// La base de conocimiento del laboratorio y la búsqueda que usa Valeria.
//
// Es la misma idea que `kb_buscar` del hub (yali/lib/kb.ts), pero en código:
// el demo no tiene tablas kb_* y probarla en local no toca ninguna base. El
// guion (valeria-guion.ts) lleva solo las reglas; los precios, preparaciones,
// sucursales, convenios y promociones viven en lab-kb-datos.ts, cada uno con
// su fuente, y el modelo los pide con la herramienta `kb_buscar`.
//
// La búsqueda imita la del hub: limpia muletillas ("cuánto cuesta", "la de",
// "buenas"), las siglas cortas (TSH, TGO, VIH) solo cuentan como palabra
// completa, y lo demás se compara por trigramas, así "glucoza", "trigliceridos"
// o "colesterol total" encuentran lo suyo aunque vengan mal escritos.

export type EstadoKb = "vigente" | "por_confirmar" | "no_se_realiza";

interface ConFuente {
  /** De dónde salió el dato: "chats Escalón, 03/10/2026, conv 45". El modelo no lo ve. */
  fuente: string;
  /** Lo que no cuadra o hay que revisar. El modelo no lo ve. */
  notas?: string;
}

export interface ExamenKb extends ConFuente {
  id: string;
  tipo: "examen" | "perfil" | "servicio";
  nombre: string;
  /** Cómo lo escribe la gente, con faltas incluidas. */
  sinonimos: string[];
  estado: EstadoKb;
  /** El precio que se da hoy, en dólares, sin seguro. */
  precio?: number;
  /** Condiciones del precio: qué incluye, qué va aparte, cuándo cambia. */
  precioNota?: string;
  /** Lo que trae un perfil o paquete. */
  incluye?: string[];
  preparacion?: string;
  muestra?: string;
  resultado?: string;
  requiereOrden?: boolean;
  descripcion?: string;
  /** Si viene, Valeria manda ESTA frase y nada más. */
  respuestaFija?: string;
  /** Lo que se pregunta cuando no se sabe cuál de varios parecidos es. */
  preguntaAclaracion?: string;
}

export interface SucursalKb extends ConFuente {
  id: string;
  nombre: string;
  sinonimos: string[];
  direccion: string;
  horario: string;
  telefono?: string;
  whatsapp?: string;
  servicios?: string;
}

export interface ConvenioKb extends ConFuente {
  id: string;
  nombre: string;
  sinonimos: string[];
  /** convenio: precio o trato especial; aseguradora: se atiende con el seguro; no_trabaja: no. */
  modalidad: "convenio" | "aseguradora" | "no_trabaja";
  descripcion: string;
  requisitos?: string;
  estado: EstadoKb;
}

/** Lo que no es un examen: formas de pago, domicilio, resultados, factura... */
export interface TemaKb extends ConFuente {
  id: string;
  nombre: string;
  sinonimos: string[];
  respuesta: string;
}

export interface PromocionKb extends ConFuente {
  id: string;
  campana: string;
  sinonimos: string[];
  detalle: string;
  /** AAAA-MM-DD, inclusive. Fuera de este rango la promoción no existe. */
  desde: string;
  hasta: string;
}

export interface BaseLab {
  examenes: ExamenKb[];
  sucursales: SucursalKb[];
  convenios: ConvenioKb[];
  temas: TemaKb[];
  promociones: PromocionKb[];
}

export type TipoCandidato = "examen" | "sucursal" | "convenio" | "tema" | "promocion";

export interface Candidato {
  tipo: TipoCandidato;
  id: string;
  nombre: string;
  estado: EstadoKb;
  score: number;
  datos: Record<string, unknown>;
}

/** Tope de candidatos por consulta: más que esto es ruido para el modelo. */
export const LIMITE_KB = 6;
/** Debajo de esto no se parece: mejor "no está" que un examen cualquiera. */
export const PUNTAJE_MINIMO = 0.3;
/** Lo que ve el modelo en `precio` cuando el examen se hace pero su precio de hoy no está confirmado. */
export const PRECIO_SIN_CONFIRMAR = "sin confirmar";

// ── Normalización ───────────────────────────────────────────────────────────

export function normalizarKb(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Las mismas del hub (kb_limpiar) más las que se ven en los chats del lab.
const MULETILLAS = new Set(
  (
    "hola buenas buenos buen dia dias tardes noches disculpe disculpa porfa porfavor favor gracias " +
    "cuanto cuanta cuantos cuantas cuesta cuestan costo costos vale valen sale salen precio precios cobran " +
    "el la los las lo un una unos unas de del al a en y e o u que quiero queria quisiera necesito saber " +
    "info informacion me mi mis se su sus le es son para por con tienen tiene hay hacen realizan puedo puede " +
    "como cual cuales este esta eso esa ese si ya tambien pero ok usted ustedes examen examenes prueba pruebas " +
    "consulta consultar pregunta preguntar valor"
  ).split(" "),
);

/** Normaliza y saca muletillas. Si no queda nada, se queda con lo normalizado. */
export function limpiarKb(s: string): string {
  const n = normalizarKb(s);
  const limpio = n
    .split(" ")
    .filter((p) => p && !MULETILLAS.has(p))
    .join(" ");
  return limpio || n;
}

// ── Trigramas (como pg_trgm) ────────────────────────────────────────────────

function trigramas(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of s.split(" ")) {
    if (!w) continue;
    const p = `  ${w} `;
    for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let comun = 0;
  for (const t of a) if (b.has(t)) comun++;
  return comun / (a.size + b.size - comun);
}

/** Qué tanto se parecen dos textos enteros. */
export function similitud(a: string, b: string): number {
  return jaccard(trigramas(a), trigramas(b));
}

/**
 * Qué tanto aparece `a` dentro de `b`: el mejor tramo seguido de palabras de
 * `b` comparado con `a`. "glucosa" contra "glucosa post prandial" da 1.
 */
export function similitudEnTexto(a: string, b: string): number {
  const ta = trigramas(a);
  const palabras = b.split(" ").filter(Boolean);
  let mejor = 0;
  for (let i = 0; i < palabras.length; i++) {
    for (let j = i + 1; j <= palabras.length; j++) {
      mejor = Math.max(mejor, jaccard(ta, trigramas(palabras.slice(i, j).join(" "))));
    }
  }
  return mejor;
}

function contienePalabra(texto: string, palabra: string): boolean {
  return ` ${texto} `.includes(` ${palabra} `);
}

/** El puntaje de un término contra la consulta, con las reglas de kb_buscar. */
export function puntaje(termino: string, consulta: string): number {
  if (!termino || !consulta) return 0;
  if (termino === consulta) return 1;
  if (termino.length <= 4 || consulta.length <= 4) {
    if (termino.length <= 4 && contienePalabra(consulta, termino)) return 0.9;
    if (consulta.length <= 4 && contienePalabra(termino, consulta)) return 0.8;
    return 0;
  }
  return Math.max(similitudEnTexto(termino, consulta), similitudEnTexto(consulta, termino));
}

// ── Lo que ve el modelo ─────────────────────────────────────────────────────

/** Sin fuente ni notas: eso es para quien mantiene la base, no para el paciente. */
function sinInterno<T extends ConFuente>(x: T): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fuente, notas, ...resto } = x as T & { sinonimos?: unknown };
  delete (resto as { sinonimos?: unknown }).sinonimos;
  return Object.fromEntries(Object.entries(resto).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

const CAMPOS_SIN_CONFIRMAR = ["id", "tipo", "nombre", "estado", "respuestaFija", "preguntaAclaracion"];

/**
 * Lo único que viaja de un dato que NO está vigente: su nombre, su estado y
 * la frase fija si la hay. Lo que no se puede decir no se le pasa al modelo,
 * así no depende de que lea bien el estado (lección del hub con la citología).
 */
export function datosParaElModelo(estado: EstadoKb, datos: Record<string, unknown>): Record<string, unknown> {
  if (estado === "vigente") return datos;
  return Object.fromEntries(Object.entries(datos).filter(([k]) => CAMPOS_SIN_CONFIRMAR.includes(k)));
}

function vigenteHoy(p: PromocionKb, hoy: string): boolean {
  return p.desde <= hoy && hoy <= p.hasta;
}

/** Busca en la base. `hoy` en AAAA-MM-DD, hora de El Salvador. */
export function buscarEnBase(base: BaseLab, consulta: string, hoy: string, limite = LIMITE_KB): Candidato[] {
  const q = limpiarKb(consulta);
  if (!q) return [];
  const candidatos: Candidato[] = [];
  const puntuar = (terminos: string[]) =>
    terminos.reduce((m, t) => Math.max(m, puntaje(limpiarKb(t), q)), 0);

  for (const e of base.examenes) {
    const s = puntuar([e.nombre, ...e.sinonimos]);
    if (s < PUNTAJE_MINIMO) continue;
    const datos = datosParaElModelo(e.estado, sinInterno(e));
    // Un examen que se hace pero sin precio confirmado lo dice con todas las
    // letras: un campo ausente el modelo lo puede leer como "no lo sé" o como
    // permiso para completarlo.
    if (e.estado === "vigente" && e.precio === undefined && e.tipo !== "servicio") datos.precio = PRECIO_SIN_CONFIRMAR;
    candidatos.push({ tipo: "examen", id: e.id, nombre: e.nombre, estado: e.estado, score: s, datos });
  }
  for (const su of base.sucursales) {
    const s = puntuar([su.nombre, ...su.sinonimos]);
    if (s >= PUNTAJE_MINIMO)
      candidatos.push({ tipo: "sucursal", id: su.id, nombre: su.nombre, estado: "vigente", score: s, datos: sinInterno(su) });
  }
  for (const c of base.convenios) {
    const s = puntuar([c.nombre, ...c.sinonimos]);
    if (s >= PUNTAJE_MINIMO)
      candidatos.push({ tipo: "convenio", id: c.id, nombre: c.nombre, estado: c.estado, score: s, datos: datosParaElModelo(c.estado, sinInterno(c)) });
  }
  for (const t of base.temas) {
    const s = puntuar([t.nombre, ...t.sinonimos]);
    if (s >= PUNTAJE_MINIMO)
      candidatos.push({ tipo: "tema", id: t.id, nombre: t.nombre, estado: "vigente", score: s, datos: sinInterno(t) });
  }
  for (const p of base.promociones) {
    if (!vigenteHoy(p, hoy)) continue;
    const s = puntuar([p.campana, ...p.sinonimos]);
    if (s >= PUNTAJE_MINIMO)
      candidatos.push({ tipo: "promocion", id: p.id, nombre: p.campana, estado: "vigente", score: s, datos: sinInterno(p) });
  }

  // A igual puntaje gana el de nombre más parecido a lo que preguntaron:
  // "glucosa" calza igual con la curva (que la trae de sinónimo) que con la
  // glucosa sola, y la que buscaban es la sola.
  const porNombre = new Map(candidatos.map((c) => [c, similitud(limpiarKb(c.nombre), q)]));
  return candidatos
    .sort(
      (a, b) =>
        b.score - a.score ||
        (porNombre.get(b) ?? 0) - (porNombre.get(a) ?? 0) ||
        a.nombre.localeCompare(b.nombre),
    )
    .slice(0, limite)
    .map((c) => ({ ...c, score: Math.round(c.score * 100) / 100 }));
}

/**
 * El JSON que recibe el modelo. Sin resultados también es una respuesta: se
 * le dice que no está, para que no lo complete con lo que suene razonable.
 * La consulta no se devuelve: lo que respalda una cifra tiene que venir de la
 * base, no de lo que el modelo escribió al buscar.
 */
export function respuestaDeBusqueda(base: BaseLab, consulta: unknown, hoy: string): string {
  const q = String(consulta ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!q) return JSON.stringify({ error: "Falta qué buscar.", resultados: [] });
  const resultados = buscarEnBase(base, q, hoy);
  if (resultados.length === 0) {
    return JSON.stringify({
      resultados: [],
      nota: "No está en la base. No lo inventes: aplica CUANDO NO SABES ALGO.",
    });
  }
  return JSON.stringify({ resultados });
}
