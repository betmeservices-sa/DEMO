// Crea (o actualiza) en Vapi la agente de voz de demostracion de la Caja de
// Credito de Chalatenango (Elena).
//
//   node scripts/crear-agente-chalatenango.mjs            -> crea o actualiza
//   node scripts/crear-agente-chalatenango.mjs --dry-run  -> solo imprime el cuerpo
//
// El guion NO vive aca: vive en lib/chalatenango-agente.ts (el maestro y un
// bloque por camino). Este archivo solo lo sube. Correrlo dos veces no duplica
// la agente: si ya existe una con el mismo nombre, la actualiza.
//
// No le asigna numero ni hace llamadas: eso se decide aparte.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { CONFIG_VAPI_CHALATENANGO } from "../lib/chalatenango-agente.ts";

const aqui = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(aqui, "..");
const VAPI = "https://api.vapi.ai";

function llaveVapi() {
  if (process.env.VAPI_PRIVATE_KEY) return process.env.VAPI_PRIVATE_KEY;
  try {
    const env = readFileSync(join(RAIZ, ".env.local"), "utf8");
    const m = /^VAPI_PRIVATE_KEY=(.+)$/m.exec(env);
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

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(CONFIG_VAPI_CHALATENANGO, null, 2));
  process.exit(0);
}

const key = llaveVapi();
if (!key) {
  console.error("Falta VAPI_PRIVATE_KEY (ni en el entorno ni en .env.local).");
  process.exit(1);
}

const existentes = await pedir("/assistant?limit=200", key);
const previo = (Array.isArray(existentes) ? existentes : []).find(
  (a) => a.name === CONFIG_VAPI_CHALATENANGO.name,
);

const guardado = previo
  ? await pedir(`/assistant/${previo.id}`, key, {
      method: "PATCH",
      body: JSON.stringify(CONFIG_VAPI_CHALATENANGO),
    })
  : await pedir("/assistant", key, {
      method: "POST",
      body: JSON.stringify(CONFIG_VAPI_CHALATENANGO),
    });

console.log(previo ? "Agente actualizada." : "Agente creada.");
console.log(`  id:     ${guardado.id}`);
console.log(`  nombre: ${guardado.name}`);
console.log(`  modelo: ${guardado.model?.model ?? "-"}`);
console.log(`  voz:    ${guardado.voice?.model ?? "-"} ${guardado.voice?.voiceId ?? ""}`);
console.log("");
console.log("Ese id va en lib/chalatenango-agente.ts (CHALATENANGO_ASSISTANT_ID).");
