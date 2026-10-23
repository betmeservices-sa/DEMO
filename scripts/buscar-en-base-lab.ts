/**
 * Lo que devuelve kb_buscar para una lista de consultas, sin modelo de por medio.
 * Sirve para revisar sinónimos y puntajes de la base del laboratorio gratis,
 * antes de gastar una llamada a luna.
 *
 *   npx tsx scripts/buscar-en-base-lab.ts "tsh" "post pandrial" "asesuisa"
 */
import { buscarEnBase } from "../lib/consultorio/lab-kb";
import { BASE_LAB } from "../lib/consultorio/lab-kb-datos";

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/El_Salvador" }).format(new Date());
for (const q of process.argv.slice(2)) {
  const r = buscarEnBase(BASE_LAB, q, hoy).slice(0, 3);
  const linea = r
    .map((c) => `${c.id}(${c.score}${c.estado !== "vigente" ? `,${c.estado}` : ""}${c.datos.precio ? `,$${c.datos.precio}` : ""})`)
    .join("  ");
  console.log(`${q.padEnd(28)} ${linea || "(nada)"}`);
}
