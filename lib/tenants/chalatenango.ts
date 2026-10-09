// Tenant "chalatenango": Caja de Credito de Chalatenango (Sistema Fedecredito).
//
// La bandeja unificada partida en las tres areas en que trabaja la Caja:
// consultas generales (que incluye a quien pregunta por credito), cobros y
// tarjetas de credito. Es el primer cliente con la cara "flotante": riel de
// iconos a la izquierda, las tres areas como pestanas arriba y tarjetas sobre
// un fondo verde muy tenue (components/shell/flotante).
//
// Marca REAL, leida de cajachalatenango.com.sv: verde #006341 y lima #C4D600
// de su hoja de estilos, Open Sans, y el simbolo de su favicon (256 px), que es
// el unico archivo con resolucion suficiente: el logotipo que publican es un
// PNG de 200x66 con fondo blanco.
//
// Lo que la agente afirma de la Caja (horarios, agencias, productos, canales)
// sale de su sitio. Tasas, montos y requisitos que no estan publicados NO se
// inventan: los confirma un asesor.
//
// La agente es ELENA en MODO DEMO, por voz y por WhatsApp (+503 6452 4233,
// conectado en wa_connections). Es la misma: si por WhatsApp le piden que
// llame, marca la Elena de voz desde el 2505-4608 (lib/llamar-por-pedido.ts),
// y si en la llamada piden seguir por WhatsApp, le llega la plantilla
// elena_continuar_demo (app/api/webhooks/vapi/chalatenango). Lo que se hablo
// por telefono le llega al guion de WhatsApp (lib/llamada-contexto.ts).
import type { TenantConfig } from "./types";
import { chalatenangoSeed } from "./seeds/chalatenango";
import { chalatenangoSimulacion } from "./simulacion/chalatenango";
import { CHALATENANGO_ASSISTANT_ID, NOMBRE_AGENTE, armarGuionChat } from "@/lib/chalatenango-agente";

// Elena de WhatsApp es la MISMA demo que la Elena de voz: el guion sale de
// lib/chalatenango-agente.ts (una sola fuente para los dos canales), escrito
// para chat. Ya no es el guion de atencion real: el numero de este panel es el
// de la demo.
const SYSTEM_PROMPT = armarGuionChat();

export const chalatenangoTenant: TenantConfig = {
  id: "chalatenango",
  brand: {
    nombre: "Caja de Crédito de Chalatenango",
    nombreCorto: "Caja de Crédito",
    tagline: "Sistema Fedecrédito",
    loginTitulo: "Centro de Atención",
    emailPlaceholder: "nombre@cajachalatenango.com.sv",
    logoComponent: "chalatenango",
  },
  labels: { contacto: "cliente", contactoPlural: "clientes" },
  roles: {
    recepcion: "Atención al socio",
    atencion: "Atención",
    marketing: "Mercadeo",
    gerente_marketing: "Gerencia de Negocios",
    medico: "Ejecutivo de negocios",
    jefe: "Jefatura de cobros",
    admin: "Gerencia general",
  },
  defaultDepartment: "consultas",
  tags: [
    "Horarios y agencias",
    "Ahorro",
    "Interés en crédito",
    "Cuota vencida",
    "Promesa de pago",
    "Pide arreglo de pago",
    "Solicitud de tarjeta",
    "Bloqueo de tarjeta",
    "Fedepuntos",
  ],
  seed: chalatenangoSeed,
  simulacion: chalatenangoSimulacion,
  // Luna, como todos los agentes de demo. Si contesta sola lo decide el
  // interruptor del numero (wa_connections.ia_activa) o el Modo IA del panel.
  // limiteMensajes: 40 porque es una demo de cuatro caminos de 4 a 8 mensajes
  // cada uno; con el tope de siempre (10) se pasaba a una persona a mitad del
  // segundo camino.
  ai: { systemPrompt: SYSTEM_PROMPT, nombre: NOMBRE_AGENTE, modelo: "luna", limiteMensajes: 40 },
  dashboard: [
    { label: "Consultas generales hoy", icon: "MessageSquare", kind: "metric", metricLabel: "Consultas generales hoy", fallback: 0 },
    { label: "Gestiones de cobro hoy", icon: "HandCoins", kind: "metric", metricLabel: "Gestiones de cobro hoy", fallback: 0 },
    { label: "Promesas de pago", icon: "CalendarCheck", kind: "metric", metricLabel: "Promesas de pago", fallback: 0 },
    { label: "Solicitudes de tarjeta", icon: "Wallet", kind: "metric", metricLabel: "Solicitudes de tarjeta", fallback: 0 },
    { label: "Atendidas por IA", icon: "Bot", kind: "metric", metricLabel: "Atendidas por IA", fallback: "0%" },
    { label: "Primera respuesta", icon: "Timer", kind: "metric", metricLabel: "Primera respuesta", fallback: "-" },
    { label: "Tasa de resolución", icon: "CheckCircle2", kind: "resolucionPct" },
    { label: "Sin asignar", icon: "Inbox", kind: "sinAsignar" },
  ],
  waTemplates: [
    {
      name: "recordatorio_cuota",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, le recordamos que la cuota de su {{2}} vence el {{3}}. Puede pagar en agencias, Fede Punto Vecino, Fede Banking o Fede Móvil. Si ya pagó, no tome en cuenta este mensaje.",
          example: { body_text: [["Marta", "crédito popular", "viernes 9 de octubre"]] },
        },
        { type: "FOOTER", text: "Caja de Crédito de Chalatenango" },
      ],
    },
    {
      name: "compromiso_pago_registrado",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, quedó registrado su compromiso de pago por {{2}} para el {{3}}. Gracias por confirmarlo.",
          example: { body_text: [["Marta", "$48.00", "viernes 9 de octubre"]] },
        },
        { type: "FOOTER", text: "Caja de Crédito de Chalatenango" },
      ],
    },
    {
      name: "presolicitud_tarjeta_recibida",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, recibimos su presolicitud de tarjeta de crédito. Un ejecutivo de negocios lo contactará para continuar el proceso.",
          example: { body_text: [["Gabriel"]] },
        },
        { type: "FOOTER", text: "Caja de Crédito de Chalatenango" },
      ],
    },
  ],
  whatsapp: {},
  // La agente de voz de demostracion: un guion maestro y cuatro caminos de
  // juego de roles (lib/chalatenango-agente.ts, se sube con
  // scripts/crear-agente-chalatenango.mjs). Contesta en la linea 2505-4608.
  // Es la misma Elena del WhatsApp: si ahi le piden "llameme", la llamada se
  // presenta como Elena, de la Caja, de usted, y el aviso por escrito dice de
  // que linea le entra.
  voz: {
    assistantId: CHALATENANGO_ASSISTANT_ID,
    nombre: NOMBRE_AGENTE,
    mismaAgente: { marca: "Caja de Crédito de Chalatenango", articulo: "la", agente: NOMBRE_AGENTE },
  },
  shell: "flotante",
  areas: ["consultas", "cobranza", "tarjetas"],
};
