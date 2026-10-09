// Crea (o actualiza) en Vapi la agente de voz de demostracion de la Caja de
// Credito de Chalatenango (Elena) y su herramienta seguir_por_whatsapp.
//
//   node scripts/crear-agente-chalatenango.mjs            -> crea o actualiza
//   node scripts/crear-agente-chalatenango.mjs --dry-run  -> solo imprime los cuerpos (sin el secreto)
//
// El guion NO vive aca: vive en lib/chalatenango-agente.ts (el maestro y un
// bloque por camino, la herramienta y la ruta). Este archivo solo lo sube.
// Correrlo dos veces no duplica nada: la agente se actualiza por su id (o por
// nombre si aun no existe) y la herramienta por su id (o por nombre y ruta).
//
// El secreto de la ruta (header x-vapi-secret) sale de VAPI_MEMORIA_SECRET, del
// entorno o de .env.local; nunca se escribe en el repo.
//
// OJO Vapi: PATCH /tool/{id} con solo `function` BORRA el server. Por eso la
// herramienta se manda siempre completa.
//
// ORDEN: la ruta (app/api/webhooks/vapi/chalatenango) tiene que estar
// desplegada ANTES de correr esto, o Elena apuntaria a una ruta que no existe.
//
// No le asigna numero ni hace llamadas: eso se decide aparte.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  CHALATENANGO_ASSISTANT_ID,
  CONFIG_VAPI_CHALATENANGO,
  ELENA_TOOL_WHATSAPP_ID,
  TOOL_SEGUIR_POR_WHATSAPP,
} from "../lib/chalatenango-agente.ts";

const aqui = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(aqui, "..");
const VAPI = "https://api.vapi.ai";

function delEntorno(nombre) {
  if (process.env[nombre]) return process.env[nombre];
  try {
    const env = readFileSync(join(RAIZ, ".env.local"), "utf8");
    const m = new RegExp(`^${nombre}=(.+)$`, "m").exec(env);
    if (m) return m[1].trim().replace(/^"|"$/g, "");
  } catch {
    // sin .env.local: se cae al error de abajo
  }
  return null;
}

async function pedir(ruta, key, init = {}) {
  const res = await fetch(`${VAPI}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    const m = cuerpo?.message;
    throw new Error(
      `Vapi respondió ${res.status} en ${ruta}: ${Array.isArray(m) ? m.join("; ") : m ?? "sin detalle"}`,
    );
  }
  return cuerpo;
}

/** La herramienta con el secreto puesto. */
function herramienta(secreto) {
  return {
    ...TOOL_SEGUIR_POR_WHATSAPP,
    server: { ...TOOL_SEGUIR_POR_WHATSAPP.server, headers: { "x-vapi-secret": secreto } },
  };
}

/** La agente con su herramienta y el secreto de su ruta. */
function agente(secreto, toolId) {
  return {
    ...CONFIG_VAPI_CHALATENANGO,
    model: { ...CONFIG_VAPI_CHALATENANGO.model, toolIds: [toolId] },
    server: { ...CONFIG_VAPI_CHALATENANGO.server, headers: { "x-vapi-secret": secreto } },
  };
}

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify({ herramienta: herramienta("***"), agente: agente("***", ELENA_TOOL_WHATSAPP_ID || "<id>") }, null, 2));
  process.exit(0);
}

const key = delEntorno("VAPI_PRIVATE_KEY");
const secreto = delEntorno("VAPI_MEMORIA_SECRET");
if (!key || !secreto) {
  console.error("Faltan VAPI_PRIVATE_KEY o VAPI_MEMORIA_SECRET (ni en el entorno ni en .env.local).");
  process.exit(1);
}

// 1. La herramienta.
const tool = herramienta(secreto);
let toolPrevia = null;
if (ELENA_TOOL_WHATSAPP_ID) {
  toolPrevia = await pedir(`/tool/${ELENA_TOOL_WHATSAPP_ID}`, key);
} else {
  const tools = await pedir("/tool?limit=1000", key);
  toolPrevia =
    (Array.isArray(tools) ? tools : []).find(
      (t) => t.function?.name === tool.function.name && t.server?.url === tool.server.url,
    ) ?? null;
}
const toolGuardada = toolPrevia
  ? await pedir(`/tool/${toolPrevia.id}`, key, {
      method: "PATCH",
      // Completa: function y server. Sin `type`, que no se cambia.
      body: JSON.stringify({ function: tool.function, server: tool.server }),
    })
  : await pedir("/tool", key, { method: "POST", body: JSON.stringify(tool) });
console.log(toolPrevia ? "Herramienta actualizada." : "Herramienta creada.");
console.log(`  id:   ${toolGuardada.id}`);
console.log(`  ruta: ${toolGuardada.server?.url ?? "-"}`);

// 2. La agente.
const cuerpo = agente(secreto, toolGuardada.id);
let previo = null;
try {
  previo = await pedir(`/assistant/${CHALATENANGO_ASSISTANT_ID}`, key);
} catch {
  const existentes = await pedir("/assistant?limit=200", key);
  previo = (Array.isArray(existentes) ? existentes : []).find((a) => a.name === cuerpo.name) ?? null;
}
const guardado = previo
  ? await pedir(`/assistant/${previo.id}`, key, { method: "PATCH", body: JSON.stringify(cuerpo) })
  : await pedir("/assistant", key, { method: "POST", body: JSON.stringify(cuerpo) });

console.log(previo ? "Agente actualizada." : "Agente creada.");
console.log(`  id:      ${guardado.id}`);
console.log(`  nombre:  ${guardado.name}`);
console.log(`  modelo:  ${guardado.model?.model ?? "-"}`);
console.log(`  voz:     ${guardado.voice?.model ?? "-"} ${guardado.voice?.voiceId ?? ""}`);
console.log(`  tools:   ${(guardado.model?.toolIds ?? []).join(", ") || "-"}`);
console.log(`  server:  ${guardado.server?.url ?? "-"} (${(guardado.serverMessages ?? []).join(", ")})`);
console.log("");
console.log("Los ids van en lib/chalatenango-agente.ts (CHALATENANGO_ASSISTANT_ID y ELENA_TOOL_WHATSAPP_ID).");
