// La muestra del tablero de eventos: propuestas y llamadas de demostración.
//
// TODO es ficticio salvo los lugares: los organizadores, los eventos y las
// personas son inventados; los recintos y municipios son reales de El Salvador.
// Ningún artista ni productora real. Los teléfonos van en el rango 9xxx, que en
// El Salvador no existe, para que ninguna acción del demo le llegue a alguien.
//
// Las fechas son RELATIVAS a hoy (hora de El Salvador): el día que se enseña,
// hay eventos que ya pasaron, propuestas de esta mañana y fechas de uno a
// cuatro meses. Y es determinista: el mismo día da la misma muestra en el
// servidor y en cualquier recarga.

import type {
  CambioEtapa,
  CanalOrigen,
  DatosEvento,
  Etapa,
  LlamadaEvento,
  MotivoLlamada,
  NotaInterna,
  Propuesta,
} from "./tipos";
import { datosVacios } from "./contrato";
import { diaSV, diaSemanaDeFecha, isoDeSV, sumarDias, diasEntre, fechaLarga } from "./fechas";

interface Spec {
  id: string;
  canal: CanalOrigen;
  /** Hace cuántas horas entró. */
  hace: number;
  /** Días del evento respecto de hoy (negativo = ya pasó). */
  enDias: number;
  dias?: number; // duración en días
  /** Día de la semana en que cae (0 domingo a 6 sábado). Sin esto, sábado. */
  dia?: number;
  limiteEnDias?: number;
  etapa: Etapa;
  /** Hasta qué etapa llegó antes de descartarse. */
  descartadaDesde?: Etapa;
  motivoDescarte?: string;
  asesor: string;
  /** Horas desde que entró hasta el primer contacto. Sin esto, no hubo. */
  contacto?: number;
  datos: Partial<DatosEvento>;
  resumen: string;
  notas?: { hace: number; autor: string; texto: string }[];
}

const SPECS: Spec[] = [
  {
    id: "s01",
    dia: 5,
    canal: "llamada",
    hace: 50,
    enDias: 52,
    limiteEnDias: 5,
    etapa: "negociacion",
    asesor: "s2",
    contacto: 3,
    datos: {
      tipo_evento: "concierto",
      nombre_evento: "Noche de Bandas Nacionales",
      descripcion_evento: "Concierto con seis bandas salvadoreñas, de las 4 de la tarde a la medianoche.",
      horario: "4:00 p. m. a 12:00 a. m.",
      recinto: "Estadio Cuscatlán",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "aire_libre",
      aforo_esperado: 18000,
      perfil_publico: "Jóvenes y adultos de 18 a 40 años",
      tipo_entrada: "con_boleto",
      precio_boleto: 25,
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_mas_comision",
      monto_cuota: 2500,
      porcentaje_comision: 10,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 14,
      tamano_espacio: "Dos módulos de 6 x 4 metros en la zona de comidas",
      energia_electrica: "incluida",
      agua: "no_incluida",
      toldo_mobiliario: "no_incluido",
      montaje: "Desde las 8:00 a. m. del mismo día",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo y tarjeta; hay red de datos en la zona de comidas",
      promocion_de_marca: "Logo en la pantalla del escenario y en redes del evento",
      contacto_nombre: "Diego Arévalo Mena",
      contacto_cargo: "Director de producción",
      contacto_empresa: "Volcán Azul Producciones",
      contacto_telefono: "91204415",
      contacto_correo: "diego.arevalo@volcanazul.example",
      contacto_horario: "Lunes a viernes, de 9:00 a 18:00",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Diego Arévalo, de Volcán Azul Producciones, invita a Pizza Hut a vender en la Noche de Bandas Nacionales en el Estadio Cuscatlán. Esperan 18,000 personas con boleto de $25. Ofrecen exclusividad de pizza con cuota de $2,500 más 10% de comisión; incluyen energía.",
    notas: [
      { hace: 46, autor: "s2", texto: "Hablé con Diego. Aceptan bajar la cuota si confirmamos antes del día 12. Pidió propuesta por escrito." },
      { hace: 20, autor: "s2", texto: "Enviada contrapropuesta: cuota de $1,800 y 10% de comisión. Esperando respuesta." },
    ],
  },
  {
    id: "s02",
    canal: "llamada",
    hace: 9,
    enDias: 24,
    etapa: "nueva",
    asesor: "s3",
    datos: {
      tipo_evento: "deportivo",
      nombre_evento: "Final del Torneo Intercolegial de Fútbol",
      descripcion_evento: "Final y premiación del torneo entre colegios del área metropolitana.",
      horario: "1:00 p. m. a 6:00 p. m.",
      recinto: "Estadio Nacional Jorge \"Mágico\" González",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "aire_libre",
      aforo_esperado: 6000,
      perfil_publico: "Estudiantes de bachillerato y sus familias",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "comision",
      porcentaje_comision: 12,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 6,
      tamano_espacio: "",
      energia_electrica: "por_definir",
      agua: "por_definir",
      toldo_mobiliario: "no_incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Patricia Lemus",
      contacto_cargo: "Coordinadora del torneo",
      contacto_empresa: "Liga Intercolegial Metropolitana",
      contacto_telefono: "92817734",
      contacto_correo: "",
      contacto_horario: "Por las tardes",
      contacto_canal: "llamada",
    },
    resumen:
      "Patricia Lemus, de la Liga Intercolegial Metropolitana, propone vender en la final del torneo de fútbol en el Estadio Jorge González. Esperan 6,000 personas, entrada gratuita, 12% de comisión y exclusividad de pizza. No sabe todavía si hay energía.",
  },
  {
    id: "s03",
    canal: "whatsapp",
    hace: 31,
    enDias: 38,
    dias: 2,
    etapa: "nueva",
    asesor: "s2",
    datos: {
      tipo_evento: "festival_feria",
      nombre_evento: "Festival Gastronómico de Playa",
      descripcion_evento: "Dos días de música en vivo, comida y actividades de playa.",
      horario: "10:00 a. m. a 9:00 p. m.",
      recinto: "Playa El Tunco",
      municipio: "Tamanique",
      departamento: "La Libertad",
      espacio: "aire_libre",
      aforo_esperado: 4500,
      perfil_publico: "Turistas nacionales y extranjeros, familias y surfistas",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 600,
      exclusividad_pizza: "no",
      otros_vendedores_comida: 25,
      tamano_espacio: "Espacio de 4 x 4 metros",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "no_incluido",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo, tarjeta y transferencia",
      contacto_nombre: "Karla Rosales",
      contacto_cargo: "Organizadora",
      contacto_empresa: "Colectivo Marea Alta",
      contacto_telefono: "93350218",
      contacto_correo: "karla.rosales@mareaalta.example",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Karla Rosales escribió por WhatsApp para invitar a Pizza Hut al Festival Gastronómico de Playa en El Tunco, dos días con 4,500 personas. Cuota fija de $600, sin exclusividad: habrá unos 25 vendedores de comida.",
  },
  {
    id: "s04",
    dia: 5,
    canal: "llamada",
    hace: 27,
    enDias: 75,
    dias: 10,
    etapa: "nueva",
    asesor: "s4",
    datos: {
      tipo_evento: "fiesta_patronal",
      nombre_evento: "Fiestas del Barrio San Lorenzo",
      descripcion_evento: "Diez días de fiestas con juegos mecánicos, desfile y conciertos de marimba.",
      horario: "3:00 p. m. a 11:00 p. m.",
      recinto: "Parque Libertad",
      municipio: "Santa Ana",
      departamento: "Santa Ana",
      espacio: "aire_libre",
      aforo_esperado: 8000,
      evento_recurrente: true,
      asistencia_anterior: 7000,
      perfil_publico: "Familias de Santa Ana y municipios vecinos",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 350,
      exclusividad_pizza: "por_definir",
      otros_vendedores_comida: 30,
      tamano_espacio: "",
      energia_electrica: "no_incluida",
      agua: "por_definir",
      toldo_mobiliario: "por_definir",
      permisos_a_cargo_de: "por_definir",
      contacto_nombre: "José Luis Portillo",
      contacto_cargo: "Presidente del comité de festejos",
      contacto_empresa: "Comité de Festejos Barrio San Lorenzo",
      contacto_telefono: "94468120",
      contacto_correo: "",
      contacto_horario: "Después de las 5:00 p. m.",
      contacto_canal: "llamada",
    },
    resumen:
      "José Luis Portillo, del comité de festejos del Barrio San Lorenzo, invita a Pizza Hut a las fiestas en el Parque Libertad de Santa Ana: diez días y unas 8,000 personas; el año pasado llegaron 7,000. Cuota de $350 por los diez días. La energía no está incluida.",
  },
  {
    id: "s05",
    dia: 4,
    canal: "llamada",
    hace: 5,
    enDias: 33,
    etapa: "nueva",
    asesor: "s5",
    datos: {
      tipo_evento: "corporativo",
      nombre_evento: "Convención anual de distribuidores",
      descripcion_evento: "Convención de dos jornadas para clientes y distribuidores de una empresa de repuestos.",
      horario: "8:00 a. m. a 5:00 p. m.",
      recinto: "CIFCO",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "techado",
      aforo_esperado: 1200,
      perfil_publico: "Empresarios y personal de ventas",
      tipo_entrada: "gratuita",
      modalidad: "catering",
      condicion_comercial: "por_definir",
      exclusividad_pizza: "si",
      tamano_espacio: "Área de almuerzo dentro del pabellón",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Mónica Beltrán",
      contacto_cargo: "Jefa de mercadeo",
      contacto_empresa: "Repuestos Centroamericanos del Norte",
      contacto_telefono: "95513307",
      contacto_correo: "mbeltran@repuestoscn.example",
      contacto_horario: "Lunes a viernes por la mañana",
      contacto_canal: "correo",
    },
    resumen:
      "Mónica Beltrán busca catering de pizza para el almuerzo de una convención de 1,200 personas en CIFCO. Ofrecen exclusividad y todo incluido; las condiciones comerciales quedan por definir con el asesor.",
  },
  {
    id: "s06",
    dia: 4,
    canal: "instagram",
    hace: 70,
    enDias: 44,
    etapa: "revision",
    asesor: "s2",
    contacto: 16,
    datos: {
      tipo_evento: "educativo",
      nombre_evento: "Expo Ingenio",
      descripcion_evento: "Feria de proyectos de ciencia y emprendimiento estudiantil.",
      horario: "9:00 a. m. a 4:00 p. m.",
      recinto: "Ciudad Universitaria",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "mixto",
      aforo_esperado: 3000,
      perfil_publico: "Estudiantes universitarios y de bachillerato",
      tipo_entrada: "gratuita",
      modalidad: "mixta",
      condicion_comercial: "sin_costo",
      exclusividad_pizza: "si",
      otros_vendedores_comida: 5,
      tamano_espacio: "Un stand de 3 x 3 metros",
      energia_electrica: "incluida",
      agua: "por_definir",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      promocion_de_marca: "Logo en afiches y en el premio al mejor proyecto",
      contacto_nombre: "Fernando Aguilar",
      contacto_cargo: "Presidente del comité organizador",
      contacto_empresa: "Comité Expo Ingenio",
      contacto_telefono: "96620981",
      contacto_correo: "expo.ingenio@correo.example",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Fernando Aguilar escribió por Instagram para invitar a Pizza Hut a Expo Ingenio: 3,000 estudiantes, sin costo de participación y con exclusividad. Piden además pizzas para el jurado a cambio del logo en el premio.",
    notas: [{ hace: 50, autor: "s2", texto: "Revisar con mercadeo si el canje de pizzas para el jurado entra en el presupuesto de patrocinios." }],
  },
  {
    id: "s07",
    canal: "facebook",
    hace: 96,
    enDias: 19,
    etapa: "contactado",
    asesor: "s4",
    contacto: 7,
    datos: {
      tipo_evento: "religioso_comunitario",
      nombre_evento: "Kermés parroquial",
      descripcion_evento: "Kermés de fin de semana para recaudar fondos para la parroquia.",
      horario: "10:00 a. m. a 8:00 p. m.",
      recinto: "Parque central de Ilobasco",
      municipio: "Ilobasco",
      departamento: "Cabañas",
      espacio: "aire_libre",
      aforo_esperado: 1500,
      perfil_publico: "Familias de la comunidad",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "comision",
      porcentaje_comision: 10,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 12,
      tamano_espacio: "Puesto de 3 x 3 metros",
      energia_electrica: "incluida",
      agua: "no_incluida",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo",
      contacto_nombre: "Rosa Elena Cáceres",
      contacto_cargo: "Coordinadora de la kermés",
      contacto_empresa: "Pastoral juvenil de la parroquia",
      contacto_telefono: "97735016",
      contacto_correo: "",
      contacto_canal: "llamada",
    },
    resumen:
      "Rosa Elena Cáceres escribió por Messenger: kermés de fin de semana en Ilobasco para 1,500 personas, 10% de comisión para la parroquia y exclusividad de pizza.",
    notas: [{ hace: 89, autor: "s4", texto: "Llamé a doña Rosa. Confirmó que la plaza tiene tomacorrientes; el agua la tendríamos que llevar." }],
  },
  {
    id: "s08",
    canal: "llamada",
    hace: 140,
    enDias: 45,
    etapa: "negociacion",
    asesor: "s3",
    contacto: 4,
    limiteEnDias: 6,
    datos: {
      tipo_evento: "deportivo",
      nombre_evento: "Media maratón nocturna",
      descripcion_evento: "Carrera de 21 kilómetros por el centro de San Salvador, con feria en la meta.",
      horario: "6:00 p. m. a 11:00 p. m.",
      recinto: "Plaza Salvador del Mundo",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "aire_libre",
      aforo_esperado: 8000,
      evento_recurrente: true,
      asistencia_anterior: 6500,
      perfil_publico: "Corredores y sus familias, de 18 a 50 años",
      tipo_entrada: "con_boleto",
      precio_boleto: 30,
      modalidad: "patrocinio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 1500,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 8,
      tamano_espacio: "Carpa de 6 x 6 metros junto a la meta",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "no_incluido",
      montaje: "Desde las 2:00 p. m.",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo y tarjeta",
      promocion_de_marca: "Logo en la camiseta oficial y en el arco de meta",
      contacto_nombre: "Mario Cornejo",
      contacto_cargo: "Gerente comercial",
      contacto_empresa: "Ruta Nocturna Eventos Deportivos",
      contacto_telefono: "98104462",
      contacto_correo: "mcornejo@rutanocturna.example",
      contacto_horario: "Cualquier día después de las 2:00 p. m.",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Mario Cornejo propone a Pizza Hut como patrocinador de la media maratón nocturna: 8,000 personas entre corredores y público, logo en la camiseta oficial y carpa en la meta por $1,500. La edición pasada reunió 6,500 personas.",
    notas: [{ hace: 30, autor: "s3", texto: "Mercadeo aprobó el patrocinio en principio. Falta confirmar la ubicación de la carpa." }],
  },
  {
    id: "s09",
    dia: 5,
    canal: "llamada",
    hace: 216,
    enDias: 66,
    dias: 2,
    etapa: "confirmada",
    asesor: "s2",
    contacto: 2,
    datos: {
      tipo_evento: "concierto",
      nombre_evento: "Festival de Rock del Puerto",
      descripcion_evento: "Dos noches de rock nacional frente al mar.",
      horario: "5:00 p. m. a 1:00 a. m.",
      recinto: "Malecón del Puerto de La Libertad",
      municipio: "La Libertad",
      departamento: "La Libertad",
      espacio: "aire_libre",
      aforo_esperado: 9000,
      evento_recurrente: true,
      asistencia_anterior: 7800,
      perfil_publico: "Jóvenes de 18 a 35 años",
      tipo_entrada: "con_boleto",
      precio_boleto: 15,
      modalidad: "venta_en_sitio",
      condicion_comercial: "comision",
      porcentaje_comision: 15,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 10,
      tamano_espacio: "Módulo de 6 x 3 metros",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "incluido",
      montaje: "El día anterior desde las 3:00 p. m.",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo, tarjeta y pago con QR",
      promocion_de_marca: "Menciones desde el escenario",
      contacto_nombre: "Andrea Castaneda",
      contacto_cargo: "Productora general",
      contacto_empresa: "Oleaje Música",
      contacto_telefono: "93052271",
      contacto_correo: "andrea@oleajemusica.example",
      contacto_horario: "Lunes a sábado",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Andrea Castaneda, de Oleaje Música, invita a Pizza Hut al Festival de Rock del Puerto: dos noches con 9,000 personas, 15% de comisión, exclusividad y todo incluido.",
    notas: [{ hace: 48, autor: "s2", texto: "Contrato firmado. Montaje el día anterior; coordinar con operaciones el horno portátil." }],
  },
  {
    id: "s10",
    dia: 5,
    canal: "llamada",
    hace: 22,
    enDias: 58,
    dias: 3,
    etapa: "revision",
    asesor: "s4",
    contacto: 10,
    datos: {
      tipo_evento: "festival_feria",
      nombre_evento: "Feria de emprendedores de fin de semana",
      descripcion_evento: "Tres días con más de cien emprendimientos, música y zona infantil.",
      horario: "10:00 a. m. a 10:00 p. m.",
      recinto: "Paseo El Carmen",
      municipio: "Santa Tecla",
      departamento: "La Libertad",
      espacio: "aire_libre",
      aforo_esperado: 5000,
      perfil_publico: "Familias y jóvenes",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 450,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 18,
      tamano_espacio: "Puesto de 3 x 6 metros",
      energia_electrica: "incluida",
      agua: "no_incluida",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo y tarjeta",
      contacto_nombre: "Luis Fernando Rivas",
      contacto_cargo: "Coordinador de expositores",
      contacto_empresa: "Red de Emprendedores Tecleños",
      contacto_telefono: "94170035",
      contacto_correo: "expositores@emprendeteclenos.example",
      contacto_canal: "correo",
    },
    resumen:
      "Luis Fernando Rivas invita a Pizza Hut a una feria de emprendedores de tres días en el Paseo El Carmen, Santa Tecla: 5,000 personas, cuota de $450 y exclusividad de pizza.",
  },
  {
    id: "s11",
    canal: "correo",
    hace: 49,
    enDias: 28,
    etapa: "contactado",
    asesor: "s5",
    contacto: 20,
    datos: {
      tipo_evento: "corporativo",
      nombre_evento: "Día de la familia",
      descripcion_evento: "Convivio anual para los empleados de una planta de confección y sus familias.",
      horario: "9:00 a. m. a 3:00 p. m.",
      recinto: "Parque Bicentenario",
      municipio: "Antiguo Cuscatlán",
      departamento: "La Libertad",
      espacio: "aire_libre",
      aforo_esperado: 2500,
      perfil_publico: "Empleados y sus familias",
      tipo_entrada: "gratuita",
      modalidad: "catering",
      condicion_comercial: "sin_costo",
      exclusividad_pizza: "si",
      tamano_espacio: "",
      energia_electrica: "por_definir",
      agua: "por_definir",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Claudia Mejía",
      contacto_cargo: "Jefa de recursos humanos",
      contacto_empresa: "Confecciones Brisa Marina",
      contacto_telefono: "95281146",
      contacto_correo: "cmejia@brisamarina.example",
      contacto_canal: "correo",
    },
    resumen:
      "Claudia Mejía escribió por correo: buscan catering de pizza para el día de la familia de 2,500 personas en el Parque Bicentenario. La empresa paga el consumo.",
    notas: [{ hace: 28, autor: "s5", texto: "Le mandé el menú de catering para grupos. Pide cotización por 400 pizzas." }],
  },
  {
    id: "s12",
    dia: 5,
    canal: "whatsapp",
    hace: 12,
    enDias: 17,
    etapa: "nueva",
    asesor: "s2",
    datos: {
      tipo_evento: "educativo",
      nombre_evento: "Festival deportivo del colegio",
      descripcion_evento: "Jornada de deportes y convivio de toda la comunidad educativa.",
      horario: "7:00 a. m. a 2:00 p. m.",
      recinto: "Colegio Bilingüe Los Almendros",
      municipio: "Santa Tecla",
      departamento: "La Libertad",
      espacio: "mixto",
      aforo_esperado: 900,
      perfil_publico: "Alumnos de primaria y secundaria, padres de familia",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "comision",
      porcentaje_comision: 10,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 4,
      tamano_espacio: "Mesa en la cancha techada",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Sandra Escalante",
      contacto_cargo: "Coordinadora de actividades",
      contacto_empresa: "Colegio Bilingüe Los Almendros",
      contacto_telefono: "96402258",
      contacto_correo: "actividades@losalmendros.example",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Sandra Escalante, del Colegio Los Almendros, invita a Pizza Hut al festival deportivo: 900 personas, 10% de comisión para la asociación de padres y exclusividad.",
  },
  {
    id: "s13",
    canal: "llamada",
    hace: 170,
    enDias: 21,
    etapa: "confirmada",
    asesor: "s4",
    contacto: 5,
    datos: {
      tipo_evento: "deportivo",
      nombre_evento: "Juego de Estrellas de Baloncesto",
      descripcion_evento: "Partido de exhibición con los mejores jugadores de la liga y concurso de clavadas.",
      horario: "5:00 p. m. a 10:00 p. m.",
      recinto: "Gimnasio Nacional Adolfo Pineda",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "techado",
      aforo_esperado: 4000,
      perfil_publico: "Aficionados al baloncesto, jóvenes y familias",
      tipo_entrada: "con_boleto",
      precio_boleto: 8,
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 800,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 5,
      tamano_espacio: "Dos puestos en el lobby",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "incluido",
      montaje: "Desde las 12:00 m.",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo y tarjeta",
      contacto_nombre: "Gerardo Funes",
      contacto_cargo: "Director del evento",
      contacto_empresa: "Asociación de Baloncesto Capitalino",
      contacto_telefono: "97516640",
      contacto_correo: "gfunes@baloncestocapitalino.example",
      contacto_canal: "llamada",
    },
    resumen:
      "Gerardo Funes propone vender en el Juego de Estrellas de Baloncesto en el Gimnasio Nacional: 4,000 personas, boleto de $8, cuota de $800 y exclusividad de pizza.",
  },
  {
    id: "s14",
    canal: "llamada",
    hace: 240,
    enDias: 95,
    dias: 7,
    etapa: "negociacion",
    asesor: "s3",
    contacto: 8,
    datos: {
      tipo_evento: "fiesta_patronal",
      nombre_evento: "Fiestas del Barrio La Merced",
      descripcion_evento: "Una semana de fiestas con carrozas, juegos y escenario de música.",
      horario: "4:00 p. m. a 11:00 p. m.",
      recinto: "Parque David J. Guzmán",
      municipio: "San Miguel",
      departamento: "San Miguel",
      espacio: "aire_libre",
      aforo_esperado: 12000,
      evento_recurrente: true,
      asistencia_anterior: 11000,
      perfil_publico: "Familias de San Miguel y visitantes de oriente",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 900,
      exclusividad_pizza: "no",
      otros_vendedores_comida: 40,
      tamano_espacio: "Puesto de 4 x 4 metros",
      energia_electrica: "incluida",
      agua: "no_incluida",
      toldo_mobiliario: "no_incluido",
      permisos_a_cargo_de: "pizza_hut",
      medios_de_pago: "Efectivo",
      contacto_nombre: "Óscar Villatoro",
      contacto_cargo: "Tesorero del comité",
      contacto_empresa: "Comité de Festejos La Merced",
      contacto_telefono: "98633405",
      contacto_correo: "",
      contacto_horario: "Por las noches",
      contacto_canal: "llamada",
    },
    resumen:
      "Óscar Villatoro invita a Pizza Hut a una semana de fiestas en el Parque Guzmán de San Miguel: 12,000 personas, cuota de $900 y sin exclusividad. El permiso municipal correría por cuenta de Pizza Hut.",
    notas: [{ hace: 100, autor: "s3", texto: "Pidieron $1,200; quedamos en $900 si el puesto queda frente al escenario. Falta el permiso municipal." }],
  },
  {
    id: "s15",
    canal: "llamada",
    hace: 360,
    enDias: 40,
    etapa: "contactado",
    asesor: "s5",
    contacto: 22,
    datos: {
      tipo_evento: "concierto",
      nombre_evento: "Concierto sinfónico al aire libre",
      descripcion_evento: "Orquesta juvenil con repertorio de música salvadoreña.",
      horario: "6:00 p. m. a 9:00 p. m.",
      recinto: "Plaza Gerardo Barrios",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "aire_libre",
      aforo_esperado: 3000,
      perfil_publico: "Público general y familias",
      tipo_entrada: "gratuita",
      modalidad: "patrocinio",
      condicion_comercial: "canje",
      exclusividad_pizza: "si",
      tamano_espacio: "Stand de 3 x 3 metros",
      energia_electrica: "incluida",
      agua: "por_definir",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      promocion_de_marca: "Logo en el programa impreso y mención al cierre",
      contacto_nombre: "Elena Durán",
      contacto_cargo: "Gestora cultural",
      contacto_empresa: "Fundación Notas del Valle",
      contacto_telefono: "92289961",
      contacto_correo: "elena.duran@notasdelvalle.example",
      contacto_canal: "correo",
    },
    resumen:
      "Elena Durán, de la Fundación Notas del Valle, ofrece un canje: pizzas para los 80 músicos a cambio del logo en el programa y un stand en la Plaza Gerardo Barrios, con 3,000 asistentes.",
  },
  {
    id: "s16",
    canal: "instagram",
    hace: 120,
    enDias: 34,
    dias: 2,
    etapa: "descartada",
    descartadaDesde: "contactado",
    motivoDescarte: "Aforo muy bajo para montar un punto de venta",
    asesor: "s3",
    contacto: 9,
    datos: {
      tipo_evento: "festival_feria",
      nombre_evento: "Encuentro de food trucks en la montaña",
      descripcion_evento: "Fin de semana de food trucks y música acústica.",
      horario: "11:00 a. m. a 7:00 p. m.",
      recinto: "Parque central de Concepción de Ataco",
      municipio: "Concepción de Ataco",
      departamento: "Ahuachapán",
      espacio: "aire_libre",
      aforo_esperado: 600,
      perfil_publico: "Turistas de fin de semana",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 300,
      exclusividad_pizza: "no",
      otros_vendedores_comida: 15,
      energia_electrica: "no_incluida",
      agua: "no_incluida",
      toldo_mobiliario: "no_incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Tomás Henríquez",
      contacto_cargo: "Organizador",
      contacto_empresa: "Ruta Sabores de Occidente",
      contacto_telefono: "93745520",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Tomás Henríquez escribió por Instagram: encuentro de food trucks en Ataco para 600 personas, cuota de $300 y sin servicios incluidos.",
  },
  {
    id: "s17",
    canal: "llamada",
    hace: 75,
    enDias: 31,
    etapa: "revision",
    asesor: "s2",
    contacto: 6,
    datos: {
      tipo_evento: "deportivo",
      nombre_evento: "Torneo de voleibol de playa",
      descripcion_evento: "Torneo abierto por parejas con premiación al atardecer.",
      horario: "8:00 a. m. a 6:00 p. m.",
      recinto: "Playa El Sunzal",
      municipio: "Tamanique",
      departamento: "La Libertad",
      espacio: "aire_libre",
      aforo_esperado: 1500,
      perfil_publico: "Deportistas y turistas de playa",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "comision",
      porcentaje_comision: 12,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 3,
      tamano_espacio: "Carpa de 3 x 3 metros en la arena",
      energia_electrica: "por_definir",
      agua: "no_incluida",
      toldo_mobiliario: "no_incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Raúl Montoya",
      contacto_cargo: "Organizador",
      contacto_empresa: "Club Arena y Red",
      contacto_telefono: "94921187",
      contacto_correo: "raul.montoya@arenayred.example",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Raúl Montoya invita a Pizza Hut al torneo de voleibol de playa en El Sunzal: 1,500 personas, 12% de comisión y exclusividad de pizza.",
  },
  {
    id: "s18",
    dia: 4,
    canal: "whatsapp",
    hace: 4,
    enDias: 12,
    etapa: "nueva",
    asesor: "s5",
    datos: {
      tipo_evento: "corporativo",
      nombre_evento: "Inauguración de oficinas",
      descripcion_evento: "Apertura de un nuevo centro de llamadas con convivio para el personal.",
      horario: "",
      recinto: "Oficinas de la empresa",
      municipio: "Antiguo Cuscatlán",
      departamento: "La Libertad",
      espacio: "techado",
      aforo_esperado: 700,
      perfil_publico: "Personal de la empresa",
      tipo_entrada: "gratuita",
      modalidad: "catering",
      condicion_comercial: "sin_costo",
      exclusividad_pizza: "si",
      contacto_nombre: "Iván Saravia",
      contacto_cargo: "Coordinador de operaciones",
      contacto_empresa: "Conecta Servicios de Contacto",
      contacto_telefono: "95067719",
      contacto_correo: "",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Iván Saravia escribió por WhatsApp: necesitan pizzas para 700 personas en la inauguración de sus oficinas. Todavía no tiene el horario.",
  },
  {
    id: "s19",
    dia: 5,
    canal: "llamada",
    hace: 20,
    enDias: 48,
    etapa: "nueva",
    asesor: "s3",
    datos: {
      tipo_evento: "educativo",
      nombre_evento: "Fiesta de promoción",
      descripcion_evento: "Fiesta de graduación de bachillerato abierta a la comunidad.",
      horario: "",
      recinto: "Cancha del complejo educativo",
      municipio: "Zacatecoluca",
      departamento: "La Paz",
      espacio: "",
      aforo_esperado: 800,
      perfil_publico: "Graduandos y familias",
      tipo_entrada: "",
      modalidad: "venta_en_sitio",
      condicion_comercial: "por_definir",
      exclusividad_pizza: "por_definir",
      contacto_nombre: "Wendy Orellana",
      contacto_cargo: "Madre de familia del comité",
      contacto_empresa: "Comité de padres de familia",
      // Llamó sin dar otro número: queda el número desde el que llamó.
      contacto_telefono: "99547710",
      contacto_correo: "",
      contacto_canal: "llamada",
    },
    resumen:
      "Wendy Orellana, del comité de padres, consulta si Pizza Hut puede vender en la fiesta de promoción en Zacatecoluca, unas 800 personas. No tenía claras las condiciones ni el horario.",
  },
  {
    id: "s20",
    canal: "llamada",
    hace: 52,
    enDias: 59,
    etapa: "contactado",
    asesor: "s3",
    contacto: 5,
    datos: {
      tipo_evento: "religioso_comunitario",
      nombre_evento: "Festival juvenil comunitario",
      descripcion_evento: "Jornada juvenil con música, deporte y feria de emprendimientos.",
      horario: "2:00 p. m. a 10:00 p. m.",
      recinto: "Estadio Juan Francisco Barraza",
      municipio: "San Miguel",
      departamento: "San Miguel",
      espacio: "aire_libre",
      aforo_esperado: 7000,
      perfil_publico: "Jóvenes de 15 a 30 años",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "sin_costo",
      exclusividad_pizza: "si",
      otros_vendedores_comida: 9,
      tamano_espacio: "Puesto de 4 x 3 metros en la pista",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "no_incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Néstor Ramírez",
      contacto_cargo: "Coordinador general",
      contacto_empresa: "Red Juvenil de Oriente",
      contacto_telefono: "96754308",
      contacto_correo: "nramirez@redjuvenil.example",
      contacto_canal: "llamada",
    },
    resumen:
      "Néstor Ramírez invita a Pizza Hut al festival juvenil en el Estadio Barraza de San Miguel: 7,000 jóvenes, sin costo de participación, exclusividad, energía y agua incluidas.",
  },
  {
    id: "s21",
    canal: "llamada",
    hace: 26,
    enDias: 80,
    etapa: "revision",
    asesor: "s4",
    contacto: 3,
    datos: {
      tipo_evento: "concierto",
      nombre_evento: "Tributo a los clásicos del rock",
      descripcion_evento: "Concierto de bandas tributo con canciones de los años ochenta.",
      horario: "6:00 p. m. a 11:00 p. m.",
      recinto: "Estadio Las Delicias",
      municipio: "Santa Tecla",
      departamento: "La Libertad",
      espacio: "aire_libre",
      aforo_esperado: 5000,
      perfil_publico: "Adultos de 30 a 55 años",
      tipo_entrada: "con_boleto",
      precio_boleto: 20,
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 1200,
      exclusividad_pizza: "por_definir",
      otros_vendedores_comida: 8,
      tamano_espacio: "Módulo de 4 x 4 metros",
      energia_electrica: "incluida",
      agua: "por_definir",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Alejandro Pineda",
      contacto_cargo: "Socio",
      contacto_empresa: "Eco de Montaña Producciones",
      contacto_telefono: "97188852",
      contacto_correo: "apineda@ecodemontana.example",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Alejandro Pineda propone vender en un concierto de bandas tributo en el Estadio Las Delicias: 5,000 personas, boleto de $20 y cuota de $1,200. La exclusividad está por definir.",
  },
  {
    id: "s22",
    canal: "llamada",
    hace: 190,
    enDias: 21,
    etapa: "confirmada",
    asesor: "s5",
    contacto: 2,
    datos: {
      tipo_evento: "deportivo",
      nombre_evento: "Torneo regional de veteranos",
      descripcion_evento: "Cuadrangular de fútbol de veteranos con final el mismo día.",
      horario: "9:00 a. m. a 5:00 p. m.",
      recinto: "Estadio Óscar Quiteño",
      municipio: "Santa Ana",
      departamento: "Santa Ana",
      espacio: "aire_libre",
      aforo_esperado: 3500,
      evento_recurrente: true,
      asistencia_anterior: 3000,
      perfil_publico: "Aficionados y familias de occidente",
      tipo_entrada: "con_boleto",
      precio_boleto: 5,
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_mas_comision",
      monto_cuota: 400,
      porcentaje_comision: 8,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 6,
      tamano_espacio: "Puesto en la entrada principal",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "no_incluido",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo",
      contacto_nombre: "Hugo Salazar",
      contacto_cargo: "Presidente de la liga",
      contacto_empresa: "Liga de Veteranos de Occidente",
      contacto_telefono: "98420176",
      contacto_correo: "hsalazar@veteranosoccidente.example",
      contacto_canal: "llamada",
    },
    resumen:
      "Hugo Salazar invita a Pizza Hut al torneo regional de veteranos en el Estadio Óscar Quiteño: 3,500 personas, $400 de cuota más 8% y exclusividad. El año pasado llegaron 3,000.",
  },
  {
    id: "s23",
    dia: 4,
    canal: "correo",
    hace: 264,
    enDias: 88,
    dias: 4,
    limiteEnDias: 20,
    etapa: "negociacion",
    asesor: "s4",
    contacto: 18,
    datos: {
      tipo_evento: "festival_feria",
      nombre_evento: "Exposición de vivienda y decoración",
      descripcion_evento: "Cuatro días de exposición con desarrolladoras, bancos y tiendas de decoración.",
      horario: "10:00 a. m. a 8:00 p. m.",
      recinto: "CIFCO",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "techado",
      aforo_esperado: 15000,
      perfil_publico: "Familias y parejas de 25 a 50 años",
      tipo_entrada: "con_boleto",
      precio_boleto: 3,
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 2000,
      exclusividad_pizza: "no",
      otros_vendedores_comida: 12,
      tamano_espacio: "Local de 5 x 5 metros en la plaza de comidas",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "incluido",
      montaje: "Dos días antes",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo y tarjeta",
      contacto_nombre: "Verónica Alas",
      contacto_cargo: "Gerente de ventas de espacios",
      contacto_empresa: "Expo Hogar Centroamérica",
      contacto_telefono: "99310064",
      contacto_correo: "valas@expohogar.example",
      contacto_horario: "Lunes a viernes, de 8:00 a 17:00",
      contacto_canal: "correo",
    },
    resumen:
      "Verónica Alas ofrece un local en la plaza de comidas de una exposición de cuatro días en CIFCO: 15,000 visitantes, cuota de $2,000, sin exclusividad (habrá 12 vendedores de comida).",
    notas: [{ hace: 120, autor: "s4", texto: "Pedimos exclusividad en pizza y nos ofrecieron el local más cercano a la entrada. Revisar con gerencia." }],
  },
  {
    id: "s24",
    canal: "facebook",
    hace: 144,
    enDias: 26,
    etapa: "contactado",
    asesor: "s2",
    contacto: 12,
    datos: {
      tipo_evento: "otro",
      nombre_evento: "Autocinema familiar",
      descripcion_evento: "Funciones de cine al aire libre desde el carro, sábado y domingo.",
      horario: "6:00 p. m. a 11:00 p. m.",
      recinto: "Parque Cuscatlán",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "aire_libre",
      aforo_esperado: 1800,
      perfil_publico: "Familias y parejas",
      tipo_entrada: "con_boleto",
      precio_boleto: 12,
      modalidad: "venta_en_sitio",
      condicion_comercial: "comision",
      porcentaje_comision: 15,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 2,
      tamano_espacio: "Puesto junto a la entrada vehicular",
      energia_electrica: "incluida",
      agua: "no_incluida",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Tarjeta y pago con QR",
      contacto_nombre: "Gabriel Zelaya",
      contacto_cargo: "Organizador",
      contacto_empresa: "Cine Bajo las Estrellas",
      contacto_telefono: "92036618",
      contacto_correo: "",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Gabriel Zelaya escribió por Messenger: autocinema familiar en el Parque Cuscatlán, unas 1,800 personas por fin de semana, 15% de comisión y exclusividad. Quiere entrega de pizza a los carros.",
  },
  // ── Ya pasaron ──
  {
    id: "s25",
    canal: "llamada",
    hace: 60 * 24,
    enDias: -20,
    etapa: "confirmada",
    asesor: "s3",
    contacto: 4,
    datos: {
      tipo_evento: "concierto",
      nombre_evento: "Festival de cumbia",
      descripcion_evento: "Concierto con orquestas nacionales de cumbia.",
      horario: "5:00 p. m. a 12:00 a. m.",
      recinto: "Estadio Cuscatlán",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "aire_libre",
      aforo_esperado: 15000,
      perfil_publico: "Adultos de 25 a 55 años",
      tipo_entrada: "con_boleto",
      precio_boleto: 18,
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_mas_comision",
      monto_cuota: 2000,
      porcentaje_comision: 10,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 12,
      tamano_espacio: "Dos módulos de 6 x 4 metros",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "no_incluido",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo y tarjeta",
      contacto_nombre: "Diego Arévalo Mena",
      contacto_cargo: "Director de producción",
      contacto_empresa: "Volcán Azul Producciones",
      contacto_telefono: "91204415",
      contacto_correo: "diego.arevalo@volcanazul.example",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Diego Arévalo propone vender en un festival de cumbia en el Estadio Cuscatlán: 15,000 personas, $2,000 de cuota más 10% y exclusividad de pizza.",
    notas: [{ hace: 19 * 24, autor: "s3", texto: "Evento realizado. Se agotó el producto a las 10:30 p. m.; para la próxima llevar un horno más." }],
  },
  {
    id: "s26",
    dia: 0,
    canal: "llamada",
    hace: 45 * 24,
    enDias: -12,
    etapa: "confirmada",
    asesor: "s4",
    contacto: 6,
    datos: {
      tipo_evento: "deportivo",
      nombre_evento: "Carrera 10K de la ciudad",
      descripcion_evento: "Carrera de 10 kilómetros con salida y meta en la plaza.",
      horario: "5:30 a. m. a 11:00 a. m.",
      recinto: "Plaza Salvador del Mundo",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "aire_libre",
      aforo_esperado: 5000,
      evento_recurrente: true,
      asistencia_anterior: 4200,
      perfil_publico: "Corredores y familias",
      tipo_entrada: "con_boleto",
      precio_boleto: 25,
      modalidad: "patrocinio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 1000,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 4,
      tamano_espacio: "Carpa en la meta",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      promocion_de_marca: "Logo en la medalla y en la camiseta",
      contacto_nombre: "Mario Cornejo",
      contacto_cargo: "Gerente comercial",
      contacto_empresa: "Ruta Nocturna Eventos Deportivos",
      contacto_telefono: "98104462",
      contacto_correo: "mcornejo@rutanocturna.example",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Mario Cornejo ofrece el patrocinio de la carrera 10K con carpa en la meta: 5,000 personas y logo en la medalla por $1,000.",
    notas: [{ hace: 11 * 24, autor: "s4", texto: "Realizado. Buena respuesta; el mismo organizador ya llamó por la media maratón." }],
  },
  {
    id: "s27",
    dia: 3,
    canal: "llamada",
    hace: 55 * 24,
    enDias: -30,
    dias: 5,
    etapa: "descartada",
    descartadaDesde: "negociacion",
    motivoDescarte: "Fecha choca con otro evento confirmado",
    asesor: "s5",
    contacto: 9,
    datos: {
      tipo_evento: "fiesta_patronal",
      nombre_evento: "Fiestas del Barrio El Centro",
      descripcion_evento: "Cinco días de fiestas con carnaval de cierre.",
      horario: "3:00 p. m. a 11:00 p. m.",
      recinto: "Parque central de Apopa",
      municipio: "Apopa",
      departamento: "San Salvador",
      espacio: "aire_libre",
      aforo_esperado: 6000,
      evento_recurrente: true,
      asistencia_anterior: 5000,
      perfil_publico: "Familias",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 500,
      exclusividad_pizza: "no",
      otros_vendedores_comida: 35,
      tamano_espacio: "Puesto de 3 x 3 metros",
      energia_electrica: "no_incluida",
      agua: "no_incluida",
      toldo_mobiliario: "no_incluido",
      permisos_a_cargo_de: "pizza_hut",
      contacto_nombre: "Rigoberto Alvarado",
      contacto_cargo: "Coordinador",
      contacto_empresa: "Comité de Festejos Barrio El Centro",
      contacto_telefono: "93915540",
      contacto_canal: "llamada",
    },
    resumen:
      "Rigoberto Alvarado invita a Pizza Hut a cinco días de fiestas en Apopa: 6,000 personas, cuota de $500, sin exclusividad ni servicios incluidos.",
  },
  {
    id: "s28",
    dia: 3,
    canal: "llamada",
    hace: 35 * 24,
    enDias: -8,
    dias: 3,
    etapa: "confirmada",
    asesor: "s2",
    contacto: 3,
    datos: {
      tipo_evento: "educativo",
      nombre_evento: "Semana cultural universitaria",
      descripcion_evento: "Tres días de conciertos, ferias y competencias entre facultades.",
      horario: "10:00 a. m. a 7:00 p. m.",
      recinto: "Universidad Centroamericana José Simeón Cañas",
      municipio: "Antiguo Cuscatlán",
      departamento: "La Libertad",
      espacio: "mixto",
      aforo_esperado: 6000,
      evento_recurrente: true,
      asistencia_anterior: 5500,
      perfil_publico: "Estudiantes universitarios",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "comision",
      porcentaje_comision: 10,
      exclusividad_pizza: "si",
      otros_vendedores_comida: 7,
      tamano_espacio: "Stand de 3 x 6 metros",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      medios_de_pago: "Efectivo, tarjeta y pago con QR",
      contacto_nombre: "Daniela Mejía Rivas",
      contacto_cargo: "Presidenta de la asociación de estudiantes",
      contacto_empresa: "Asociación de estudiantes",
      contacto_telefono: "94487213",
      contacto_correo: "asociacion.estudiantes@correo.example",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Daniela Mejía, de la asociación de estudiantes, invita a Pizza Hut a la semana cultural: tres días con 6,000 estudiantes, 10% de comisión y exclusividad.",
    notas: [{ hace: 7 * 24, autor: "s2", texto: "Realizado. Pidieron repetir el próximo año con dos puntos de venta." }],
  },
  {
    id: "s29",
    dia: 4,
    canal: "llamada",
    hace: 40 * 24,
    enDias: -15,
    dias: 2,
    etapa: "descartada",
    descartadaDesde: "contactado",
    motivoDescarte: "Condición comercial no conviene",
    asesor: "s3",
    contacto: 5,
    datos: {
      tipo_evento: "corporativo",
      nombre_evento: "Feria de empleo",
      descripcion_evento: "Dos días de feria de empleo con empresas de todo el país.",
      horario: "8:00 a. m. a 4:00 p. m.",
      recinto: "CIFCO",
      municipio: "San Salvador",
      departamento: "San Salvador",
      espacio: "techado",
      aforo_esperado: 4000,
      perfil_publico: "Jóvenes buscando empleo",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "cuota_fija",
      monto_cuota: 2500,
      exclusividad_pizza: "no",
      otros_vendedores_comida: 10,
      tamano_espacio: "Local en la plaza de comidas",
      energia_electrica: "incluida",
      agua: "incluida",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Silvia Recinos",
      contacto_cargo: "Coordinadora de logística",
      contacto_empresa: "Talento en Ruta",
      contacto_telefono: "95608349",
      contacto_correo: "srecinos@talentoenruta.example",
      contacto_canal: "correo",
    },
    resumen:
      "Silvia Recinos ofrece un local en una feria de empleo en CIFCO: 4,000 personas, cuota de $2,500 y sin exclusividad.",
  },
  {
    id: "s30",
    dia: 0,
    canal: "instagram",
    hace: 25 * 24,
    enDias: -5,
    etapa: "descartada",
    descartadaDesde: "revision",
    motivoDescarte: "El organizador no respondió",
    asesor: "s4",
    contacto: 11,
    datos: {
      tipo_evento: "festival_feria",
      nombre_evento: "Festival de cometas",
      descripcion_evento: "Tarde de cometas y juegos para niños en la playa.",
      horario: "1:00 p. m. a 6:00 p. m.",
      recinto: "Playa El Majahual",
      municipio: "La Libertad",
      departamento: "La Libertad",
      espacio: "aire_libre",
      aforo_esperado: 2000,
      perfil_publico: "Familias con niños",
      tipo_entrada: "gratuita",
      modalidad: "venta_en_sitio",
      condicion_comercial: "por_definir",
      exclusividad_pizza: "por_definir",
      contacto_nombre: "Lucía Pérez",
      contacto_cargo: "Organizadora",
      contacto_empresa: "Vientos de Costa",
      contacto_telefono: "96118870",
      contacto_canal: "whatsapp",
    },
    resumen: "Lucía Pérez escribió por Instagram por un festival de cometas en El Majahual para 2,000 personas. No dejó condiciones.",
  },
  {
    id: "s31",
    canal: "whatsapp",
    hace: 46,
    enDias: 105,
    dias: 2,
    etapa: "revision",
    asesor: "s5",
    contacto: 20,
    datos: {
      tipo_evento: "religioso_comunitario",
      nombre_evento: "Torneo relámpago y feria del cantón",
      descripcion_evento: "Torneo de fútbol rápido y feria de comida para recaudar fondos para la casa comunal.",
      horario: "8:00 a. m. a 6:00 p. m.",
      recinto: "Cancha municipal",
      municipio: "Usulután",
      departamento: "Usulután",
      espacio: "aire_libre",
      aforo_esperado: 1200,
      evento_recurrente: true,
      asistencia_anterior: 1000,
      perfil_publico: "Familias de la zona",
      tipo_entrada: "gratuita",
      modalidad: "donacion",
      condicion_comercial: "sin_costo",
      exclusividad_pizza: "si",
      tamano_espacio: "",
      energia_electrica: "no_incluida",
      agua: "por_definir",
      toldo_mobiliario: "incluido",
      permisos_a_cargo_de: "organizador",
      contacto_nombre: "Marta Alicia Guevara",
      contacto_cargo: "Presidenta de la directiva comunal",
      contacto_empresa: "Asociación Comunal Brisas del Lago",
      contacto_telefono: "97230495",
      contacto_correo: "",
      contacto_canal: "whatsapp",
    },
    resumen:
      "Marta Alicia Guevara pide un donativo de pizzas para los equipos del torneo comunal en Usulután, a cambio de vender en la feria sin costo. Esperan 1,200 personas.",
  },
];

// ── Construcción ──

function alDia(ymd: string, dia: number, sentido: 1 | -1): string {
  let d = ymd;
  for (let i = 0; i < 7 && diaSemanaDeFecha(d) !== dia; i++) d = sumarDias(d, sentido);
  return d;
}

const ORDEN: Etapa[] = ["nueva", "revision", "contactado", "negociacion", "confirmada"];

function historialDe(s: Spec, creada: number, ahora: number, finEvento: number): CambioEtapa[] {
  const meta = s.etapa === "descartada" ? (s.descartadaDesde ?? "revision") : s.etapa;
  const camino = ORDEN.slice(0, ORDEN.indexOf(meta) + 1);
  const h: CambioEtapa[] = [];
  const contacto = s.contacto !== undefined ? creada + s.contacto * 3_600_000 : null;
  // Lo que pasó después del primer contacto se reparte hasta hoy, o hasta unos
  // días antes del evento si el evento ya pasó.
  const tope = Math.min(ahora - 3_600_000, finEvento - 2 * 86_400_000);
  const desde = contacto ?? creada + 2 * 3_600_000;
  const pasos = camino.filter((e) => e === "negociacion" || e === "confirmada");
  const extra = s.etapa === "descartada" ? 1 : 0;
  const tramo = Math.max(3_600_000, (tope - desde) / (pasos.length + extra + 1));
  let i = 0;
  let previa: Etapa | null = null;
  for (const e of camino) {
    let ts: number;
    if (e === "nueva") ts = creada;
    else if (e === "revision") ts = creada + Math.min(2, (s.contacto ?? 3) / 2) * 3_600_000;
    else if (e === "contactado") ts = contacto ?? creada + 3 * 3_600_000;
    else ts = desde + tramo * ++i;
    h.push({ ts: new Date(ts).toISOString(), de: previa, a: e, actor: e === "nueva" ? "ia" : s.asesor });
    previa = e;
  }
  if (s.etapa === "descartada") {
    h.push({
      ts: new Date(desde + tramo * (i + 1)).toISOString(),
      de: previa,
      a: "descartada",
      actor: s.asesor,
      motivo: s.motivoDescarte,
    });
  }
  return h;
}

/** Las propuestas de muestra, con fechas relativas a `ahora`. */
export function propuestasDeMuestra(ahora: number = Date.now()): Propuesta[] {
  const hoy = diaSV(ahora);
  return SPECS.map((s) => {
    const creada = ahora - s.hace * 3_600_000;
    // Cae en su día de la semana (casi todo, sábado): un concierto relativo a
    // hoy no puede quedar un martes. Lo próximo se corre hacia adelante y lo que
    // ya pasó hacia atrás, para que no cambie de lado.
    const fechaInicio = alDia(sumarDias(hoy, s.enDias), s.dia ?? 6, s.enDias < 0 ? -1 : 1);
    const fechaFin = s.dias && s.dias > 1 ? sumarDias(fechaInicio, s.dias - 1) : "";
    const finEvento = Date.parse(isoDeSV(fechaFin || fechaInicio, 23));
    const datos: DatosEvento = {
      ...datosVacios(),
      ...s.datos,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      fecha_limite_respuesta: s.limiteEnDias !== undefined ? sumarDias(hoy, s.limiteEnDias) : "",
    };
    const historial = historialDe(s, creada, ahora, finEvento);
    const notasInternas: NotaInterna[] = (s.notas ?? []).map((n, i) => ({
      id: `${s.id}-n${i + 1}`,
      ts: new Date(ahora - n.hace * 3_600_000).toISOString(),
      autor: n.autor,
      texto: n.texto,
    }));
    return {
      id: s.id,
      origen: "semilla",
      canal: s.canal,
      creada: new Date(creada).toISOString(),
      datos,
      resumen: s.resumen,
      etapa: s.etapa,
      motivoDescarte: s.motivoDescarte,
      asesorId: s.asesor,
      primerContacto: s.contacto !== undefined ? new Date(creada + s.contacto * 3_600_000).toISOString() : null,
      notasInternas,
      historial,
      llamadaId: s.canal === "llamada" ? `muestra-${s.id}` : undefined,
    } satisfies Propuesta;
  });
}

// ── Llamadas de muestra ──

/** Generador pseudoaleatorio con semilla: la misma fecha da los mismos números. */
function azar(semilla: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lo que no fue propuesta, con lo que dijo Daniela. Sigue su guion: los
// pedidos van a la página web o la aplicación (sin dar teléfonos), no da
// horarios ni direcciones de sucursales, y cualquier otro tema lo anota
// (nombre, número y una nota) y lo traslada al área correspondiente, sin
// prometer plazos.
interface VarianteRuido {
  resumen: string;
  dialogo: string[]; // "AI: ..." / "User: ..."
}

const RUIDO: Record<Exclude<MotivoLlamada, "propuesta">, VarianteRuido[]> = {
  pedido: [
    {
      resumen: "Quería pedir dos pizzas a domicilio. Daniela le explicó que esta línea es del equipo de eventos y que los pedidos se hacen en la página web o en la aplicación de Pizza Hut.",
      dialogo: [
        "User: Buenas, quería pedir dos pizzas grandes a domicilio.",
        "AI: Con gusto le oriento. Esta línea es del equipo de eventos; los pedidos se hacen en la página web o en la aplicación de Pizza Hut. ¿Le puedo ayudar con algo más?",
        "User: Ah, va, gracias.",
      ],
    },
    {
      resumen: "Buscaba encargar pizzas para una fiesta familiar de diez personas. Daniela le orientó a la página web o la aplicación de Pizza Hut.",
      dialogo: [
        "User: Hola, voy a tener una fiesta en mi casa el sábado, como para diez personas, y quería encargar las pizzas.",
        "AI: ¡Qué bueno! Esta línea atiende propuestas de organizadores de eventos; un pedido como el suyo lo puede hacer en la página web o en la aplicación de Pizza Hut.",
        "User: Perfecto, ahí lo hago.",
      ],
    },
    {
      resumen: "Preguntó si podía hacer su pedido por teléfono. Daniela le indicó que los pedidos se hacen en la página web o en la aplicación de Pizza Hut.",
      dialogo: [
        "User: ¿Aquí puedo hacer un pedido por teléfono?",
        "AI: Esta línea es del equipo de eventos. Los pedidos se hacen en la página web o en la aplicación de Pizza Hut. ¿Algo más en lo que le ayude?",
        "User: No, gracias.",
      ],
    },
    {
      resumen: "Quería agregar una bebida a un pedido que ya había hecho. Daniela le explicó que esta línea es de eventos y le orientó a la página web o la aplicación de Pizza Hut.",
      dialogo: [
        "User: Buenas, hice un pedido hace rato y quería agregarle una bebida.",
        "AI: Le entiendo. Esta línea es del equipo de eventos y no maneja pedidos; le recomiendo revisarlo en la página web o en la aplicación de Pizza Hut.",
        "User: Ah, ok, gracias.",
      ],
    },
  ],
  sucursal: [
    {
      resumen: "Preguntó a qué hora cierra una sucursal. Daniela le orientó a la página web o la aplicación de Pizza Hut para consultarlo.",
      dialogo: [
        "User: Buenas tardes, ¿a qué hora cierra la sucursal de mi colonia?",
        "AI: Esta línea es del equipo de eventos. Los horarios de cada sucursal los puede consultar en la página web o en la aplicación de Pizza Hut. ¿Algo más en lo que le ayude?",
        "User: No, eso era, gracias.",
      ],
    },
    {
      resumen: "Quería saber si hay una sucursal cerca de su trabajo. Daniela le orientó a la página web o la aplicación de Pizza Hut para buscarla.",
      dialogo: [
        "User: Hola, ¿hay alguna sucursal cerca de donde trabajo?",
        "AI: Desde la línea de eventos no tengo esa información; en la página web o en la aplicación de Pizza Hut puede ver las sucursales más cercanas.",
        "User: Va, gracias.",
      ],
    },
    {
      resumen: "Consultó si una sucursal tiene área de juegos para niños. Daniela le orientó a la página web o la aplicación de Pizza Hut.",
      dialogo: [
        "User: ¿Me puede decir si la sucursal de Santa Tecla tiene área de juegos?",
        "AI: Eso no lo manejo desde la línea de eventos; la información de cada sucursal está en la página web o en la aplicación de Pizza Hut.",
        "User: Ok, gracias.",
      ],
    },
  ],
  seguimiento: [
    {
      resumen: "Organizador que ya había dejado una propuesta preguntó si ya la revisaron. Daniela tomó su nombre y el del evento y le avisó al asesor asignado.",
      dialogo: [
        "User: Hola, yo había llamado la semana pasada por un evento y quería saber si ya lo revisaron.",
        "AI: Claro que sí. ¿Me dice su nombre y el nombre del evento para avisarle al asesor que lo lleva?",
        "User: Es para el festival de la colonia, a nombre de Rodrigo.",
        "AI: Listo, ya quedó anotado y se lo paso al asesor. ¡Que tenga buen día!",
      ],
    },
    {
      resumen: "Llamó para avisar que el aforo de su evento subió a 6,000 personas. Daniela lo anotó para el asesor.",
      dialogo: [
        "User: Buenas, ya habíamos dejado una propuesta y le quería actualizar un dato: ahora esperamos como seis mil personas.",
        "AI: Gracias por avisar. ¿A nombre de quién quedó la propuesta?",
        "User: De la asociación de comerciantes del centro.",
        "AI: Perfecto, ya lo anoté para el asesor.",
      ],
    },
    {
      resumen: "El organizador movió una semana la fecha de su torneo. Daniela anotó la nueva fecha y le avisó al asesor.",
      dialogo: [
        "User: Le llamo porque movimos la fecha del torneo una semana.",
        "AI: Entendido. ¿Me confirma la nueva fecha y el nombre del evento?",
        "User: Sería el sábado siguiente, es el torneo del cantón.",
        "AI: Listo, queda anotado para el asesor.",
      ],
    },
    {
      resumen: "Preguntó a dónde mandar los documentos que le pidió el asesor. Daniela tomó nota para que el asesor le contacte con esos detalles.",
      dialogo: [
        "User: Ya hablé con un asesor y me pidió unos documentos, ¿a dónde los mando?",
        "AI: Le tomo nota para que el asesor le contacte con esos detalles. ¿Me dice su nombre y el evento?",
        "User: Claro, es la feria del colegio, habla Patricia.",
        "AI: Gracias, ya quedó anotado.",
      ],
    },
    {
      resumen: "Avisó que ya le aprobaron el permiso municipal para su festival. Daniela lo anotó para el asesor.",
      dialogo: [
        "User: Buenas, solo para avisar que ya nos aprobaron el permiso de la alcaldía para el festival.",
        "AI: ¡Qué buena noticia! ¿A nombre de qué evento lo anoto?",
        "User: Del festival de la playa.",
        "AI: Listo, ya se lo paso al asesor.",
      ],
    },
  ],
  proveedor: [
    {
      resumen: "Proveedor de toldos y mobiliario ofreciendo sus servicios. Daniela tomó su nombre, su número y una nota, y lo trasladó al área correspondiente.",
      dialogo: [
        "User: Buenas, le hablo de una empresa de toldos y mobiliario, queremos ofrecer nuestros servicios para sus eventos.",
        "AI: Gracias por tomarnos en cuenta. Le tomo su nombre, un número de contacto y una nota breve para trasladarlo al área correspondiente.",
        "User: Claro, se los dicto.",
        "AI: Listo, ya quedó anotado.",
      ],
    },
    {
      resumen: "Empresa de sonido e iluminación ofreciendo servicios. Daniela tomó sus datos y los trasladó al área correspondiente.",
      dialogo: [
        "User: Hola, tenemos una empresa de sonido e iluminación para eventos y queríamos presentarnos.",
        "AI: Con gusto. ¿Me da su nombre, un número de contacto y qué servicios ofrecen? Lo traslado al área correspondiente.",
        "User: Sí, se lo dicto.",
        "AI: Gracias, ya quedó anotado.",
      ],
    },
    {
      resumen: "Imprenta ofreciendo material promocional. Daniela tomó sus datos para trasladarlos al área correspondiente, sin comprometer una respuesta.",
      dialogo: [
        "User: Buenas, somos una imprenta y hacemos material para eventos: banners, afiches, todo eso.",
        "AI: Gracias por llamar. Le tomo su nombre y un número de contacto y lo traslado al área correspondiente.",
        "User: Perfecto, gracias.",
      ],
    },
  ],
  equivocado: [
    {
      resumen: "Número equivocado: buscaba un taller mecánico.",
      dialogo: ["User: ¿Aló? ¿Es el taller?", "AI: No, se comunicó con Pizza Hut, área de eventos.", "User: Ah, disculpe, me equivoqué."],
    },
    {
      resumen: "Colgó al saber que era la línea de eventos de Pizza Hut.",
      dialogo: ["User: Ah, perdón, me equivoqué de número."],
    },
    {
      resumen: "Número equivocado: buscaba una farmacia.",
      dialogo: ["User: Buenas, ¿es la farmacia?", "AI: No, esta es la línea de eventos de Pizza Hut.", "User: Ay, disculpe."],
    },
  ],
  otro: [
    {
      resumen: "Preguntó si Pizza Hut tiene vacantes. Daniela tomó su nombre, su número y una nota para trasladarlo al área correspondiente.",
      dialogo: [
        "User: Buenas, quería saber si están contratando personal.",
        "AI: Esta línea es del equipo de eventos, pero con gusto le tomo su nombre, un número de contacto y una nota para trasladarlo al área correspondiente.",
        "User: Sí, por favor.",
        "AI: Listo, ya quedó anotado.",
      ],
    },
    {
      resumen: "Consultó por una promoción que vio en redes. Daniela anotó su consulta y la trasladó al área correspondiente.",
      dialogo: [
        "User: Buenas, quería preguntar por una promoción que vi en redes.",
        "AI: Le tomo su nombre, un número de contacto y la consulta, y la traslado al área correspondiente.",
        "User: Va, gracias.",
      ],
    },
    {
      resumen: "Queja por un pedido que llegó tarde. Daniela tomó su nombre, su número y lo que pasó, y lo trasladó al área correspondiente sin prometer plazos.",
      dialogo: [
        "User: Buenas, hice un pedido y me llegó una hora tarde.",
        "AI: Lamento lo que pasó. Le tomo su nombre, un número de contacto y una nota de lo sucedido para trasladarlo al área correspondiente.",
        "User: Está bien, se lo doy.",
        "AI: Gracias, ya quedó anotado.",
      ],
    },
  ],
};

const MOTIVOS_RUIDO: { m: Exclude<MotivoLlamada, "propuesta">; peso: number }[] = [
  { m: "pedido", peso: 38 },
  { m: "sucursal", peso: 22 },
  { m: "seguimiento", peso: 16 },
  { m: "proveedor", peso: 9 },
  { m: "equivocado", peso: 8 },
  { m: "otro", peso: 7 },
];

function elegir<T extends { peso: number }>(xs: T[], r: number): T {
  const total = xs.reduce((n, x) => n + x.peso, 0);
  let acc = 0;
  for (const x of xs) {
    acc += x.peso / total;
    if (r < acc) return x;
  }
  return xs[xs.length - 1];
}

// A qué hora llama la gente: más en horario de oficina, pero también de noche
// y en fin de semana, que es justo lo que solo atiende Daniela.
const PESO_HORA = [0, 0, 0, 0, 0, 0, 1, 3, 6, 9, 10, 10, 8, 8, 9, 9, 8, 7, 7, 6, 5, 4, 2, 1];

function horaAlAzar(r: number): number {
  const total = PESO_HORA.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let h = 0; h < 24; h++) {
    acc += PESO_HORA[h] / total;
    if (r < acc) return h;
  }
  return 12;
}

function telefonoMuestra(r: () => number): string {
  return `+5039${String(Math.floor(r() * 10_000_000)).padStart(7, "0")}`;
}

/**
 * Las llamadas de muestra de los últimos `dias` días: las que dejaron una
 * propuesta de la muestra (con su misma hora) y las que no eran eventos, que
 * se generan día por día con semilla en la fecha.
 */
export function llamadasDeMuestra(propuestas: Propuesta[], ahora: number = Date.now(), dias = 30): LlamadaEvento[] {
  const hoy = diaSV(ahora);
  const desde = sumarDias(hoy, -(dias - 1));
  const out: LlamadaEvento[] = [];

  for (const p of propuestas) {
    if (p.origen !== "semilla" || p.canal !== "llamada") continue;
    const dia = diaSV(p.creada);
    if (dia < desde) continue;
    const r = azar(p.id);
    const dur = 170 + Math.floor(r() * 260);
    const fin = new Date(p.creada).getTime();
    out.push({
      id: p.llamadaId ?? `muestra-${p.id}`,
      origen: "muestra",
      numero: p.datos.contacto_telefono ? `+503${p.datos.contacto_telefono}` : telefonoMuestra(r),
      inicio: new Date(fin - dur * 1000).toISOString(),
      fin: new Date(fin).toISOString(),
      duracionSeg: dur,
      resumen: p.resumen,
      grabacion: true,
      esPropuesta: true,
      motivo: "propuesta",
      propuestaId: p.id,
    });
  }

  const rueda: Partial<Record<MotivoLlamada, number>> = {};
  const inicioRueda = Math.round(Date.parse(`${desde}T12:00:00Z`) / 86_400_000);
  for (let i = 0; i < dias; i++) {
    const dia = sumarDias(desde, i);
    const r = azar(`ph-${dia}`);
    const finDeSemana = [0, 6].includes(new Date(`${dia}T12:00:00Z`).getUTCDay());
    const n = 1 + Math.floor(r() * (finDeSemana ? 4 : 3));
    for (let k = 0; k < n; k++) {
      const hora = horaAlAzar(r());
      const minuto = Math.floor(r() * 60);
      const inicio = Date.parse(isoDeSV(dia, hora, minuto));
      if (inicio > ahora - 10 * 60_000) continue; // nada en el futuro
      const motivo = elegir(MOTIVOS_RUIDO, r()).m;
      const dur = motivo === "equivocado" ? 12 + Math.floor(r() * 30) : 35 + Math.floor(r() * 130);
      out.push({
        id: `muestra-${dia}-${k + 1}`,
        origen: "muestra",
        numero: telefonoMuestra(r),
        inicio: new Date(inicio).toISOString(),
        fin: new Date(inicio + dur * 1000).toISOString(),
        duracionSeg: dur,
        resumen: "", // se reparte abajo, en orden de llegada
        grabacion: true,
        esPropuesta: false,
        motivo,
      });
    }
  }
  // Las variantes de un mismo motivo van en rueda y en orden de llegada: dos
  // seguimientos seguidos nunca cuentan lo mismo hasta agotar la lista.
  const ruido = out.filter((l) => !l.esPropuesta).sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (const l of ruido) {
    const motivo = l.motivo as Exclude<MotivoLlamada, "propuesta">;
    const turno = (rueda[motivo] = (rueda[motivo] ?? inicioRueda) + 1);
    l.resumen = RUIDO[motivo][turno % RUIDO[motivo].length].resumen;
  }
  return out.sort((a, b) => b.inicio.localeCompare(a.inicio));
}

// ── Transcripción de muestra ──

const miles = (n: number) => n.toLocaleString("en-US");

/**
 * La conversación de una llamada de muestra, armada con los datos de su
 * propuesta. Se arma al abrirla (no viaja en la lista) y sale igual siempre.
 */
export function transcripcionDeMuestra(llamada: LlamadaEvento, propuesta?: Propuesta): string {
  const L: string[] = [];
  const ai = (t: string) => L.push(`AI: ${t}`);
  const user = (t: string) => L.push(`User: ${t}`);
  ai("Gracias por llamar a Pizza Hut. Le saluda Daniela, del área de eventos. ¿En qué le puedo ayudar?");

  if (!propuesta || !llamada.esPropuesta) {
    // La conversación de la variante que corresponde al resumen de la llamada.
    const variante = Object.values(RUIDO)
      .flat()
      .find((v) => v.resumen === llamada.resumen);
    if (variante) L.push(...variante.dialogo);
    else user("Buenas, quería hacer una consulta.");
    return L.join("\n");
  }

  const d = propuesta.datos;
  const quien = d.contacto_empresa ? `de ${d.contacto_empresa}` : "";
  user(`Buenas, le hablo ${quien}. Vamos a tener ${d.nombre_evento ? `el evento "${d.nombre_evento}"` : "un evento"} y queríamos saber si a Pizza Hut le interesa estar vendiendo.`);
  ai("¡Qué bueno que nos tomen en cuenta! Le hago unas preguntas para pasarle la información completa a un asesor. ¿Qué tipo de evento es y para qué fecha?");
  user(`${d.descripcion_evento || "Es un evento abierto al público."} ${d.fecha_inicio ? `Sería el ${fechaLarga(d.fecha_inicio)}${d.fecha_fin ? ` y termina el ${fechaLarga(d.fecha_fin)}` : ""}.` : "La fecha todavía no está cerrada."}`);
  ai("¿Dónde se va a realizar y en qué horario?");
  user(`${d.recinto ? `En ${d.recinto}, ${d.municipio}.` : "Todavía estamos viendo el lugar."} ${d.horario ? `De ${d.horario}.` : "El horario no lo tengo aún."}`);
  ai("¿Cuántas personas esperan y la entrada es gratuita o con boleto?");
  user(
    `${d.aforo_esperado ? `Unas ${miles(d.aforo_esperado)} personas.` : "No sabría decirle cuántas."}${d.evento_recurrente && d.asistencia_anterior ? ` El año pasado llegaron como ${miles(d.asistencia_anterior)}.` : ""} ${
      d.tipo_entrada === "con_boleto" ? `Con boleto de $${d.precio_boleto}.` : d.tipo_entrada === "gratuita" ? "La entrada es gratis." : ""
    }`,
  );
  ai("¿Cómo sería la participación de Pizza Hut y qué condiciones tienen para los vendedores?");
  const cond = d.condicion_comercial;
  user(
    cond === "cuota_fija"
      ? `Se cobra una cuota de $${miles(d.monto_cuota)} por el espacio.`
      : cond === "comision"
        ? `Pedimos el ${d.porcentaje_comision}% de lo que se venda.`
        : cond === "cuota_mas_comision"
          ? `Son $${miles(d.monto_cuota)} de cuota más el ${d.porcentaje_comision}% de las ventas.`
          : cond === "sin_costo"
            ? "No le cobramos nada por estar."
            : cond === "canje"
              ? "Lo que buscamos es un canje, pizzas a cambio de promoción de la marca."
              : "Eso todavía lo estamos definiendo.",
  );
  ai("¿Pizza Hut sería la única marca de pizza en el evento?");
  user(d.exclusividad_pizza === "si" ? "Sí, les daríamos la exclusividad." : d.exclusividad_pizza === "no" ? "No, va a haber otros vendedores de pizza." : "Eso lo tendría que consultar.");
  ai("¿El espacio incluye energía eléctrica, agua y toldo?");
  user(
    [
      d.energia_electrica === "incluida" ? "La energía sí va incluida" : d.energia_electrica === "no_incluida" ? "La energía no" : "La energía no la tengo clara",
      d.agua === "incluida" ? "el agua también" : d.agua === "no_incluida" ? "el agua no" : "del agua no sé",
      d.toldo_mobiliario === "incluido" ? "y el toldo lo ponemos nosotros." : "y el toldo lo tendrían que llevar ustedes.",
    ].join(", "),
  );
  ai("Perfecto. Para que un asesor le contacte, ¿me confirma su nombre, su cargo y un número de teléfono?");
  user(
    `${d.contacto_nombre ? `Soy ${d.contacto_nombre}` : "Mi nombre es"}${d.contacto_cargo ? `, ${d.contacto_cargo.toLowerCase()}` : ""}. ${
      d.contacto_telefono ? `Mi número es ${d.contacto_telefono.slice(0, 4)}-${d.contacto_telefono.slice(4)}.` : "Puede llamarme a este mismo número."
    }`,
  );
  ai(`Gracias${d.contacto_nombre ? `, ${d.contacto_nombre.split(" ")[0]}` : ""}. Un asesor del equipo de eventos le va a contactar para revisar los detalles. ¡Que tenga buen día!`);
  return L.join("\n");
}

/** Para pruebas: cuántos días faltan al evento de cada propuesta de muestra. */
export function diasAlEvento(p: Propuesta, ahora: number = Date.now()): number | null {
  return p.datos.fecha_inicio ? diasEntre(diaSV(ahora), p.datos.fecha_inicio) : null;
}

