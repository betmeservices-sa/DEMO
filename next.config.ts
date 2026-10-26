import type { NextConfig } from "next";
import path from "path";

const enDesarrollo = process.env.NODE_ENV === "development";
// Content-Security-Policy, por ahora SOLO EN MODO REPORTE: el navegador no
// bloquea nada, pero avisa a /api/csp-reporte cada vez que algo se saldría de
// esta lista. Cuando el reporte lleve unos días limpio, se pasa a
// `Content-Security-Policy` en firme con el mismo valor.
//
// Lo que se permite y por qué:
//   - script-src 'unsafe-inline': Next mete scripts en línea para hidratar.
//     En desarrollo además 'unsafe-eval', por el HMR.
//   - style-src 'unsafe-inline': Tailwind y los estilos en línea de React.
//   - fonts.googleapis.com (hoja de estilo) y fonts.gstatic.com (woff2): la
//     tipografía de cada tema entra por <link>. Primer día en modo reporte
//     (2026-10-12): era lo ÚNICO que se salía de la lista, unos 30 reportes
//     por pantalla.
//   - img-src https: data: blob:: fotos de perfil y adjuntos vienen de los CDN
//     de Meta, los QR salen como data: y las vistas previas como blob:.
//   - media-src https: blob:: las notas de voz de WhatsApp y las grabaciones
//     de las llamadas.
//   - connect-src 'self': el navegador solo habla con este panel (en desarrollo
//     también el websocket del HMR). Lo externo lo hace el servidor. La
//     excepción es leer imágenes para la descarga del estudio: las generadas
//     viven en el storage de la base (*.supabase.co) y en local van como data:.
//   - frame-ancestors 'none': lo mismo que X-Frame-Options DENY.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${enDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' https: blob: data:",
  `connect-src 'self' data: blob: https://*.supabase.co${enDesarrollo ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "report-uri /api/csp-reporte",
].join("; ");

// Headers de seguridad para un panel interno (no se embebe en iframes, no se
// infiere el tipo MIME, referrer acotado, HTTPS forzado, sin cámara ni
// ubicación: este panel no las usa, y así ningún script que se cuele puede
// pedirlas). El micrófono queda para el propio sitio: la inmobiliaria dicta
// las fichas de propiedades (app/cartera/nueva).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  // Este proyecto vive anidado dentro de otro repo. Fijamos la raíz de
  // Turbopack para que no infiera mal el workspace por lockfiles vecinos.
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
