// Logotipo de Restaurante La Campana (demo).
//
// La campana es el símbolo que publica el restaurante en lacampanacyt.com
// (public/brand/lacampana-campana.png, roja con borde blanco: se lee igual sobre
// claro y sobre el rojo del encabezado). El nombre va en SVG para que herede el
// color del tema y se vea nítido en cualquier pantalla.

export function LaCampanaMarca({ height = 44 }: { height?: number }) {
  return (
    <svg
      height={height}
      viewBox="0 0 330 80"
      fill="none"
      role="img"
      aria-label="Restaurante La Campana"
      style={{ width: (height * 330) / 80 }}
    >
      <image href="/brand/lacampana-campana.png" x="0" y="2" width="76" height="76" />
      <text
        x="86"
        y="44"
        fill="currentColor"
        fontSize="34"
        fontWeight="800"
        letterSpacing="0.5"
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        La Campana
      </text>
      <text
        x="88"
        y="67"
        fill="currentColor"
        fontSize="13.5"
        letterSpacing="3.2"
        opacity="0.8"
        fontFamily="var(--font-sans), system-ui, sans-serif"
      >
        CARNES, TACOS Y MÁS
      </text>
    </svg>
  );
}

export function LaCampanaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="text-brand">
      <LaCampanaMarca height={compact ? 28 : 44} />
    </span>
  );
}
