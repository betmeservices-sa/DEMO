/**
 * Si este proceso es el panel en vivo (Vercel o un build de producción) o una
 * prueba local / la suite. Lo usan los webhooks para decidir qué hacer sin
 * secreto configurado: en vivo se rechaza, en local se acepta para poder
 * simular mensajes sin firmarlos.
 */
export function enProduccion(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}
