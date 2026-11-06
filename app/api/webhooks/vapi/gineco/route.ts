import { FRASES_HOSPITAL } from "@/lib/memoria-llamadas";
import { extraerHospital, notaHospital } from "@/lib/memoria-hospital";
import { diagnosticoMemoria, manejarMemoria } from "@/lib/memoria-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Memoria de los agentes de voz del Hospital Centro Ginecológico (Recepción,
// Ultrasonografía y Laboratorio desde 2026-11-06, la misma para los tres).
//
// Guarda todo lo relevante de la llamada, pedido por el hospital: el motivo, los
// estudios o exámenes de los que se habló, la doctora que la atiende y si quedó
// una cita. Es lo mismo que anota una recepcionista cuando reconoce a una
// paciente que vuelve, y es lo que permite que la segunda llamada no empiece de
// cero. Qué se guarda y cómo se anota: lib/memoria-hospital.ts.
//
// La ruta es PÚBLICA (la llama Vapi desde sus servidores, ver middleware.ts) y
// valida el secreto compartido.

const OPCIONES = {
  tenant: "gineco",
  tenantFicha: "hospital",
  frases: FRASES_HOSPITAL,
  extraer: extraerHospital,
  nota: notaHospital,
};

export const GET = (req: Request) => diagnosticoMemoria(req);
export const POST = (req: Request) => manejarMemoria(req, OPCIONES);
