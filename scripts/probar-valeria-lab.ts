/**
 * Conversaciones de prueba contra la Valeria del laboratorio, en local.
 *
 * Corre el mismo `generarRespuesta` que contesta un turno real del tenant
 * consultorio: el guion, la base del lab (kb_buscar), las herramientas y luna.
 * La conversación es "prueba:qa-<caso>", así crear_ticket no abre nada: solo se
 * cuenta y se imprime. No toca WhatsApp ni ninguna base.
 *
 * Gasta la llave de PRUEBAS de OpenAI (~/.secrets/openai-prueba.env), nunca la
 * del cliente. Correr el caso puntual mientras se ajusta el guion, y la tanda
 * completa una sola vez al final:
 *   npx tsx scripts/probar-valeria-lab.ts            # todos
 *   npx tsx scripts/probar-valeria-lab.ts ayuno      # los que contienen "ayuno" en el nombre
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function cargarLlave(): void {
  const archivo = path.join(os.homedir(), ".secrets", "openai-prueba.env");
  const linea = fs
    .readFileSync(archivo, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("OPENAI_API_KEY="));
  const llave = linea?.slice("OPENAI_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  if (!llave) throw new Error(`Falta OPENAI_API_KEY en ${archivo}`);
  process.env.OPENAI_API_KEY = llave;
}

/** Cada turno es lo que el paciente manda antes de que Valeria conteste (una ráfaga = varios). */
interface Caso {
  nombre: string;
  turnos: string[][];
}

const CASOS: Caso[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "probar-valeria-lab.casos.json"), "utf8"),
) as Caso[];

async function main() {
  cargarLlave();
  // Se importa después de cargar la llave: el cliente de OpenAI la lee al usarse.
  const { generarRespuesta } = await import("../lib/ai");
  const filtro = (process.argv[2] ?? "").toLowerCase();
  const casos = CASOS.filter((c) => !filtro || c.nombre.toLowerCase().includes(filtro));
  let entrada = 0;
  let salida = 0;
  let llamadas = 0;

  for (const [i, caso] of casos.entries()) {
    console.log(`\n━━━ ${i + 1}. ${caso.nombre} ━━━`);
    const historial: { autor: "cliente" | "staff"; texto: string }[] = [];
    for (const rafaga of caso.turnos) {
      for (const t of rafaga) {
        historial.push({ autor: "cliente", texto: t });
        console.log(`  P: ${t}`);
      }
      const casosAbiertos: { tipo: string; titulo: string }[] = [];
      const r = await generarRespuesta(
        historial,
        { onCaso: (c) => void casosAbiertos.push(c) },
        { tenantId: "consultorio", clave: `prueba:qa-${i + 1}` },
      );
      historial.push({ autor: "staff", texto: r.texto });
      console.log(`  V: ${r.texto.replace(/\n/g, "\n     ")}`);
      for (const c of casosAbiertos) console.log(`     [caso ${c.tipo}] ${c.titulo}`);
      entrada += (r.uso.input_tokens ?? 0) + (r.uso.cache_read_input_tokens ?? 0) + (r.uso.cache_creation_input_tokens ?? 0);
      salida += r.uso.output_tokens ?? 0;
      llamadas += r.llamadas;
    }
  }
  // Tarifa real de luna: entrada ~$0.125 por millón (se factura como escritura de caché), salida $0.50.
  const costo = (entrada * 0.125 + salida * 0.5) / 1e6;
  console.log(`\n${casos.length} casos, ${llamadas} llamadas, ${entrada} tokens de entrada, ${salida} de salida, ~$${costo.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
