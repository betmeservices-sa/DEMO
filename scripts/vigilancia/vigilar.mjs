// Vigilancia de los demos de demo.miagentia.com.
//
// POR QUE EXISTE. El 2026-10-07 la bandeja de Nissan (demon) se caia en el
// navegador con "This page couldn't load" mientras el servidor contestaba 200 a
// todo: revisar con curl dijo "funciona" y no funcionaba. Esto entra como entra
// una persona: un navegador de verdad, la pantalla de login con el usuario y la
// clave de cada panel, cada pantalla del menu, y abre un chat de la bandeja.
//
// Que cuenta como FALLA:
//   - no deja entrar con su usuario y clave, o pide algo que no deberia
//   - un error de JavaScript en la pagina (lo que tumba la pantalla)
//   - la pantalla de error de Next ("This page couldn't load", 404, 500)
//   - una API del panel que contesta 500 o mas
//   - la pantalla en blanco, o que lo saque al login a mitad del recorrido
// Lo que es raro pero no rompe nada (una API con 4xx, una red lenta) va como aviso.
//
// Los usuarios y claves se leen de DEMO_LOGINS en lib/tenants/index.ts: un
// panel nuevo queda vigilado el dia que se agrega ahi, sin tocar este archivo.
//
// Uso:
//   node scripts/vigilancia/vigilar.mjs                 todos los logins
//   node scripts/vigilancia/vigilar.mjs demon demoi     solo esas claves
// Variables:
//   VIGILANCIA_URL      por defecto https://demo.miagentia.com
//   VIGILANCIA_CANAL    "msedge" o "chrome" para usar el navegador instalado
//   PLAYWRIGHT_CORE     ruta a playwright-core si no esta en node_modules
//   VIGILANCIA_REPORTE  donde escribir el JSON (por defecto vigilancia-reporte.json)
// Sale con codigo 1 si algun panel fallo.

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const BASE = (process.env.VIGILANCIA_URL ?? "https://demo.miagentia.com").replace(/\/$/, "");
const EN_PARALELO = 4;

async function cargarPlaywright() {
  try {
    return await import("playwright-core");
  } catch {
    if (!process.env.PLAYWRIGHT_CORE) throw new Error("falta playwright-core (npm i --no-save playwright o PLAYWRIGHT_CORE=ruta)");
    return await import(pathToFileURL(process.env.PLAYWRIGHT_CORE + "/index.mjs").href);
  }
}

/** Los logins de DEMO_LOGINS, sin los ejemplos comentados. */
function leerLogins() {
  const fuente = readFileSync(new URL("../../lib/tenants/index.ts", import.meta.url), "utf8");
  const re = /\{\s*usuario:\s*"([^"]+)",\s*password:\s*"([^"]+)",\s*tenant:\s*"([^"]+)"\s*\}/;
  const logins = [];
  for (const linea of fuente.split(/\r?\n/)) {
    if (linea.trim().startsWith("//")) continue;
    const m = linea.match(re);
    if (m) logins.push({ usuario: m[1], password: m[2], tenant: m[3] });
  }
  return logins;
}

const PANTALLA_DE_ERROR =
  /This page couldn.t load|Application error|Unhandled Runtime Error|Internal Server Error|This page could not be found|404: This page|500: Internal/i;

/** Visita una ruta ya logueado y junta lo que salio mal. */
async function revisarRuta(page, ruta, extra) {
  const errores = [];
  const avisos = [];
  const alError = (e) => errores.push(`error de JavaScript: ${e.message.split("\n")[0].slice(0, 200)}`);
  const alResponder = (r) => {
    const url = r.url();
    if (!url.startsWith(BASE + "/api/")) return;
    const camino = url.slice(BASE.length).split("?")[0];
    if (r.status() >= 500) errores.push(`API ${r.status()} en ${camino}`);
    // /api/auth/password contesta 401 a las cuentas demo, que no tienen clave
    // propia que cambiar: es lo esperado, no un aviso.
    else if (r.status() === 401 && camino === "/api/auth/password") return;
    else if (r.status() >= 400) avisos.push(`API ${r.status()} en ${camino}`);
  };
  page.on("pageerror", alError);
  page.on("response", alResponder);
  try {
    await page.goto(BASE + ruta, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => avisos.push("la red no se calmo en 20 s"));
    await page.waitForTimeout(1500);
    if (extra) await extra(page, errores, avisos);
    const texto = (await page.locator("body").innerText({ timeout: 10000 }).catch(() => "")) ?? "";
    const error = texto.match(PANTALLA_DE_ERROR);
    if (error) errores.push(`pantalla de error: "${error[0]}"`);
    if (await page.locator('input[placeholder="usuario"]').isVisible().catch(() => false)) errores.push("lo saco al login");
    if (texto.trim().length < 40) errores.push("pantalla en blanco");
  } catch (e) {
    errores.push(`no cargo: ${e.message.split("\n")[0].slice(0, 200)}`);
  } finally {
    page.off("pageerror", alError);
    page.off("response", alResponder);
  }
  return { ruta, errores: [...new Set(errores)], avisos: [...new Set(avisos)] };
}

/** En la bandeja, abrir el primer chat: ahi viven el hilo y el panel de contexto. */
async function abrirPrimerChat(page, errores) {
  const chat = page.locator("[data-item-conv]").first();
  if (!(await chat.isVisible().catch(() => false))) return;
  await chat.click({ timeout: 10000 }).catch((e) => errores.push(`no se pudo abrir un chat: ${e.message.split("\n")[0]}`));
  await page.waitForTimeout(2500);
}

async function entrar(page, login) {
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
  const usuario = page.locator('input[placeholder="usuario"]');
  await usuario.waitFor({ state: "visible", timeout: 30000 });
  await usuario.fill(login.usuario);
  await page.locator('input[type="password"]').first().fill(login.password);
  await page.locator('button[type="submit"]').first().click();
  // Entro cuando el formulario se va. Si aparece el codigo de 2 pasos, no entro.
  const resultado = await Promise.race([
    usuario.waitFor({ state: "detached", timeout: 30000 }).then(() => "ok").catch(() => null),
    usuario.waitFor({ state: "hidden", timeout: 30000 }).then(() => "ok").catch(() => null),
    page.locator('input[placeholder="000000"]').waitFor({ state: "visible", timeout: 30000 }).then(() => "2fa").catch(() => null),
  ]);
  if (resultado === "2fa") throw new Error("pide el codigo de 2 pasos");
  if (resultado !== "ok") throw new Error("el login no avanzo en 30 s (usuario o clave rechazados?)");
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

/** Las pantallas del menu del panel, tal como las ve quien entra. */
async function rutasDelMenu(page) {
  const hrefs = await page
    .$$eval("aside a[href], nav a[href], header a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""))
    .catch(() => []);
  const rutas = new Set();
  for (const h of hrefs) {
    if (!h.startsWith("/") || h.startsWith("//") || h.startsWith("/api")) continue;
    rutas.add(h.split("#")[0]);
  }
  return [...rutas];
}

async function vigilarLogin(browser, login) {
  const etiqueta = `${login.usuario} / ${login.password} (${login.tenant})`;
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "es-SV", timezoneId: "America/El_Salvador" });
  const page = await ctx.newPage();
  const res = { login: etiqueta, tenant: login.tenant, entro: false, pantallas: [], errores: [] };
  try {
    await entrar(page, login);
    res.entro = true;
    const inicio = new URL(page.url()).pathname;
    const rutas = [...new Set([inicio, ...(await rutasDelMenu(page))])];
    if (rutas.length <= 1) res.errores.push("no se encontro el menu del panel");
    for (const ruta of rutas) {
      res.pantallas.push(await revisarRuta(page, ruta, ruta === "/" ? abrirPrimerChat : undefined));
    }
  } catch (e) {
    res.errores.push(`no pudo entrar: ${e.message.split("\n")[0]}`);
  }
  await ctx.close();

  // La misma primera pantalla en un celular: ahi fue donde se vio la caida.
  if (res.entro) {
    const movil = await browser.newContext({
      viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6,
      locale: "es-SV", timezoneId: "America/El_Salvador",
    });
    const p = await movil.newPage();
    try {
      await entrar(p, login);
      const r = await revisarRuta(p, new URL(p.url()).pathname);
      r.ruta = `${r.ruta} (celular)`;
      res.pantallas.push(r);
    } catch (e) {
      res.errores.push(`celular: ${e.message.split("\n")[0]}`);
    }
    await movil.close();
  }

  res.ok = res.errores.length === 0 && res.pantallas.every((p) => p.errores.length === 0);
  return res;
}

async function main() {
  const { chromium } = await cargarPlaywright();
  const filtro = process.argv.slice(2);
  const logins = leerLogins().filter((l) => filtro.length === 0 || filtro.includes(l.password) || filtro.includes(l.tenant));
  if (logins.length === 0) throw new Error("no se encontro ningun login en DEMO_LOGINS");

  const canal = process.env.VIGILANCIA_CANAL;
  const browser = await chromium.launch({ headless: true, ...(canal ? { channel: canal } : {}) });
  const inicio = Date.now();
  const resultados = [];
  const cola = [...logins];
  await Promise.all(
    Array.from({ length: Math.min(EN_PARALELO, cola.length) }, async () => {
      while (cola.length) {
        const login = cola.shift();
        const r = await vigilarLogin(browser, login);
        resultados.push(r);
        console.log(`${r.ok ? "OK   " : "FALLA"} ${r.login}: ${r.pantallas.length} pantallas`);
      }
    }),
  );
  await browser.close();

  resultados.sort((a, b) => Number(a.ok) - Number(b.ok) || a.login.localeCompare(b.login));
  const fallas = resultados.filter((r) => !r.ok);
  console.log(`\n${resultados.length} logins, ${fallas.length} con falla, ${Math.round((Date.now() - inicio) / 1000)} s`);
  for (const r of fallas) {
    console.log(`\nFALLA ${r.login}`);
    for (const e of r.errores) console.log(`  - ${e}`);
    for (const p of r.pantallas.filter((p) => p.errores.length)) console.log(`  ${p.ruta}: ${p.errores.join(" | ")}`);
  }
  const avisos = resultados.flatMap((r) => r.pantallas.filter((p) => p.avisos.length).map((p) => `${r.tenant} ${p.ruta}: ${p.avisos.join(" | ")}`));
  if (avisos.length) console.log(`\nAvisos (no rompen la pantalla):\n  ${avisos.join("\n  ")}`);

  const reporte = { cuando: new Date().toISOString(), base: BASE, ok: fallas.length === 0, resultados };
  writeFileSync(process.env.VIGILANCIA_REPORTE ?? "vigilancia-reporte.json", JSON.stringify(reporte, null, 2));
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => {
  console.error(`La vigilancia no pudo correr: ${e.message}`);
  process.exit(2);
});
