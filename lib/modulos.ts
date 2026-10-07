// Que ve cada rol y en que ruta vive cada modulo.
//
// Va aparte de roles.ts porque esto TAMBIEN corre en el servidor: el middleware
// lo usa para cerrar la puerta de verdad. roles.ts es "use client" y ademas lee
// las etiquetas del tenant activo, asi que no se puede importar desde ahi.
//
// La distincion importa: el menu que no muestra un modulo es comodidad; lo que
// impide entrar escribiendo la URL a mano es esto.

import type { RoleId } from "./data/types";

export type ModuleId =
  | "bandeja"
  | "mis-chats"
  | "tickets"
  | "hoy"
  | "contactos"
  | "habitaciones"
  | "calendario"
  | "pipeline"
  // Tablero de prospectos de CrediQ, la financiera de Grupo Q. Es su propio
  // modulo y no el "pipeline" de arriba: ese es el tablero inmobiliario, con
  // propiedades y carriles que aca no aplican.
  | "crediq"
  // Tablero de la sala de ventas de Nissan: el mismo oficio que "crediq" pero
  // del otro lado del negocio. Aca no se persigue un expediente, se persigue
  // que el carro salga del piso, y por eso las columnas y los pasos son otros.
  | "ventas"
  // El centro de reclutamiento de BetMe: el pipeline de candidatos por
  // vacante, las vacantes con su match automatico contra el banco, los
  // perfiles, las entrevistas con sus scorecards y el onboarding.
  | "talento"
  | "vacantes"
  | "perfiles"
  | "entrevistas"
  | "onboarding"
  // Pizza Hut: las propuestas de organizadores para vender en sus eventos
  // (lista, tablero por etapa y calendario). Es el corazon de ese panel.
  | "eventos"
  | "visitas"
  | "cartera"
  | "publicacion"
  | "cobros"
  | "campanas"
  // El consultorio: los pacientes del doctor con su QR, sus recetas y sus
  // ordenes. Y el mostrador del laboratorio, que es la otra punta del mismo
  // flujo: quien llega a hacerse los examenes.
  | "consultorio"
  | "laboratorio"
  // Lo que mira el jefe del laboratorio: cuanta gente paso, cuanto espero,
  // cuanto se facturo y que quedo sin hacerse.
  | "jefatura"
  // La Unidad de Imagenologia y la sala de procedimientos: su propia fila, su
  // propio codigo de entrada y su propio catalogo.
  | "imagenologia"
  // La bandeja simulada de la clinica: conversaciones de muestra, de solo
  // lectura. No es la bandeja real de los otros clientes.
  | "mensajes"
  | "interno"
  | "redes"
  | "comentarios"
  | "promociones"
  | "perfil"
  // Probar a Sofía: un chat de prueba contra el guion real (solo Yali).
  | "sofia"
  | "dashboard"
  // El reporte de desempeno de Sofia: que reservas son suyas y por que. Es la
  // vista de la AGENCIA sobre el cliente (dice "este caso no cuenta" y nombra
  // de quien fue cada error), asi que no va en el menu del hotel.
  | "reporte"
  // El registro de quién entró al panel de cada cliente (audit log). Es de la
  // agencia: antes vivía al fondo de su tablero.
  | "auditoria"
  // Lo que costó cada conversación del agente de un cliente (IA, por mensaje).
  // Es de la agencia: el costo de operar el agente es nuestro, no del hotel.
  | "costos"
  | "llamadas"
  // Los leads de las landings de conferencia de miagentia.com (/sandra y
  // /andrea): quien dejo sus datos o pidio la llamada demo. Solo en el panel
  // comercial de MiAgentIA (tenant "comercial").
  | "leads"
  // Escuchar lo que dijo el agente. Va aparte de "llamadas" (que es el tablero
  // de costo y volumen) porque quien hace QA no viene a mirar cifras.
  | "qa"
  | "agentes"
  | "settings";

// Los modulos que solo existen en la clinica (tenant "consultorio"). Es UNA
// lista para el menu de la clinica y para esconderlos en los demas clientes:
// antes eran dos listas a mano, y jefatura, imagenologia y la bandeja de
// muestra entraron a una sola, asi que aparecian en el menu de todos.
export const MODULOS_CLINICA: readonly ModuleId[] = [
  "consultorio",
  "laboratorio",
  "imagenologia",
  "jefatura",
  "mensajes",
];

// El menu de MiAgentIA Comercial (las asesoras), EN ESTE ORDEN: primero los
// leads, que es para lo que entran, despues el WhatsApp comercial y sus
// contactos. Sin ajustes: ahi viven interruptores que mueven a todo el demo.
export const MODULOS_COMERCIAL: readonly ModuleId[] = ["leads", "bandeja", "contactos"];

// El riel de la Caja de Credito de Chalatenango, EN ESTE ORDEN: la bandeja es
// el centro de su panel, despues el tablero, los contactos, el chat del equipo
// y la agente de voz de demostracion. Sin ajustes: ahi viven interruptores que
// mueven a todo el demo, y este panel no tiene nada propio que configurar.
export const MODULOS_CAJA: readonly ModuleId[] = [
  "bandeja",
  "dashboard",
  "contactos",
  "interno",
  "llamadas",
  "agentes",
];

// El menu de Pizza Hut, EN ESTE ORDEN. Es una lista cerrada como la de la
// clinica: su panel gira alrededor de las propuestas de eventos, y lo demas
// (redes, tickets, chat interno) aca solo haria ruido.
export const MODULOS_PIZZAHUT: readonly ModuleId[] = [
  "dashboard",
  "bandeja",
  "eventos",
  "llamadas",
  "contactos",
  "agentes",
  "settings",
];

export interface RoleDef {
  id: RoleId;
  nombre: string;
  ve: ModuleId[];
}

// Qué módulos ve cada rol (igual para todos los tenants):
//   Recepción       -> Bandeja + Chat interno
//   Marketing       -> Bandeja + Redes sociales
//   Dirección       -> todo
//   Gerente de Mkt. -> todo
// Médico/Asesor y Jefe mantienen su acceso operativo (bandeja/interno/dashboard).
// "hoy", "habitaciones" y "calendario" solo existen en el tenant del hotel (el
// Sidebar los filtra); los roles que atienden al huésped los ven, marketing no.
// "pipeline", "visitas", "cartera" y "publicacion" solo existen en la
// inmobiliaria: el pipeline y las visitas son de quien vende (marketing no ve
// los leads ni la agenda), y la publicación la arman tanto el asesor como
// marketing, porque los dos suben anuncios.
// "mis-chats", "promociones" y "perfil" solo existen en Yali Hospitality. Las
// promociones alimentan en vivo lo que el agente puede ofrecer, así que las ve
// también marketing; el perfil del agente lo tocan solo dirección y jefatura.
// "comentarios" es la otra mitad de la bandeja: lo que preguntan en publico
// debajo de las publicaciones. Lo ve quien atiende y quien lleva las redes.
// "tickets" es el tablero de casos que el agente no resuelve solo. Lo trabajan
// quienes atienden (recepcion, medico) y lo mira jefatura por las metricas;
// marketing no gestiona casos, asi que no lo ve.
// "mis-chats" lo ve todo el mundo: es donde caen los chats que el agente pasa a
// una persona, y quien atiende tiene que verlos sin depender de su rol.
const TODO: ModuleId[] = ["bandeja", "mis-chats", "tickets", "hoy", "contactos", "habitaciones", "calendario", "pipeline", "crediq", "ventas", "talento", "vacantes", "perfiles", "entrevistas", "onboarding", "eventos", "visitas", "cartera", "publicacion", "cobros", "campanas", "consultorio", "laboratorio", "jefatura", "imagenologia", "mensajes", "interno", "redes", "comentarios", "promociones", "perfil", "sofia", "dashboard", "reporte", "auditoria", "costos", "llamadas", "leads", "qa", "agentes", "settings"];
export const VE: Record<RoleId, ModuleId[]> = {
  // Recepcion del consultorio es quien recibe al paciente y quien mueve la
  // fila del laboratorio: los dos modulos del modulo clinico son suyos.
  recepcion: ["bandeja", "mis-chats", "tickets", "hoy", "contactos", "habitaciones", "calendario", "pipeline", "crediq", "ventas", "talento", "perfiles", "entrevistas", "onboarding", "eventos", "visitas", "cartera", "consultorio", "laboratorio", "imagenologia", "mensajes", "interno", "comentarios"],
  // Atencion es quien da la cara: contesta lo privado y lo publico, trabaja
  // los casos que el agente no resuelve (los de pago van a Veronica desde el
  // kickoff), habla con el equipo, y VE COMO VA EL HOTEL: Veronica y Olga son
  // los ojos de los duenos, asi que el dashboard y Probar a Sofia son suyos.
  // Lo que sigue cerrado: ajustes, promociones y el perfil del agente, que
  // cambian como se comporta Sofia.
  atencion: ["bandeja", "mis-chats", "tickets", "interno", "comentarios", "redes", "sofia", "dashboard"],
  marketing: ["bandeja", "mis-chats", "contactos", "cartera", "publicacion", "cobros", "redes", "comentarios", "promociones"],
  gerente_marketing: TODO,
  // El medico ve su consultorio (sus pacientes, sus recetas), pero no el
  // mostrador del laboratorio: esa fila no es suya.
  medico: ["bandeja", "mis-chats", "tickets", "hoy", "contactos", "habitaciones", "calendario", "pipeline", "crediq", "ventas", "talento", "vacantes", "perfiles", "entrevistas", "eventos", "visitas", "cartera", "publicacion", "cobros", "campanas", "consultorio", "imagenologia", "mensajes", "interno"],
  jefe: ["bandeja", "mis-chats", "tickets", "hoy", "contactos", "habitaciones", "calendario", "pipeline", "crediq", "ventas", "talento", "vacantes", "perfiles", "entrevistas", "onboarding", "eventos", "visitas", "cartera", "publicacion", "cobros", "consultorio", "laboratorio", "jefatura", "imagenologia", "mensajes", "interno", "redes", "comentarios", "promociones", "perfil", "sofia", "dashboard"],
  admin: TODO,
};


// Ruta de cada modulo (para navegar / redirigir).
export const MODULO_RUTA: Record<ModuleId, string> = {
  bandeja: "/",
  "mis-chats": "/mis-chats",
  tickets: "/tickets",
  hoy: "/hoy",
  contactos: "/contactos",
  habitaciones: "/habitaciones",
  calendario: "/calendario",
  pipeline: "/pipeline",
  crediq: "/crediq",
  ventas: "/ventas",
  talento: "/talento",
  vacantes: "/talento/vacantes",
  perfiles: "/talento/perfiles",
  entrevistas: "/talento/entrevistas",
  onboarding: "/talento/onboarding",
  eventos: "/eventos",
  visitas: "/visitas",
  cartera: "/cartera",
  publicacion: "/publicacion",
  cobros: "/cobros",
  campanas: "/campanas",
  consultorio: "/consultorio",
  laboratorio: "/laboratorio",
  jefatura: "/laboratorio/jefatura",
  imagenologia: "/imagenologia",
  mensajes: "/mensajes",
  interno: "/interno",
  redes: "/redes",
  comentarios: "/comentarios",
  promociones: "/promociones",
  perfil: "/perfil",
  sofia: "/sofia",
  dashboard: "/dashboard",
  reporte: "/reporte",
  auditoria: "/auditoria",
  costos: "/costos",
  llamadas: "/llamadas",
  leads: "/leads",
  qa: "/qa",
  agentes: "/agentes",
  settings: "/settings",
};

// Que modulo corresponde a una ruta. null = ruta sin modulo (no se restringe).
export function moduloDeRuta(pathname: string): ModuleId | null {
  if (pathname === "/") return "bandeja";
  if (pathname.startsWith("/mis-chats")) return "mis-chats";
  if (pathname.startsWith("/tickets")) return "tickets";
  if (pathname.startsWith("/hoy")) return "hoy";
  if (pathname.startsWith("/contactos")) return "contactos";
  if (pathname.startsWith("/habitaciones")) return "habitaciones";
  if (pathname.startsWith("/calendario")) return "calendario";
  if (pathname.startsWith("/pipeline")) return "pipeline";
  if (pathname.startsWith("/ventas")) return "ventas";
  if (pathname.startsWith("/talento/vacantes")) return "vacantes";
  if (pathname.startsWith("/talento/perfiles")) return "perfiles";
  if (pathname.startsWith("/talento/entrevistas")) return "entrevistas";
  if (pathname.startsWith("/talento/onboarding")) return "onboarding";
  if (pathname.startsWith("/talento")) return "talento";
  if (pathname.startsWith("/eventos")) return "eventos";
  if (pathname.startsWith("/reporte")) return "reporte";
  if (pathname.startsWith("/auditoria")) return "auditoria";
  if (pathname.startsWith("/costos")) return "costos";
  if (pathname.startsWith("/visitas")) return "visitas";
  if (pathname.startsWith("/cartera")) return "cartera";
  if (pathname.startsWith("/publicacion")) return "publicacion";
  if (pathname.startsWith("/cobros")) return "cobros";
  if (pathname.startsWith("/campanas")) return "campanas";
  if (pathname.startsWith("/consultorio")) return "consultorio";
  if (pathname.startsWith("/imagenologia")) return "imagenologia";
  if (pathname.startsWith("/mensajes")) return "mensajes";
  if (pathname.startsWith("/laboratorio/jefatura")) return "jefatura";
  if (pathname.startsWith("/laboratorio")) return "laboratorio";
  if (pathname.startsWith("/interno")) return "interno";
  if (pathname.startsWith("/redes")) return "redes";
  if (pathname.startsWith("/comentarios")) return "comentarios";
  if (pathname.startsWith("/promociones")) return "promociones";
  if (pathname.startsWith("/perfil")) return "perfil";
  if (pathname.startsWith("/sofia")) return "sofia";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/llamadas")) return "llamadas";
  if (pathname.startsWith("/leads")) return "leads";
  if (pathname.startsWith("/qa")) return "qa";
  if (pathname.startsWith("/agentes")) return "agentes";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

// Primer modulo que ve un rol (a donde mandarlo si entra a uno que no puede ver).
export function primerModulo(def: { ve: ModuleId[] }): ModuleId {
  return def.ve[0] ?? "bandeja";
}


/**
 * ¿Puede este rol entrar a esta ruta?
 *
 * Las rutas que no corresponden a ningun modulo no se restringen: son cosas
 * como el login o los assets, y cerrarlas por rol dejaria a todos afuera.
 */
export function puedeVerRuta(rol: RoleId, pathname: string): boolean {
  const modulo = moduloDeRuta(pathname);
  if (!modulo) return true;
  return (VE[rol] ?? []).includes(modulo);
}

// El tablero de la agencia (tenant "miagentia") es SOLO metricas de clientes:
// el tablero por cliente (consumo, conversaciones, reservas, quien cerro), el
// reporte de desempeno del agente de cada cliente, lo que costo cada
// conversacion del agente y las llamadas con su costo.
// Bandeja, redes, contactos, ajustes y lo demas operativo no van: se atiende
// desde el panel de cada cliente, no desde aca. Es una lista CERRADA, igual
// que la de la clinica, para el menu, la portada y la puerta del servidor.
export const MODULOS_AGENCIA: readonly ModuleId[] = ["dashboard", "reporte", "costos", "llamadas"];

/**
 * ¿Abre este cliente esta ruta? Solo cierra para la agencia; el resto de los
 * clientes sigue con su menu de siempre. Las rutas sin modulo no se cierran.
 */
export function agenciaVeRuta(tenant: string, pathname: string): boolean {
  if (tenant !== "miagentia") return true;
  const modulo = moduloDeRuta(pathname);
  return modulo === null || MODULOS_AGENCIA.includes(modulo);
}

/** A donde mandar a la agencia: su primer modulo de metricas que el rol ve. */
export function destinoAgencia(ve: readonly ModuleId[]): ModuleId | null {
  return MODULOS_AGENCIA.find((m) => ve.includes(m)) ?? null;
}
