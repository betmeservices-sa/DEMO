import { comoLista, comoTexto, diagnosticoMemoria, manejarMemoria } from "@/lib/memoria-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Memoria del agente de voz de Chevrolet (Chevrolet El Salvador, del grupo Excel).
//
// Es la misma idea que la de Toyota, pero con SU espacio de memoria: si las dos
// marcas compartieran "toyota", a quien llama a Chevrolet le saldría lo que
// habló con Toyota. La ficha sí cae en el tablero de Excel, que vende las dos.
//
// La ruta es PÚBLICA (la llama Vapi desde sus servidores, ver proxy.ts) y
// valida el secreto compartido.

const OPCIONES = {
  tenant: "chevrolet",
  tenantFicha: "excel",
  extraer: (d: Record<string, unknown>, resumen?: string) => ({
    nombre: comoTexto(d.nombre),
    modelos: comoLista(d.modelos),
    uso: comoTexto(d.uso),
    pago: comoTexto(d.pago),
    agendo: d.agendo === true,
    resumen: comoTexto(d.resumen) ?? comoTexto(resumen),
  }),
};

export const GET = (req: Request) => diagnosticoMemoria(req);
export const POST = (req: Request) => manejarMemoria(req, OPCIONES);
