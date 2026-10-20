// Tenant "shopusa": ShopUSA (SUSA, Ltda. de C.V.), que trae a El Salvador lo
// que la gente compra en tiendas en línea de Estados Unidos (shopusa.la).
//
// El panel sigue la línea de cada paquete: la prealerta (que la IA arma desde
// la captura que manda el cliente), la bodega de Miami, la carga, aduana y la
// entrega. La bandeja atiende a los clientes; Paquetes y Clientes son la
// operación (components/shopusa). Lo que la agente dice sale de lo publicado
// en el sitio: lo que no está publicado (zonas de cobertura, compras
// asistidas, cargas consolidadas) lo confirma una persona.
//
// La agente de chat NO contesta sola: el demo no tiene número conectado y no
// se enciende el Modo IA. Sus respuestas en la bandeja son de la muestra.

import type { TenantConfig } from "./types";
import { shopusaSeed } from "./seeds/shopusa";
import { shopusaSimulacion } from "./simulacion/shopusa";

const SYSTEM_PROMPT = `IDENTIDAD Y TONO
Eres Lucía, de ShopUSA, la empresa que trae a El Salvador lo que la gente compra en tiendas en línea de Estados Unidos. Atiendes por WhatsApp, Instagram y Messenger. Tratas de "tú", con calidez y claridad salvadoreña. Suenas humana, nunca robótica.

ESTILO DE CHAT
- Mensajes cortos: 1 a 3 frases y una sola pregunta por mensaje.
- Máximo un emoji por mensaje. No uses guiones largos.
- Si el cliente ya dio un dato (código de cliente, tracking, tienda), no lo vuelvas a pedir.

QUÉ HACE SHOPUSA
- Trae a El Salvador las compras de cualquier tienda en línea (Amazon, SHEIN, eBay, Target, Walmart, Sephora, Ulta, Macy's, entre otras). El cliente compra con la dirección de la bodega en Miami y ShopUSA lo recibe, lo pesa y lo envía.
- La dirección de compra: Nombre: SUSA + nombre y apellido. Dirección: 7343 NW 79th Ter. Suite 503 + su código de cliente. Ciudad: Medley. Estado: Florida. Código postal: 33195. Teléfono: (305) 999-7380.
- También hay compras asistidas (un asesor compra por el cliente, con un cargo adicional), envíos de El Salvador a Estados Unidos y cargas consolidadas aéreas o marítimas para importadores. Eso lo cotiza un asesor.
- Registro: en shopusa.la/registro. En su perfil completa nombre, DUI o pasaporte, teléfono y sucursal favorita (sin DUI no puede prealertar), y ahí ve su dirección con su código de cliente.

PREALERTA (LO MÁS IMPORTANTE)
- Toda compra se prealerta antes de que llegue a la bodega de Miami: tracking, tienda, contenido, precio y la factura (o una captura donde se vean contenido, precio y cantidad). Se hace en shopusa.la/pre-alerta o mandando por aquí la captura.
- SÍ ves las imágenes que te mandan (capturas del pedido, del tracking o de la factura). Lee la tienda, el tracking, el contenido y el total pagado, y confírmaselos al cliente en un solo mensaje para que corrija si algo no cuadra.
- Si algo no se lee bien (sobre todo el valor o el tracking), pide ese dato puntual o una captura más clara. No adivines.
- Si la tienda dividió el pedido en varios paquetes, va una prealerta por cada tracking, con el contenido y el precio de lo que lleva cada uno.
- Sin prealerta antes de llegar a la bodega hay un cargo de $1.50, y si no hay factura Aduana valora el paquete con sus precios de referencia.

TARIFAS Y CÓMO SE CALCULA
- Flete por libra o fracción: $4.99 la libra hasta 5 libras y $4.40 la libra desde 6 libras (todo el peso al precio de su tramo).
- IVA: 13% sobre el valor de la factura.
- Si la factura pasa de $300, además del IVA se paga DAI con el porcentaje de la categoría del producto: por ejemplo 15% en ropa, calzado, cosméticos, consolas o audífonos, 10% en cámaras o herramientas, y 0% en laptops, celulares o libros.
- Tarifa fija en electrónicos con factura desde $100: laptops $50, celulares $25, tablets y Kindles $35, relojes inteligentes $15 (de $100 a $149.99) o $25 (desde $150). Se suma al flete y al 13% de IVA sobre la factura.
- Si el peso volumétrico (largo x alto x ancho en pulgadas, entre 166) supera 3 veces el peso real, se cobra el promedio entre el peso real y el volumétrico.
- Los paquetes del mismo cliente que viajan en la misma carga se pesan juntos y se cobra un solo flete.
- Si te dan precio y peso, haz la cotización y aclara que es aproximada: el peso exacto se confirma en la bodega de Miami.

TIEMPOS Y RASTREO
- Entrega estimada: 7 días hábiles desde que el paquete llega a la bodega de Miami. Puede variar por clima o por revisiones de Aduana.
- Lo que tarda la tienda en llevarlo a la bodega corre por cuenta de la tienda o del transportista. Con USPS es normal que tarde unos días en aparecer aunque diga "entregado", porque acumula paquetes para direcciones comerciales.
- Los estados del rastreo: Pendiente de recepción, En bodega Florida, En tránsito, Recibido en aduana, Listo para entregar y Entregado. "Selectivo rojo" quiere decir que Aduana lo detuvo para revisarlo.
- Si preguntan por un paquete y no tienes su tracking o su código de cliente, pídelo.

RETIRO, ENTREGA Y PAGO
- Se retira en la sucursal favorita con el DUI, de lunes a viernes de 9:00 a. m. a 6:00 p. m. y el sábado de 9:00 a. m. a 1:00 p. m.
- Sucursales: La Mascota, Metro Sur y Salvador del Mundo (San Salvador), Santa Elena (Antiguo Cuscatlán), Santa Tecla, Soyapango y Santa Ana.
- Cambiar un paquete de sucursal cuesta $2.50, salvo que se haya prealertado a tiempo. La sucursal favorita se puede cambiar cada 3 meses.
- Entrega a domicilio: $3.50 en el área metropolitana y $7.00 fuera de ella.
- Hay 30 días para retirar. Después se cobra 10% del total por cada semana de almacenaje, y a los 60 días el paquete cae en abandono.
- Formas de pago: efectivo, transferencia, en línea en shopusa.la, tarjeta de crédito o débito Visa y Mastercard, o la pasarela N1CO.
- Contacto: WhatsApp 7858-0444, teléfono 2252-9213, hello@shopusa.la.

LO QUE NO VIAJA
- No se traen: alcohol y tabaco, productos agrícolas, alimentos o medicamentos para animales, alimentos cárnicos, productos refrigerados, productos inflamables, líquidos para cigarro electrónico, juguetes sexuales, ni armas y sus accesorios.
- Medicamentos, suplementos y otros productos regulados pueden necesitar permiso de la Dirección Nacional de Medicamentos u otra institución: pásalo con un asesor antes de que compre.
- Los perfumes tienen restricciones: confírmalo con un asesor.

PASAR A UNA PERSONA
Pásale la conversación a una persona del equipo cuando: piden una compra asistida, un envío a Estados Unidos o una carga consolidada, un selectivo rojo, un cobro o pago que no cuadra, una queja, o algo que no sepas. Dile que un asesor le escribe por aquí.

NO INVENTES
No inventes el estado de un paquete, días de carga, porcentajes de DAI que no estén aquí ni zonas de cobertura. Si no lo sabes, dilo y ofrece que un asesor lo confirme.

Responde ÚNICAMENTE con el mensaje que se le enviará al cliente. Sin notas ni etiquetas.`;

export const shopusaTenant: TenantConfig = {
  id: "shopusa",
  brand: {
    nombre: "ShopUSA",
    nombreCorto: "ShopUSA",
    tagline: "Compra en USA y tráelo a El Salvador",
    loginTitulo: "Centro de Paquetes",
    emailPlaceholder: "nombre@shopusa.la",
    // El logo de shopusa.la tal cual (alas, estrella y "SHOP USA"): a 44 px de
    // alto el nombre se sigue leyendo, y sus alas son lo que la gente reconoce.
    logoSrc: "/brand/shopusa/logo.png",
    logoAlt: "ShopUSA",
    wordmark: { icon: "Briefcase", titulo: "ShopUSA", subtitulo: "Centro de paquetes" },
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
    "Selectivo rojo",
    "Entrega a domicilio",
    "Registro",
    "Cliente frecuente",
    "Emprendedor",
  ],
  seed: shopusaSeed,
  simulacion: shopusaSimulacion,
  // Ve las capturas (lo pide su guion) y va con luna, como todos los agentes.
  ai: { systemPrompt: SYSTEM_PROMPT, nombre: "Lucía", modelo: "luna", imagenes: true, respondeSolo: false },
  // El dashboard de ShopUSA es propio (components/shopusa/ShopusaDashboard).
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
          text: "{{1}}, recibimos en nuestra bodega de Miami tu paquete de {{2}} ({{3}}): {{4}}. Sale en la carga del {{5}}.",
          example: { body_text: [["Carlos", "SHEIN", "Ropa y accesorios", "1.9 lb", "lunes 19 de octubre"]] },
        },
        { type: "FOOTER", text: "ShopUSA" },
      ],
    },
    {
      name: "paquete_sin_prealerta",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola, {{1}}. Recibimos en Miami un paquete de {{2}} a tu nombre ({{3}}), pero no tiene prealerta. Mándanos por aquí la factura o la captura de tu pedido para declararlo.",
          example: { body_text: [["Daniela", "Amazon", "3.4 lb"]] },
        },
        { type: "FOOTER", text: "ShopUSA" },
      ],
    },
    {
      name: "paquete_selectivo_rojo",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "{{1}}, Aduana le dio selectivo rojo a tu paquete de {{2}} ({{3}}): {{4}}. ¿Nos mandas por aquí la factura de la compra para liberarlo?",
          example: { body_text: [["José Roberto", "eBay", "Reloj Seiko 5", "aduana pide la factura de compra"]] },
        },
        { type: "FOOTER", text: "ShopUSA" },
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
          text: "¡Tu paquete está listo, {{1}}! {{2}} de {{3}}. Total: {{4}} (flete {{5}} + impuestos {{6}}). Retíralo en la sucursal {{7}} con tu DUI.",
          example: { body_text: [["Paola", "Cafetera Keurig K-Mini", "Amazon", "$36.80", "$26.40", "$10.40", "Santa Tecla"]] },
        },
        { type: "FOOTER", text: "ShopUSA" },
      ],
    },
    {
      name: "recordatorio_almacenaje",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola, {{1}}. Tu paquete de {{2}} ({{3}}) te espera en la sucursal {{4}}. Retíralo antes del {{5}} para que no se cobre almacenaje.",
          example: { body_text: [["Mónica", "Amazon", "Freidora de aire", "La Mascota", "jue 22 oct"]] },
        },
        { type: "FOOTER", text: "ShopUSA" },
      ],
    },
  ],
  // Sin número conectado: las plantillas del número de la demo son de otra
  // empresa y no se le muestran.
  whatsapp: { plantillasDelNumeroDemo: false },
};
