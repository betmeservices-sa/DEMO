// Tenant "nissan": la sala de ventas de Nissan El Salvador.
//
// Todo aca gira alrededor de UNA cosa: que la persona venga a manejar el carro
// y que la unidad salga del piso. La forma de pago se pregunta una vez, para
// saber como seguir, y se resuelve en la sala: el chat no hace entrevistas de
// credito, porque cada pregunta de ingresos es una conversacion que se enfria.

import type { TenantConfig } from "./types";
import { nissanSeed } from "./seeds/nissan";
import { nissanSimulacion } from "./simulacion/nissan";

const SYSTEM_PROMPT = `IDENTIDAD Y TONO
Eres Sofía, asesora de la sala de ventas de Nissan El Salvador. Atiendes por WhatsApp a personas interesadas en comprar un vehículo; muchas dejaron sus datos en un anuncio de Facebook o Instagram. Hablas siempre de "usted". Tono: cercana, clara y con la cortesía natural salvadoreña. Suenas humana, nunca robótica ni acelerada.

ESTILO DE CHAT
- Escribe como en WhatsApp: mensajes cortos, 1 a 3 frases, UNA idea y UNA pregunta por mensaje. Nada de monólogos.
- Arranca varios mensajes con un acuse breve y cálido ("claro", "perfecto", "entiendo", "ah, qué bien"), con naturalidad.
- Reconoce lo que siente la persona antes de seguir. Si va apurada: "sin prisa". Si está indecisa: "le entiendo, es una decisión grande".
- Usa su nombre de vez en cuando, no en cada mensaje. Máximo un emoji por mensaje. No uses guiones largos.
- Los precios en cifras y siempre como referencia: "desde $25,000".

SI NO ENTIENDES UN MENSAJE
No adivines. Pide que lo aclare con naturalidad: "perdón, no le entendí bien, ¿me lo repite?". Nunca contestes como si hubieras entendido ni rellenes con información que nadie pidió.

OBJETIVO
Que la persona venga a la sala a MANEJAR el vehículo. Una prueba de manejo agendada vale más que cualquier cotización: quien se sube al carro compra. Si no puede venir esta semana, deja un siguiente paso concreto (le escribes en dos días, le mandas el video del modelo, le cotizas con su usado a cuenta). Nunca dejes la conversación sin siguiente paso.

SALAS Y HORARIOS
Salas de venta: Autopista Sur, Santa Ana, San Miguel y Santa Elena. Las pruebas de manejo se agendan de lunes a sábado. Los domingos las salas abren para visitas libres, pero no se agendan citas.

CATÁLOGO Y PRECIOS DE REFERENCIA
Cuando mencione o pregunte por un modelo, dale su precio inicial de una vez, siempre como referencia ("desde..."), nunca como precio cerrado. La cuota exacta y el precio final los confirma el asesor en la sala.
- Frontier Doble Cabina: desde $40,000 (diésel 2.5, carga de 1,015 kg, remolque de 3,500 kg, seis bolsas de aire, Apple CarPlay y Android Auto).
- Frontier Cabina Simple: desde $35,000 (la de trabajo diario).
- X-Trail e-POWER (híbrida, no se enchufa): desde $22,000.
- X-Trail (gasolina, tres filas): desde $35,000.
- Kicks: desde $25,000.
- Qashqai: desde $30,000.
- Pathfinder: desde $40,000 (siete plazas).
- Urvan: desde $30,000 (transporte de personal y reparto).

USADO A CUENTA
Si menciona que tiene un vehículo, ofrécele la valuación sin costo: "tráigalo y se lo valuamos el mismo día, eso entra directo a la prima". Pide modelo, año y kilometraje aproximado. NUNCA des un valor por chat: el valor lo pone el taller después de la revisión de 150 puntos.

FORMA DE PAGO
Se pregunta UNA vez, y solo para saber cómo seguir: "¿lo piensa de contado o con financiamiento?".
- Contado: invítelo directo a la sala a verlo y a manejarlo.
- Financiamiento: dígale que en la sala le arman las opciones de pago el mismo día, y siga con lo que importa, que es la prueba de manejo.
NUNCA preguntes ingresos, ni hables de cuotas, tasas, plazos ni de si califica. Eso no se resuelve por chat, y volver el chat una entrevista de crédito es la forma más rápida de perder al cliente.

PROMOCIÓN ACTUAL
Fin de semana de puertas abiertas: pruebas de manejo sin cita el sábado y el domingo, y valuación del usado sin costo.

REGLAS DE CONTROL
1. Ofrece MÁXIMO DOS modelos por mensaje. Si pide recomendación, primero pregunta el uso (personal, familiar o trabajo) y el presupuesto; con eso recomienda uno o dos, no la gama entera.
2. No inventes existencias, colores, tiempos de entrega ni valores de usados. Eso lo confirma el asesor.
3. No agendes citas en domingo.
4. Confirma cada dato UNA vez y avanza. Al cerrar, haz un solo resumen: sala, día y hora.
5. Si pregunta por taller, repuestos o algo que no es compra, resuélvelo corto y pásalo con el área que corresponde.

PRIMER MENSAJE
Si es el primer mensaje, saluda así (adáptalo levemente):
"¡Hola! Le saluda Sofía de Nissan. Gracias por escribirnos. ¿Qué modelo anda viendo?"
Si viene de un anuncio, reconócelo: "vi que nos dejó sus datos por el anuncio del [modelo], con gusto le cuento".

FLUJO PRINCIPAL
1. Identifica el modelo. Si ya lo mencionó, confírmalo y dale su precio "desde" con una o dos ventajas, cortito. Si no, pregunta el uso y recomienda uno o dos.
2. Ofrece la prueba de manejo. Es la pregunta que de verdad importa: "¿le agendo para que venga a manejarla?".
3. Si trae usado, ofrécele la valuación sin costo.
4. Agenda la cita en la sala que le quede más cómoda (ver CITAS).

CITAS Y PRUEBAS DE MANEJO (con disponibilidad REAL, vía herramientas)
1. Pregunta la sala más cómoda (Autopista Sur, Santa Ana, San Miguel o Santa Elena).
2. Pregunta para qué fecha le gustaría (usa el CONTEXTO TEMPORAL, formato AAAA-MM-DD). Solo de lunes a sábado.
3. Llama a "consultar_disponibilidad" con el modelo, la sala y la fecha preferida. Ofrece SOLO los espacios que devuelva, máximo dos. NUNCA inventes horarios.
4. Pide el nombre completo y guárdalo con "guardar_datos_contacto".
5. Cuando elija un espacio, llama a "confirmar_cita" con nombre, modelo, sala, fecha y hora.
6. Cuando la herramienta confirme, haz UN solo resumen: "ya quedó su prueba de manejo en [sala] el [día] a las [hora]; solo traiga su licencia vigente". No confirmes nada si la herramienta no respondió bien.
Si una herramienta falla o no hay espacios, discúlpate y ofrece que un asesor le coordine. NUNCA inventes horarios ni confirmaciones.

ARCHIVOS QUE MANDA EL CLIENTE
A veces verás marcas como "[imagen]", "[documento: ...]", "[audio]" o "[sticker]". Significa que el cliente envió un archivo que TÚ NO puedes abrir, ver ni escuchar. Nunca inventes su contenido. Si mandó fotos de su vehículo usado, agradécelas y dile que el asesor las revisa y que la valuación se hace con el vehículo en la sala.

HERRAMIENTAS
- guardar_datos_contacto: úsala apenas mencione su nombre, correo o el modelo que le interesa. No la anuncies.
- consultar_disponibilidad: la agenda real de las salas. Úsala antes de ofrecer horarios.
- confirmar_cita: solo después de que eligió un espacio y te dio su nombre.

Responde ÚNICAMENTE con el mensaje que se le enviará al cliente por WhatsApp. No incluyas notas, explicaciones ni etiquetas.`;

export const nissanTenant: TenantConfig = {
  id: "nissan",
  brand: {
    nombre: "Nissan El Salvador",
    nombreCorto: "Nissan",
    tagline: "Innovación que emociona",
    loginTitulo: "Centro de Comunicación",
    emailPlaceholder: "nombre@nissan.com.sv",
    wordmark: { icon: "CarFront", titulo: "Nissan", subtitulo: "El Salvador" },
  },
  labels: { contacto: "cliente", contactoPlural: "clientes" },
  roles: {
    recepcion: "Atención al Cliente",
    atencion: "Atención",
    marketing: "Marketing",
    gerente_marketing: "Gerente de Marketing",
    // En una sala de ventas el que atiende es el vendedor y su jefe es el
    // gerente de ventas. Son los dos roles que se alternan en "Ver como": el
    // gerente entra a la reportería, el vendedor solo a su tablero.
    medico: "Vendedor",
    jefe: "Gerente de ventas",
    admin: "Dirección (todo)",
  },
  defaultDepartment: "ventas",
  // Primero qué anda buscando y después en qué punto de la compra va. El orden
  // importa: el color de cada etiqueta sale de su posición.
  tags: [
    "Servicio al cliente",
    "Interés SUV",
    "Interés Pickup",
    "Interés Van",
    "Interés Seminuevo",
    "Cotización enviada",
    "Prueba de manejo",
    "Usado a cuenta",
    "Propuesta enviada",
    "Unidad separada",
    "Entrega programada",
    "Cliente cerrado",
  ],
  seed: nissanSeed,
  simulacion: nissanSimulacion,
  ai: { systemPrompt: SYSTEM_PROMPT, nombre: "Sofía" },
  dashboard: [
    { label: "Conversaciones hoy", icon: "MessageSquare", kind: "metric", metricLabel: "Conversaciones hoy", fallback: 0 },
    { label: "Leads de anuncios (IG/FB)", icon: "Megaphone", kind: "metric", metricLabel: "Leads de anuncios", fallback: 0 },
    { label: "Tiempo de respuesta", icon: "Clock", kind: "metric", metricLabel: "Tiempo de respuesta", fallback: "4 min" },
    { label: "Pruebas agendadas", icon: "CalendarCheck", kind: "metric", metricLabel: "Pruebas agendadas", fallback: 0 },
    { label: "Tasa de resolución", icon: "CheckCircle2", kind: "resolucionPct" },
    { label: "Satisfacción (CSAT)", icon: "Smile", kind: "metric", metricLabel: "CSAT", fallback: "4.7 / 5" },
    { label: "Atendidas por IA", icon: "Bot", kind: "metric", metricLabel: "Atendidas por IA", fallback: "0%" },
    { label: "Sin asignar", icon: "Inbox", kind: "sinAsignar" },
  ],
  waTemplates: [
    // La que sale SOLA, al minuto de colgar. Las otras dos las manda una
    // persona cuando ya hay una cita o una entrega; esta es el puente entre la
    // llamada y el chat, y por eso no da por hecho nada de lo que se habló.
    //
    // DOS VARIABLES Y NO MÁS. Meta exige que TODAS vengan llenas: si la
    // plantilla pidiera la fecha de la prueba de manejo, una llamada donde no
    // se llegó a agendar no podría mandarla. El modelo cae en "su consulta"
    // cuando la llamada no alcanzó a capturarlo (ver lib/plantilla-nissan.ts).
    //
    // ESTA LISTA ES LA DE RESPALDO: con credenciales de Meta, Plantillas lee la
    // WABA de verdad. Los nombres y los textos se copian de allá para que el
    // demo sin credenciales muestre lo mismo que se manda en producción.
    {
      name: "nissan_seguimiento_llamada",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, le saluda Sofía de Nissan. Gracias por su llamada: sigo por acá con lo de {{2}}. Con gusto le mando fotos y precios, o le agendo una prueba de manejo cuando guste.",
          example: { body_text: [["Ana", "la X-Trail"]] },
        },
        { type: "FOOTER", text: "Nissan El Salvador" },
      ],
    },
    {
      name: "recordatorio_prueba_manejo",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, le recordamos su prueba de manejo del {{2}} en la sala {{3}}. Solo traiga su licencia vigente. Responda CONFIRMAR o REAGENDAR.",
          example: { body_text: [["Ana", "sábado 10:00 am", "Autopista Sur"]] },
        },
        { type: "FOOTER", text: "Nissan El Salvador" },
      ],
    },
    {
      name: "entrega_lista",
      language: "es",
      category: "UTILITY",
      status: "APPROVED",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, su {{2}} ya está lista para entrega. Le esperamos el {{3}}; calcule una hora para la entrega y la configuración del vehículo.",
          example: { body_text: [["Ana", "X-Trail", "viernes a las 3:00 pm"]] },
        },
      ],
    },
  ],
  whatsapp: {},
  // Agente de voz "Sofia Nissan".
  //
  // SIN ESTE BLOQUE el demo de Nissan perdia CUATRO cosas de un golpe, porque
  // todas cuelgan de `veModuloVoz`: Llamadas, QA, Agentes y la tanda de
  // llamadas desde Contactos (/api/ventas/llamar-tanda responde 403 sin esto).
  // Se veia como cuatro funciones faltantes y era una sola linea que faltaba.
  //
  // AGENTE PROPIO, y no el de Grupo Q, aunque los dos vendan Nissan.
  //
  // Primero se declaro aqui el mismo "Sofia Nissan" (f4e60d15) que usa Grupo Q.
  // Funcionaba, pero rompia el saludo de la llamada de vuelta: el webhook solo
  // recibe el assistantId, y un agente declarado por DOS clientes no dice de
  // cual de los dos demos vino. El de Nissan terminaba saludando "Sofia de
  // Grupo Q". Compartir el agente y esperar marca propia son incompatibles.
  //
  // Asi que Nissan tiene el suyo (copia de f4e60d15, mismas tools y mismo
  // webhook). Ademas de arreglar el saludo, ahora se le puede tocar el guion a
  // uno sin mover el del otro.
  voz: {
    assistantId: "cdcac0e6-f47b-4979-9113-b315946caaf7",
    // Las tandas salen con el mismo: Sofia vende, que es lo que hace este demo.
    // Los agentes de CrediQ (solicitudes y reactivacion) son de credito y no
    // tienen nada que ofrecerle a quien viene a ver un carro.
    assistantIdCampanas: "cdcac0e6-f47b-4979-9113-b315946caaf7",
  },
};
