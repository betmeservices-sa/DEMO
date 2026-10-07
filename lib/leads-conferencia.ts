// Los leads de las landings de conferencia de miagentia.com (/sandra y
// /andrea): quien deja sus datos en el formulario y quien pide la llamada demo
// con Sofia. Los guarda el sitio de miagentia.com en `public.miagentia_leads`
// (mismo Supabase que este panel) y aca solo se leen.
//
// Este archivo es PURO (tipos, cuentas, filtro y CSV) para poder probarlo y
// usarlo desde la pagina. La lectura de la base vive en
// lib/leads-conferencia-store.ts, que corre solo en el servidor.

import { TZ } from "./formato-agencia";

export type TipoLead = "datos" | "llamada-demo";

export interface LeadConferencia {
  id: string;
  creado_en: string;
  tipo: TipoLead;
  asesora: string | null;
  landing: string | null;
  origen: string | null;
  nombre: string;
  empresa: string | null;
  cargo: string | null;
  telefono: string | null;
  correo: string | null;
  interes: string | null;
  mensaje: string | null;
  consentimiento: boolean | null;
  utm: Record<string, string> | null;
}

export const TIPO_LEAD: Record<TipoLead, string> = {
  datos: "Dejó sus datos",
  "llamada-demo": "Pidió llamada demo",
};

const diaClave = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** "2026-10-07": el dia en El Salvador, para contar los de hoy sin caer en UTC. */
export function diaSV(fecha: string | Date): string {
  return diaClave.format(typeof fecha === "string" ? new Date(fecha) : fecha);
}

export interface ResumenLeads {
  total: number;
  hoy: number;
  datos: number;
  llamadas: number;
  /** De la que mas trajo a la que menos; los que no traen asesora no cuentan aca. */
  porAsesora: { asesora: string; total: number }[];
}

export function resumirLeads(leads: readonly LeadConferencia[], hoy: string): ResumenLeads {
  const porAsesora = new Map<string, number>();
  let deHoy = 0;
  let datos = 0;
  for (const l of leads) {
    if (diaSV(l.creado_en) === hoy) deHoy++;
    if (l.tipo === "datos") datos++;
    if (l.asesora) porAsesora.set(l.asesora, (porAsesora.get(l.asesora) ?? 0) + 1);
  }
  return {
    total: leads.length,
    hoy: deHoy,
    datos,
    llamadas: leads.length - datos,
    porAsesora: [...porAsesora]
      .map(([asesora, total]) => ({ asesora, total }))
      .sort((a, b) => b.total - a.total || a.asesora.localeCompare(b.asesora)),
  };
}

export interface FiltroLeads {
  asesora: string | "todas";
  tipo: TipoLead | "todos";
  texto: string;
}

export function filtrarLeads(leads: readonly LeadConferencia[], f: FiltroLeads): LeadConferencia[] {
  const q = f.texto.trim().toLowerCase();
  // Un numero se busca como se lee ("7539-1721") aunque este guardado como
  // "+50375391721": se comparan solo los digitos.
  const qDigitos = q.replace(/[^0-9]/g, "");
  return leads.filter((l) => {
    if (f.asesora !== "todas" && l.asesora !== f.asesora) return false;
    if (f.tipo !== "todos" && l.tipo !== f.tipo) return false;
    if (!q) return true;
    if (qDigitos.length >= 4 && (l.telefono ?? "").replace(/[^0-9]/g, "").includes(qDigitos)) return true;
    return [l.nombre, l.empresa, l.cargo, l.telefono, l.correo, l.interes, l.mensaje]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

/**
 * Como se lee el telefono en la pantalla. El Salvador sin codigo ("7539-1721"),
 * el resto de Centroamerica (502 a 507, todos de 8 digitos locales) con el
 * suyo ("+502 5788-1234") para no confundir el pais. Lo demas, como vino.
 */
export function telefonoDeLead(telefono: string | null): string {
  const crudo = (telefono ?? "").trim();
  const d = crudo.replace(/\D/g, "");
  if (d.length !== 11) return crudo;
  const local = `${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.startsWith("503")) return local;
  if (/^50[2-7]/.test(d)) return `+${d.slice(0, 3)} ${local}`;
  return crudo;
}

/** Lo que va despues de wa.me/: solo los digitos, con el codigo de pais que ya trae. */
export function whatsappDe(telefono: string | null): string | null {
  const d = (telefono ?? "").replace(/\D/g, "");
  return d.length >= 8 ? d : null;
}

const fechaCsv = new Intl.DateTimeFormat("es-SV", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function leadsACsv(leads: readonly LeadConferencia[]): string {
  const celda = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const cabecera = ["fecha_sv", "tipo", "asesora", "nombre", "empresa", "cargo", "telefono", "correo", "interes", "mensaje", "landing", "origen", "utm"];
  const filas = leads.map((l) =>
    [fechaCsv.format(new Date(l.creado_en)), TIPO_LEAD[l.tipo], l.asesora, l.nombre, l.empresa, l.cargo, l.telefono, l.correo, l.interes, l.mensaje, l.landing, l.origen, l.utm]
      .map(celda)
      .join(","),
  );
  return [cabecera.join(","), ...filas].join("\r\n");
}
