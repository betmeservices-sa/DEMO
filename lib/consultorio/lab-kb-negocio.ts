// Lo que no es el catálogo: sucursales, aseguradoras, temas generales y promociones.
// Sale del respaldo del WhatsApp de la Sucursal Escalón (1,803 chats, 2022 a oct-2026,
// tandas 1 a 5 y chats internos de supervisión) y, para las sedes que no son Escalón,
// de la base del hospital del mismo grupo (hub, 15/10/2026). Escalón usa los datos de
// 2026 porque se trasladó en marzo de 2026. Los porcentajes que dice el personal y lo
// que no cuadra van en `notas`, que el modelo no ve.
import type { ConvenioKb, PromocionKb, SucursalKb, TemaKb } from "./lab-kb";

// ── Sucursales ──────────────────────────────────────────────────────────────

export const SUCURSALES_LAB: SucursalKb[] = [
  {
    id: "suc-escalon",
    nombre: "Sucursal Escalón",
    sinonimos: [
      "escalon",
      "colonia escalon",
      "sucursal escalon",
      "sucursal el paseo",
      "el paseo",
      "paseo general escalon",
      "paseo escalon",
      "gasolinera uno",
      "frente a la uno",
      "steren",
      "mcdonalds",
      "ferrocentro",
      "87 avenida norte",
      "ubicacion",
      "direccion",
      "donde estan",
      "horario",
      "horario de atencion",
      "a que hora abren",
      "a que hora cierran",
      "estan abiertos",
      "abren el sabado",
      "abren el domingo",
      "atienden domingo",
    ],
    direccion:
      "Paseo General Escalón y 87 Avenida Norte, Edificio Escalón, local 1-B, Colonia Escalón, San Salvador. Frente a la Gasolinera UNO, media cuadra arriba del McDonald's del Paseo, a la par de Steren (junto a Ferrocentro). Si el Paseo está cerrado, se entra por la 87 Avenida Norte.",
    horario: "Lunes a sábado de 6:00 a.m. a 6:00 p.m. Domingo de 6:00 a.m. a 12:00 m.",
    whatsapp: "6121-9138",
    servicios:
      "Laboratorio clínico con toma de muestras. Cuarto exclusivo para la muestra de espermograma (sin acompañante). Salas para quienes se quedan en curvas de tolerancia. Servicio a domicilio en la zona. Resultados por WhatsApp y correo.",
    fuente:
      "chats Escalón: dirección formal 15/05/2026 conv 4; referencias 18/04/2026 conv 67, 16/05/2026 conv 135, 03/07/2026 conv 62, 08/07/2026 conv 69, 25/05/2026 conv 517, 16/06/2026 conv 534; Paseo cerrado 15/09/2026 conv 81; horario automático 12/06/2026 conv 11 y 463; plantilla 08/09/2026 conv 189; domingo 19/10/2026 conv 35; espermograma 23/07/2026 conv 396 y supervisión 25/07/2026",
    notas:
      "TELÉFONO FIJO 2514-3430: NO se da. Fallas reportadas 11/10/2025 (conv 162), 21/05/2026 (conv 625: 'la línea está dañada'), 06/06/2026 (conv 568: 'no tenemos fijo por el momento'), 08/07/2026 (conv 69), 30/08/2026 (interno: 'brindar el de celular'). Se da el WhatsApp. Si el lab confirma que el fijo volvió, se agrega en `telefono`. " +
      "Local anterior (hasta marzo de 2026): 83 Avenida Sur y Calle Juan José Cañas, Edificio Instituto de Ojos, local 5, frente a la entrada del parqueo del Banco Promerica. Se trasladó 'desde marzo' (conv 69, 750); el 06/06/2026 todavía avisaban 'nueva ubicación' (conv 90). " +
      "Edificio: 'Edificio Escalón Local Uno-B' (conv 4) y 'Edificio Ferrocentro' (conv 392, 673); 'justo debajo [de Ferrocentro], sobre el paseo' (conv 309). Confirmar el nombre del edificio. " +
      "Horario: antes del traslado era L-V 6:30-6:30, sáb 6:30-12:00, domingo cerrado. Desde abril de 2026 'nuevo horario' 6:00-6:00 L-S y domingo 6:00-12:00 (lo más repetido en 2026, incluido el mensaje automático). Contradicciones sueltas: sábado 13/06/2026 'cerramos al mediodía' (conv 539); viernes 12/06/2026 'hasta las 5.30 PM' (conv 463); 'L-V 6:30 a 7:00 pm horario hábil' (conv 19). " +
      "Al cierre la licenciada se retira y ya no se toman muestras (18:32, conv 134); en 2025 pedían llegar 15 a 30 minutos antes del cierre para dejar orina. Feriados 2026 vistos: 1 de mayo y 17 de junio de 6:00 a 12:00; Jueves Santo hasta las 6:00 p.m.; 15/09/2026 abierto; 31/12/2025 de 6:30 a 12:30. " +
      "Monitoreo fetal NO en Escalón (solo Colonia Médica, conv 128). Citologías 'de momento aún no' (conv 392). Hay un consultorio rotulado en el local, pero 'aún no tenemos consultas' (04/2026); en 08-09/2026 se menciona un consultorio de ginecología dentro de la sucursal: confirmar antes de decir que hay consulta.",
  },
  {
    id: "suc-colonia-medica",
    nombre: "Laboratorio Colonia Médica (casa matriz)",
    sinonimos: [
      "colonia medica",
      "col medica",
      "la medica",
      "casa matriz",
      "matriz",
      "24 horas",
      "24/7",
      "abierto 24 horas",
      "sucursal 24 horas",
      "a la par del hospital",
    ],
    direccion:
      "Pasaje Martha Gladys Urbina y diagonal Dr. Luis Edmundo Vásquez, Colonia Médica, San Salvador. Un poco más abajo del Hospital Centro Ginecológico, a la par de Farmacia San Nicolás.",
    horario:
      "Abierto las 24 horas, todos los días. Horario hábil (precio normal): lunes a sábado de 6:00 a.m. a 6:00 p.m.; fuera de ese horario los exámenes llevan recargo.",
    telefono: "2247-1141, 2247-1143",
    whatsapp: "7121-6699",
    servicios: "Laboratorio clínico las 24 horas. Monitoreo fetal solo en esta sede.",
    fuente:
      "hub, base del hospital, 15/10/2026; chats Escalón: '24/7' 20/02/2026 conv 327, 04/05/2026 conv 680, 2025 conv 1000, 1220, 1296; WhatsApp 13/02/2026 conv 898; monitoreo fetal 25/09/2026 conv 128",
    notas:
      "El hub dice 'COVID solo aquí', pero el 03/07/2026 Escalón cotizó una prueba COVID (conv 222): no se publica hasta confirmar. Una vez (08/08/2025, conv 1341) se dijo 'de 6:30 AM a 6:30 PM' para Colonia Médica. Recargo nocturno: 'a partir de las 6:30 de la tarde' (2025, conv 762) y 'después de las 7 pm' (2026, conv 278, 641). Espermograma: aquí la muestra se toma en baño, no hay cuarto propio (supervisión 25/07/2026). Al 2247-1141 llaman pacientes y ahí les dan indicaciones.",
  },
  {
    id: "suc-san-benito",
    nombre: "Laboratorio San Benito",
    sinonimos: ["san benito", "zona rosa", "boulevard del hipodromo", "hipodromo", "sucursal san benito"],
    direccion: "Local 303, Boulevard del Hipódromo, Zona Rosa, San Salvador.",
    horario:
      "Lunes a viernes de 6:30 a.m. a 6:30 p.m. Sábado de 6:30 a.m. a 12:30 p.m. Domingo de 6:30 a.m. a 12:00 m.",
    telefono: "2514-7900",
    whatsapp: "6175-8389",
    servicios: "Laboratorio clínico. Cuarto exclusivo para la muestra de espermograma.",
    fuente:
      "hub, base del hospital, 15/10/2026; chats Escalón: WhatsApp 08/10/2026 conv 101; cuarto de espermograma 23/07/2026 conv 396",
    notas:
      "Los pacientes le dicen 'Zona Rosa'. El 31/10/2025 se dijo que tenía el mismo horario que Escalón (de entonces). El 21/08/2026 un paciente se quejó de que no abrió a tiempo. Escalón cambió su horario en 2026; no se sabe si San Benito también: confirmar.",
  },
  {
    id: "suc-las-ramblas",
    nombre: "Laboratorio C.C. Las Ramblas",
    sinonimos: ["las ramblas", "ramblas", "cc las ramblas", "centro comercial las ramblas", "merliot", "ciudad merliot", "santa tecla", "panamericana"],
    direccion: "Centro Comercial Las Ramblas, Calle Panamericana, km 10, Ciudad Merliot, Santa Tecla, La Libertad.",
    horario:
      "Lunes a viernes de 6:30 a.m. a 6:30 p.m. Sábado de 6:30 a.m. a 12:30 p.m. Domingo de 6:30 a.m. a 12:00 m.",
    telefono: "2508-6064",
    whatsapp: "7497-4472",
    servicios: "Laboratorio clínico. Cuarto exclusivo para la muestra de espermograma.",
    fuente:
      "hub, base del hospital, 15/10/2026; chats Escalón: WhatsApp 02/06/2025 conv 335, 29/06/2026 conv 491, 11/08/2026 conv 275; cuarto de espermograma 23/07/2026 conv 396",
    notas: "Varios pacientes dicen que al 2508-6064 no contestan (conv 667, 603); el personal de Escalón siempre da el WhatsApp 7497-4472.",
  },
  {
    id: "suc-santa-rosa",
    nombre: "Laboratorio C.C. Santa Rosa",
    sinonimos: ["santa rosa", "cc santa rosa", "centro comercial santa rosa", "santa tecla", "monsenor romero", "calle real"],
    direccion:
      "Centro Comercial Santa Rosa, intersección de Calle Real, 9a. Calle Poniente y Boulevard Monseñor Romero, Santa Tecla, La Libertad.",
    horario: "Lunes a domingo de 6:30 a.m. a 6:30 p.m.",
    telefono: "2564-6638",
    whatsapp: "6933-5495",
    servicios:
      "Laboratorio clínico. Cuarto exclusivo para la muestra de espermograma. Además, Clínica de Atención Familiar con consulta general: lunes a viernes de 9:00 a.m. a 6:00 p.m. y sábado de 8:00 a.m. a 12:00 m.",
    fuente:
      "hub, base del hospital, 15/10/2026; chats Escalón: teléfono y WhatsApp 11/02/2025 conv 1757; apertura 07/02/2025 (supervisión); cuarto de espermograma 23/07/2026 conv 396",
    notas: "Abrió en febrero de 2025. En 2025 se dijo 'abre a las 6 am' (conv 1577) y 'de 6:30 a 6 pm' (conv 1020); se deja el horario del hub, que es más nuevo.",
  },
  {
    id: "suc-aguilares",
    nombre: "Laboratorio C.C. El Encuentro, Aguilares",
    sinonimos: ["aguilares", "el encuentro", "cc el encuentro", "encuentro aguilares", "troncal del norte"],
    direccion: "Centro Comercial El Encuentro, local MA4, Carretera Troncal del Norte, Aguilares.",
    horario: "Lunes a domingo de 6:00 a.m. a 6:00 p.m.",
    telefono: "2556-5351",
    whatsapp: "7226-8560",
    servicios: "Laboratorio clínico.",
    fuente: "hub, base del hospital, 15/10/2026; chats Escalón: 'A las 6' abre, 29/09/2026 conv 126",
    notas: "En mayo de 2025 aún no abría (conv 1512); en agosto de 2025 ya está en la lista de sucursales (conv 1341).",
  },
];

// ── Aseguradoras y convenios ────────────────────────────────────────────────

export const CONVENIOS_LAB: ConvenioKb[] = [
  {
    id: "seg-rpn",
    nombre: "RPN (Atlántida RPN)",
    sinonimos: ["rpn", "red rpn", "atlantida", "atlantida rpn", "atlantida vida", "seguros atlantida", "rpn acsa", "mediprocesos", "carnet de rpn"],
    modalidad: "aseguradora",
    descripcion:
      "Trabajamos con la red RPN por despacho directo. Si su médico subió los exámenes a la plataforma de RPN o usted trae la orden de despacho con su autorización, se despacha en el laboratorio y usted paga solo lo que le corresponde según su póliza; ese monto se conoce hasta hacer el despacho. Si su médico no es de la red RPN o no hay autorización, paga el total con el precio arancelado y lo somete a reembolso con la aseguradora. El precio con seguro lleva el descuento arancelado con RPN, y se aplica aunque no use el seguro.",
    requisitos:
      "Orden de despacho de RPN en físico o en PDF (la foto sirve para cotizar, pero no para la aseguradora), número de autorización y PIN si se lo dieron, carnet de RPN y DUI del paciente. La autorización se gestiona el mismo día de la toma; la papelería se puede dejar lista antes enviándola por este chat. El paciente firma la boleta del seguro.",
    estado: "vigente",
    fuente:
      "chats Escalón: 25/11/2025 conv 9; 14/10/2026 conv 45; 21/10/2026 conv 80; 25/05/2026 conv 517; 14/07/2025 conv 1412; grupo RPN 2024-2026; supervisión 27/06/2024",
    notas:
      "El personal dice '10% de descuento que es el arancelado con la aseguradora' (conv 9, 45, 1412), pero el precio no siempre es 10% exacto sobre el particular (vitamina D $93.60 queda en $80.00). El coaseguro solo se ve en el portal al despachar. Si no hay PIN, RPN puede hacer verificación manual. 2024: el panel respiratorio pedía autorización y formulario. Pólizas de la Superintendencia del Sistema Financiero pueden traer 'formulario no red' sellado por el médico (2025). Una clínica lo llama 'RPN (mediprocesos)' y un paciente 'RPN ACSA': Mediprocesos administra la red; confirmar qué pólizas de ACSA y Atlántida pasan por RPN. Vigencia de formularios de aseguradora: 'normalmente son 30 días' (conv 9).",
  },
  {
    id: "seg-sisa",
    nombre: "SISA",
    sinonimos: ["sisa", "red sisa", "seguros sisa", "carnet de sisa"],
    modalidad: "aseguradora",
    descripcion:
      "Con SISA el trámite es por reembolso: usted paga el total con el precio arancelado con SISA y luego presenta a la aseguradora la orden del médico y la factura detallada. El descuento arancelado se aplica al presentar el carnet, aunque la prueba no esté cubierta. Si ya trae una autorización de SISA, una compañera confirma si se puede despachar.",
    requisitos:
      "Carnet de SISA y DUI. Para el reembolso: orden original del médico y factura detallada (la factura llega al correo; si la aseguradora pide el detalle sellado, se entrega en la sucursal).",
    estado: "vigente",
    fuente:
      "chats Escalón: 'trabajamos con la red Sisa solo bajo reembolso' 15/07/2025 conv 228; 2025 conv 1379; 17/10/2026 conv 41; 2026 conv 286, 299, 377, 410, 681",
    notas:
      "El personal dice 12% ('el 12% de descuento que es el arancelado con la Aseguradora Sisa'), pero el precio queda ~16% abajo del particular (insulina $49.86 a $39.12, conv 41). Contradicción: en 08/2025 hubo pruebas 'no aprobadas por SISA' y firma de boleta (conv 62), y otra tanda dice que con autorización se despacha (conv 1056). 'Mi Red (SISA)' aparece como red de SISA con despacho (ver MiRed).",
  },
  {
    id: "seg-mired",
    nombre: "MiRed",
    sinonimos: ["mired", "mired sisa", "mired atlantida", "seguro de mired", "orden de mired"],
    modalidad: "aseguradora",
    descripcion:
      "Con MiRed se trabaja por despacho: con la orden de MiRed y su carnet, se despacha en el laboratorio y usted paga lo que le corresponde según su póliza, que se conoce al hacer el despacho. El precio lleva el descuento arancelado.",
    requisitos: "Orden de MiRed (vale 90 días desde la fecha de la consulta), carnet y DUI del paciente.",
    estado: "vigente",
    fuente: "chats Escalón: 22/08/2025 conv 62; 20/09/2025 conv 1222; 08/12/2025 conv 776; 02/07/2026 conv 62",
    notas:
      "El personal dice 10%. No está claro de qué aseguradora es: 'Mi Red (SISA)' y 'miRed SISA' (tanda 1), 'MiRed de Seguros Atlántida' (tanda 5), 'ASSA- mi red' (conv 165). Empleados del Fondo Social: 'es rápido su despacho'. Pregunta de copago de MiRed al 30% sin respuesta (conv 412). Confirmar con el lab.",
  },
  {
    id: "seg-asesuisa",
    nombre: "Asesuisa",
    sinonimos: ["asesuisa", "asesuiza", "aseuisa", "asesuiz", "asesuisa vida", "carnet de asesuisa"],
    modalidad: "aseguradora",
    descripcion:
      "Hacemos despachos de Asesuisa. Si su médico gestionó la preautorización, se despacha en el laboratorio con el número de preautorización y usted paga solo su coaseguro, que se conoce al hacer el despacho. Sin preautorización o sin boleta, paga el total con el precio arancelado y lo somete a reembolso. El descuento arancelado se aplica al presentar el carnet, aunque no use el seguro. Para tramitar la preautorización, el laboratorio le da el monto total de las pruebas con el descuento.",
    requisitos:
      "Orden o formulario de exámenes en físico o PDF, número de preautorización, carnet de Asesuisa y DUI. El despacho se hace con el paciente presente, y el paciente firma el documento de despacho.",
    estado: "vigente",
    fuente:
      "chats Escalón: 'si hacemos despachos de asesuisa' 2025 conv 1302; 04/06/2026 conv 260; 03/07/2026 conv 476; 25/05/2026 conv 608; 12/11/2025 conv 1117; 24/09/2026 conv 59",
    notas:
      "El personal dice 12%, pero el precio queda ~16% abajo del particular (AMH $87.70 a $73.33). Reembolso cuando la paciente 'no tengo boleta' (conv 1378). Para preautorizar avisan qué prueba pasa de $100 (conv 1714). Lo interno del portal de preautorizaciones no se le dice al paciente.",
  },
  {
    id: "seg-mapfre",
    nombre: "MAPFRE",
    sinonimos: ["mapfre", "maphre", "mafre", "mapfhre", "carnet de mapfre"],
    modalidad: "aseguradora",
    descripcion:
      "Trabajamos con MAPFRE. Con órdenes autorizadas y activas, se despacha en el laboratorio y usted paga el porcentaje que le corresponde según su póliza, que se ve al hacer el despacho. Si no hay autorización, paga el total con el precio arancelado y lo somete a reembolso. Si solo autorizaron parte de la orden, se puede despachar esa parte y lo demás se paga aparte.",
    requisitos:
      "Órdenes en físico o PDF que aparezcan activas, carnet de MAPFRE y DUI. Puede enviar antes por este chat el PDF de la orden y fotos del DUI y del carnet para dejar la papelería lista; la autorización se gestiona el mismo día de la toma.",
    estado: "vigente",
    fuente:
      "chats Escalón: 08/07/2026 conv 69; 27/07/2026 conv 30; 12/08/2026 conv 343 (parcial); 21/08/2025 conv 1299; supervisión 05/02/2025 y 09/06/2026",
    notas: "El personal dice 12%. Una vez 'por reembolso' (conv 1103). La orden parcial se consultó y 'me dicen que se puede realizar parcial' (conv 343).",
  },
  {
    id: "seg-acsa",
    nombre: "ACSA",
    sinonimos: ["acsa", "accsa", "aqsa", "assa", "aseguradora acsa", "carnet de acsa"],
    modalidad: "aseguradora",
    descripcion:
      "Con ACSA el trámite es bajo reembolso: usted paga el total con el precio arancelado con ACSA y luego presenta el reclamo a la aseguradora con su factura y la orden original. El descuento arancelado se aplica al presentar el carnet. Si paga con el descuento de la tarjeta VIP de Farmacia San Nicolás, no podrá solicitar el reembolso.",
    requisitos: "Carnet de ACSA y DUI. Para el reclamo: factura detallada y orden original del médico.",
    estado: "vigente",
    fuente:
      "chats Escalón: 'pago reembolso' 01/2025 conv 1802; 13/04/2026 conv 731; 04/09/2026 conv 233; 13/10/2026 conv 72",
    notas:
      "Descuento dicho: 10% 'global' (conv 233, 72) y una vez 12% junto con Mapfre (conv 30). Una tanda dice que con autorización se despacha (conv 991). Pacientes escriben 'Aqsa' y 'ASSA' y el lab los trató como ACSA (conv 233, 165); ASSA es otra aseguradora: confirmar. Pacientes con 'RPN ACSA' pueden ir por la red RPN. Domicilio con ACSA por reembolso (2024).",
  },
  {
    id: "seg-palig",
    nombre: "Palig (Pan-American Life)",
    sinonimos: ["palig", "palic", "pallig", "paligmed", "palligmed", "pan american", "pan american life", "carnet de palig"],
    modalidad: "aseguradora",
    descripcion:
      "Con Palig trabajamos solo bajo reembolso: usted paga el total con el precio arancelado con Palig y luego lo presenta a la aseguradora con la orden del médico y la factura. El descuento arancelado se aplica al presentar el carnet.",
    requisitos: "Carnet de Palig y DUI. Para el reembolso: orden original del médico y factura detallada.",
    estado: "vigente",
    fuente:
      "chats Escalón: 'con ellos solo trabajamos en base a reembolso' 12/12/2025 conv 1054; Pan American Life 05/02/2026 conv 920; 15/04/2026 conv 280; 09/09/2026 conv 206; 25/09/2026 conv 35",
    notas: "El personal dice 10% ('el pactado con la Aseguradora PALIG'), pero el precio queda ~14.5% abajo del particular (TSH $35.10 a $30.00).",
  },
  {
    id: "seg-abank",
    nombre: "Abank",
    sinonimos: ["abank", "aseguradora abank", "red abank", "seguros abank"],
    modalidad: "aseguradora",
    descripcion:
      "Trabajamos con Abank por despacho cuando su médico es de la red de Abank y la orden está en su plataforma: se despacha en el laboratorio y usted paga su coaseguro según la póliza. Si el médico no aparece en la plataforma de Abank, no es de la red y el trámite es bajo reembolso. Algunas pruebas no las cubre Abank y se pagan aparte. El precio lleva el descuento arancelado.",
    requisitos:
      "Orden médica con diagnóstico y exámenes (no se procesan órdenes de más de 6 meses), carnet o número de póliza, DUI y fecha de la consulta.",
    estado: "vigente",
    fuente: "grupo Abank 2024-2026; chats Escalón: 01/09/2026 y 04/09/2026 conv 4 y 29; 26/06/2026 conv 29; 2025-2026 conv 479, 488, 504",
    notas:
      "Descuento dicho: 12% (tanda 5) y 25% en el portal (interno, 23/08/2026). Coaseguro de 30% o 15% según póliza (2024), 20% en un caso (2026). El panel respiratorio no está arancelado con Abank y el 'mono test' no lo cubre (2026). Regla vieja de 21/09/2024 'solo reembolso, no dar crédito', ya no se aplica en 2025-2026. Desde 01/09/2026 Abank pide que se le compartan los resultados (proceso interno). El 04/09/2026 una paciente se fue molesta porque su médico no estaba en la plataforma.",
  },
  {
    id: "seg-vumi",
    nombre: "VUMI",
    sinonimos: ["vumi", "seguro vumi"],
    modalidad: "aseguradora",
    descripcion:
      "Con VUMI el laboratorio aplica el descuento arancelado al presentar el carnet; no se hace despacho directo. Si su póliza cubre exámenes de laboratorio, puede solicitar el reembolso a la aseguradora con la orden y la factura.",
    requisitos: "Carnet de VUMI. Para el reembolso: orden del médico y factura.",
    estado: "vigente",
    fuente: "chats Escalón: 'Solo se le aplica el 10% de descuento' 18/02/2025 conv 1665",
    notas: "Un solo chat (2025). Aquí sí es 10% exacto sobre el particular (glucosa $6.40 a $5.76). Que no hay despacho es inferencia de 'solo se le aplica el descuento': confirmar.",
  },
  {
    id: "seg-azul",
    nombre: "Seguros Azul",
    sinonimos: ["seguros azul", "seguro azul", "aseguradora azul"],
    modalidad: "aseguradora",
    descripcion:
      "Con Seguros Azul se aplica el descuento arancelado al presentar el carnet. Si se puede despachar o es por reembolso, lo confirma una compañera.",
    requisitos: "Carnet de Seguros Azul y DUI.",
    estado: "vigente",
    fuente: "chats Escalón: 21/04/2025 conv 1564",
    notas: "Un solo chat (2025), cotizado 'con 10%'. Sin datos de despacho.",
  },
  {
    id: "seg-internacional",
    nombre: "Seguros internacionales",
    sinonimos: ["seguro internacional", "seguros internacionales", "seguro del extranjero", "seguro de estados unidos"],
    modalidad: "aseguradora",
    descripcion: "Por confirmar con el laboratorio cómo se trabaja con seguros internacionales.",
    estado: "por_confirmar",
    fuente: "chats Escalón: 28/05/2026 conv 603 (sin resolver); 18/09/2026 conv 166 ('10%')",
    notas: "En 09/2026 a uno le aplicaron 10%; en 05/2026 no se resolvió cómo funciona.",
  },
  {
    id: "seg-claria",
    nombre: "Claria",
    sinonimos: ["claria"],
    modalidad: "aseguradora",
    descripcion: "Por confirmar con el laboratorio cómo se trabaja con Claria.",
    estado: "por_confirmar",
    fuente: "chats Escalón: 25/08/2026 conv 279",
    notas: "Se le cotizó a un paciente de Claria en imagen; no se dijo descuento ni modalidad.",
  },
  {
    id: "conv-cuscatlan",
    nombre: "Tarjetas Banco Cuscatlán",
    sinonimos: ["tarjeta cuscatlan", "banco cuscatlan", "cuscatlan", "descuento con tarjeta cuscatlan"],
    modalidad: "convenio",
    descripcion: "Por confirmar con el laboratorio si sigue vigente el descuento al pagar con tarjetas de Banco Cuscatlán.",
    estado: "por_confirmar",
    fuente: "chats Escalón: 26/01/2026 conv 951 y 953; 16/04/2026 conv 530",
    notas:
      "Dicho: 15% al pagar con tarjeta Cuscatlán, de lunes a viernes de 6:30 a.m. a 6:00 p.m.; no aplica feriados, fines de semana, horario nocturno, aseguradoras ni junto con otras promociones. Último dato: 16/04/2026. En 05/2025 se dijo que no había promoción con tarjetas.",
  },
  {
    id: "conv-latid",
    nombre: "Latid Fertility Center",
    sinonimos: ["latid", "latid fertility", "latid fertil center", "boleta de latid"],
    modalidad: "convenio",
    descripcion: "Por confirmar con el laboratorio si la boleta de Latid Fertility Center lleva descuento.",
    estado: "por_confirmar",
    fuente: "chats Escalón: 07/01/2026 conv 176; supervisión 2023-2024",
    notas: "Una paciente dijo que su boleta de Latid decía que tenía descuento; se cotizó en imagen y no se confirmó.",
  },
  {
    id: "no-isss",
    nombre: "ISSS (Seguro Social)",
    sinonimos: ["isss", "seguro social", "carnet del seguro social"],
    modalidad: "no_trabaja",
    descripcion:
      "El ISSS no es un seguro médico privado: no se despacha ni lleva descuento de aseguradora. Los exámenes se cotizan a precio regular.",
    estado: "vigente",
    fuente: "chats Escalón: 2025, tanda 5 ('el ISSS no cuenta como seguro privado')",
  },
  {
    id: "no-doctor-sv",
    nombre: "Doctor SV",
    sinonimos: ["doctor sv", "dr sv", "doctorsv"],
    modalidad: "no_trabaja",
    descripcion: "No atendemos con Doctor SV.",
    estado: "vigente",
    fuente: "chats Escalón: 'Nosotros no atendemos de Dr SV' 04/06/2026 conv 260",
  },
];

// ── Temas que no son un examen ──────────────────────────────────────────────

export const TEMAS_LAB: TemaKb[] = [
  {
    id: "tema-cotizar",
    nombre: "Cómo pedir una cotización",
    sinonimos: ["cotizar", "cotizacion", "me cotiza", "cuanto me sale", "precio de estos examenes", "cuanto me cuestan estos", "presupuesto"],
    respuesta:
      "Para cotizar, envíenos una foto o PDF de la orden, o la lista de exámenes, y díganos si el paciente tiene seguro médico privado y con qué aseguradora. Si la foto trae marcas, indíquenos cuáles exámenes necesita. Los precios que damos son de horario hábil.",
    fuente: "chats Escalón, las 5 tandas (intención número 1, unas 490 conversaciones); marcas en la foto conv 972",
    notas: "El personal manda la cotización como imagen con una línea del descuento incluido. Si la letra del médico no se entiende, preguntan (conv 1291, 589).",
  },
  {
    id: "tema-horario-habil",
    nombre: "Horario hábil y recargo de domingo y nocturno",
    sinonimos: [
      "horario habil",
      "horario no habil",
      "recargo",
      "recargo de domingo",
      "mas caro el domingo",
      "precio del domingo",
      "precio de noche",
      "horario nocturno",
      "incremento de precio",
      "aumento de precio",
      "sale mas caro",
    ],
    respuesta:
      "Los precios que damos son de horario hábil: lunes a sábado de 6:00 a.m. a 6:00 p.m. Los domingos y en horario nocturno (de 7:00 p.m. a 6:00 a.m.) los exámenes llevan un recargo del 20 %, en todas las sucursales y también con aseguradora. En días feriados también puede haber recargo; una compañera se lo confirma. La forma de pago no cambia el precio.",
    fuente:
      "chats Escalón: 17/05/2026 conv 641 y 642; 30/05/2026 conv 597; 04/09/2026 conv 233; 26/08/2026 conv 278; 17/10/2026 conv 41; 01/09/2026 conv 35 (forma de pago)",
    notas:
      "Variantes: 'L-V 6:30 a 7:00 pm son horarios hábiles' (conv 19, 12/04/2026); Colonia Médica 'a partir de las 6:30 de la tarde' (2025). Feriados: 'Creería que los precios aumentan un 20%' (conv 563, 2026) y supervisión 2023 'como es día feriado sí'. Se dijo que pagar por transferencia un día antes deja el precio normal (conv 563 feriado; conv 35 domingo, no claro): no se publica. Si el guion no deja calcular, dar el precio hábil y decir que el domingo lleva el recargo.",
  },
  {
    id: "tema-feriados",
    nombre: "Horario en días feriados",
    sinonimos: ["feriado", "dia feriado", "asueto", "semana santa", "1 de mayo", "dia del padre", "15 de septiembre", "navidad", "fin de ano", "31 de diciembre", "vacaciones", "abren en feriado"],
    respuesta:
      "En días feriados y asuetos el horario de las sucursales puede cambiar, por ejemplo abrir solo hasta el mediodía, y los exámenes pueden llevar recargo. Para el horario de un feriado en particular, una compañera se lo confirma. La sede de Colonia Médica atiende las 24 horas.",
    fuente: "chats Escalón: 02/04/2026 conv 547; 04/04/2026 conv 764; 27/04/2026 conv 563; 16/06/2026 conv 528; 15/09/2026 conv 81; 30/12/2025 conv 127",
    notas:
      "Escalón 2026: 1 de mayo y 17 de junio de 6:00 a 12:00; Sábado Santo hasta las 12; Domingo de Pascua 6:00 a 12:00; Jueves Santo hasta las 6:00 p.m.; 15 de septiembre abierta. 31/12/2025 de 6:30 a 12:30. En 2025 el 1 de mayo Escalón cerró. 3-6 de agosto de 2026 hubo horario especial y se suspendieron domicilios.",
  },
  {
    id: "tema-cita",
    nombre: "Cita para exámenes",
    sinonimos: ["cita", "sacar cita", "agendar", "agendar cita", "hacer cita", "reservar", "cupo", "programar cita", "solo llego", "orden de llegada", "llegar antes de las 6"],
    respuesta:
      "No necesita cita para sus exámenes de laboratorio: se atiende por orden de llegada. Al llegar se le factura y luego le toman la muestra. La sucursal abre a las 6:00 a.m.; antes de esa hora no se puede atender. Si tiene consulta con su médico ese mismo día, avise al llegar.",
    fuente:
      "chats Escalón: 07/10/2026 conv 42; 14/10/2026 conv 45; 08/09/2026 conv 210; 06/01/2026 conv 1020; 06/02/2026 conv 917; unas 60 veces en las 5 tandas",
    notas: "Si avisan que tienen consulta, el personal anota la muestra como urgente y la prioriza (conv 1193, 140); también recomiendan hacerse los exámenes un día antes (conv 1149).",
  },
  {
    id: "tema-orden-medica",
    nombre: "Orden médica (boleta) y su descuento",
    sinonimos: ["orden medica", "orden del doctor", "boleta", "boleta del medico", "papel del doctor", "la orden", "receta de examenes", "sin orden", "necesito orden", "descuento de la orden", "descuento por la boleta", "hoja del doctor"],
    respuesta:
      "No es obligatorio traer orden médica: puede solicitar sus exámenes sin ella. Para cotizar, puede enviarnos una foto o PDF de la orden por este chat. Si la orden es de un médico de nuestro laboratorio (la boleta del Centro Ginecológico, que lo indica al pie), al presentarla original el día de la toma se le aplica un 10 % de descuento en las pruebas que aplican. La foto sirve para cotizar, pero el descuento se hace al presentar la orden. No aplica los domingos, y los perfiles ya tienen precio de paquete sin descuento adicional. Para usar su seguro sí necesita la orden.",
    fuente:
      "chats Escalón: 12/04/2026 conv 19; 05/06/2026 conv 90; 29/06/2026 conv 93; 13/02/2026 conv 327; 20/06/2026 conv 388; 'la propia de nosotros' 28/03/2026 conv 770; 'nuestra orden tiene un descuento especial' 02/06/2026 conv 587; 'sí puede presentarse sin la orden' 13/02/2026 conv 899; perfil 02/06/2026 conv 205",
    notas:
      "El 10% sí da exacto sobre el particular. En 09/2025 se dijo que solo aplica a pruebas de rutina (glucosa, creatinina, triglicéridos, colesterol) y no a especiales (conv 1218); 'se le aplica a las pruebas que apliquen descuento' (conv 598). En conv 19 se dijo primero 'fin de semana' y luego 'solo de lunes a viernes en horario hábil'; en conv 90 y 93 no se dijo restricción de días. No se sabe si se combina con aseguradora. Antes había 10% por pago en efectivo, ya no (07/2025, conv 1441).",
  },
  {
    id: "tema-tarjeta-vip",
    nombre: "Tarjeta VIP Farmacia San Nicolás",
    sinonimos: ["tarjeta vip", "vip san nicolas", "tarjeta san nicolas", "farmacia san nicolas", "tarjeta de la farmacia", "descuento san nicolas"],
    respuesta:
      "Con la tarjeta VIP de Farmacia San Nicolás se aplica un 20 % de descuento en los exámenes. Hay que presentar la tarjeta al momento de facturar, y aplica cuando la tarjeta es del paciente. Es válida de lunes a viernes de 7:00 a.m. a 6:00 p.m. No se combina con los precios de aseguradora ni aplica en algunas pruebas especiales. Si paga con este descuento, posiblemente su aseguradora no le reembolse la factura.",
    fuente:
      "chats Escalón: 04/09/2026 conv 217 y 233; 28/08/2026 conv 269; 13/05/2026 conv 327; 11/09/2026 conv 29 (interno, referencia); 29/09/2026 conv 126",
    notas:
      "Las 'pruebas especiales' en que no aplica son las de referencia (conv 29): eso nunca se le dice al paciente. El 20% da exacto (H. pylori $41.50 a $33.20). Contradicciones: en conv 19 (12/04/2026) se dijo 'L-V 6:30 a.m. a 7:00 p.m.'; el 13/05/2026 se dijo que aplica si la tarjeta es del paciente y luego se la aplicaron a la mamá de la titular. En 07/2025 se dijo que el descuento era 'aplicable en el área del Hospital', no en el lab (conv 1421), ya superado en 2026. Con un perfil, el 20% se aplicó solo en las pruebas que el perfil no incluye (conv 245).",
  },
  {
    id: "tema-descuentos",
    nombre: "Descuentos disponibles",
    sinonimos: ["descuento", "descuentos", "promocion", "promociones", "oferta", "rebaja", "descuento tercera edad", "descuento por pagar en efectivo", "descuento estudiante", "descuento por varios examenes", "cliente frecuente", "hay alguna promocion"],
    respuesta:
      "Los descuentos que tenemos son: el precio arancelado si tiene seguro médico privado (aunque no use el seguro), el de la orden de un médico de nuestro laboratorio al presentarla, y el de la tarjeta VIP de Farmacia San Nicolás. Por el momento no tenemos descuento por pago en efectivo, por tercera edad ni por estudiante.",
    fuente:
      "chats Escalón: 22/05/2025 conv 598; efectivo 02/07/2025 conv 1441 y 21/05/2025 conv 570; tercera edad 08/08/2025 conv 1341 y 06/05/2026 conv 673; estudiante 18/06/2026 conv 261",
    notas:
      "Perfiles en promoción aparecen por temporadas (perfil de rutina en abril y junio de 2026) sin fecha de fin escrita: no se publican. Tarjetas Cuscatlán: ver el convenio por confirmar. Descuento por AFP: preguntado, sin respuesta (conv 217). Si piden descuentos que no están aquí, pasar a una persona sin confirmar ni negar.",
  },
  {
    id: "tema-formas-de-pago",
    nombre: "Formas de pago",
    sinonimos: ["formas de pago", "forma de pago", "tarjeta", "tarjeta de credito", "tarjeta de debito", "efectivo", "pago con tarjeta", "aceptan tarjeta", "link de pago", "pago en linea", "tasa cero", "metodos de pago"],
    respuesta:
      "Aceptamos efectivo, tarjeta de crédito o débito y transferencia electrónica. No tenemos link de pago ni pago en línea, y no manejamos tasa cero. La forma de pago no cambia el precio. Por seguridad, no comparta por este chat los datos de su tarjeta: el pago con tarjeta se hace en persona, en la sucursal o con el POS en el domicilio.",
    fuente:
      "chats Escalón: 20/03/2026 conv 90; 01/09/2026 conv 35; 16/06/2026 conv 534; 16/07/2026 conv 339; 12/03/2026 conv 746; 06/02/2026 conv 917; 27/02/2025 conv 1706 (tasa cero); 30/07/2026 conv 229 (POS)",
    notas:
      "El 10/06/2026 el personal pidió por chat el número completo y la fecha de vencimiento de una tarjeta (conv 548): eso no se repite. 16/03/2026 una paciente pidió 'el link de pago' y el lab contestó 'Ok' (conv 792), sin aclarar.",
  },
  {
    id: "tema-transferencia",
    nombre: "Pago por transferencia",
    sinonimos: ["transferencia", "numero de cuenta", "cuenta bancaria", "cuenta para transferir", "datos para transferir", "comprobante de transferencia", "deposito", "pagar por transferencia", "me pasa la cuenta", "abonar"],
    respuesta:
      "Sí puede pagar por transferencia. Una compañera del laboratorio le comparte por este chat los datos de la cuenta, que está a nombre de Laboratorios Centro Ginecológico. Después de transferir, envíe por aquí la foto del comprobante. Si paga antes de venir, solo llega a hacerse las pruebas. Los resultados se envían cuando el pago está confirmado.",
    fuente:
      "chats Escalón: 03/07/2026 conv 167; 25/05/2026 conv 611; 11/09/2026 conv 35; 08/09/2025 conv 1245 ('al salir no se podrán grabar, hasta tener el # de orden'); supervisión 28/02/2024 (cuenta de Laboratorios, no del hospital)",
    notas:
      "El agente NUNCA da números de cuenta: los manda una persona (el lab usa una imagen con las cuentas). Piden el comprobante 'antes de las 5:30' por el cierre de caja (conv 236).",
  },
  {
    id: "tema-domicilio",
    nombre: "Servicio a domicilio",
    sinonimos: ["domicilio", "a domicilio", "servicio a domicilio", "toma a domicilio", "examenes a domicilio", "servicio domiciliar", "vengan a mi casa", "tomar la muestra en casa", "recoger muestra en casa", "domi"],
    respuesta:
      "Sí tenemos servicio a domicilio, de lunes a viernes: una licenciada del laboratorio sale desde la Sucursal Escalón a tomar las muestras. El servicio cuesta $9.40, aparte de los exámenes. Para coordinarlo necesitamos:\nDirección exacta y punto de referencia (para verificar cobertura)\nDía y hora en que desea el servicio (de lunes a viernes)\nFotografía del DUI del paciente (si es menor de edad, el DUI del responsable)\nNombre del médico tratante\nExámenes solicitados\nCorreo electrónico para el envío de la factura\nForma de pago (efectivo o transferencia)\nCon esta información una compañera valida la cobertura y coordina su domicilio; la hora la confirma según la disponibilidad de la licenciada. El despacho de seguro no se hace a domicilio: debe hacerse en persona en la sucursal. El domicilio se factura en un documento aparte de los exámenes.",
    fuente:
      "chats Escalón: $9.40 20/04/2026 conv 717, 21/05/2026 conv 624, 10/07/2026 conv 449, 30/07/2026 conv 229, 13/11/2025 conv 1114; datos 25/07/2026 conv 29 y 389, 02/03/2026 conv 353; pago antes 07/06/2026 conv 4; seguro 01/09/2025 conv 1275; facturas separadas 06/06/2026 conv 365",
    notas:
      "Lista de datos y 'de lunes a viernes': mensaje que Verónica (contact center) manda antes de confirmar, 30/10/2026; pago solo efectivo o transferencia. Monto mínimo para domicilio: no definido al 30/10/2026 (confirmar con la Licda. Paredes); no se le dice ninguno al paciente. Costo más reciente: $9.40 (30/07/2026; ese chat venía con descuento interno, el de 10/07/2026 no). En 2024 eran $8 y se cobraba aunque el paciente pusiera el transporte. Zonas vistas: Escalón, Paraíso de La Escalón, La Floresta, Lisboa, San Francisco, Lomas de Altamira, San Benito, Col. Rubio, Antiguo Cuscatlán, Beethoven; sin límite escrito. Horarios vistos: 6:30-9:00 a.m. (ayuno, cortisol), 1:00 p.m., 2:30-3:00 p.m.; a las 5:00 p.m. ya no sale; en la mañana cuesta porque hay una sola licenciada (conv 449, 638). Sábado 06/06/2026 'hoy van hasta las 6'. Se suspenden en días de horario especial (03/08/2026). Regla 07/06/2026: a quienes piden seguido 'solo q cancelen antes' y resultados hasta que paguen. Resultados de rutina unas 2 h después de que regresa la licenciada. Matriz pasa a Escalón los domicilios cercanos.",
  },
  {
    id: "tema-entrega-resultados",
    nombre: "Entrega de resultados",
    sinonimos: ["entrega de resultados", "como me entregan los resultados", "por donde llegan los resultados", "cuanto tardan los resultados", "en cuanto tiempo salen", "a que hora salen los resultados", "resultados por correo", "resultados por whatsapp", "tiempo de entrega", "resultados al medico"],
    respuesta:
      "Los resultados se envían en PDF por WhatsApp y al correo que dejó registrado, y también a su médico si está registrado en nuestro sistema. Antes de enviarlos, la licenciada los revisa y firma. Los exámenes de rutina (hemograma, química, orina y heces) salen el mismo día, normalmente en unas horas: si viene por la mañana, por la tarde están listos. Las pruebas especiales, como hormonas, tiroideas o insulina, pueden salir más tarde o en la noche. Los cultivos tardan unos 3 días. Algunas pruebas especiales tardan más, según la prueba. Al correo pueden llegar las pruebas por partes conforme salen; por WhatsApp se envía la orden completa, y si lo necesita, se le comparte lo que ya está listo. Si necesita una copia impresa, se la imprimimos sin costo para recoger en la sucursal.",
    fuente:
      "chats Escalón: canales 15/07/2026 conv 439, 14/09/2026 conv 185; médico 08/10/2026 conv 88, 24/08/2026 conv 255; firma 12/06/2026 conv 463; tiempos tanda 4 §1.3 y tanda 5 conv 1259, 1287; correo por partes 18/05/2026 conv 351; WhatsApp orden completa 02/09/2026 conv 243; impresión 29/07/2026 conv 379, 19/10/2026 conv 36",
    notas:
      "Tiempos de rutina dichos: '2 horas máximo', '3 horas', '4 a 6 horas'. Matriz reporta mucho de noche (00:00-02:00). El tiempo de cada prueba va en el catálogo. Si el médico no está registrado, la boleta sale sin médico y la aseguradora puede rechazar el reembolso (conv 300).",
  },
  {
    id: "tema-estado-resultado",
    nombre: "Estado de mis resultados",
    sinonimos: ["ya estan mis resultados", "ya salieron mis resultados", "no me han llegado los resultados", "aun no tienen mis resultados", "me falta un resultado", "falta un examen", "resultado pendiente", "no me llego el resultado", "a que hora me mandan los resultados", "cuando salen mis resultados"],
    respuesta:
      "Para revisar sus resultados necesitamos el nombre completo del paciente, el día en que se hizo los exámenes y la sucursal. Una compañera revisa con el área técnica en qué va su orden y le envía lo que ya esté listo. Si tiene consulta con su médico, díganos a qué hora para tomarlo en cuenta.",
    fuente: "chats Escalón: 19/10/2026 conv 36; 22/08/2026 conv 297; 10/03/2026 conv 830; 27/02/2025 conv 395; 2025 conv 1318, 1671",
    notas:
      "El agente no ve el sistema: el estado real lo da el área técnica. El personal da estimados como '10 a 15 minutos' o '45 minutos' después de consultar. Si se hizo en otra sucursal, se da el WhatsApp de esa sucursal (conv 491).",
  },
  {
    id: "tema-cultivo-preliminar",
    nombre: "Resultado preliminar de un cultivo",
    sinonimos: ["preliminar", "resultado preliminar", "antibiograma", "solo dice positivo", "no dice la bacteria", "cultivo positivo", "urocultivo positivo", "falta el antibiograma", "me llego incompleto el cultivo"],
    respuesta:
      "En los cultivos, a veces llega primero al correo un resultado preliminar que arroja el equipo, por ejemplo solo 'positivo'. Ese no es el resultado final: el reporte completo, con el antibiograma, se envía cuando termina el proceso. El tiempo del cultivo se cuenta desde que se siembra la muestra, no desde que se recibe. Una compañera le confirma cuándo sale el reporte completo.",
    fuente: "chats Escalón: 14/05/2026 conv 127; 20/10/2026 conv 33; 19/10/2026 conv 36; 26/01/2026 conv 561; 13/04/2026 conv 730",
    notas: "Los cultivos positivos los reporta matriz; el texto largo del cultivo se escanea (conv 713).",
  },
  {
    id: "tema-resultados-terceros",
    nombre: "Enviar resultados a otra persona o número",
    sinonimos: ["enviar resultados a mi esposo", "mandar a otro numero", "enviar a otro numero", "enviar a mi doctor", "enviar al medico", "resultados de mi mama", "resultados de mi hijo", "resultados de un familiar", "otro correo", "que los recoja otra persona", "clinica pide resultados"],
    respuesta:
      "Los resultados se envían al número y al correo que el paciente dejó registrados, y a su médico si está registrado. Si necesita que se envíen a otro número, a un familiar o a otro médico, indíquenos el nombre completo del paciente, el día y la sucursal de la toma, y el número o correo de destino. Una compañera lo verifica y se los comparte. Si otra persona va a recoger la copia impresa, díganos su nombre. Las pruebas genéticas se entregan solo al médico que las solicitó.",
    fuente:
      "chats Escalón: 15/01/2026 conv 136; 23/05/2026 conv 34; 07/09/2026 conv 110; 24/08/2026 conv 289; 29/07/2026 conv 379; tanda 4 regla 31-32; tanda 5 conv 1385, 1629; genéticas conv 1438, 1573",
    notas:
      "DUDA: el lab los manda a quien lo pide (familiares, clínicas, otro número) sin verificar identidad, y hubo resultados enviados a la persona equivocada (conv 214, 1142, 1376, 1729). Regla que conviene: mandar a otro destino solo si lo pide el paciente desde su número registrado o la persona del lab lo confirma; confirmar con el lab. Algunos médicos piden recibirlos solo ellos y algunos pacientes piden no mandarlos al médico (conv 997, 982). MaterniT pide DUI de la paciente para reportar.",
  },
  {
    id: "tema-reenvio-resultados",
    nombre: "Reenvío de resultados anteriores o copia impresa",
    sinonimos: ["reenviar resultados", "volver a enviar", "no puedo abrir el pdf", "no abre el archivo", "resultados anteriores", "resultados viejos", "resultados del ano pasado", "copia impresa", "impreso", "en fisico", "imprimir resultados", "perdi mis resultados", "historial de examenes", "tarjeta de tipeo"],
    respuesta:
      "Con gusto le reenviamos sus resultados: indíquenos el nombre completo del paciente, la fecha aproximada y la sucursal. Si el PDF no le abre, se lo enviamos de nuevo o en foto. Si necesita una copia impresa, se la imprimimos sin costo y la recoge en la sucursal. Los resultados muy antiguos podrían ya no estar en el sistema; una compañera lo revisa.",
    fuente: "chats Escalón: 28/05/2026 conv 95; 04/07/2026 conv 471; 29/07/2026 conv 379; 19/10/2026 conv 36; 2025 conv 1520, 1661",
    notas: "'Se depura cada 6 meses' (2025, conv 431, 1000, 1661), pero se reenviaron resultados de 8 y 9 meses antes (conv 705, 1591). Confirmar cuánto se guardan. La tarjeta de tipeo se entrega impresa en la sucursal.",
  },
  {
    id: "tema-formato-resultado",
    nombre: "Cómo viene el reporte de resultados",
    sinonimos: ["dato controlado", "fecha de recibido", "fecha de emitido", "recibido y emitido", "sgot", "sgpt", "no viene el tgo", "no aparece en el pdf", "no viene desglosado", "falta en el pdf"],
    respuesta:
      "En el reporte, la fecha de 'recibido' es cuando se facturó la orden y la de 'emitido' es cuando se grabó el resultado. 'Dato controlado' quiere decir que la prueba se repitió para confirmar que el resultado es correcto. Las transaminasas TGO y TGP aparecen como SGOT y SGPT. Si cree que falta una prueba en el PDF, avísenos y lo revisamos.",
    fuente: "chats Escalón: 2025 conv 1357, 1547, 1598; 28/09/2026 conv 67; 22/01/2026 conv 962",
  },
  {
    id: "tema-error-resultado",
    nombre: "Resultado con error o de otra persona",
    sinonimos: ["este no es mi resultado", "no es mio", "resultado de otra persona", "mi nombre esta mal", "nombre equivocado", "resultado equivocado", "error en el resultado", "el doctor dice que esta mal", "sale en cero"],
    respuesta:
      "Disculpe el inconveniente. Para corregirlo, indíquenos el nombre completo del paciente, el día y la sucursal, y qué dato está mal. Una compañera lo revisa con el área técnica y le envía el resultado corregido. Si recibió un resultado que no es suyo, por favor no lo comparta y avísenos.",
    fuente: "chats Escalón: 07/09/2026 conv 214; 03/09/2026 conv 241; 18/08/2026 conv 294; 27/08/2026 conv 271 y 274; 13/05/2026 conv 651; 2025 conv 1142, 1376, 1729",
  },
  {
    id: "tema-interpretacion",
    nombre: "Interpretación de resultados",
    sinonimos: ["que significa mi resultado", "salio alto", "salio bajo", "esta bien mi resultado", "es grave", "soy fertil", "explicar resultados", "leer resultados", "que quiere decir", "como sali", "bacterias abundantes", "es normal mi resultado"],
    respuesta:
      "No damos lectura ni interpretación de resultados: su médico es quien los interpreta, con base en su historial. Los resultados también se le envían a su médico si está registrado en nuestro sistema. Si cree que hay un error en un dato, avísenos y una compañera lo revisa con el área técnica.",
    fuente: "chats Escalón: 'lectura no hacemos' 27/06/2026 conv 494; 2025 conv 1285, 1424",
    notas: "El personal a veces opinó sobre resultados (conv 33, 76, 1047, 1111, 1142); eso no se repite.",
  },
  {
    id: "tema-ayuno",
    nombre: "Ayuno",
    sinonimos: ["ayuno", "ayunas", "en ayunas", "horas de ayuno", "cuantas horas de ayuno", "ir en ayuna", "puedo tomar agua", "puedo tomar cafe", "sin comer", "que ceno", "ya desayune", "comi algo"],
    respuesta:
      "Para los exámenes que lo piden, como glucosa y lípidos, debe presentarse con un ayuno mínimo de 8 horas y máximo 12 horas, a partir de su cena. La cena puede ser normal. Por ejemplo, si cena a las 7:00 p.m., debe estar en el laboratorio antes de las 7:00 a.m. Durante el ayuno solo puede tomar agua, en poca cantidad; nada de café, té ni jugos. Si una prueba de su orden pide ayuno, venga en ayunas para que todo se tome en una sola muestra. Muchas pruebas no necesitan ayuno, a menos que su médico se lo haya indicado. Si ya comió, ese día se pueden tomar las pruebas que no piden ayuno y dejar las demás para otro día.",
    fuente:
      "plantilla del personal 'ayuno mínimo de 8 horas y máximo 12 horas, a partir de su cena' (unas 100 veces en las 5 tandas; 07/10/2026 conv 42, 17/10/2026 conv 41); ejemplo 7 p.m. conv 649 y 942; agua conv 202, 227, 649, 934; una sola muestra conv 583, 1020; comió 08/04/2026 conv 366",
    notas:
      "CONTRADICCIÓN: a veces '10 horas mínimo y 12 máximo' (unas 15 veces: lípidos, postprandial, tolerancias, cortisol, embarazada), sin regla clara de cuándo; 8 a 10 h para curvas de 5 h (conv 911); Apo B 12 a 14 h (referencia). Alcohol el día anterior: 'solo le afectaría en la Glucosa' (conv 329). 'Un día antes no realizar ejercicios' (conv 545, una vez). La gripe no afecta (conv 649).",
  },
  {
    id: "tema-muestra-orina",
    nombre: "Muestra de orina",
    sinonimos: ["muestra de orina", "frasco de orina", "bote de orina", "botecito", "primera orina", "primera orina del dia", "cuanto aguanta la orina", "cuanto dura la muestra de orina", "orina de bebe", "bolsita recolectora", "cuantos ml de orina", "llevar orina de la casa", "frasco esteril", "venden frascos", "cuanto cuesta el frasco", "precio del frasco"],
    respuesta:
      "Puede tomar la muestra en su casa o aquí en el laboratorio. Hágase un buen aseo del área genital antes de recolectarla. No es necesario que sea la primera orina del día, a menos que su médico se lo haya indicado. Para el examen general bastan unos 10 ml. Use un frasco estéril que no sea de vidrio; si no tiene, aquí lo vendemos a $1.40. Si la toma en casa, tráigala lo antes posible: no debe pasar de 1 hora y media desde que la recolectó. En bebés se usa una bolsita recolectora, que se consigue en farmacia, colocada después de un buen aseo.",
    fuente:
      "chats Escalón: 07/10/2026 y 16/10/2026 conv 42; 18/09/2026 conv 132; 19/06/2026 conv 474; 26/08/2026 conv 278; 2026 conv 563, 639, 773; 09/10/2025 conv 1183 (frasco); frasco a $1.40, dicho por el usuario el 30/10/2026",
    notas:
      "CONTRADICCIÓN del tiempo: 1 h y media (lo más dicho en 2026); bebé 2 h desde que termina de recolectarse (conv 773); 'general 2 horas, cultivo 1 hora y 30 minutos' (conv 977); 'antes de una hora' (conv 1790); '2 o 3 horas' (conv 1168); 'con duración de 3 horas' (conv 1662). Primera orina: 'no solicitamos que sea la primera' (2026) frente a 'de preferencia la primera de la mañana' (2025, conv 577, 1412). Gonorrea en orina: primera del día sin aseo (2025), pero en 01/2026 'no se están realizando'. Para curvas, la orina se da antes de la sangre (conv 600).",
  },
  {
    id: "tema-muestra-heces",
    nombre: "Muestra de heces",
    sinonimos: ["muestra de heces", "frasco de heces", "muestra de popo", "popo", "heces de bebe", "pamper", "panal", "cuanta muestra de heces", "cuanto dura la muestra de heces"],
    respuesta:
      "Basta con una cantidad pequeña, no necesita traer mucho. Puede traerla en un frasco para muestras; si no tiene, aquí lo vendemos a $1.40. No es necesario que sea la primera del día. Tráigala lo antes posible: la muestra sirve hasta 1 hora y media después de recolectada. En bebés con pañal, póngale el pañal al revés para que la muestra no se absorba, y recoja suficiente cantidad.",
    fuente: "chats Escalón: 07/10/2026 conv 42; 18/09/2026 conv 132; 2026 conv 452; 2025 conv 977, 1183; pañal 06/02/2025 conv 203",
    notas: "Sangre oculta en heces lleva dieta de 3 días (va en el catálogo). Muestras de bebé insuficientes no se procesan (conv 10, 29, 134).",
  },
  {
    id: "tema-orina-24-horas",
    nombre: "Recolección de orina de 24 horas",
    sinonimos: ["orina de 24 horas", "orina 24 horas", "recolectar orina 24 horas", "como recolecto la orina de 24 horas"],
    respuesta:
      "La primera orina al levantarse se descarta. Desde la siguiente, recolecte toda la orina durante 24 horas, hasta la misma hora del día siguiente. Por ejemplo, si orina a las 3:00 a.m. (esa se descarta) y vuelve a orinar a las 6:00 a.m., recolecta desde las 6:00 a.m. hasta las 6:00 a.m. del día siguiente. Si no sabe si su médico la pidió de 24 horas o al azar, revise la orden o consúltenos.",
    fuente: "chats Escalón: 06/03/2025 conv 1268; 2025 conv 1072",
    notas: "No hay dato de frasco ni de refrigeración: confirmar con el lab.",
  },
  {
    id: "tema-muestras-medico",
    nombre: "Muestras que toma el médico (VPH, cultivo vaginal, ITS)",
    sinonimos: ["hisopado vaginal", "muestra vaginal", "quien toma la muestra de vph", "toman la muestra de vph", "secrecion vaginal", "muestra de uretra", "medio de transporte", "medios para vph", "laminillas", "no tienen ginecologo"],
    respuesta:
      "Las muestras vaginales, de uretra o de pene (como VPH, panel ITS, cultivo vaginal o estreptococo del grupo B) las toma su médico: el laboratorio no tiene médico para tomarlas, solo las procesa. Su médico toma la muestra en el medio de transporte y usted o la clínica la traen al laboratorio para facturarla y procesarla. Si su médico no tiene el medio de transporte, consúltenos.",
    fuente: "chats Escalón: 18/08/2026 conv 316; 2026 conv 618, 763; 2025 conv 919, 1322; medios 2026 conv 104, 128; 2025 conv 1301",
    notas: "Medios: 'el medio de transporte yo se lo puedo entregar' (2026) frente a 'nosotros no lo vendemos [el de VPH]' (2025). Desde 11/2024 matriz manda los medios a los médicos.",
  },
  {
    id: "tema-agregar-prueba",
    nombre: "Agregar un examen a la muestra ya tomada",
    sinonimos: ["agregar un examen", "agregar una prueba", "de la misma muestra", "con la misma muestra", "se me olvido un examen", "olvide un examen", "pasar a cultivo", "agregar a la muestra", "con las muestras que tiene"],
    respuesta:
      "Depende de que la muestra alcance y todavía sirva para esa prueba; eso lo confirma la licenciada. Si se puede, se cobra la prueba (por transferencia o en la sucursal) y el resultado sale de la misma muestra. Si no, hay que tomar una muestra nueva. Una compañera lo consulta y le avisa.",
    fuente: "chats Escalón: 25/05/2026 conv 611; 04/03/2026 conv 511; 14/04/2026 conv 724; 07/04/2026 conv 302; 2025 conv 1103, 1210, 1324, 1385, 1546",
    notas: "Después de las 6:00 p.m. la licenciada ya se retiró (conv 302). Depende del tubo: el perfil prenatal pide tubo rojo (conv 1103).",
  },
  {
    id: "tema-muestra-pendiente",
    nombre: "Muestra pendiente o en otra sucursal",
    sinonimos: ["muestra pendiente", "llevar la muestra despues", "dejar la muestra en otra sucursal", "traer la muestra otro dia", "puedo ir a otra sucursal", "misma boleta en otra sucursal", "segunda toma en otra sucursal"],
    respuesta:
      "Si le quedó pendiente una muestra, por ejemplo orina o heces, puede traerla después a la misma sucursal o dejarla en otra de nuestras sucursales con su boleta. Avísenos a cuál sucursal la llevará para enviar la orden. Los precios son los mismos en todas las sucursales en horario hábil.",
    fuente: "chats Escalón: 12/04/2026 conv 19; 02/09/2026 conv 29; supervisión 27/08/2026 y 01/09/2026 (boleta y frascos rotulados); 2024-2026 matriz",
    notas: "'Es un mes a partir de la fecha en que los canceló' para entregar la muestra de un examen pagado (2025, conv 1022): confirmar antes de publicarlo.",
  },
  {
    id: "tema-referencia-geneticas",
    nombre: "Pruebas especiales y genéticas",
    sinonimos: ["prueba de referencia", "pruebas de referencia", "prueba genetica", "pruebas geneticas", "la mandan a otro laboratorio", "se envia afuera", "la envian a estados unidos", "panel genetico", "evaluacion del genetista"],
    respuesta:
      "Algunas pruebas especiales tardan más, desde días hasta semanas según la prueba, y antes de tomarlas se le confirma el tiempo de entrega. Algunas solo se toman de lunes a viernes. Las pruebas genéticas se coordinan con su médico: varias requieren formularios firmados y su resultado se entrega al médico que las solicitó. La asesoría genética y evaluación es con el Dr. Borys Cornejo Moreno, genetista clínico molecular, al 7900-5337: la consulta es en el área de Imagenología, primera planta del Hospital Centro Ginecológico, de 4:00 p.m. a 7:00 p.m., cuesta $50.00 y acepta cualquier forma de pago. El precio y el tiempo de una prueba especial se los confirma una compañera.",
    fuente: "chats Escalón: 02/09/2026 conv 5; 19/08/2026 conv 310; 2026 conv 24, 49, 106, 134; 2025 conv 1034, 1083, 1267, 1396, 1438",
    notas:
      "NUNCA decirle al paciente que una prueba se envía a otro laboratorio ni usar 'referencia' (pedido del usuario, 30/10/2026). El genetista, su número, lugar, horario y precio de consulta vienen del Word del laboratorio §3.7, que se los da a los pacientes (antes la base decía no nombrarlo). Tiempos vistos: de 1 día a 2 meses. MaterniT: obligatorio anotar semanas de embarazo (07/2026). Sexo fetal: resultado impreso o digital.",
  },
  {
    id: "tema-hospital-servicios",
    nombre: "Servicios del hospital (no son del laboratorio)",
    sinonimos: [
      "holter",
      "elastografia",
      "elastografia hepatica",
      "electrocardiograma",
      "tac",
      "tomografia",
      "resonancia",
      "electroencefalograma",
      "radiografia",
      "rayos x",
      "endoscopia",
      "colonoscopia",
      "consulta ginecologica",
      "consulta medica",
      "ginecologo",
      "endocrinologo",
      "parto",
      "cesarea",
      "habitacion",
      "vacuna",
      "vacunas",
      "vacuna del vph",
      "inseminacion",
      "planes prenatales",
      "control prenatal",
      "implante anticonceptivo",
      "biopsia",
      "esterilizacion",
      "citologia",
      "papanicolaou",
      "empleo",
      "vacantes",
    ],
    respuesta:
      "Ese servicio no lo realizamos en el laboratorio. Puede consultarlo con el Hospital Centro Ginecológico, en Colonia Médica: Recepción del Hospital, 2247-1122. Ahí le informan sobre Holter, elastografía, electrocardiograma, tomografía, resonancia, electroencefalograma, radiografías, endoscopía, consultas médicas, planes prenatales, parto y cesárea, vacunas, inseminación y citología.",
    fuente:
      "chats Escalón: Holter 15/10/2026 conv 62; elastografía 09/04/2025 conv 128; cesárea 08/09/2026 conv 213; vacunas 05/06/2026 conv 574, 21/08/2026 conv 303; planes prenatales 17/05/2026 conv 642; inseminación 27/03/2026 conv 772; resonancia 30/06/2026 conv 485; tanda 4 conv 778, 968, 1181; tanda 5 conv 1261, 1289, 1355, 1393, 1435, 1494, 1636, 1695, 1730",
    notas:
      "Citología: 'de momento aún no' en Escalón (07/2026); en 2025 se derivó también a 2247-1141/2247-1143 (conv 1317). La consulta ginecológica es en Colonia Médica (el precio lo da el hospital, no el lab). El WhatsApp del hospital es 7837-5858 (en los chats sale como 'el # del área' de imágenes); el lab siempre deriva por teléfono.",
  },
  {
    id: "tema-imagenologia",
    nombre: "Ultrasonografía, mamografía e imágenes",
    sinonimos: ["ultra", "ultras", "ultrasonido", "ultrasonografia", "usg", "ecografia", "ultra abdominal", "ultra de embarazo", "ultra 5d", "ultra de sexo", "mamografia", "tomosintesis", "perfil biofisico", "examen de ovulacion", "ultra de tiroides", "ultra de mama", "factura de ultra", "monitoreo fetal"],
    respuesta:
      "Las ultrasonografías, mamografías y demás estudios de imagen no se hacen en el laboratorio: los realiza el área de Imagenología del Hospital Centro Ginecológico, en Colonia Médica. Para precios, citas o facturas de esos estudios, llame a Imagenología al 2247-1142. El monitoreo fetal se realiza solo en Colonia Médica.",
    fuente:
      "chats Escalón: 24/08/2026 conv 30; 03/07/2026 conv 476; 24/09/2026 conv 145; 01/09/2026 conv 217; tanda 4 conv 817, 998, 1105, 1117, 1126, 1172; tanda 5 conv 1274, 1330, 1386, 1800; monitoreo fetal 25/09/2026 conv 128",
    notas: "Una vez se dio 2247-1122 como 'Imagenología' (conv 739), error. 2026-06: 'creo q atienden por orden de llegada' para mamografía (conv 583), no confirmado. En 2025 se dijo que 'patología' también es en Imagenología (conv 1653): raro, no se publica.",
  },
  {
    id: "tema-medicamentos",
    nombre: "Medicamentos e inyecciones",
    sinonimos: ["medicamentos", "medicinas", "precio de medicamentos", "inyeccion", "inyecciones", "ponen inyecciones", "aplicar inyeccion", "inyeccion anti d", "rh negativo inyeccion", "sueros"],
    respuesta:
      "En el laboratorio no vendemos medicamentos ni aplicamos inyecciones; solo realizamos exámenes de laboratorio clínico. Para vacunas, puede consultar con la Recepción del Hospital Centro Ginecológico al 2247-1122.",
    fuente: "chats Escalón: 'Precios de medicamentos no manejamos' 29/09/2026 conv 126; anti-D 'eso sí no lo hacemos' 18/09/2026 conv 132; vacunas conv 574, 303",
  },
  {
    id: "tema-demoras",
    nombre: "Demora en los resultados",
    sinonimos: ["se han tardado", "demora", "demorado", "tardan mucho", "por que tarda tanto", "retraso", "atrasado", "llevo esperando", "tardanza"],
    respuesta:
      "Le ofrecemos las disculpas del caso. Sus pruebas siguen en proceso y algunas están tardando más de lo normal. Una compañera revisa con el área técnica en qué va su orden y le envía lo que ya esté listo; apenas salgan las demás, se las enviamos por WhatsApp y correo.",
    fuente: "supervisión 24/08/2026 (frase oficial de demora); supervisión 13-14/08/2024 ('no prometerlas para rápido'); chats Escalón 2025-2026 conv 283, 517, 591, 1093, 1167",
    notas:
      "Frase oficial aprobada (24/08/2026): 'las disculpas del caso, pero el equipo de pruebas especiales aún está en mantenimiento por lo cual se demorarán las pruebas'. Usarla solo si el personal confirma que el mantenimiento sigue. Nunca dar detalles de fallas internas (sistema caído, sin reactivo, equipo dañado, motorista, Uber) ni prometer horas.",
  },
  {
    id: "tema-quejas",
    nombre: "Quejas y reclamos",
    sinonimos: ["queja", "quejas", "reclamo", "mal servicio", "estoy molesta", "inconforme", "no me atendieron", "nadie contesta", "pesimo servicio", "defensoria del consumidor", "devolucion de dinero", "me cobraron mal", "cobro equivocado"],
    respuesta:
      "Lamentamos mucho lo sucedido y le ofrecemos las disculpas del caso. Para atenderle, indíquenos el nombre completo del paciente, el día, la sucursal y qué pasó. Su caso lo revisa la encargada del laboratorio, y una compañera le responde por este chat.",
    fuente: "chats Escalón: 14/10/2026 conv 5 ('px con queja' a administración); 11/12/2025 conv 1060; 03/06/2025 conv 1501; 18/06/2025 conv 323; 21/08/2026 conv 304",
    notas:
      "Lo que ofreció el lab en casos puntuales (repetir exámenes sin costo, anular voucher, recalcular) lo decidió la jefatura: el agente no lo promete. Amenaza de ir a la Defensoría: pasar de inmediato a una persona.",
  },
  {
    id: "tema-seguro",
    nombre: "Cómo funciona el seguro médico",
    sinonimos: ["seguro medico", "seguro privado", "aseguradora", "con seguro", "copago", "co pago", "coaseguro", "deducible", "reembolso", "desembolso", "despacho", "preautorizacion", "autorizacion del seguro", "me cubre el seguro", "cuanto pago con seguro", "80 20", "esta en la red", "medico de la red", "formulario del seguro"],
    respuesta:
      "Antes de cotizar le preguntamos si tiene seguro médico privado y cuál, porque cada aseguradora tiene su precio arancelado con descuento, y ese descuento se aplica aunque no use el seguro. Hay dos formas de usarlo. Despacho directo: si su médico subió los exámenes a la plataforma de la aseguradora o usted trae la preautorización, se despacha en el laboratorio y usted paga solo lo que le corresponde según su póliza; ese monto (coaseguro o deducible) se conoce hasta hacer el despacho. Reembolso: si su médico no es de la red o no hay autorización, paga el total con el precio arancelado y presenta a su aseguradora la orden del médico y la factura. El despacho se hace en persona el día de la toma, y usted firma la boleta del seguro. Si alguna prueba no la cubre la aseguradora, se paga aparte. El ISSS no cuenta como seguro privado.",
    fuente:
      "chats Escalón: 'Es para aplicarle descuento nada más' 23/08/2025 conv 165; 'el descuento siempre se le aplicaría' 24/06/2026 conv 330; 'el total a cancelar lo sabemos al realizar el despacho' 04/06/2026 conv 260; médico fuera de red 14/08/2026 conv 332; despacho en persona conv 481, 523; firma conv 62, 479; tanda 4 regla 3; tanda 5 conv 1372, 1412, 1499",
    notas:
      "El personal da un 'aproximado' de coaseguro si el paciente dice su porcentaje (conv 300, 354, 476): el agente no calcula. Los porcentajes que dice el personal (10% o 12%) no cuadran con los precios: hay una lista arancelada por aseguradora. 'Privado' o 'particular' a veces quiere decir que NO tiene seguro (conv 1104). Una prueba repetida en dos órdenes se cobra una vez (conv 260). Órdenes de médicos externos se aceptan con preautorización (conv 260).",
  },
  {
    id: "tema-datos-registro",
    nombre: "Datos para registrarse como paciente",
    sinonimos: ["datos del paciente", "que datos necesitan", "que documentos llevo", "que necesito llevar", "requisitos", "paciente nuevo", "registrarme", "expediente", "menor de edad"],
    respuesta:
      "Para registrarle necesitamos nombre completo, DUI, fecha de nacimiento, un número de teléfono para los resultados y un correo electrónico para la factura y los resultados. Si quiere que los resultados le lleguen a su médico, díganos su nombre. Si el paciente es menor de edad, también el nombre y DUI de la persona responsable. Para la prueba de VIH se pide copia del DUI por ambos lados. Si va a usar su seguro, traiga además el carnet y la orden o autorización.",
    fuente: "chats Escalón: 16/04/2026 conv 68 y 161; 31/08/2026 conv 236; 11/05/2026 conv 659; 2025 conv 1398, 1574, 1670; VIH 2025 conv 1068, 1083, 1467",
  },
  {
    id: "tema-factura",
    nombre: "Factura electrónica",
    sinonimos: ["factura", "facturita", "dte", "factura electronica", "no me llego la factura", "comprobante de pago", "recibo", "reenviar factura", "factura para el seguro", "detalle de la factura", "factura sellada", "factura detallada", "cambiar correo de factura"],
    respuesta:
      "La factura es electrónica (DTE) y le llega al correo registrado en el momento de facturar; revise también el correo no deseado. Si no le llegó, indíquenos a nombre de quién está la factura, el día y la sucursal, y se la compartimos en PDF por este chat. La factura se emite a nombre de una persona adulta: si el paciente es menor, va a nombre del responsable y abajo aparece el nombre del paciente. Para el reembolso de su seguro, la factura electrónica dice 'Servicios'; le enviamos el detalle de los exámenes en PDF, y si la aseguradora lo pide sellado, se lo entregamos en la sucursal. Las facturas de ultrasonografía o mamografía las da Imagenología, al 2247-1142.",
    fuente:
      "chats Escalón: 18/02/2025 conv 120; 12/06/2026 conv 11 y 91; 28/09/2026 conv 51; 23/09/2026 conv 144; 02/02/2026 conv 933; 01/09/2026 conv 217; 2025 conv 1693, 1715, 1724; matriz descarga DTE (interno)",
    notas:
      "El agente no descarga facturas: lo hace una persona (pide a matriz o contabilidad). Si el correo rebota, el sistema no deja emitir (conv 1021). La factura para reembolso debe salir detallada (conv 280). Factura de otra sucursal: la pide a matriz o se da el WhatsApp de esa sucursal. Problemas con la plataforma de facturas en 05 y 07/2026: no se dice al paciente.",
  },
  {
    id: "tema-credito-fiscal",
    nombre: "Crédito fiscal (CCF)",
    sinonimos: ["credito fiscal", "ccf", "comprobante de credito fiscal", "nrc", "tarjeta de iva", "factura a nombre de empresa", "factura a nombre del doctor", "factura con iva"],
    respuesta:
      "Sí emitimos comprobante de crédito fiscal. Hay que pedirlo al momento de facturar y compartirnos una copia de la tarjeta de IVA (NRC) de la persona o empresa a cuyo nombre se emite. Le llega al correo como documento electrónico. En el servicio a domicilio, el domicilio y los exámenes van en documentos separados.",
    fuente: "chats Escalón: 31/08/2026 conv 236; 26/02/2026 conv 353; 06/06/2026 conv 365 y 565; 31/10/2025 conv 507; 24/03/2026 conv 787",
    notas: "Un CCF pendiente de pago bloquea los resultados en el sistema (conv 366).",
  },
  {
    id: "tema-quienes-somos",
    nombre: "Quiénes somos y nuestras sucursales",
    sinonimos: ["quienes son", "son el hospital", "son del centro ginecologico", "es la misma empresa", "cuantas sucursales tienen", "que sucursales tienen", "sucursales", "sucursal en soyapango", "sucursal en santa tecla", "lista de sucursales", "otro laboratorio"],
    respuesta:
      "Somos Laboratorios Centro Ginecológico, el laboratorio clínico del grupo del Hospital Centro Ginecológico. Tenemos 6 sucursales: Colonia Médica (casa matriz, abierta las 24 horas), San Benito, Colonia Escalón, C.C. Las Ramblas y C.C. Santa Rosa (las dos en Santa Tecla) y C.C. El Encuentro en Aguilares. No tenemos sucursal en Soyapango. Si busca otro laboratorio u hospital con nombre parecido, no somos el mismo.",
    fuente: "chats Escalón: lista de sucursales 08/08/2025 conv 1341; 'somos los mismos' 28/05/2026 conv 603; tanda 4 conv 1064, 1207; tanda 5 conv 1745; hub 15/10/2026",
    notas: "En 2022 eran 3 sucursales. Pacientes confunden con el Hospital de la Mujer y con otros laboratorios: no se nombran.",
  },
  {
    id: "tema-telefono-escalon",
    nombre: "Teléfono de la Sucursal Escalón",
    sinonimos: ["telefono", "numero de telefono", "numero fijo", "telefono fijo", "llamar por telefono", "no contestan el telefono", "fuera de servicio", "2514 3430", "25143430", "a que numero llamo", "contact center", "call center"],
    respuesta:
      "Por el momento la Sucursal Escalón atiende por este WhatsApp, 6121-9138, porque el teléfono fijo de la sucursal está presentando fallas. Puede escribirnos por aquí. Para información general también está el Contact Center, 2247-1122.",
    fuente: "chats Escalón: 08/07/2026 conv 69; 16/05/2026 conv 111; 21/05/2026 conv 625; 06/06/2026 conv 568; 09/01/2026 conv 162; supervisión 30/08/2026; Contact Center 2247-1122 (supervisión 2024-2026)",
    notas: "Desde 11/2024 los artes solo llevan el número del Contact Center 2247-1122 (es la recepción del hospital). Si el lab confirma que el 2514-3430 funciona, cambiar esta respuesta.",
  },
  {
    id: "tema-escalon-traslado",
    nombre: "Nueva ubicación de la Sucursal Escalón",
    sinonimos: ["nueva ubicacion", "se cambiaron", "se trasladaron", "cambiaron de local", "ya no estan frente a promerica", "banco promerica", "promerica", "instituto de ojos", "hospital de ojos", "fui y estaba cerrado", "donde estan ahora", "a donde se movieron"],
    respuesta:
      "Desde marzo de 2026 la Sucursal Escalón se trasladó. Ya no estamos en el Edificio Instituto de Ojos, frente al Banco Promerica: ahora estamos más arriba, sobre el Paseo General Escalón y 87 Avenida Norte, Edificio Escalón, local 1-B, frente a la Gasolinera UNO, media cuadra arriba del McDonald's y a la par de Steren. Fue un traslado, no una sucursal nueva: somos los mismos.",
    fuente: "chats Escalón: 08/07/2026 conv 69; 16/05/2026 conv 135; 06/06/2026 conv 90; 03/07/2026 conv 222; 06/04/2026 conv 750; 25/05/2026 conv 752; 27/03/2026 conv 775 (rótulo)",
  },
  {
    id: "tema-pediatria",
    nombre: "Exámenes a niños y bebés",
    sinonimos: ["examenes para ninos", "examenes pediatricos", "examenes para bebe", "examenes a mi bebe", "recien nacido", "pediatrico", "nino"],
    respuesta:
      "Sí realizamos exámenes a niños y bebés. Para orina en bebés se usa una bolsita recolectora, y para heces en pañal, el pañal se pone al revés. Si el paciente es menor, necesitamos el nombre y DUI de la persona responsable.",
    fuente: "chats Escalón: 'Si realizamos' 30/08/2025 conv 1278; 2026 conv 639, 773; 06/02/2025 conv 203; 11/05/2026 conv 659",
    notas: "Domicilio a recién nacido por tamizaje neonatal (25/07/2026, conv 389). El tamizaje de oídos es del hospital (nursería).",
  },
  {
    id: "tema-encuesta",
    nombre: "Encuesta de satisfacción",
    sinonimos: ["encuesta", "me llego una encuesta", "encuesta de satisfaccion", "llego la encuesta y no los resultados"],
    respuesta:
      "Junto con los resultados le llega una encuesta de satisfacción; le agradecemos si la contesta. Si le llegó la encuesta pero aún no el resultado, es porque sus pruebas siguen en proceso: se las enviamos apenas estén listas.",
    fuente: "chats Escalón: 06/06/2026 conv 565; 07/07/2026 conv 467; 19/09/2026 conv 35; supervisión 02/01/2026 (encuesta 2026)",
    notas: "La encuesta antigua daba un código de descuento (2024); no hay evidencia de que siga: no se menciona.",
  },
];

// ── Promociones ─────────────────────────────────────────────────────────────
// Ninguna promoción de los chats tiene vigencia escrita que cubra el 23/10/2026:
// las de 2024 vencieron, los perfiles "en promoción" de abril y junio de 2026
// eran "hasta fin de mes", y la mamografía de junio de 2026 es del hospital.

export const PROMOCIONES_LAB: PromocionKb[] = [];
