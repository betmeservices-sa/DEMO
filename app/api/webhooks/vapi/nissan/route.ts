import {
  comoLista,
  comoTexto,
  diagnosticoMemoria,
  manejarMemoria,
  type OpcionesMemoria,
} from "@/lib/memoria-webhook";
import { decidirSeguimiento } from "@/lib/plantilla-nissan";
import { anotarLlamadaEnEmbudo } from "@/lib/llamada-a-oportunidad";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Memoria del agente de voz de Nissan.
//
// Mismo criterio que toyota: se guarda qué modelos miró, para qué lo quiere y
// cómo pensaba pagarlo, porque en un concesionario esa es la información que
// sirve para retomar la conversación sin volver a preguntar todo.
//
// El tenant es lo único que cambia respecto de toyota, y tiene que ser distinto
// para que las dos marcas no se pisen la memoria del mismo teléfono: la misma
// persona puede haber llamado a las dos.
//
// POR ACÁ ENTRAN DOS AGENTES: "Sofia Nissan", que es de Grupo Q, y "Sofia
// Nissan El Salvador", que es del demo de Nissan. En qué tablero cae cada
// ficha lo decide el agente de la llamada (lib/tenants/voz.ts); `tenantFicha`
// es solo el respaldo para un agente que nadie declaró.
//
// La ruta es PÚBLICA (la llama Vapi desde sus servidores) y valida el secreto
// compartido.

const OPCIONES: OpcionesMemoria = {
  tenant: "nissan",
  tenantFicha: "grupoq",
  extraer: (d: Record<string, unknown>, resumen?: string) => ({
    nombre: comoTexto(d.nombre),
    modelos: comoLista(d.modelos),
    uso: comoTexto(d.uso),
    pago: comoTexto(d.pago),
    agendo: d.agendo === true,
    resumen: comoTexto(d.resumen) ?? comoTexto(resumen),
  }),
  // Al minuto de colgar sale el WhatsApp. Sofía cierra la llamada diciendo que
  // sigue por ahí, y hasta ahora no le escribía nadie.
  //
  // NO SE LE PASA `agendo`. En este agente eso significa "quedó una prueba de
  // manejo agendada", no "acepta que le escribamos": tomarlo como permiso
  // dejaría sin mensaje justo a quien no llegó a agendar, que es a quien hay
  // que seguir. Las razones para no mandar están en lib/plantilla-nissan.ts.
  seguimientoAgendado: (e, telefono) =>
    decidirSeguimiento({ nombre: e.nombre, modelos: e.modelos, telefono }),
  // Y el carro que dijo entra al EMBUDO, no solo a la memoria del agente.
  //
  // Sin esto, alguien llamaba, decía que anda viendo la Frontier y en el
  // tablero de ventas no aparecía por ningún lado; o aparecía sin modelo y sin
  // valor, que para el gerente es lo mismo que no existir.
  alColgar: ({ telefono, extracto, tenant }) =>
    anotarLlamadaEnEmbudo({
      tenant,
      telefono,
      nombre: extracto.nombre,
      modelos: extracto.modelos,
      actor: "llamada",
    }).then((r) => r.resumen),
};

export const GET = (req: Request) => diagnosticoMemoria(req);
export const POST = (req: Request) => manejarMemoria(req, OPCIONES);
