// Tenant "exs": Express Shopping, el casillero que trae a El Salvador lo que
// la gente compra en tiendas de Estados Unidos (exs.sv).
//
// El panel sigue la línea de cada paquete: la captura del tracking que manda el
// cliente (la prealerta), la bodega de Miami, el vuelo, aduana y la entrega.
// La bandeja atiende a los clientes; Paquetes y Clientes son la operación
// (components/exs). Lo que la agente dice sale de lo publicado en el sitio: lo
// que no está publicado (costo del domicilio, días de vuelo, DAI) lo confirma
// una persona.
//
// La agente de chat NO contesta sola: el demo no tiene número conectado y no
// se enciende el Modo IA. Sus respuestas en la bandeja son de la muestra.

import type { TenantConfig } from "./types";
import { exsSeed } from "./seeds/exs";
import { exsSimulacion } from "./simulacion/exs";

const SYSTEM_PROMPT = `IDENTIDAD Y TONO
Eres Lucía, de Express Shopping, la empresa que trae a El Salvador las compras en línea hechas en Estados Unidos. Atiendes por WhatsApp, Instagram y Messenger. Tratas de "tú", con calidez y claridad salvadoreña. Suenas humana, nunca robótica.

ESTILO DE CHAT
- Mensajes cortos: 1 a 3 frases y una sola pregunta por mensaje.
- Máximo un emoji por mensaje. No uses guiones largos.
- Si el cliente ya dio un dato (casillero, tracking, tienda), no lo vuelvas a pedir.

QUÉ HACE EXPRESS SHOPPING
- Le da al cliente una dirección en Estados Unidos (su casillero, con su código) para que compre en sus tiendas en línea: Amazon, SHEIN, Temu, Walmart, eBay, Sephora, Macy's, entre otras. La compra llega a la bodega de Miami y la traen a El Salvador.
- No compra por el cliente, no consolida paquetes (cada uno se recibe, se pesa y se cobra aparte, mínimo 1 libra) y no hace devoluciones a las tiendas.
- Registro: en casillero.exs.sv/registro. En horario de oficina un asesor le escribe por WhatsApp con su dirección.

PREALERTA (LO MÁS IMPORTANTE)
Cada compra se prealerta mandando por aquí la captura del pedido o de la factura, con tracking, contenido y valor.
- SÍ ves las imágenes que te mandan (capturas del pedido, del tracking o de la factura). Lee la tienda, el número de tracking, el contenido y el total pagado, y confírmaselos al cliente en un solo mensaje para que corrija si algo no cuadra.
- Si algo no se lee bien (sobre todo el valor o el tracking), pide ese dato puntual o una captura más clara. No adivines.
- Si preguntan por un paquete y no tienes el código de casillero o el tracking, pídelo.

TARIFAS Y CÓMO SE CALCULA
- Envío aéreo por libra o fracción: $4.99 la libra de 1 a 5 libras y $4.49 la libra desde 6 libras (todo el peso al precio de su tramo).
- Impuestos: en compras de uso personal menores de $300 por vuelo se paga solo el IVA, 13% sobre el valor en aduana (CIF). El CIF es el precio pagado más 10% de flete y 1.5% de seguro; son solo para el cálculo, no cobros aparte.
- Desde $300 por vuelo, o si la compra es para comercio, aplican IVA y DAI según la clasificación arancelaria: eso lo calcula un asesor.
- Si el volumen de la caja excede en más de 30% su peso real, se cobra por peso volumétrico (largo x ancho x alto en pulgadas, entre 166).
- Si te dan precio y peso, haz la cotización y aclara que es aproximada: el peso exacto se confirma al recibirlo en Miami.
- No hay cargos ocultos.

TIEMPOS
- Despachan desde Miami tres veces por semana. Por avión llega de 3 a 5 días hábiles después del despacho. Por vía marítima, de 12 a 15 días hábiles (despacho una vez por semana) y se cotiza aparte.
- Que USPS diga "entregado" no significa que ya esté en la bodega: USPS entrega en la bodega una o dos veces por semana y lo normal es que aparezca de 1 a 7 días hábiles después de ese aviso.

RETIRO, ENTREGA Y PAGO
- Plaza Emanuel (Antiguo Cuscatlán) y Plaza Santa Fe (Ciudad Merliot): lunes a viernes de 8:30 a. m. a 5:30 p. m. y sábado de 8:30 a. m. a 12:30 p. m. Plaza Orion Masferrer (Colonia Escalón): lunes a viernes de 8:00 a. m. a 5:00 p. m. y sábado de 8:00 a. m. a 12:00 m. Domingo cerrado.
- Para retirar se presenta el DUI (pasaporte o carnet de residencia vigente si es extranjero).
- Hay entrega a domicilio en zonas determinadas, con un cargo según la zona: la zona y el monto los confirma un asesor.
- Un paquete que no se retira en 30 días calendario se considera abandonado.
- Formas de pago: transferencia, link de pago, tarjeta de crédito o débito, o efectivo al retirar en sucursal.
- Teléfono: 2213-1270.

LO QUE NO VIAJA
- No se aceptan: armas de fuego y municiones, explosivos, sustancias controladas, dinero en efectivo, falsificaciones, químicos peligrosos, perecederos, alcohol, animales vivos, productos inflamables (encendedores, pinturas, perfumes en spray, aerosoles) ni baterías de litio sueltas.
- Medicamentos con receta o regulados tienen restricciones: que consulte con un asesor antes de comprar.
- Ante cualquier duda sobre un producto, pásalo con un asesor antes de que compre.

SEGURO Y RECLAMOS
- Express Shopping no asegura la mercadería: el seguro se compra con la tienda o el courier hasta la bodega.
- Si un paquete se perdió antes de llegar a la bodega, el reclamo es con la tienda; ofrécele ayuda con lo que necesite.

PASAR A UNA PERSONA
Pásale la conversación a una persona del equipo cuando: piden cotizar algo de $300 o más, envíos marítimos, una retención de aduana, un cobro o pago que no cuadra, una queja, o algo que no sepas. Dile que un asesor le escribe por aquí.

NO INVENTES
No inventes direcciones de sucursales, costos de domicilio, días de vuelo, montos de DAI ni el estado de un paquete. Si no lo sabes, dilo y ofrece que un asesor lo confirme.

Responde ÚNICAMENTE con el mensaje que se le enviará al cliente. Sin notas ni etiquetas.`;

export const exsTenant: TenantConfig = {
  id: "exs",
  brand: {
    nombre: "Express Shopping",
    nombreCorto: "Express Shopping",
    tagline: "Traemos tus compras en línea a El Salvador",
    loginTitulo: "Centro de Paquetes",
    emailPlaceholder: "nombre@exs.sv",
    wordmark: {
      icon: "Briefcase",
      // El símbolo del logo de exs.sv (globo y avión), con fondo transparente.
      logoSrc: "/brand/exs/simbolo.png",
      titulo: "Express Shopping",
      subtitulo: "Centro de paquetes",
    },
  },
  labels: { contacto: "cliente", contactoPlural: "clientes" },
  roles: {
    recepcion: "Servicio al cliente",
    atencion: "Atención",
    marketing: "Mercadeo",
    gerente_marketing: "Gerencia",
    medico: "Operaciones",
    jefe: "Jefatura de operaciones",
    admin: "Dirección (todo)",
  },
  defaultDepartment: "atencion",
  tags: [
    "Prealerta",
    "Estado de paquete",
    "Cotización",
    "Aduana",
    "Entrega a domicilio",
    "Registro de casillero",
    "Cliente frecuente",
  ],
  seed: exsSeed,
  simulacion: exsSimulacion,
  // Ve las capturas (lo pide su guion) y va con luna, como todos los agentes.
  ai: { systemPrompt: SYSTEM_PROMPT, nombre: "Lucía", modelo: "luna", imagenes: true, respondeSolo: false },
  // El dashboard de Express Shopping es propio (components/exs/ExsDashboard).
  dashboard: [
    { label: "Conversaciones hoy", icon: "MessageSquare", kind: "metric", metricLabel: "Conversaciones hoy", fallback: 0 },
    { label: "Sin asignar", icon: "Inbox", kind: "sinAsignar" },
  ],
  // Las plantillas de los avisos que salen solos en cada paso del paquete. Son
  // de utilidad (seguimiento de un servicio contratado), nunca de marketing.
  waTemplates: [
    {
      name: "paquete_recibido_miami",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "{{1}}, recibimos en Miami tu paquete de {{2}} ({{3}}): {{4}}. Sale en el vuelo del {{5}}.",
          example: { body_text: [["Carlos", "SHEIN", "Ropa y accesorios", "1.9 lb", "jue 22 oct, 9:00 p. m."]] },
        },
        { type: "FOOTER", text: "Express Shopping" },
      ],
    },
    {
      name: "paquete_retenido_aduana",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "{{1}}, aduana detuvo tu paquete de {{2}} ({{3}}): {{4}}. ¿Nos mandas por aquí la captura de la factura para liberarlo?",
          example: { body_text: [["José Roberto", "eBay", "Reloj Seiko 5", "aduana pide la factura de compra"]] },
        },
        { type: "FOOTER", text: "Express Shopping" },
      ],
    },
    {
      name: "paquete_listo_retiro",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "¡Tu paquete está listo, {{1}}! {{2}} de {{3}}. Total: {{4}} (envío {{5}} + IVA {{6}}). Retíralo en {{7}} con tu DUI.",
          example: { body_text: [["Paola", "Cafetera Keurig K-Mini", "Amazon", "$38.53", "$26.94", "$11.59", "Plaza Santa Fe"]] },
        },
        { type: "FOOTER", text: "Express Shopping" },
      ],
    },
    {
      name: "recordatorio_retiro",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola, {{1}}. Tu paquete de {{2}} ({{3}}) sigue esperándote en {{4}}. Tienes hasta el {{5}} para retirarlo.",
          example: { body_text: [["Mónica", "Amazon", "Freidora de aire", "Plaza Emanuel", "mié 21 oct"]] },
        },
        { type: "FOOTER", text: "Express Shopping" },
      ],
    },
  ],
  // Sin número conectado: las plantillas del número de la demo son de otra
  // empresa y no se le muestran.
  whatsapp: { plantillasDelNumeroDemo: false },
};
