import type {
  Cita,
  Menu,
  Cliente,
  Conversacion,
  Plantilla,
  RangoInactividad,
  Reactivacion,
  Seguimiento,
  Visita,
  ResumenConsulta,
  Nota,
  Post,
  Campana,
  PlantillaWA,
  PlanId,
} from "./types";
import { diaCorto, fechaDe, iso, minutosDe, textoFecha } from "./format";

// Datos de demo de una agencia de nutrición ficticia en San Salvador. Todo lo
// que el agente "sabe" sale de CONOCIMIENTO: es la información aprobada por el
// equipo y nada más. Las fechas son relativas a hoy para que el demo no envejezca.

const hace = (n: number) => textoFecha(-n);

export const CLINICA = {
  nombre: "Balance Nutrición",
  corto: "Balance",
  ciudad: "San Salvador",
  agente: "MIA",
  /** Donde se dan las consultas presenciales (no es la dirección del paciente). */
  direccion: "Col. Flor Blanca, 45 Av. Norte #210, San Salvador",
  usuario: "balance.nutricion",
};

export const STAFF = {
  secretaria: { nombre: "Gabriela Ruiz", cargo: "Atención al cliente", iniciales: "GR", color: "#7c3aed" },
  nutricionista: { nombre: "Lda. Andrea Morales", cargo: "Nutricionista dietista", iniciales: "AM", color: "#15803d" },
  entrenador: { nombre: "Diego Castillo", cargo: "Entrenador personal", iniciales: "DC", color: "#0e7490" },
  reparto: { nombre: "Óscar Hernández", cargo: "Logística y entregas", iniciales: "OH", color: "#c2410c" },
} as const;

export const CALENDARIOS = {
  consultas: {
    nombre: "Agenda de Consultas · Lda. Morales",
    cuenta: "consultas@balancenutricion.com.sv",
    horario: "Lun a Vie 8:00–19:00 · Sáb 7:00–13:00",
  },
  entregas: {
    nombre: "Agenda de Entregas · Rutas a domicilio",
    cuenta: "entregas@balancenutricion.com.sv",
    horario: "Lun a Sáb 6:00–13:00",
  },
} as const;

export const CONOCIMIENTO = {
  consultas: [
    { servicio: "Consulta nutricional (presencial o en línea)", duracion: "60 min", precio: "Por definir" },
    { servicio: "Control de seguimiento", duracion: "30 min", precio: "Por definir" },
    { servicio: "Medición de composición corporal", duracion: "30 min", precio: "Por definir" },
    { servicio: "Menú personalizado, rutina y lista de compras", duracion: "Incluido en la consulta", precio: "Incluido" },
  ],
  entregas: [
    { servicio: "Plan Premium · 3 tiempos + 2 meriendas", duracion: "4 semanas · lun a sáb", precio: "Por definir" },
    { servicio: "Plan Two Meals · 2 tiempos + 2 meriendas", duracion: "4 semanas · lun a sáb", precio: "Por definir" },
    { servicio: "The Lunch · almuerzo a elegir", duracion: "Semanal · lun a sáb", precio: "Por definir" },
  ],
  digitales: [
    { servicio: "Reto Anti-inflamatorio", duracion: "Guía + menú + grupo", precio: "Por definir" },
    { servicio: "Reto de 21 días", duracion: "21 días", precio: "Por definir" },
    { servicio: "E-book de recetas", duracion: "PDF descargable", precio: "Por definir" },
  ],
  zonas: ["San Salvador (Escalón, San Benito, Miramonte, Colonia Médica, San Francisco)", "Antiguo Cuscatlán y Santa Elena", "Santa Tecla (Merliot)"],
  politicas: [
    "Las consultas presenciales son en la clínica: Col. Flor Blanca, 45 Av. Norte #210, San Salvador. Las en línea son por videollamada.",
    "Los planes incluyen consulta con la nutricionista y rutina de entrenamiento.",
    "Las entregas de los planes salen de 6:00 a 9:00; las de The Lunch de 11:00 a 13:00.",
    "Cambios de menú o de dirección: con 24 h de anticipación.",
    "The Lunch: el cliente elige su almuerzo de cada día; se pide la elección el sábado anterior.",
    "Pagos con enlace Wompi o transferencia. El descuento por transferencia lo confirma el equipo.",
    "MIA no da dietas, porciones ni indicaciones de salud: eso lo hace la nutricionista.",
  ],
};

const plan = (p: PlanId, inicio: number, zona: string, direccion: string, horaEntrega: string, semanas = 4) => ({ plan: p, inicio, semanas, zona, direccion, horaEntrega });

export const CLIENTES: Cliente[] = [
  { id: "c1", nombre: "María José Pérez", telefono: "+503 7512 3344", correo: "mariajose.perez@gmail.com", canal: "whatsapp", edad: 34, sexo: "F", objetivo: "Bajar grasa corporal sin perder músculo", modalidad: "presencial", alergias: ["nueces"], fechaNacimiento: "1992-04-18", alturaCm: 165, plan: plan("premium", -16, "Escalón", "Col. Escalón, 79 Av. Norte #412", "06:20"), etiquetas: ["Cliente frecuente"] },
  { id: "c2", nombre: "Jorge Alvarado", telefono: "+503 7421 9087", correo: "jorge.alvarado@hotmail.com", canal: "whatsapp", edad: 41, sexo: "M", objetivo: "Ganar masa muscular", modalidad: "presencial", plan: plan("two_meals", -9, "San Benito", "Col. San Benito, Calle La Reforma #233", "06:40"), alergias: ["lacteos"], restricciones: ["Sin lácteos"] },
  { id: "c3", nombre: "Ana Lucía Rivera", telefono: "+503 6098 7765", correo: "analucia.rivera@yahoo.com", canal: "whatsapp", edad: 29, sexo: "F", objetivo: "Comer mejor en la oficina", modalidad: "en_linea", plan: plan("the_lunch", -3, "Escalón", "Torre Futura, nivel 14", "11:20", 1) },
  { id: "c4", nombre: "Roberto Gálvez", telefono: "+503 7590 1123", correo: "roberto.galvez@outlook.com", canal: "facebook", edad: 52, sexo: "M", objetivo: "Controlar la glucosa (prediabetes) y bajar de peso", modalidad: "en_linea", plan: plan("premium", -12, "Santa Elena", "Urb. Santa Elena, Calle Cortez Blanco #18", "07:00"), restricciones: ["Bajo en azúcar"] },
  { id: "c5", nombre: "Sofía Herrera", telefono: "+503 7789 2210", correo: "sofia.herrera@gmail.com", canal: "whatsapp", edad: 26, sexo: "F", objetivo: "Mejorar hábitos y energía", modalidad: "presencial" },
  { id: "c6", nombre: "Daniel Ortiz", telefono: "+503 7023 4471", correo: "daniel.ortiz@hotmail.com", canal: "whatsapp", edad: 38, sexo: "M", objetivo: "Bajar 8 kg", modalidad: "presencial", plan: plan("two_meals", -8, "Miramonte", "Col. Miramonte, Calle Toluca #51", "07:20") },
  { id: "c7", nombre: "Gabriela Rivas", telefono: "+503 6345 8890", correo: "gabriela.rivas@yahoo.com", canal: "whatsapp", edad: 45, sexo: "F", objetivo: "Bajar grasa y desinflamar", modalidad: "presencial", plan: plan("two_meals", -30, "San Francisco", "Col. San Francisco, Av. Las Camelias #9", "06:00") },
  { id: "c8", nombre: "Luis Fernando Argueta", telefono: "+503 7612 7789", correo: "luisfernando.argueta@outlook.com", canal: "instagram", edad: 31, sexo: "M", objetivo: "Rendimiento deportivo", modalidad: "en_linea" },
  { id: "c9", nombre: "Carmen Estrada", telefono: "+503 7534 0012", correo: "carmen.estrada@gmail.com", canal: "whatsapp", edad: 33, sexo: "F", objetivo: "Alimentación saludable en el embarazo", modalidad: "presencial", productos: ["E-book de recetas"] },
  { id: "c10", nombre: "Pedro Juárez", telefono: "+503 7098 5521", correo: "pedro.juarez@hotmail.com", canal: "facebook", edad: 47, sexo: "M", objetivo: "Bajar colesterol y peso", modalidad: "presencial", alergias: ["mariscos"], plan: plan("premium", -20, "San Francisco", "Col. San Francisco, Calle Los Abetos #120", "06:00") },
  { id: "c11", nombre: "Valeria Monzón", telefono: "+503 6321 6654", correo: "valeria.monzon@yahoo.com", canal: "whatsapp", edad: 27, sexo: "F", objetivo: "Tonificar", modalidad: "presencial", plan: plan("the_lunch", -5, "Colonia Médica", "Hospital de Diagnóstico, torre 2", "11:40", 1) },
  { id: "c12", nombre: "Héctor Pineda", telefono: "+503 7876 4432", correo: "hector.pineda@outlook.com", canal: "whatsapp", edad: 58, sexo: "M", objetivo: "Bajar la presión y el peso", modalidad: "presencial" },
  { id: "c13", nombre: "Lucía Barrios", telefono: "+503 7455 1290", correo: "lucia.barrios@gmail.com", canal: "whatsapp", edad: 36, sexo: "F", objetivo: "Bajar 5 kg después del embarazo", modalidad: "presencial", plan: plan("two_meals", 1, "Antiguo Cuscatlán", "Res. Madreselva, pasaje 3 #14", "07:40") },
  { id: "c14", nombre: "Andrés Cifuentes", telefono: "+503 6011 7766", correo: "andres.cifuentes@hotmail.com", canal: "whatsapp", edad: 24, sexo: "M", objetivo: "Ganar masa muscular", modalidad: "en_linea" },
  { id: "c15", nombre: "Paola Sandoval", telefono: "+503 7210 3398", correo: "paola.sandoval@yahoo.com", canal: "instagram", edad: 30, sexo: "F", objetivo: "Desinflamar", modalidad: "en_linea", productos: ["Reto Anti-inflamatorio"] },
  { id: "c16", nombre: "Miguel Ángel Reyes", telefono: "+503 7987 6610", correo: "miguelangel.reyes@outlook.com", canal: "whatsapp", edad: 44, sexo: "M", objetivo: "Bajar de peso", modalidad: "presencial" },
  { id: "c17", nombre: "Fernanda Coronado", telefono: "+503 6678 2201", correo: "fernanda.coronado@gmail.com", canal: "whatsapp", edad: 39, sexo: "F", objetivo: "Comer balanceado entre semana", modalidad: "en_linea", plan: plan("the_lunch", -2, "San Benito", "Edificio Avante, nivel 6", "12:00", 1), restricciones: ["Vegetariana"] },
  { id: "c18", nombre: "José Luis Recinos", telefono: "+503 7543 8812", correo: "joseluis.recinos@hotmail.com", canal: "whatsapp", edad: 50, sexo: "M", objetivo: "Bajar grasa abdominal", modalidad: "presencial", alergias: ["gluten"], plan: plan("premium", -6, "Santa Tecla", "Ciudad Merliot, Calle Chiltiupán #77", "08:00") },
  { id: "c19", nombre: "Diana Velásquez", telefono: "+503 7678 1122", correo: "diana.velasquez@yahoo.com", canal: "whatsapp", edad: 28, sexo: "F", objetivo: "Bajar de peso", modalidad: "en_linea", creadoPorIA: true },
  { id: "c20", nombre: "Kevin Menjívar", telefono: "+503 6190 4456", correo: "kevin.menjivar@outlook.com", canal: "whatsapp", edad: 35, sexo: "M", objetivo: "Ganar masa muscular", modalidad: "presencial", creadoPorIA: true },
];

export function cliente(id: string): Cliente {
  return CLIENTES.find((c) => c.id === id)!;
}

/** Último día con entrega del plan (The Lunch se renueva cada semana). */
export function finDelPlan(c: Cliente): number {
  if (!c.plan) return -Infinity;
  if (c.plan.plan === "the_lunch") return Infinity;
  return c.plan.inicio + c.plan.semanas * 7 - 1;
}

/** ¿Tiene el plan vigente hoy (o por empezar)? */
export function planActivo(c: Cliente): boolean {
  return !!c.plan && finDelPlan(c) >= 0;
}

export const CONVERSACIONES: Conversacion[] = [
  {
    id: "v3", objetivo: "entrega", clienteId: "c1", canal: "whatsapp", agenda: "entregas", estado: "transferida", motivo: "urgencia", esperaMin: 2, noLeidos: 2, hora: "10:42",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Hola, urgente!! Me salieron ronchas en el cuello y siento la garganta rara después de la merienda de la mañana, la que traía nueces", hora: "10:41" },
      { id: "m2", autor: "ia", texto: "María José, gracias por escribir de inmediato. No puedo darte indicaciones de salud, pero esto lo tiene que ver el equipo ahora mismo: te estoy comunicando con Gabriela. Si te cuesta respirar o la hinchazón aumenta, llama ya al 132 o ve a la emergencia más cercana.", hora: "10:41" },
      { id: "m3", autor: "sistema", texto: "Transferida al equipo · Motivo: posible reacción alérgica a una comida entregada. El agente dejó de responder.", hora: "10:41" },
      { id: "m4", autor: "cliente", texto: "Ok, estoy esperando", hora: "10:42" },
    ],
  },
  {
    id: "v21", objetivo: "seguimiento", clienteId: "c4", canal: "facebook", agenda: "consultas", estado: "secretaria", motivo: "urgencia", noLeidos: 0, hora: "10:20",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Buenas, me siento mareado y sudando frío, desayuné lo del plan pero me inyecté la insulina igual que siempre", hora: "10:14" },
      { id: "m2", autor: "ia", texto: "Roberto, gracias por avisarnos. No puedo darte indicaciones de salud: te comunico ya con el equipo. Si los síntomas empeoran, llama al 132 o a tu médico de inmediato.", hora: "10:14" },
      { id: "m3", autor: "sistema", texto: "Transferida al equipo · Motivo: posible urgencia (mareo y sudor frío en paciente con insulina). El agente dejó de responder.", hora: "10:14" },
      { id: "m4", autor: "sistema", texto: "Gabriela Ruiz tomó la conversación. El agente dejó de responder.", hora: "10:16" },
      { id: "m5", autor: "secretaria", texto: "Roberto, la Lda. Morales ya está enterada. Por favor comunícate ahora con tu médico tratante; ella te llama en 10 minutos para revisar tu plan.", hora: "10:17" },
      { id: "m6", autor: "cliente", texto: "Ya hablé con mi doctor, gracias. Espero la llamada", hora: "10:20" },
    ],
  },
  {
    id: "v6", objetivo: "seguimiento", clienteId: "c6", canal: "whatsapp", agenda: "consultas", estado: "transferida", motivo: "caso_clinico", esperaMin: 14, noLeidos: 1, hora: "10:30",
    mensajes: [
      { id: "m1", autor: "ia", texto: `Hola Daniel, te escribimos de Balance Nutrición para saber cómo te ha ido con tu menú desde tu consulta del ${hace(9)}. ¿Cómo te has sentido?`, hora: "09:00", plantilla: "seguimiento_consulta", botones: ["Muy bien", "Tengo dudas", "Hablar con la nutricionista"] },
      { id: "m2", autor: "cliente", texto: "Tengo dudas. Me da muchísima hambre a media tarde y termino comiendo pan dulce", hora: "10:29" },
      { id: "m3", autor: "ia", texto: "Gracias por contarnos, Daniel. Los ajustes al menú los hace la Lda. Morales, así que le paso tu comentario para que lo revise. Gabriela te escribe en un momento.", hora: "10:29" },
      { id: "m4", autor: "sistema", texto: "Transferida al equipo · Motivo: ajuste de menú (hambre a media tarde). Para la nutricionista.", hora: "10:30" },
    ],
  },
  {
    id: "v4", objetivo: "planes", clienteId: "c8", canal: "instagram", agenda: "entregas", estado: "transferida", motivo: "cotizacion", esperaMin: 26, noLeidos: 1, hora: "10:18",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Buenas! Cuánto cuesta el plan Premium? Si pago por transferencia me hacen descuento?", hora: "10:16" },
      { id: "m2", autor: "ia", texto: "¡Hola Luis Fernando! El Premium incluye consulta con la nutricionista, 3 tiempos de comida y 2 meriendas de lunes a sábado por 4 semanas, entrega a domicilio y rutina de entrenamiento. El precio y el descuento por transferencia te los confirma directamente el equipo: ya le paso tu consulta a Gabriela. ¿En qué zona te entregaríamos?", hora: "10:16" },
      { id: "m3", autor: "cliente", texto: "En Merliot", hora: "10:17" },
      { id: "m4", autor: "sistema", texto: "Transferida al equipo · Motivo: cotización y pago (Plan Premium, zona Merliot, pregunta por descuento por transferencia).", hora: "10:17" },
      { id: "m5", autor: "cliente", texto: "Va, gracias", hora: "10:18" },
    ],
  },
  {
    id: "v31", objetivo: "entrega", resultado: { tipo: "entrega", texto: "Entrega · mañana en Torre Futura" }, clienteId: "c2", canal: "whatsapp", agenda: "entregas", estado: "ia", noLeidos: 0, hora: "10:27",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Hola! Mañana voy a estar en la oficina desde temprano, me pueden llevar la comida a Torre Futura en vez de mi casa?", hora: "10:22" },
      { id: "m2", autor: "ia", texto: "¡Hola Jorge! Torre Futura está dentro de la zona Escalón, así que sí la cubrimos. ¿En qué nivel u oficina la dejamos y a qué hora llegas?", hora: "10:22" },
      { id: "m3", autor: "cliente", texto: "Nivel 9, oficina 902. Llego a las 6:45", hora: "10:24" },
      { id: "m4", autor: "ia", texto: "Listo ✅ Mañana tu Two Meals llega a Torre Futura, nivel 9, oficina 902, entre 6:50 y 7:10. Pasado mañana vuelve a tu casa en San Benito como siempre.", hora: "10:26" },
      { id: "m5", autor: "sistema", texto: "Entrega de mañana movida en Agenda de Entregas (Google Calendar · entregas@balancenutricion.com.sv). Ruta: Escalón.", hora: "10:26" },
      { id: "m6", autor: "cliente", texto: "Mil gracias 🙌", hora: "10:27" },
    ],
  },
  {
    id: "v30", objetivo: "entrega", resultado: { tipo: "entrega", texto: "En ruta · llega 8:25" }, clienteId: "c18", canal: "whatsapp", agenda: "entregas", estado: "ia", noLeidos: 0, hora: "08:16",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Buenos días, todavía no me llega la comida y ya me tengo que ir a trabajar", hora: "08:12" },
      { id: "m2", autor: "ia", texto: "Buenos días, José Luis. Revisé la ruta de Santa Tecla: Óscar va en camino y le quedan 2 entregas antes de la tuya. Llega cerca de las 8:25. ¿Te la deja con el vigilante si ya saliste?", hora: "08:12" },
      { id: "m3", autor: "cliente", texto: "Sí, con el vigilante está bien", hora: "08:14" },
      { id: "m4", autor: "ia", texto: "Listo ✅ Le aviso a Óscar que la deje con el vigilante de tu residencial. Te escribo cuando quede entregada.", hora: "08:14" },
      { id: "m5", autor: "sistema", texto: "Nota para el repartidor: dejar con el vigilante. Entrega marcada en ruta.", hora: "08:15" },
      { id: "m6", autor: "cliente", texto: "Perfecto, gracias", hora: "08:16" },
    ],
  },
  {
    id: "v1", objetivo: "agendar", resultado: { tipo: "cita", texto: "Consultas · pasado mañana 08:00" }, clienteId: "c1", canal: "whatsapp", agenda: "consultas", estado: "ia", noLeidos: 0, hora: "10:05",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Hola! Ya me toca mi control del mes, tienen espacio esta semana temprano?", hora: "10:02" },
      { id: "m2", autor: "ia", texto: "¡Hola María José! Sí, te toca: tu último control fue hace un mes. La Lda. Morales tiene espacio pasado mañana a las 8:00 o a las 9:30. ¿Lo quieres presencial en nuestra clínica (Col. Flor Blanca) o en línea por videollamada?", hora: "10:02", botones: ["Presencial", "En línea"] },
      { id: "m3", autor: "cliente", texto: "Presencial, a las 8:00 perfecto", hora: "10:04" },
      { id: "m4", autor: "ia", texto: "Listo ✅ Control presencial con la Lda. Morales pasado mañana a las 8:00 en nuestra clínica (Col. Flor Blanca, 45 Av. Norte #210). Llega en ayunas para la medición de composición corporal, por favor. Te enviamos un recordatorio un día antes.", hora: "10:04" },
      { id: "m5", autor: "sistema", texto: "Cita creada en Agenda de Consultas · Presencial (Google Calendar · consultas@balancenutricion.com.sv).", hora: "10:04" },
      { id: "m6", autor: "cliente", texto: "Gracias!!", hora: "10:05" },
    ],
  },
  {
    id: "v2", objetivo: "menu", resultado: { tipo: "confirmada", texto: "Almuerzos de la semana elegidos" }, clienteId: "c11", canal: "whatsapp", agenda: "entregas", estado: "resuelta", noLeidos: 0, hora: "09:51",
    mensajes: [
      { id: "m1", autor: "ia", texto: "¡Hola Valeria! 🥗 Ya están los almuerzos de la próxima semana. Elige uno por día respondiendo con el número:\n\n1. Bowl de quinoa con pollo y aguacate\n2. Pescado al limón con arroz integral\n3. Tacos de lechuga con carne molida de pavo\n4. Lasaña de berenjena (vegetariana)\n\nEjemplo: «Lun 1, Mar 2, Mié 4…»", hora: "09:00", plantilla: "menu_semana_lunch", botones: ["Elegir mis almuerzos", "Repetir la semana pasada"] },
      { id: "m2", autor: "cliente", texto: "Lun 1, Mar 2, Mié 2, Jue 3, Vie 1, Sáb 4", hora: "09:47" },
      { id: "m3", autor: "ia", texto: "¡Anotado! Tu semana queda así:\nLun: bowl de quinoa · Mar y Mié: pescado al limón · Jue: tacos de lechuga · Vie: bowl de quinoa · Sáb: lasaña de berenjena.\n\nTe llegan a la Colonia Médica entre 11:40 y 12:00. ✅", hora: "09:48" },
      { id: "m4", autor: "sistema", texto: "Elección de la semana registrada para cocina y en Agenda de Entregas.", hora: "09:48" },
    ],
  },
  {
    id: "v9", objetivo: "agendar", resultado: { tipo: "cita", texto: "Consultas · hoy 15:00" }, clienteId: "c2", canal: "whatsapp", agenda: "consultas", estado: "ia", noLeidos: 0, hora: "09:32",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Buenos días, cuántas calorías debería comer para ganar músculo? estoy entrenando 5 días", hora: "09:30" },
      { id: "m2", autor: "ia", texto: "Buenos días, Jorge. No puedo darte cantidades ni indicaciones de alimentación: eso lo ajusta la Lda. Morales con tu medición. Si quieres, te agendo una medición de composición corporal hoy para que revise tu plan; esa cita es presencial porque se hace en la báscula. Tiene espacio a las 15:00 o a las 16:30.", hora: "09:30" },
      { id: "m3", autor: "cliente", texto: "Sí, a las 3 porfa", hora: "09:31" },
      { id: "m4", autor: "ia", texto: "Listo ✅ Medición de composición corporal presencial hoy a las 15:00 con la Lda. Morales, en nuestra clínica (Col. Flor Blanca).", hora: "09:31" },
      { id: "m5", autor: "sistema", texto: "Cita creada en Agenda de Consultas · Presencial. Etiqueta: pregunta sobre calorías, sin orientación dada.", hora: "09:31" },
    ],
  },
  {
    id: "v5", objetivo: "recordatorio", resultado: { tipo: "confirmada", texto: "Confirmó · hoy 11:00" }, clienteId: "c5", canal: "whatsapp", agenda: "consultas", estado: "resuelta", noLeidos: 0, hora: "09:12",
    mensajes: [
      { id: "m1", autor: "ia", texto: "Hola Sofía, te recordamos tu control con la Lda. Morales hoy a las 11:00 en Balance Nutrición. ¿Nos confirmas tu asistencia?", hora: "08:00", plantilla: "recordatorio_cita", botones: ["Confirmar", "Reagendar", "Cancelar"] },
      { id: "m2", autor: "cliente", texto: "Confirmar", hora: "09:12" },
      { id: "m3", autor: "ia", texto: "¡Gracias Sofía! Cita confirmada. Te esperamos a las 11:00 en la clínica (Col. Flor Blanca, 45 Av. Norte #210).", hora: "09:12" },
    ],
  },
  {
    id: "v7", objetivo: "reactivacion", clienteId: "c7", canal: "whatsapp", agenda: "entregas", estado: "ia", noLeidos: 1, hora: "10:39",
    mensajes: [
      { id: "m1", autor: "ia", texto: `Hola Gabriela, tu plan Two Meals terminó el ${hace(3)} 🥗 ¿Quieres renovarlo para seguir con tus comidas a domicilio desde el lunes?`, hora: "08:30", plantilla: "renovacion_plan", botones: ["Renovar mi plan", "Cambiar de plan", "Ahora no"] },
      { id: "m2", autor: "cliente", texto: "Cambiar de plan", hora: "10:38" },
      { id: "m3", autor: "ia", texto: "¡Claro! Tenemos el Premium (3 tiempos + 2 meriendas) y The Lunch (solo almuerzo, eliges el menú cada día). ¿Cuál te interesa? Con eso le paso tu cambio al equipo para que te confirme el precio y te envíe el enlace de pago.", hora: "10:39" },
    ],
  },
  {
    id: "v10", objetivo: "informacion", clienteId: "c10", canal: "facebook", agenda: null, estado: "secretaria", noLeidos: 0, hora: "08:40",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Buen día, me pueden mandar la factura de crédito fiscal del plan? Es a nombre de mi empresa", hora: "08:35" },
      { id: "m2", autor: "ia", texto: "¡Hola Pedro! Las facturas las emite el equipo administrativo. Ya le aviso a Gabriela para que te la envíe.", hora: "08:35" },
      { id: "m3", autor: "sistema", texto: "Gabriela Ruiz tomó la conversación. El agente dejó de responder.", hora: "08:38" },
      { id: "m4", autor: "secretaria", texto: "Hola Pedro, buen día. Con gusto: ¿me compartes el NRC y el nombre de la empresa? Te la envío hoy mismo.", hora: "08:40" },
    ],
  },
  {
    id: "v8", objetivo: "informacion", clienteId: "c8", canal: "instagram", agenda: null, estado: "resuelta", fueraHorario: true, noLeidos: 0, hora: "Ayer",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Holaa hacen entregas en Santa Tecla? y abren los sábados?", hora: "22:40" },
      { id: "m2", autor: "ia", texto: "¡Hola Luis Fernando! Sí: entregamos en Santa Tecla (zona Merliot), además de San Salvador, Antiguo Cuscatlán y Santa Elena. Los sábados atendemos de 7:00 a 13:00 y los planes también se entregan ese día. ¿Quieres que te cuente de los planes?", hora: "22:40" },
      { id: "m3", autor: "cliente", texto: "Mañana les escribo, gracias!", hora: "22:43" },
    ],
  },
  {
    id: "v11", objetivo: "recordatorio", resultado: { tipo: "reagendada", texto: "Reagendó · mañana 10:00" }, clienteId: "c11", canal: "whatsapp", agenda: "consultas", estado: "ia", noLeidos: 0, hora: "Ayer",
    mensajes: [
      { id: "m1", autor: "ia", texto: "Hola Valeria, te recordamos tu control con la Lda. Morales mañana a las 10:00 en Balance Nutrición. ¿Nos confirmas tu asistencia?", hora: "15:00", plantilla: "recordatorio_cita", botones: ["Confirmar", "Reagendar", "Cancelar"] },
      { id: "m2", autor: "cliente", texto: "Reagendar", hora: "15:20" },
      { id: "m3", autor: "ia", texto: "Claro. La Lda. Morales tiene espacio pasado mañana a las 10:00 o a las 17:30. ¿Presencial como la vez pasada, o en línea?", hora: "15:20", botones: ["Presencial", "En línea"] },
      { id: "m4", autor: "cliente", texto: "Presencial, pasado mañana a las 10", hora: "15:22" },
      { id: "m5", autor: "ia", texto: "Listo ✅ Moví tu control a pasado mañana a las 10:00. El espacio de mañana quedó libre.", hora: "15:22" },
    ],
  },
  {
    id: "v12", objetivo: "reactivacion", resultado: { tipo: "sin_interes", texto: "Ahora no" }, clienteId: "c12", canal: "whatsapp", agenda: "consultas", estado: "resuelta", noLeidos: 0, hora: "Ayer",
    mensajes: [
      { id: "m1", autor: "ia", texto: "Hola Héctor, en Balance Nutrición nos acordamos de ti 💚 Tu último control fue hace casi 4 meses. ¿Te gustaría agendar uno para ver cómo vas?", hora: "10:00", plantilla: "reactivacion_consulta", botones: ["Agendar control", "Ahora no", "No recibir más"] },
      { id: "m2", autor: "cliente", texto: "Ahora no", hora: "11:15" },
      { id: "m3", autor: "ia", texto: "Entendido, Héctor. Cuando quieras retomarlo, escríbenos por aquí. ¡Saludos!", hora: "11:15" },
    ],
  },
  {
    id: "v13", objetivo: "reactivacion", resultado: { tipo: "cita", texto: "Consultas · hoy 13:00" }, clienteId: "c16", canal: "whatsapp", agenda: "consultas", estado: "resuelta", noLeidos: 0, hora: "Ayer",
    mensajes: [
      { id: "m1", autor: "ia", texto: "Hola Miguel Ángel, en Balance Nutrición nos acordamos de ti 💚 Tu último control fue hace casi 3 meses. ¿Te gustaría agendar uno para ver cómo vas?", hora: "10:00", plantilla: "reactivacion_consulta", botones: ["Agendar control", "Ahora no", "No recibir más"] },
      { id: "m2", autor: "cliente", texto: "Agendar control", hora: "12:41" },
      { id: "m3", autor: "ia", texto: "¡Qué bueno! ¿Prefieres presencial en nuestra clínica (Col. Flor Blanca) o en línea por videollamada?", hora: "12:41", botones: ["Presencial", "En línea"] },
      { id: "m4", autor: "cliente", texto: "Presencial, ya subí un poco otra vez jaja", hora: "12:44" },
      { id: "m5", autor: "ia", texto: "¡Para eso estamos! La Lda. Morales tiene espacio mañana a las 13:00 o a las 17:30. ¿Cuál te queda mejor?", hora: "12:44" },
      { id: "m6", autor: "cliente", texto: "13:00 está bien", hora: "12:45" },
      { id: "m7", autor: "ia", texto: "Listo ✅ Control presencial mañana a las 13:00 con la Lda. Morales.", hora: "12:45" },
      { id: "m8", autor: "sistema", texto: "Cita creada en Agenda de Consultas · Presencial. Origen: reactivación.", hora: "12:45" },
    ],
  },
  {
    id: "v14", objetivo: "planes", clienteId: "c15", canal: "instagram", agenda: null, estado: "secretaria", noLeidos: 0, hora: "Ayer",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Hola! Vi su historia del reto anti-inflamatorio, cómo funciona?", hora: "16:02" },
      { id: "m2", autor: "ia", texto: "¡Hola Paola! El Reto Anti-inflamatorio incluye una guía, menú de 3 semanas con recetas y lista de compras, y acompañamiento en un grupo de WhatsApp con la nutricionista. Se paga con enlace Wompi. ¿Quieres que el equipo te envíe el enlace de pago?", hora: "16:02" },
      { id: "m3", autor: "cliente", texto: "Sí porfa", hora: "16:05" },
      { id: "m4", autor: "sistema", texto: "Transferida al equipo · Motivo: enviar enlace de pago Wompi (Reto Anti-inflamatorio).", hora: "16:05" },
      { id: "m5", autor: "secretaria", texto: "¡Hola Paola! Aquí está tu enlace de pago del reto: pay.wompi.sv/balance-reto-ai 💚 Cuando se acredite te agregamos al grupo.", hora: "16:20" },
      { id: "m6", autor: "cliente", texto: "Listo, ya pagué!", hora: "16:31" },
    ],
  },
  {
    id: "v15", objetivo: "menu", clienteId: "c17", canal: "whatsapp", agenda: "entregas", estado: "ia", noLeidos: 1, hora: "10:12",
    mensajes: [
      { id: "m1", autor: "ia", texto: "¡Hola Fernanda! 🥗 Ya están los almuerzos vegetarianos de la próxima semana. Elige uno por día respondiendo con el número:\n\n1. Bowl de garbanzos al curry\n2. Lasaña de berenjena\n3. Tacos de hongos con pico de gallo\n4. Ensalada tibia de lentejas", hora: "09:00", plantilla: "menu_semana_lunch", botones: ["Elegir mis almuerzos", "Repetir la semana pasada"] },
      { id: "m2", autor: "cliente", texto: "Lun 2, Mar 1, Mié 3... el jueves no voy a la oficina, me lo pueden mandar a mi casa?", hora: "10:12" },
      { id: "m3", autor: "ia", texto: "¡Claro! ¿Cuál es la dirección de tu casa para el jueves? Reviso que esté dentro de la cobertura y lo dejo anotado. ¿Y qué almuerzo quieres para jueves, viernes y sábado?", hora: "10:12" },
    ],
  },
  {
    id: "v16", objetivo: "menu", clienteId: "c13", canal: "whatsapp", agenda: "consultas", estado: "transferida", motivo: "caso_clinico", esperaMin: 4, noLeidos: 1, hora: "10:38",
    mensajes: [
      { id: "m1", autor: "ia", texto: "📄 Menu_Lucia_Barrios.pdf\n\nHola Lucía, te compartimos el menú personalizado, la rutina y la lista de compras que preparó la Lda. Morales en tu consulta de hoy.\n\nSi tienes dudas sobre el menú, responde a este mensaje y el equipo te contactará.", hora: "09:40", plantilla: "menu_personalizado", botones: ["Tengo una duda"] },
      { id: "m5", autor: "cliente", texto: "Gracias! Una pregunta, estoy dando lactancia, ¿puedo cambiar el pollo de la cena por atún?", hora: "10:37" },
      { id: "m6", autor: "ia", texto: "Buena pregunta, Lucía. Los cambios al menú, y más durante la lactancia, los decide la Lda. Morales: ya le paso tu consulta para que te responda.", hora: "10:37" },
      { id: "m7", autor: "sistema", texto: "Transferida al equipo · Motivo: duda sobre el menú durante la lactancia (para la nutricionista).", hora: "10:38" },
    ],
  },
  {
    id: "v22", objetivo: "planes", clienteId: "c9", canal: "whatsapp", agenda: null, estado: "transferida", motivo: "caso_clinico", esperaMin: 9, noLeidos: 1, hora: "10:33",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Hola! Estoy embarazada de 4 meses, ¿puedo hacer el reto de 21 días?", hora: "10:32" },
      { id: "m2", autor: "ia", texto: "¡Felicidades, Carmen! 💚 Durante el embarazo cualquier plan de alimentación lo tiene que revisar la nutricionista. Le paso tu consulta a la Lda. Morales para que te diga qué te conviene; también puedo agendarte una consulta presencial si lo prefieres.", hora: "10:32" },
      { id: "m3", autor: "sistema", texto: "Transferida al equipo · Motivo: embarazo y reto de 21 días (para la nutricionista).", hora: "10:33" },
    ],
  },
  {
    id: "v17", objetivo: "agendar", resultado: { tipo: "cita", texto: "Consultas · mañana 16:30" }, clienteId: "c19", canal: "whatsapp", agenda: "consultas", estado: "ia", noLeidos: 0, hora: "10:24",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Hola buenas, quiero empezar con una nutricionista, tienen consultas en línea?", hora: "10:19" },
      { id: "m2", autor: "ia", texto: "¡Hola! Sí 💚 La consulta puede ser presencial o en línea e incluye menú personalizado, rutina de entrenamiento y lista de compras. Es la primera vez que nos escribes desde este número: ¿me compartes tu nombre?", hora: "10:19" },
      { id: "m3", autor: "cliente", texto: "Diana Velásquez", hora: "10:20" },
      { id: "m4", autor: "ia", texto: "Mucho gusto, Diana. Para preparar tu consulta: ¿qué edad tienes y cuál es tu objetivo principal?", hora: "10:20" },
      { id: "m5", autor: "cliente", texto: "28 años, quiero bajar de peso", hora: "10:21" },
      { id: "m6", autor: "sistema", texto: "Perfil creado por MIA · Paciente: Diana Velásquez (+503 7678 1122) · 28 años · Objetivo: bajar de peso · En línea. Queda para revisión del equipo.", hora: "10:21" },
      { id: "m7", autor: "ia", texto: "¡Listo, ya te registré! ¿La quieres en línea por videollamada, como me dijiste, o prefieres presencial en nuestra clínica (Col. Flor Blanca)? En línea tengo mañana a las 9:00 o a las 16:30.", hora: "10:21", botones: ["Presencial", "En línea"] },
      { id: "m8", autor: "cliente", texto: "En línea, a las 4:30 porfa", hora: "10:23" },
      { id: "m9", autor: "ia", texto: "Listo ✅ Consulta en línea mañana a las 16:30 con la Lda. Morales. Te enviaremos el enlace de la videollamada y un formulario corto sobre tus hábitos.", hora: "10:24" },
      { id: "m10", autor: "sistema", texto: "Cita creada en Agenda de Consultas · En línea, con enlace de videollamada (Google Calendar · consultas@balancenutricion.com.sv).", hora: "10:24" },
    ],
  },
  {
    id: "v19", objetivo: "agendar", clienteId: "c20", canal: "facebook", agenda: "consultas", estado: "resuelta", noLeidos: 0, hora: "10:38",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "buenas cuanto cuesta la consulta?", hora: "10:36" },
      { id: "m2", autor: "ia", texto: "¡Hola! La consulta dura unos 60 minutos e incluye menú personalizado y rutina de entrenamiento. Para agendarla y que el equipo te confirme el precio, escríbenos por WhatsApp aquí: wa.me/50379790000 — ahí te atiendo de inmediato 💚", hora: "10:36" },
      { id: "m3", autor: "cliente", texto: "va, ahí le escribo", hora: "10:38" },
    ],
  },
  {
    id: "v20", objetivo: "agendar", clienteId: "c20", canal: "whatsapp", agenda: "consultas", estado: "ia", noLeidos: 1, hora: "10:44",
    mensajes: [
      { id: "m1", autor: "cliente", texto: "Hola, les escribí por Facebook, quiero agendar consulta para ganar masa muscular", hora: "10:41" },
      { id: "m2", autor: "ia", texto: "¡Hola! Qué bueno que nos escribes por aquí. Es la primera vez que nos contactas desde este número: ¿me compartes tu nombre y tu edad?", hora: "10:41" },
      { id: "m3", autor: "cliente", texto: "Kevin Menjívar, 35", hora: "10:43" },
      { id: "m4", autor: "ia", texto: "Gracias, Kevin. ¿Prefieres la consulta presencial en nuestra clínica (Col. Flor Blanca) o en línea por videollamada?", hora: "10:43", botones: ["Presencial", "En línea"] },
      { id: "m5", autor: "cliente", texto: "presencial", hora: "10:44" },
      { id: "m6", autor: "sistema", texto: "Perfil creado por MIA · Paciente: Kevin Menjívar (+503 6190 4456) · 35 años · Objetivo: ganar masa muscular · Presencial. Queda para revisión del equipo.", hora: "10:44" },
      { id: "m7", autor: "ia", texto: "¡Listo, ya te registré! Para tu consulta presencial, la Lda. Morales tiene espacio hoy a las 16:30 o mañana a las 9:00. ¿Cuál prefieres? En la consulta también te arma la rutina con Diego, nuestro entrenador.", hora: "10:44" },
    ],
  },
];

// Citas de consulta: las de hoy van a mano; el resto de la semana sale de la
// tabla de abajo para que la ocupación tenga forma realista.
const HOY: Cita[] = [
  { id: "a1", agenda: "consultas", clienteId: "c13", servicio: "Consulta nutricional", modalidad: "presencial", dia: 0, hora: "08:30", duracionMin: 60, estado: "completada", origen: "ia" },
  { id: "a2", agenda: "consultas", clienteId: "c14", servicio: "Consulta nutricional", modalidad: "en_linea", dia: 0, hora: "09:30", duracionMin: 60, estado: "completada", origen: "ia" },
  { id: "a3", agenda: "consultas", clienteId: "c5", servicio: "Control de seguimiento", modalidad: "presencial", dia: 0, hora: "11:00", duracionMin: 30, estado: "confirmada", origen: "ia" },
  { id: "a5", agenda: "consultas", clienteId: "c4", servicio: "Control de seguimiento", modalidad: "en_linea", dia: 0, hora: "14:00", duracionMin: 30, estado: "confirmada", origen: "manual" },
  { id: "a6", agenda: "consultas", clienteId: "c2", servicio: "Composición corporal", modalidad: "presencial", dia: 0, hora: "15:00", duracionMin: 30, estado: "confirmada", origen: "ia" },
  { id: "a7", agenda: "consultas", clienteId: "c10", servicio: "Control de seguimiento", modalidad: "presencial", dia: 0, hora: "17:00", duracionMin: 30, estado: "por_confirmar", origen: "manual" },
  { id: "x1", agenda: "consultas", clienteId: "c12", servicio: "Control de seguimiento", modalidad: "presencial", dia: -1, hora: "10:00", duracionMin: 30, estado: "ausente", origen: "manual" },
  { id: "x2", agenda: "consultas", clienteId: "c11", servicio: "Control de seguimiento", modalidad: "presencial", dia: 0, hora: "10:00", duracionMin: 30, estado: "reagendada", origen: "ia" },
  { id: "a4", agenda: "consultas", clienteId: "c16", servicio: "Control de seguimiento", modalidad: "presencial", dia: 0, hora: "13:00", duracionMin: 30, estado: "por_confirmar", origen: "ia" },
  { id: "x4", agenda: "consultas", clienteId: "c1", servicio: "Control de seguimiento", modalidad: "presencial", dia: 2, hora: "08:00", duracionMin: 30, estado: "confirmada", origen: "ia" },
  { id: "x6", agenda: "consultas", clienteId: "c11", servicio: "Control de seguimiento", modalidad: "presencial", dia: 1, hora: "10:00", duracionMin: 30, estado: "confirmada", origen: "ia" },
  { id: "x7", agenda: "consultas", clienteId: "c6", servicio: "Control de seguimiento", modalidad: "presencial", dia: -4, hora: "09:00", duracionMin: 30, estado: "cancelada", origen: "manual" },
  { id: "x8", agenda: "consultas", clienteId: "c19", servicio: "Consulta nutricional", modalidad: "en_linea", dia: 1, hora: "16:30", duracionMin: 60, estado: "confirmada", origen: "ia" },
  { id: "x9", agenda: "consultas", clienteId: "c18", servicio: "Control de seguimiento", modalidad: "presencial", dia: 4, hora: "17:30", duracionMin: 30, estado: "confirmada", origen: "manual" },
];

// Generador determinista para rellenar la semana.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const SERV_C: [string, number][] = [
  ["Consulta nutricional", 60],
  ["Control de seguimiento", 30],
  ["Control de seguimiento", 30],
  ["Composición corporal", 30],
  ["Control de seguimiento", 30],
];
const HORAS_C = ["08:00", "09:00", "10:00", "10:30", "11:00", "11:30", "13:00", "14:00", "14:30", "15:00", "16:00", "16:30", "17:00", "17:30", "18:00"];
const HORAS_SAB = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00"];

function relleno(): Cita[] {
  const r = rng(42);
  const out: Cita[] = [];
  // Intervalos ocupados por día (minutos), para que nada se encime.
  const ocupado: Record<number, [number, number][]> = {};
  const marcar = (dia: number, ini: number, dur: number) => (ocupado[dia] ??= []).push([ini, ini + dur]);
  const choca = (dia: number, ini: number, dur: number) => (ocupado[dia] ?? []).some(([a, b]) => ini < b && ini + dur > a);
  for (const c of HOY) if (c.estado !== "reagendada" && c.estado !== "cancelada") marcar(c.dia, minutosDe(c.hora), c.duracionMin);
  for (let dia = -6; dia <= 6; dia++) {
    if (dia === 0 || diaCorto(dia).domingo) continue;
    const horas = diaCorto(dia).sabado ? HORAS_SAB : HORAS_C;
    const ocup = 0.3 + r() * 0.35;
    for (const hora of horas) {
      if (r() > ocup) continue;
      const cli = CLIENTES[Math.floor(r() * CLIENTES.length)];
      const [servicio, largo] = SERV_C[Math.floor(r() * SERV_C.length)];
      // Una consulta de 60 min que caería en el almuerzo (12:00) queda de 30.
      const duracionMin = largo === 60 && hora === "11:30" ? 30 : largo;
      if (choca(dia, minutosDe(hora), duracionMin)) continue;
      marcar(dia, minutosDe(hora), duracionMin);
      const pasado = dia < 0;
      const x = r();
      const estado = pasado
        ? x < 0.82 ? "completada" : x < 0.9 ? "ausente" : x < 0.96 ? "cancelada" : "reagendada"
        : dia === 1 ? (x < 0.6 ? "confirmada" : "por_confirmar")
        : x < 0.93 ? "confirmada" : "cancelada";
      out.push({
        id: `r${dia}c${hora}`,
        agenda: "consultas",
        clienteId: cli.id,
        servicio,
        modalidad: r() < 0.35 ? "en_linea" : "presencial",
        dia,
        hora,
        duracionMin,
        estado,
        origen: r() < 0.64 ? "ia" : "manual",
      });
    }
  }
  return out;
}

const SERVICIO_PLAN: Record<PlanId, string> = {
  premium: "Premium · día completo",
  two_meals: "Two Meals · día completo",
  the_lunch: "The Lunch · almuerzo",
};

// Estados de entrega que no siguen la regla general (cliente|día).
const ENTREGA_ESPECIAL: Record<string, Cita["estado"]> = {
  "c18|0": "en_curso",
  "c10|-2": "ausente",
  "c17|1": "por_confirmar",
};

/**
 * Entregas de la semana: una por día (lun a sáb) para cada cliente con plan
 * vigente, a su hora de entrega. Las de hoy antes de las 9:00 ya salieron.
 */
function entregas(): Cita[] {
  const out: Cita[] = [];
  for (const c of CLIENTES) {
    const p = c.plan;
    if (!p) continue;
    const fin = finDelPlan(c);
    for (let dia = -6; dia <= 6; dia++) {
      if (diaCorto(dia).domingo || dia < p.inicio || dia > fin) continue;
      const especial = ENTREGA_ESPECIAL[`${c.id}|${dia}`];
      const estado = especial ?? (dia < 0 ? "completada" : dia === 0 && minutosDe(p.horaEntrega) < 9 * 60 ? "completada" : "confirmada");
      // Jorge pidió por chat que mañana se la lleven a su oficina.
      const movida = c.id === "c2" && dia === 1;
      out.push({
        id: `e${c.id}${dia}`,
        agenda: "entregas",
        clienteId: c.id,
        servicio: SERVICIO_PLAN[p.plan],
        zona: movida ? "Escalón" : p.zona,
        dia,
        hora: movida ? "06:50" : p.horaEntrega,
        duracionMin: 20,
        estado,
        origen: movida ? "ia" : "manual",
      });
    }
  }
  return out;
}

export const CITAS: Cita[] = [...HOY, ...relleno(), ...entregas()];

export const SEGUIMIENTOS: Seguimiento[] = [
  { id: "s1", clienteId: "c6", consulta: "Consulta nutricional · Two Meals", fechaConsulta: hace(9), regla: "A los 7 días · cómo va con el menú", envio: "Hoy 09:00", estado: "transferido", respuesta: "Me da muchísima hambre a media tarde…" },
  { id: "s2", clienteId: "c14", consulta: "Consulta nutricional en línea", fechaConsulta: "Hoy", regla: "A los 3 días · dudas con el menú", envio: `${textoFecha(3)} 10:00`, estado: "programado" },
  { id: "s3", clienteId: "c13", consulta: "Consulta nutricional · Two Meals", fechaConsulta: "Hoy", regla: "Primer día del plan · cómo llegó la comida", envio: `${textoFecha(1)} 12:00`, estado: "programado" },
  { id: "s4", clienteId: "c4", consulta: "Control · prediabetes", fechaConsulta: hace(12), regla: "A los 7 días · cómo va con el menú", envio: `${hace(5)} 09:00`, estado: "nueva_cita", respuesta: "Bien, agendó control hoy 14:00" },
  { id: "s5", clienteId: "c2", consulta: "Control · masa muscular", fechaConsulta: hace(15), regla: "A los 7 días · cómo va con el menú", envio: `${hace(8)} 09:00`, estado: "respondido", respuesta: "Muy bien" },
  { id: "s6", clienteId: "c1", consulta: "Control mensual", fechaConsulta: hace(30), regla: "A los 7 días · cómo va con el menú", envio: `${hace(23)} 09:00`, estado: "respondido", respuesta: "Muy bien" },
  { id: "s7", clienteId: "c5", consulta: "Control de seguimiento", fechaConsulta: "Hoy 11:00", regla: "Lo define la nutricionista al cerrar la consulta", envio: "Pendiente de regla", estado: "programado" },
  { id: "s8", clienteId: "c18", consulta: "Consulta nutricional · Premium", fechaConsulta: hace(6), regla: "A los 5 días · cómo va con el menú", envio: `${hace(1)} 09:00`, estado: "enviado" },
];

/**
 * Filtro para reactivar: días desde la última consulta (consultas) o desde que
 * venció el plan (entregas). El equipo escoge el rango y manda el mensaje.
 */
export const RANGOS: { id: RangoInactividad; label: string; detalle: string; min: number; max: number }[] = [
  { id: "15d", label: "Hasta 15 días", detalle: "1 a 15 días", min: 1, max: 15 },
  { id: "1m", label: "Hasta 1 mes y medio", detalle: "16 a 45 días", min: 16, max: 45 },
  { id: "mas1m", label: "Más tiempo", detalle: "46 días o más", min: 46, max: Infinity },
];

export function rangoDe(dias: number): RangoInactividad | null {
  return RANGOS.find((r) => dias >= r.min && dias <= r.max)?.id ?? null;
}

// Pacientes sin control reciente (consultas) y planes vencidos sin renovar
// (entregas): un mismo paciente puede estar al día en uno y no en el otro.
export const REACTIVACIONES: Reactivacion[] = [
  { id: "r1", clienteId: "c12", agenda: "consultas", ultimoServicio: `Control · ${hace(110)}`, diasInactivo: 110, estado: "no_interesado" },
  { id: "r2", clienteId: "c16", agenda: "consultas", ultimoServicio: `Consulta nutricional · ${hace(80)}`, diasInactivo: 80, estado: "cita" },
  { id: "r3", clienteId: "c9", agenda: "consultas", ultimoServicio: `Consulta nutricional · ${hace(150)}`, diasInactivo: 150, estado: "detectado" },
  { id: "r4", clienteId: "c3", agenda: "consultas", ultimoServicio: `Consulta en línea · ${hace(50)}`, diasInactivo: 50, estado: "detectado" },
  { id: "r5", clienteId: "c10", agenda: "consultas", ultimoServicio: `Consulta nutricional · ${hace(28)}`, diasInactivo: 28, estado: "contactado" },
  { id: "r6", clienteId: "c15", agenda: "consultas", ultimoServicio: `Consulta en línea · ${hace(200)}`, diasInactivo: 200, estado: "detectado" },
  { id: "r7", clienteId: "c18", agenda: "consultas", ultimoServicio: `Consulta nutricional · ${hace(45)}`, diasInactivo: 45, estado: "detectado" },
  { id: "r8", clienteId: "c17", agenda: "consultas", ultimoServicio: `Consulta en línea · ${hace(70)}`, diasInactivo: 70, estado: "respondio" },
  { id: "r9", clienteId: "c8", agenda: "consultas", ultimoServicio: `Consulta en línea · ${hace(21)}`, diasInactivo: 21, estado: "detectado" },
  { id: "r10", clienteId: "c11", agenda: "consultas", ultimoServicio: `Consulta nutricional · ${hace(12)}`, diasInactivo: 12, estado: "detectado" },
  { id: "r11", clienteId: "c7", agenda: "entregas", ultimoServicio: `Two Meals · venció ${hace(3)}`, diasInactivo: 3, estado: "respondio" },
  { id: "r12", clienteId: "c15", agenda: "entregas", ultimoServicio: `Two Meals · venció ${hace(60)}`, diasInactivo: 60, estado: "detectado" },
  { id: "r13", clienteId: "c8", agenda: "entregas", ultimoServicio: `The Lunch · venció ${hace(20)}`, diasInactivo: 20, estado: "detectado" },
  { id: "r14", clienteId: "c12", agenda: "entregas", ultimoServicio: `Premium · venció ${hace(140)}`, diasInactivo: 140, estado: "no_interesado" },
  { id: "r15", clienteId: "c9", agenda: "entregas", ultimoServicio: `Two Meals · venció ${hace(25)}`, diasInactivo: 25, estado: "contactado" },
  { id: "r16", clienteId: "c16", agenda: "entregas", ultimoServicio: `Premium · venció ${hace(85)}`, diasInactivo: 85, estado: "cita" },
  { id: "r17", clienteId: "c5", agenda: "entregas", ultimoServicio: `The Lunch · venció ${hace(9)}`, diasInactivo: 9, estado: "detectado" },
  { id: "r18", clienteId: "c14", agenda: "entregas", ultimoServicio: `The Lunch · venció ${hace(14)}`, diasInactivo: 14, estado: "detectado" },
];

/** Totales de la base completa (la lista de arriba es una muestra). */
export const REACTIVACION_TOTALES = {
  consultas: { detectados: 132, contactados: 90, respondieron: 34, citas: 19, excluidos: 6 },
  entregas: { detectados: 58, contactados: 41, respondieron: 17, citas: 11, excluidos: 3 },
};

export const PLANTILLAS: Plantilla[] = [
  {
    nombre: "confirmacion_cita",
    categoria: "UTILITY",
    agenda: "consultas",
    titulo: "Confirmación de cita",
    cuerpo: "Hola {{1}}, tu cita en Balance Nutrición quedó agendada.\n\nServicio: {{2}}\nModalidad: {{3}}\nFecha: {{4}}\nHora: {{5}}\n\nSi necesitas cambiarla, responde a este mensaje y te ayudamos.",
    ejemplo: ["María José", "Control de seguimiento", "Presencial", "jueves 23 de octubre", "08:00"],
    botones: ["Reagendar"],
    cuando: "Al crear una cita cuando la ventana de 24 h de WhatsApp está cerrada: citas que el equipo agenda por teléfono o desde Google Calendar. Si el paciente agendó por chat, la confirmación va como mensaje normal.",
    estadoMeta: "Aprobada",
    stats: { enviados: 74, entregados: 73, leidos: 69, respondidos: 9 },
  },
  {
    nombre: "recordatorio_cita",
    categoria: "UTILITY",
    agenda: "consultas",
    titulo: "Recordatorio de cita",
    cuerpo: "Hola {{1}}, te recordamos tu {{2}} con la Lda. Morales el {{3}} a las {{4}} en Balance Nutrición.\n\n¿Nos confirmas tu asistencia?",
    ejemplo: ["Sofía", "control", "martes 21 de octubre", "11:00"],
    botones: ["Confirmar", "Reagendar", "Cancelar"],
    cuando: "24 h antes de cada consulta. Si a las 4 h antes no hay respuesta, la cita aparece en «Por confirmar» para que el equipo llame.",
    estadoMeta: "Aprobada",
    stats: { enviados: 268, entregados: 263, leidos: 247, respondidos: 214 },
  },
  {
    nombre: "seguimiento_consulta",
    categoria: "UTILITY",
    agenda: "consultas",
    titulo: "Seguimiento después de la consulta",
    cuerpo: "Hola {{1}}, te escribimos de Balance Nutrición para saber cómo te ha ido con tu menú desde tu consulta del {{2}}.\n\n¿Cómo te has sentido?",
    ejemplo: ["Daniel", "12 de octubre"],
    botones: ["Muy bien", "Tengo dudas", "Hablar con la nutricionista"],
    cuando: "En el momento que define la nutricionista al cerrar la consulta (3, 5 o 7 días…). «Tengo dudas» y «Hablar con la nutricionista» pasan al equipo; el agente no ajusta menús.",
    estadoMeta: "Aprobada",
    stats: { enviados: 88, entregados: 87, leidos: 80, respondidos: 61 },
  },
  {
    nombre: "reactivacion_consulta",
    categoria: "MARKETING",
    agenda: "consultas",
    titulo: "Reactivación · Consultas",
    cuerpo: "Hola {{1}}, en Balance Nutrición nos acordamos de ti 💚 Tu último control fue hace {{2}}.\n\n¿Te gustaría agendar uno para ver cómo vas?",
    ejemplo: ["Héctor", "casi 4 meses"],
    botones: ["Agendar control", "Ahora no", "No recibir más"],
    cuando: "Cuando el equipo lo selecciona en Reactivación según el tiempo sin control. Sale en horario de atención y nunca a quien pidió no recibir más.",
    estadoMeta: "Aprobada",
    stats: { enviados: 90, entregados: 86, leidos: 71, respondidos: 34 },
  },
  {
    nombre: "renovacion_plan",
    categoria: "MARKETING",
    agenda: "entregas",
    titulo: "Renovación de plan",
    cuerpo: "Hola {{1}}, tu plan {{2}} terminó el {{3}} 🥗 ¿Quieres renovarlo para seguir con tus comidas a domicilio desde el lunes?",
    ejemplo: ["Gabriela", "Two Meals", "18 oct 2026"],
    botones: ["Renovar mi plan", "Cambiar de plan", "Ahora no"],
    cuando: "El último sábado del plan y, si no responde, cuando el equipo lo selecciona en Reactivación. Precio y enlace de pago los envía el equipo.",
    estadoMeta: "Aprobada",
    stats: { enviados: 41, entregados: 41, leidos: 38, respondidos: 17 },
  },
  {
    nombre: "menu_semana_lunch",
    categoria: "UTILITY",
    agenda: "entregas",
    titulo: "Elige tus almuerzos (The Lunch)",
    cuerpo: "¡Hola {{1}}! 🥗 Ya están los almuerzos de la próxima semana. Elige uno por día respondiendo con el número:\n\n{{2}}",
    ejemplo: ["Valeria", "1. Bowl de quinoa con pollo…"],
    botones: ["Elegir mis almuerzos", "Repetir la semana pasada"],
    cuando: "Cada sábado a las 9:00 a quienes tienen The Lunch. Si el domingo a mediodía no eligió, se repite su semana anterior y la entrega queda «Por confirmar».",
    estadoMeta: "Aprobada",
    stats: { enviados: 96, entregados: 96, leidos: 93, respondidos: 88 },
  },
  {
    nombre: "menu_personalizado",
    categoria: "UTILITY",
    agenda: "consultas",
    titulo: "Menú personalizado (encabezado: documento PDF)",
    cuerpo: "Hola {{1}}, te compartimos el menú personalizado, la rutina y la lista de compras que preparó {{2}} en tu consulta de hoy.\n\nSi tienes dudas sobre el menú, responde a este mensaje y el equipo te contactará.",
    ejemplo: ["Lucía", "la Lda. Morales"],
    botones: ["Tengo una duda"],
    cuando: "Justo al terminar la consulta, cuando la nutricionista pulsa «Enviar menú». Lleva el PDF como encabezado. «Tengo una duda» pasa al equipo: el agente no cambia ni explica menús.",
    estadoMeta: "Aprobada",
    stats: { enviados: 52, entregados: 52, leidos: 50, respondidos: 19 },
  },
];

const tiempos = (d: [string, string][]) =>
  d.map(([tiempo, comida]) => {
    const [c, porcion = "", nota = ""] = comida.split(" | ");
    return { tiempo, comida: c, porcion, nota };
  });

export const MENUS: Menu[] = [
  {
    id: "mn1", clienteId: "c13", hora: "09:35", fecha: "Hoy", vigencia: "4 semanas", estado: "duda",
    indicaciones: "2.5 L de agua al día. Lactancia: agregar 1 merienda extra si da hambre. Rutina de fuerza 3 días con Diego.",
    compras: "Claras de huevo\nEspinaca\nTortillas de maíz\nYogur griego natural\nFresas\nPechuga de pollo\nArroz integral\nAguacate\nAlmendras\nPescado blanco",
    items: tiempos([
      ["Desayuno", "Omelette de claras con espinaca + 1 tortilla | 3 claras · 1 taza de espinaca"],
      ["Merienda AM", "Yogur griego natural con fresas | 1 taza"],
      ["Almuerzo", "Pechuga de pollo a la plancha, arroz integral y ensalada | 120 g pollo · ½ taza arroz"],
      ["Merienda PM", "Manzana con almendras | 1 manzana · 10 almendras"],
      ["Cena", "Pollo desmenuzado con vegetales salteados | 100 g pollo | Se puede alternar con pescado"],
    ]),
  },
  {
    id: "mn2", clienteId: "c14", hora: "10:35", fecha: "Hoy", vigencia: "4 semanas", estado: "leido",
    indicaciones: "Superávit ligero. Proteína en cada tiempo. Entrenamiento 5 días: rutina de hipertrofia de Diego.",
    compras: "Avena\nHuevos\nBanano\nCrema de maní\nCarne molida magra\nPapa\nFrijoles\nQueso fresco\nLeche",
    items: tiempos([
      ["Desayuno", "Avena con banano y crema de maní + 2 huevos | 1 taza avena"],
      ["Merienda AM", "Licuado de leche con banano | 1 vaso"],
      ["Almuerzo", "Carne molida magra con papa y vegetales | 150 g carne"],
      ["Merienda PM", "Sándwich de pan integral con queso fresco | 2 rebanadas"],
      ["Cena", "Frijoles, 2 tortillas, huevo y aguacate | ½ taza frijoles"],
    ]),
  },
  {
    id: "mn3", clienteId: "c6", hora: "16:20", fecha: hace(9), vigencia: "4 semanas", estado: "enviado",
    indicaciones: "Plan Two Meals cubre almuerzo y cena; desayuno en casa según el menú. Caminar 30 min diarios.",
    items: tiempos([
      ["Desayuno", "Huevos revueltos con tomate y cebolla + 1 tortilla | 2 huevos"],
      ["Merienda AM", "Pepino y zanahoria con limón | 1 taza (Plan)"],
      ["Almuerzo", "Del plan Two Meals | Entrega a domicilio"],
      ["Merienda PM", "Gelatina sin azúcar con nueces | (Plan)"],
      ["Cena", "Del plan Two Meals | Entrega a domicilio"],
    ]),
  },
  {
    id: "mn4", clienteId: "c1", hora: "09:10", fecha: hace(30), vigencia: "4 semanas", estado: "leido",
    indicaciones: "Plan Premium: todos los tiempos llegan a domicilio. Fuerza 3 días + cardio 2 días.",
    items: tiempos([
      ["Desayuno", "Del plan Premium | Entrega 6:20"],
      ["Merienda AM", "Del plan Premium"],
      ["Almuerzo", "Del plan Premium"],
      ["Merienda PM", "Del plan Premium"],
      ["Cena", "Del plan Premium"],
    ]),
  },
  {
    id: "mn5", clienteId: "c2", hora: "15:40", fecha: hace(15), vigencia: "4 semanas", estado: "leido",
    indicaciones: "Sin lácteos. Agregar 1 batido de proteína vegetal después de entrenar.",
    items: tiempos([
      ["Desayuno", "Pancakes de avena con banano y huevo | 3 pancakes"],
      ["Merienda AM", "Del plan Two Meals"],
      ["Almuerzo", "Del plan Two Meals"],
      ["Merienda PM", "Batido de proteína vegetal con leche de almendras | 1 vaso"],
      ["Cena", "Del plan Two Meals"],
    ]),
  },
  {
    id: "mn6", clienteId: "c4", hora: "14:30", fecha: hace(12), vigencia: "4 semanas", estado: "leido",
    indicaciones: "Bajo en azúcar y harinas refinadas. No saltar tiempos de comida por la insulina. Coordinar cambios con su médico tratante.",
    items: tiempos([
      ["Desayuno", "Del plan Premium (versión baja en azúcar)"],
      ["Merienda AM", "Del plan Premium"],
      ["Almuerzo", "Del plan Premium"],
      ["Merienda PM", "Del plan Premium"],
      ["Cena", "Del plan Premium"],
    ]),
  },
  {
    id: "mn7", clienteId: "c5", hora: "11:30", fecha: hace(35), vigencia: "4 semanas", estado: "leido",
    indicaciones: "Desayunar antes de las 9:00. Dormir 7 h. Rutina en casa 3 días.",
    compras: "Pan integral\nHuevos\nAguacate\nPapaya\nPollo\nArroz\nVegetales mixtos\nYogur natural",
    items: tiempos([
      ["Desayuno", "Pan integral con huevo y aguacate | 2 rebanadas"],
      ["Merienda AM", "Papaya con yogur natural | 1 taza"],
      ["Almuerzo", "Pollo guisado con arroz y vegetales | 120 g pollo"],
      ["Merienda PM", "Puñado de maní sin sal | 1 puño"],
      ["Cena", "Sopa de vegetales con queso fresco | 1 plato"],
    ]),
  },
];

// Historial de consultas. Las anteriores van a mano (con resumen y medidas);
// las de hoy salen de las citas atendidas.
const NUT = STAFF.nutricionista.nombre;

const v = (id: string, clienteId: string, dias: number, hora: string, servicio: string): Visita => ({ id, clienteId, agenda: "consultas", fecha: iso(fechaDe(-dias)), hora, servicio, atendio: NUT });

const HISTORICAS: Visita[] = [
  v("h1", "c1", 120, "09:00", "Consulta nutricional"),
  v("h2", "c1", 90, "09:00", "Control de seguimiento"),
  v("h3", "c1", 60, "08:30", "Control de seguimiento"),
  v("h4", "c1", 30, "09:00", "Control de seguimiento"),
  v("h5", "c2", 75, "15:00", "Consulta nutricional"),
  v("h6", "c2", 45, "15:30", "Control de seguimiento"),
  v("h7", "c2", 15, "15:30", "Control de seguimiento"),
  v("h8", "c4", 40, "14:00", "Consulta nutricional"),
  v("h9", "c4", 12, "14:00", "Control de seguimiento"),
  v("h10", "c6", 9, "16:00", "Consulta nutricional"),
  v("h11", "c5", 35, "11:00", "Consulta nutricional"),
  v("h12", "c10", 28, "17:00", "Consulta nutricional"),
  v("h13", "c3", 50, "13:00", "Consulta en línea"),
  v("h14", "c11", 12, "10:00", "Consulta nutricional"),
  v("h15", "c16", 80, "17:30", "Consulta nutricional"),
  v("h16", "c12", 110, "10:00", "Control de seguimiento"),
  v("h17", "c12", 170, "10:00", "Consulta nutricional"),
  v("h18", "c7", 32, "08:00", "Consulta nutricional"),
  v("h19", "c9", 150, "16:00", "Consulta nutricional"),
  v("h20", "c15", 200, "18:00", "Consulta en línea"),
  v("h21", "c17", 70, "13:00", "Consulta en línea"),
  v("h22", "c18", 6, "17:30", "Consulta nutricional"),
  v("h23", "c18", 45, "17:00", "Consulta nutricional"),
  v("h24", "c8", 21, "19:00", "Consulta en línea"),
];

// Solo las de hoy: el resto de la semana es relleno del calendario.
const ATENDIDAS: Visita[] = CITAS.filter((c) => c.agenda === "consultas" && c.dia === 0 && c.estado === "completada").map((c) => ({
  id: `cita-${c.id}`,
  clienteId: c.clienteId,
  agenda: c.agenda,
  fecha: iso(fechaDe(c.dia)),
  hora: c.hora,
  servicio: c.modalidad === "en_linea" ? `${c.servicio} · en línea` : c.servicio,
  atendio: NUT,
}));

export const VISITAS: Visita[] = [...HISTORICAS, ...ATENDIDAS];

const r = (
  dias: number,
  hora: string,
  medidas: [string, string, string],
  motivo: string,
  observaciones: string,
  objetivo: string,
  indicaciones: string,
  proximoControl: string,
): ResumenConsulta => ({
  motivo,
  pesoKg: medidas[0],
  grasaPct: medidas[1],
  musculoKg: medidas[2],
  observaciones,
  objetivo,
  indicaciones,
  proximoControl,
  autor: NUT,
  escrito: dias === 0 ? `Hoy · ${hora}` : `${hace(dias)} · ${hora}`,
});

/** Resúmenes de consulta ya escritos, por id de visita. Llevan las medidas de composición corporal. */
export const RESUMENES: Record<string, ResumenConsulta> = {
  h1: r(120, "10:05", ["74.2", "34.1", "25.8"], "Quiere bajar de peso para su boda; come fuera casi todos los días.", "Salta el desayuno y cena tarde. Actividad física casi nula. Duerme 6 h.", "Bajar 6 kg de grasa en 5 meses sin perder músculo", "Plan Premium 4 semanas. Fuerza 3 días con Diego. 2.5 L de agua al día.", "En 30 días"),
  h2: r(90, "09:35", ["72.0", "32.6", "26.1"], "Control mensual.", "Buena adherencia al plan. Dice que duerme mejor.", "Seguir bajando grasa", "Renueva Premium. Agrega 2 días de cardio.", "En 30 días"),
  h3: r(60, "09:00", ["70.4", "31.0", "26.5"], "Control mensual.", "Bajó 1.6 kg y subió músculo. Antojos de dulce los fines de semana.", "Seguir bajando grasa", "Merienda con fruta los sábados. Mismo plan.", "En 30 días"),
  h4: r(30, "09:30", ["69.1", "29.8", "26.9"], "Control mensual.", "Va muy bien: 5 kg menos desde la primera consulta y más músculo.", "Llegar a 27% de grasa", "Renueva Premium 4 semanas. Subir peso en la rutina de fuerza.", "En 30 días"),
  h5: r(75, "15:45", ["82.0", "24.5", "34.0"], "Quiere ganar músculo; entrena 4 días.", "Come poca proteína y no desayuna. Sin lácteos.", "Ganar 4 kg de masa muscular", "Plan Two Meals. Batido de proteína vegetal después de entrenar.", "En 30 días"),
  h6: r(45, "16:00", ["82.6", "22.9", "35.4"], "Control.", "Subió 1.4 kg de músculo y bajó grasa. Buena adherencia.", "Ganar 4 kg de masa muscular", "Mismo plan. Sube a 5 días de entrenamiento.", "En 30 días"),
  h7: r(15, "16:00", ["83.1", "21.8", "36.2"], "Control.", "Sigue subiendo músculo. Pregunta por suplementos.", "Ganar 4 kg de masa muscular", "Renueva Two Meals. Suplementos solo con indicación médica.", "En 15 días"),
  h8: r(40, "14:45", ["96.5", "31.2", "36.0"], "Prediabetes; su médico le pidió bajar de peso.", "Usa insulina basal. Desayuna pan dulce y café con azúcar.", "Bajar 8 kg y mejorar la glucosa", "Premium versión baja en azúcar. Coordinar cualquier cambio con su médico.", "En 30 días"),
  h9: r(12, "14:30", ["94.8", "30.1", "36.3"], "Control.", "Bajó 1.7 kg. Glucosas en ayunas más estables, según su médico.", "Bajar 8 kg y mejorar la glucosa", "Mismo plan. Caminar 30 min después del almuerzo.", "En 15 días"),
  h10: r(9, "16:50", ["88.3", "27.4", "35.1"], "Quiere bajar 8 kg; trabaja de noche dos veces por semana.", "Picotea de noche. Toma 3 sodas al día.", "Bajar 8 kg en 4 meses", "Plan Two Meals. Cambiar sodas por agua con limón. Caminar 30 min.", "En 30 días"),
  h11: r(35, "11:45", ["61.0", "27.9", "24.0"], "Se siente cansada y come a deshoras.", "Desayuna tarde, mucho café. Duerme 5–6 h.", "Mejorar hábitos y energía", "Menú en casa con horarios fijos. Rutina en casa 3 días.", "En 30 días"),
  h12: r(28, "17:45", ["91.0", "29.0", "35.8"], "Colesterol alto en sus exámenes.", "Come frito casi a diario. Sedentario.", "Bajar colesterol y 6 kg", "Plan Premium. Fuerza 2 días + caminata diaria.", "En 30 días"),
  h13: r(50, "13:40", ["63.5", "30.2", "23.1"], "Quiere dejar de comer comida rápida en la oficina.", "Almuerza en la calle todos los días.", "Comer mejor en la oficina", "The Lunch semanal. Desayuno y cena según el menú.", "En 30 días"),
  h22: r(6, "18:20", ["92.4", "30.8", "34.9"], "Le preocupa la grasa abdominal.", "Cena muy tarde. Cerveza los fines de semana.", "Bajar 7 cm de cintura", "Plan Premium. Cenar antes de las 8 pm.", "En 30 días"),
  "cita-a1": r(0, "09:30", ["68.4", "33.0", "24.2"], "Quiere bajar 5 kg después del embarazo; da lactancia.", "Bebé de 7 meses. Duerme poco. Come a deshoras.", "Bajar 5 kg en 4 meses cuidando la lactancia", "Plan Two Meals desde mañana. Merienda extra si da hambre. Rutina suave 3 días.", "En 30 días"),
};

export const NOTAS: Nota[] = [
  { id: "n1", clienteId: "c1", texto: "Prefiere controles temprano por la mañana, en ayunas. Su boda es en marzo.", fecha: iso(fechaDe(-30)), hora: "09:40", autor: "Recepción" },
  { id: "n2", clienteId: "c4", texto: "Usa insulina: cualquier cambio de menú se coordina con su médico tratante.", fecha: iso(fechaDe(-40)), hora: "15:00", autor: "Lda. Morales" },
  { id: "n3", clienteId: "c2", texto: "No toma lácteos. Pide que la entrega no llegue antes de las 6:30.", fecha: iso(fechaDe(-9)), hora: "07:50", autor: "Recepción" },
];

// Diseños prediseñados para posts (fondo + título sobre la imagen).
export const DISENOS = [
  { fondo: "linear-gradient(135deg,#15803d,#4ade80)", titulo: "Receta de la semana" },
  { fondo: "linear-gradient(135deg,#a16207,#facc15)", titulo: "Nutritip" },
  { fondo: "linear-gradient(135deg,#7c3aed,#c084fc)", titulo: "Reto de 21 días" },
  { fondo: "linear-gradient(135deg,#c2410c,#fb923c)", titulo: "Rutina en casa" },
];

export const POSTS: Post[] = [
  {
    id: "p1", redes: ["instagram", "facebook"], estado: "publicada", fecha: iso(fechaDe(-4)), hora: "18:00",
    diseno: DISENOS[0],
    texto: "Bowl de quinoa con pollo y aguacate 🥑 Listo en 15 minutos y perfecto para llevar a la oficina. Guarda la receta y cuéntanos si lo haces. Si quieres que te lo llevemos, pregúntanos por The Lunch por WhatsApp. #RecetasSaludables #ElSalvador",
    stats: { alcance: 4180, meGusta: 512, comentarios: 46, mensajes: 38 },
  },
  {
    id: "p2", redes: ["instagram"], estado: "publicada", fecha: iso(fechaDe(-9)), hora: "12:30",
    diseno: DISENOS[1],
    texto: "Nutritip 💡 La dieta no es restricción: lo importante no es el número en la báscula sino tu grasa corporal y tu masa muscular. En consulta las medimos y armamos tu plan. #Nutritips",
    stats: { alcance: 3360, meGusta: 401, comentarios: 29, mensajes: 22 },
  },
  {
    id: "p3", redes: ["facebook"], estado: "publicada", fecha: iso(fechaDe(-17)), hora: "09:00",
    diseno: DISENOS[3],
    texto: "Rutina de 20 minutos en casa con Diego 🏋️ Sin equipo, para todos los niveles. Y si quieres tu rutina personalizada, viene incluida en tu consulta. Agenda por WhatsApp: MIA te responde al instante.",
    stats: { alcance: 1980, meGusta: 143, comentarios: 18, mensajes: 27 },
  },
  {
    id: "p4", redes: ["instagram", "facebook"], estado: "programada", fecha: iso(fechaDe(3)), hora: "10:00",
    diseno: DISENOS[2],
    texto: "Arranca el Reto de 21 días 💜 Menú, lista de compras, rutinas y acompañamiento en grupo con la nutricionista. Escríbenos «RETO» por WhatsApp para inscribirte. #Reto21Dias",
  },
];

export const CAMPANAS: Campana[] = [
  {
    id: "k1", nombre: "Renueva tu plan", segmento: "plan_vencido", estado: "enviada", fecha: iso(fechaDe(-20)), hora: "10:00", destinatarios: 41,
    mensaje: "Hola {{nombre}}, ¿extrañas tus comidas de Balance? 🥗 Renueva tu plan y vuelve a recibirlas desde el lunes. ¿Te ayudamos?",
    botones: ["Renovar mi plan", "Ahora no", "No recibir más"],
    stats: { entregados: 40, leidos: 35, respondieron: 14, citas: 9 },
  },
  {
    id: "k2", nombre: "Vuelve a tu control", segmento: "consultas_inactivos", estado: "enviada", fecha: iso(fechaDe(-27)), hora: "09:30", destinatarios: 64,
    mensaje: "Hola {{nombre}}, hace un tiempo no te vemos en consulta 💚 ¿Agendamos un control para medir cómo vas?",
    botones: ["Agendar control", "Ahora no", "No recibir más"],
    stats: { entregados: 62, leidos: 54, respondieron: 21, citas: 12 },
  },
  {
    id: "k3", nombre: "Lanzamiento Reto de 21 días", segmento: "sin_plan", estado: "programada", fecha: iso(fechaDe(3)), hora: "10:00", destinatarios: 9,
    mensaje: "Hola {{nombre}}, arranca el Reto de 21 días 💜 Menú, rutinas y grupo con la nutricionista. ¿Te mandamos la información?",
    botones: ["Quiero info", "Ahora no", "No recibir más"],
  },
];

/** Límite de plantillas de WhatsApp que el equipo puede tener guardadas. */
export const MAX_PLANTILLAS = 5;

export const PLANTILLAS_WA: PlantillaWA[] = [
  {
    id: "w1", nombre: "recordatorio_cita", categoria: "UTILITY", estado: "Aprobada", actualizada: hace(19),
    encabezado: "Recordatorio de cita",
    cuerpo: "Hola {{1}}, te recordamos tu {{2}} con la Lda. Morales el {{3}} a las {{4}} en Balance Nutrición. ¿Nos confirmas tu asistencia?",
    ejemplos: ["Sofía", "control", "martes 21 de octubre", "11:00"],
    pie: "Balance Nutrición · San Salvador",
    botones: ["Confirmar", "Reagendar", "Cancelar"],
  },
  {
    id: "w2", nombre: "renovacion_plan", categoria: "MARKETING", estado: "Aprobada", actualizada: hace(23),
    cuerpo: "Hola {{1}}, tu plan {{2}} terminó el {{3}} 🥗 ¿Quieres renovarlo para seguir con tus comidas a domicilio desde el lunes?",
    ejemplos: ["Gabriela", "Two Meals", "18 oct 2026"],
    botones: ["Renovar mi plan", "Cambiar de plan", "Ahora no"],
  },
  {
    id: "w3", nombre: "entrega_en_camino", categoria: "UTILITY", estado: "En revisión", actualizada: "Hoy",
    cuerpo: "¡Hola {{1}}! Tu {{2}} va en camino 🛵 Llega entre {{3}}. Si no vas a estar, responde y le avisamos al repartidor.",
    ejemplos: ["José Luis", "plan Premium", "8:00 y 8:20"],
    botones: ["Dejar con el vigilante"],
  },
];
