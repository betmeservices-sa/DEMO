// Redes, comentarios y promociones de Capitán Hawk para el demo.
//
// Las fotos son del lugar (publicadas por Latina Republic en 2021) y las
// cuentas son las suyas (@capitanhawk_ en Instagram y Capitan Hawk en
// Facebook). La visita de día de $10 + $10 consumibles, la fogata del fin de
// semana, la piscina iluminada y que es pet friendly salen de lo que publican.
// Los números de cada publicación, quién comenta y las promociones son
// INVENTADOS.

import type { PromocionSemilla, RedesMuestra } from "./tipos";

const F = "/brand/capitanhawk/fotos";

export const CAPITANHAWK_REDES: RedesMuestra = {
  cuentas: [
    { red: "instagram", handle: "@capitanhawk_", seguidores: 4620, nuevosSeguidores: 184, crecimientoPct: 4.1, alcance30d: 21400, vistas30d: 48200, interacciones30d: 3120 },
    { red: "facebook", handle: "Capitan Hawk", seguidores: 12800, nuevosSeguidores: 96, crecimientoPct: 0.8, alcance30d: 18900, vistas30d: 35100, interacciones30d: 1840 },
  ],
  publicaciones: [
    { id: "ig1", red: "instagram", estado: "publicado", enDias: -2, hora: "18:00", imagenes: [`${F}/atardecer.jpg`], texto: "Atardeceres que no se olvidan 🌅 Playa El Amatal, a 40 minutos de San Salvador. Reserva tu palapa o bungalow por WhatsApp.", engagement: { alcance: 6840, meGusta: 412, comentarios: 38, compartidos: 21, guardados: 64 } },
    { id: "ig2", red: "instagram", estado: "publicado", enDias: -6, hora: "12:00", imagenes: [`${F}/piscina.jpg`], texto: "Nuestra piscina iluminada hasta las 10:00 p. m. ✨ ¿Ya conoces el Bungalow Ecológico?", engagement: { alcance: 5210, meGusta: 298, comentarios: 19, compartidos: 9, guardados: 41 } },
    { id: "ig3", red: "instagram", estado: "publicado", enDias: -11, hora: "17:30", imagenes: [`${F}/bungalow.jpg`], texto: "Bungalows de palma con aire acondicionado e iluminación solar, a pasos del mar 🌴 Pet friendly 🐾", engagement: { alcance: 4380, meGusta: 251, comentarios: 22, compartidos: 14, guardados: 37 } },
    { id: "ig4", red: "instagram", estado: "programado", enDias: 2, hora: "17:00", imagenes: [`${F}/palapa.jpg`], texto: "Fin de semana de fogata en la playa 🔥 Quedan pocos bungalows: escríbenos por WhatsApp y te lo apartamos." },

    { id: "fb1", red: "facebook", estado: "publicado", enDias: -4, hora: "09:00", imagenes: [`${F}/palapa.jpg`], texto: "¡Visita de día por $10! Palapa privada frente al mar, hamaca, piscina, duchas y parqueo. Más $10 en consumibles en el bar. Pet friendly 🐾", engagement: { alcance: 9120, meGusta: 356, comentarios: 52, compartidos: 47 } },
    { id: "fb2", red: "facebook", estado: "publicado", enDias: -15, hora: "11:00", imagenes: [`${F}/comida.jpg`], texto: "Mariscos, pescado frito y ceviche de nuestro restaurante aliado, servidos en tu palapa 🦐", engagement: { alcance: 7300, meGusta: 289, comentarios: 31, compartidos: 25 } },
    { id: "fb3", red: "facebook", estado: "borrador", enDias: 5, hora: "10:00", imagenes: [`${F}/playa.jpg`], texto: "Celebra tu convivio de fin de año en Capitán Hawk: palapas reservadas para grupos y almuerzo por encargo." },
  ],
  comentarios: [
    { id: "cc1", publicacionId: "fb1", autor: "Karen Mejía", texto: "¿Se puede llevar hielera con comida?", haceMin: 18 },
    { id: "cc2", publicacionId: "ig1", autor: "dani.rivas", texto: "¿Para el domingo hay palapas? Somos 5 🙌", haceMin: 47, meGusta: 2 },
    { id: "cc3", publicacionId: "ig3", autor: "luis_amaya.sv", texto: "¿Cuánto la noche en bungalow para 4?", haceMin: 95 },
    {
      id: "cc4",
      publicacionId: "fb1",
      autor: "Roberto Campos",
      texto: "¿Aceptan perros grandes?",
      haceMin: 260,
      respuestas: [{ autor: "", nuestra: true, texto: "¡Hola Roberto! Sí, somos pet friendly y su mascota entra sin costo. Solo le pedimos traerla con correa en las áreas comunes 🐾", haceMin: 240 }],
    },
    {
      id: "cc5",
      publicacionId: "ig2",
      autor: "mafer.cg",
      texto: "@luisa_hdz este finde sí o sí",
      haceMin: 380,
      meGusta: 3,
      respuestas: [
        { autor: "luisa_hdz", texto: "¡Vamos! 🌴", haceMin: 360, meGusta: 1 },
        { autor: "", nuestra: true, texto: "¡Las esperamos a las dos!", haceMin: 340 },
      ],
    },
    { id: "cc6", publicacionId: "fb2", autor: "Promo Seguidores Baratos", texto: "Gana seguidores reales, escríbenos al DM", haceMin: 500, oculto: true },
  ],
};

export const CAPITANHAWK_PROMOCIONES: PromocionSemilla[] = [
  {
    id: "chp1",
    nombre: "Bungalow para visita de día",
    descripcion: "Bungalow con cama y aire acondicionado para pasar el día, con palapa privada frente al mar.",
    precio: "$38 para dos personas",
    restricciones: "De lunes a viernes. No aplica feriados.",
    activa: true,
  },
  {
    id: "chp2",
    nombre: "Noche en Bungalow Ecológico",
    descripcion: "Palapa privada, piscina iluminada hasta las 10:00 p. m., fogata en la playa el fin de semana y desayuno típico.",
    precio: "$90 para 2 · $120 para 3 · $150 para 4",
    restricciones: "Sujeto a disponibilidad. Check in 3:00 p. m., check out 2:00 p. m.",
    activa: true,
  },
  {
    id: "chp3",
    nombre: "Suite Capitán para parejas",
    descripcion: "Cama matrimonial, aire acondicionado, baño completo y jardín privado.",
    precio: "$100 la noche (antes $150)",
    restricciones: "De domingo a jueves.",
    hastaEnDias: 30,
    activa: true,
  },
];
