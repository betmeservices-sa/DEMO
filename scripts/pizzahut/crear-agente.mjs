// Crea (o actualiza) en Vapi a Daniela, la agente de voz de Eventos de Pizza Hut.
//
//   node scripts/pizzahut/crear-agente.mjs                      crea o actualiza
//   node scripts/pizzahut/crear-agente.mjs --dry-run            solo imprime el cuerpo (sin secretos)
//   node scripts/pizzahut/crear-agente.mjs --respaldo=<carpeta> guarda el JSON que devuelve Vapi
//
// Idempotente: si ya existe un asistente con el mismo nombre lo actualiza con
// PATCH, y el número solo se crea si todavía no está en Vapi. Ojo con el PATCH:
// `model` se reemplaza ENTERO, por eso acá va completo (mensajes y herramientas).
//
// El guion vive en scripts/pizzahut/prompt.md. Este archivo solo lo sube.
//
// Los datos de la llamada salen en el end-of-call-report, en
// `message.analysis.structuredData` (structuredDataPlan, el mismo mecanismo
// que leen los webhooks de Nissan y CrediQ en lib/memoria-webhook.ts), y el
// resumen en `message.analysis.summary`.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const aqui = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(aqui, "..", "..");
const VAPI = "https://api.vapi.ai";

const NOMBRE = "Daniela - Pizza Hut (Eventos)";
const WEBHOOK = "https://demo.miagentia.com/api/webhooks/vapi/pizzahut";

// Línea: serie BYO SIP de Tigo (+50325054600 a +50325054699), mismo trunk y
// misma credencial que Nissan y CEGISA. Número NUEVO, no se mueve ninguno.
const NUMERO = "+50325054606";
const NOMBRE_NUMERO = "Pizza Hut Eventos";
const CREDENCIAL_TRUNK = "b58e5508-ba89-4664-a7db-6df43e8b9da8";

// ---------------------------------------------------------------- secretos

function leerEnv() {
  try {
    return readFileSync(join(RAIZ, ".env.local"), "utf8");
  } catch {
    return "";
  }
}

function variable(nombre, env) {
  if (process.env[nombre]) return process.env[nombre];
  const m = new RegExp(`^${nombre}=(.*)$`, "m").exec(env);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

const ENV = leerEnv();
// Mismo orden que lib/vapi-secreto.ts: VAPI_MEMORIA_SECRET si no está vacío.
const SECRETO = variable("VAPI_MEMORIA_SECRET", ENV) || variable("VAPI_WEBHOOK_SECRET", ENV);

// ---------------------------------------------------------------- datos

const S = (description) => ({ type: "string", description });
const N = (description) => ({ type: "number", description });
const B = (description) => ({ type: "boolean", description });
const E = (valores, description) => ({ type: "string", enum: valores, description });

// Contrato con el tablero (tenant pizzahut). Nombres EXACTOS, todo opcional.
const ESQUEMA = {
  type: "object",
  properties: {
    tipo_evento: E(
      ["concierto", "deportivo", "festival_feria", "fiesta_patronal", "corporativo", "educativo", "religioso_comunitario", "otro"],
      "Tipo de evento.",
    ),
    nombre_evento: S("Nombre del evento: artista, equipos o actividad. Vacío si no lo dijo."),
    descripcion_evento: S("De qué se trata el evento, en una frase."),
    fecha_inicio: S("Primer día del evento en formato YYYY-MM-DD. Vacío si no hay fecha."),
    fecha_fin: S("Último día en formato YYYY-MM-DD. Igual a fecha_inicio si es de un día. Vacío si no hay fecha."),
    horario: S("Horario del evento, por ejemplo 'de 4:00 p. m. a 11:00 p. m.'."),
    recinto: S("Lugar o recinto: CIFCO, Estadio Cuscatlán, un parque, un colegio."),
    municipio: S("Municipio o ciudad, como lo dijo la persona."),
    departamento: S("Departamento de El Salvador. Si no lo dijo pero el municipio lo deja claro, ponlo."),
    espacio: E(["aire_libre", "techado", "mixto", ""], "Si el evento es al aire libre, techado o mixto."),
    aforo_esperado: N("Cantidad de personas que esperan. 0 si no sabe."),
    evento_recurrente: B("true si el evento ya se hizo antes."),
    asistencia_anterior: N("Personas que llegaron la vez anterior. 0 si no aplica o no sabe."),
    perfil_publico: S("Qué tipo de público va: familias, jóvenes, empresas."),
    tipo_entrada: E(["gratuita", "con_boleto", ""], "Entrada gratuita o con boleto."),
    precio_boleto: N("Precio del boleto en dólares. 0 si no aplica o no lo dijo."),
    modalidad: E(
      ["venta_en_sitio", "patrocinio", "catering", "donacion", "mixta", "por_definir"],
      "Qué buscan de Pizza Hut: venta en el lugar (stand o puesto), patrocinio, comida para staff o invitados, donación, varias de ellas (mixta) o no está claro (por_definir).",
    ),
    condicion_comercial: E(
      ["cuota_fija", "comision", "cuota_mas_comision", "sin_costo", "canje", "por_definir"],
      "Condición que propone el organizador.",
    ),
    monto_cuota: N("Cuota fija por el espacio en dólares. 0 si no aplica o no lo dijo."),
    porcentaje_comision: N("Porcentaje de comisión sobre ventas, de 0 a 100. 0 si no aplica o no lo dijo."),
    exclusividad_pizza: E(["si", "no", "por_definir"], "Si Pizza Hut sería la única marca de pizza."),
    otros_vendedores_comida: N("Cuántos puestos de comida más habrá. 0 si no sabe."),
    tamano_espacio: S("Tamaño del espacio para Pizza Hut, como lo dijo, por ejemplo '3 x 3 metros'."),
    energia_electrica: E(["incluida", "no_incluida", "por_definir"], "Si el espacio incluye energía eléctrica."),
    agua: E(["incluida", "no_incluida", "por_definir"], "Si el espacio incluye agua."),
    toldo_mobiliario: E(["incluido", "no_incluido", "por_definir"], "Si incluye toldo y mobiliario."),
    montaje: S("Cuándo es el montaje y el desmontaje, y si hay acceso vehicular."),
    permisos_a_cargo_de: E(["organizador", "pizza_hut", "por_definir"], "Quién tramita los permisos de alcaldía y Salud."),
    medios_de_pago: S("Cómo se paga dentro del evento: efectivo, tarjeta, pulsera (cashless)."),
    promocion_de_marca: S("Cómo aparecería la marca Pizza Hut en la promoción del evento."),
    fecha_limite_respuesta: S("Fecha límite para responder, YYYY-MM-DD. Vacío si no la dijo."),
    contacto_nombre: S("Nombre de quien llamó."),
    contacto_cargo: S("Cargo de quien llamó."),
    contacto_empresa: S("Empresa u organización de quien llamó."),
    contacto_telefono: S("Teléfono de contacto: 8 dígitos sin guiones ni código de país. Si se dijo en palabras, pásalo a dígitos."),
    contacto_correo: S("Correo de contacto, en minúsculas y sin espacios."),
    contacto_horario: S("Mejor horario para contactarle."),
    contacto_canal: E(["llamada", "whatsapp", "correo", ""], "Medio preferido para el contacto."),
    es_propuesta_de_evento: B("true si la llamada fue para proponer un evento. false si fue un pedido, una queja, un número equivocado u otro tema."),
    notas: S("Cualquier otro dato útil para el asesor que no cabe en los campos anteriores. En llamadas que no son de evento, el motivo."),
  },
};

const SISTEMA_DATOS = `Eres quien registra las propuestas que recibe el equipo de Eventos de Pizza Hut El Salvador. Te paso la transcripción de la llamada. Extrae los datos según el JSON Schema.

Fecha de la llamada: {{"now" | date: "%Y-%m-%d", "America/El_Salvador"}}. Úsala para poner el año a las fechas que se dijeron sin año (la próxima que corresponda a partir de esa fecha) y para resolver fechas relativas.

Reglas:
- Solo lo que se dijo en la llamada. Si un dato no se dijo, omítelo o déjalo vacío; nunca lo inventes.
- Los números dichos en palabras pásalos a cifras.
- La marca se escribe siempre "Pizza Hut", aunque en la transcripción aparezca "Pizza Jat" u otra forma.
- Si la llamada no fue para proponer un evento, es_propuesta_de_evento es false.

Json Schema:
{{schema}}

Responde solo con el JSON.`;

const SISTEMA_RESUMEN = `Eres quien toma notas del equipo de Eventos de Pizza Hut El Salvador. Te paso la transcripción de la llamada que entró a la línea de eventos.
Resume en dos o tres frases, en español: qué evento es, cuándo, dónde, cuánta gente esperan, qué le proponen a Pizza Hut y quién llamó (nombre, cargo y empresa si los dijo).
Escribe siempre "Pizza Hut", aunque en la transcripción aparezca "Pizza Jat". No uses guiones largos.
Si la llamada no fue una propuesta de evento (un pedido, una queja, un número equivocado), dilo en una frase con el motivo.
Devuelve solo el resumen.`;

const USUARIO_ANALISIS =
  "Here is the transcript:\n\n{{transcript}}\n\n. Here is the ended reason of the call:\n\n{{endedReason}}\n\n";

const KEYTERMS = [
  "Pizza Hut",
  "aforo",
  "stand",
  "patrocinio",
  "comisión",
  "exclusividad",
  "catering",
  "canje",
  "toldo",
  "montaje",
  "desmontaje",
  "concesión",
  "alcaldía",
  "chalet",
  "food truck",
  "pulsera",
  "cashless",
  "fiestas patronales",
  "fiestas agostinas",
  "CIFCO",
  "Estadio Cuscatlán",
  "Estadio Mágico González",
  "Gimnasio Nacional",
  "Surf City",
  "Ahuachapán",
  "Santa Ana",
  "Sonsonate",
  "Chalatenango",
  "La Libertad",
  "San Salvador",
  "Cuscatlán",
  "La Paz",
  "Cabañas",
  "San Vicente",
  "Usulután",
  "San Miguel",
  "Morazán",
  "La Unión",
];

function configuracion(prompt) {
  return {
    name: NOMBRE,
    firstMessage: "Gracias por llamar a Pizza Jat, le saluda Daniela, del equipo de Eventos. ¿En qué le puedo ayudar?",
    firstMessageInterruptionsEnabled: false,
    voicemailMessage: "Le saluda Daniela, del equipo de Eventos de Pizza Jat. Con gusto le atendemos cuando guste volver a llamarnos.",
    endCallMessage: "Con gusto. Que tenga un buen día.",
    // Estándar 2026-10-06: v4 turbo con "Eli Salvadoran". Con este modelo
    // Vapi ignora speed, style, similarityBoost y optimizeStreamingLatency.
    voice: {
      provider: "11labs",
      voiceId: "cQ7rlUiVL3ishf4Oo7t2",
      model: "eleven_v4_turbo",
      stability: 0.5,
      language: "es",
    },
    // Sin temperature ni maxTokens (estándar 2026-10-06).
    model: {
      provider: "openai",
      model: "gpt-5.6-luna",
      messages: [{ role: "system", content: prompt }],
      tools: [{ type: "endCall" }],
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-3",
      language: "es-419",
      keyterm: KEYTERMS,
      fallbackPlan: { autoFallback: { enabled: true } },
    },
    silenceTimeoutSeconds: 25,
    maxDurationSeconds: 900,
    backgroundSound: "office",
    backgroundDenoisingEnabled: true,
    messagePlan: {
      idleMessages: ["Aquí le espero, sin prisa.", "¿Sigue en la línea?"],
      idleMessageMaxSpokenCount: 2,
      idleTimeoutSeconds: 12,
    },
    startSpeakingPlan: { smartEndpointingPlan: { provider: "vapi" } },
    analysisPlan: {
      summaryPlan: {
        enabled: true,
        messages: [
          { role: "system", content: SISTEMA_RESUMEN },
          { role: "user", content: USUARIO_ANALISIS },
        ],
      },
      structuredDataPlan: {
        enabled: true,
        schema: ESQUEMA,
        messages: [
          { role: "system", content: SISTEMA_DATOS },
          { role: "user", content: USUARIO_ANALISIS },
        ],
      },
      successEvaluationPlan: { enabled: false },
    },
    server: {
      url: WEBHOOK,
      timeoutSeconds: 20,
      headers: { "x-vapi-secret": SECRETO },
    },
    serverMessages: ["end-of-call-report"],
  };
}

// ---------------------------------------------------------------- Vapi

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

function sinSecretos(obj) {
  const copia = structuredClone(obj);
  if (copia?.server?.headers?.["x-vapi-secret"]) copia.server.headers["x-vapi-secret"] = "<oculto>";
  return copia;
}

// ---------------------------------------------------------------- main

const prompt = readFileSync(join(aqui, "prompt.md"), "utf8").trim();
const cuerpo = configuracion(prompt);

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(sinSecretos(cuerpo), null, 2));
  process.exit(0);
}

const key = variable("VAPI_PRIVATE_KEY", ENV);
if (!key) {
  console.error("Falta VAPI_PRIVATE_KEY (ni en el entorno ni en .env.local).");
  process.exit(1);
}
if (!SECRETO) {
  console.error("Falta VAPI_MEMORIA_SECRET o VAPI_WEBHOOK_SECRET: sin secreto el webhook rechaza todo.");
  process.exit(1);
}

const asistentes = await pedir("/assistant?limit=1000", key);
const previo = (Array.isArray(asistentes) ? asistentes : []).find((a) => a.name === NOMBRE);

const asistente = previo
  ? await pedir(`/assistant/${previo.id}`, key, { method: "PATCH", body: JSON.stringify(cuerpo) })
  : await pedir("/assistant", key, { method: "POST", body: JSON.stringify(cuerpo) });

console.log(previo ? "Asistente actualizado." : "Asistente creado.");
console.log(`  id:     ${asistente.id}`);
console.log(`  modelo: ${asistente.model?.model} | voz: ${asistente.voice?.model} ${asistente.voice?.voiceId}`);

// Número: se crea si no existe. Si existe y es de otro asistente, NO se toca.
const numeros = await pedir("/phone-number?limit=1000", key);
const linea = (Array.isArray(numeros) ? numeros : []).find((n) => n.number === NUMERO);
let numero;
if (!linea) {
  numero = await pedir("/phone-number", key, {
    method: "POST",
    body: JSON.stringify({
      provider: "byo-phone-number",
      number: NUMERO,
      numberE164CheckEnabled: true,
      credentialId: CREDENCIAL_TRUNK,
      name: NOMBRE_NUMERO,
      assistantId: asistente.id,
    }),
  });
  console.log("Número creado.");
} else if (linea.assistantId && linea.assistantId !== asistente.id) {
  console.error(`El ${NUMERO} ya está asignado a otro asistente (${linea.assistantId}). No se mueve.`);
  process.exit(1);
} else {
  numero =
    linea.assistantId === asistente.id && linea.name === NOMBRE_NUMERO
      ? linea
      : await pedir(`/phone-number/${linea.id}`, key, {
          method: "PATCH",
          body: JSON.stringify({ assistantId: asistente.id, name: NOMBRE_NUMERO }),
        });
  console.log("Número ya existía, asignado a Daniela.");
}
console.log(`  phoneNumberId: ${numero.id}`);
console.log(`  número:        ${numero.number} (${numero.name})`);

const arg = process.argv.find((a) => a.startsWith("--respaldo="));
if (arg) {
  const carpeta = arg.slice("--respaldo=".length);
  mkdirSync(carpeta, { recursive: true });
  const archivo = join(carpeta, "pizzahut-daniela-vapi.json");
  writeFileSync(archivo, JSON.stringify({ asistente: sinSecretos(asistente), numero }, null, 2));
  console.log(`  respaldo:      ${archivo}`);
}
