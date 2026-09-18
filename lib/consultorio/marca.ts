// La marca de la clínica, en un solo lugar.
//
// El nombre y los archivos del logotipo se usan en tres mundos que no se
// hablan entre sí: las pantallas del módulo, los papeles que se imprimen y el
// correo que sale por n8n. Tenerlos sueltos en cada archivo fue exactamente lo
// que hizo que el nombre viejo sobreviviera en un pie de correo.
//
// Es un módulo PURO a propósito: lo importa tanto el servidor como el
// navegador, así que acá no entra nada que necesite `process.env` ni la red.

export const CLINICA = "Centro Ginecológico";

/** El logotipo completo: símbolo y nombre. Para portadas y papeles. */
export const LOGO = {
  azul: "/gineco/logo-azul.svg",
  blanco: "/gineco/logo-blanco.svg",
} as const;

/**
 * Solo el símbolo. Es lo que se usa en barras y membretes: el logotipo es
 * vertical, y a 40 px de alto el nombre de abajo no se lee, así que ahí el
 * nombre lo escribe la tipografía del documento.
 */
export const SIMBOLO = {
  azul: "/gineco/simbolo-azul.svg",
  blanco: "/gineco/simbolo-blanco.svg",
} as const;

/** El del correo va en PNG: Gmail y Outlook no pintan SVG. */
export const LOGO_CORREO = "/gineco/logo-azul.png";
