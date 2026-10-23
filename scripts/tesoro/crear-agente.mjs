// Crea (o actualiza) en Vapi a Marina, la recepcionista de voz del Hotel
// Tesoro Beach, y le da la línea 2505-4620.
//
//   node scripts/tesoro/crear-agente.mjs                      crea o actualiza
//   node scripts/tesoro/crear-agente.mjs --dry-run            solo imprime el cuerpo
//   node scripts/tesoro/crear-agente.mjs --respaldo=<carpeta> guarda el JSON que devuelve Vapi
//
// El guion NO vive acá: vive en lib/tesoro-agente.ts, y las habitaciones y
// tarifas salen de la muestra del panel (lib/hotel-muestra/tesoro.ts y
// tarifas.ts). Este archivo solo lo sube.
//
// Idempotente: actualiza por TESORO_ASSISTANT_ID (o por nombre si aún no hay
// id) y el número solo se crea si todavía no está en Vapi. Ojo con el PATCH:
// `model` se reemplaza ENTERO, por eso va completo.
//
// Sin webhook: el panel lee las llamadas de Vapi (app/api/hotel-muestra/llamadas).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { configVapiTesoro, NUMERO_MARINA, TESORO_ASSISTANT_ID } from "../../lib/tesoro-agente.ts";
import { TESORO } from "../../lib/hotel-muestra/tesoro.ts";
import { tarifaFinde } from "../../lib/hotel-muestra/tarifas.ts";

const aqui = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(aqui, "..", "..");
const VAPI = "https://api.vapi.ai";

// Serie BYO SIP de Tigo (+50325054600 a +50325054699), mismo trunk y misma
// credencial que las demás líneas. La 4609 y de la 4611 a la 4619 son del alta
// de WhatsApp en vivo: la 4620 es la primera libre.
const NOMBRE_NUMERO = "Tesoro Beach Recepcion";
const CREDENCIAL_TRUNK = "b58e5508-ba89-4664-a7db-6df43e8b9da8";

function variable(nombre) {
  if (process.env[nombre]) return process.env[nombre];
  try {
    const env = readFileSync(join(RAIZ, ".env.local"), "utf8");
    const m = new RegExp(`^${nombre}=(.*)$`, "m").exec(env);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}

async function pedir(ruta, key, init = {}) {
  const res = await fetch(`${VAPI}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    const m = cuerpo?.message;
    throw new Error(`Vapi respondió ${res.status} en ${ruta}: ${Array.isArray(m) ? m.join("; ") : m ?? "sin detalle"}`);
  }
  return cuerpo;
}

const cuerpo = configVapiTesoro(TESORO.zonas, tarifaFinde);

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(cuerpo, null, 2));
  process.exit(0);
}

const key = variable("VAPI_PRIVATE_KEY");
if (!key) {
  console.error("Falta VAPI_PRIVATE_KEY (ni en el entorno ni en .env.local).");
  process.exit(1);
}

let previo = null;
if (TESORO_ASSISTANT_ID) {
  previo = await pedir(`/assistant/${TESORO_ASSISTANT_ID}`, key);
} else {
  const asistentes = await pedir("/assistant?limit=1000", key);
  previo = (Array.isArray(asistentes) ? asistentes : []).find((a) => a.name === cuerpo.name) ?? null;
}
const asistente = previo
  ? await pedir(`/assistant/${previo.id}`, key, { method: "PATCH", body: JSON.stringify(cuerpo) })
  : await pedir("/assistant", key, { method: "POST", body: JSON.stringify(cuerpo) });

console.log(previo ? "Asistente actualizado." : "Asistente creado.");
console.log(`  id:     ${asistente.id}`);
console.log(`  nombre: ${asistente.name}`);
console.log(`  modelo: ${asistente.model?.model} | voz: ${asistente.voice?.model} ${asistente.voice?.voiceId}`);

// Número: se crea si no existe. Si existe y es de otro asistente, NO se toca.
const numeros = await pedir("/phone-number?limit=1000", key);
const linea = (Array.isArray(numeros) ? numeros : []).find((n) => n.number === NUMERO_MARINA);
let numero;
if (!linea) {
  numero = await pedir("/phone-number", key, {
    method: "POST",
    body: JSON.stringify({
      provider: "byo-phone-number",
      number: NUMERO_MARINA,
      numberE164CheckEnabled: true,
      credentialId: CREDENCIAL_TRUNK,
      name: NOMBRE_NUMERO,
      assistantId: asistente.id,
    }),
  });
  console.log("Número creado.");
} else if (linea.assistantId && linea.assistantId !== asistente.id) {
  console.error(`El ${NUMERO_MARINA} ya está asignado a otro asistente (${linea.assistantId}). No se mueve.`);
  process.exit(1);
} else {
  numero =
    linea.assistantId === asistente.id && linea.name === NOMBRE_NUMERO
      ? linea
      : await pedir(`/phone-number/${linea.id}`, key, {
          method: "PATCH",
          body: JSON.stringify({ assistantId: asistente.id, name: NOMBRE_NUMERO }),
        });
  console.log("Número ya existía, asignado a Marina.");
}
console.log(`  phoneNumberId: ${numero.id}`);
console.log(`  número:        ${numero.number} (${numero.name})`);
if (!TESORO_ASSISTANT_ID) console.log(`\nPoner el id en lib/tesoro-agente.ts (TESORO_ASSISTANT_ID = "${asistente.id}").`);

const arg = process.argv.find((a) => a.startsWith("--respaldo="));
if (arg) {
  const carpeta = arg.slice("--respaldo=".length);
  mkdirSync(carpeta, { recursive: true });
  const archivo = join(carpeta, "tesoro-marina-vapi.json");
  writeFileSync(archivo, JSON.stringify({ asistente, numero }, null, 2));
  console.log(`  respaldo:      ${archivo}`);
}
