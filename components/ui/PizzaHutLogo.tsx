// Marca de Pizza Hut en el panel.
//
// Su sitio publica el logotipo solo como imagen (webp), sin SVG, así que acá
// va un wordmark sobrio: una porción dibujada en SVG dentro del cuadro de
// marca y el nombre como texto del DOM, con la tipografía del panel. Los
// colores salen de los tokens del tema, no van escritos a mano.

export function PizzaHutSimbolo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect width="36" height="36" rx="10" fill="var(--brand-blue)" />
      {/* La porción: la orilla arriba y la punta abajo. */}
      <path d="M8.5 11.5c6.2-3.2 12.8-3.2 19 0L18 28.5z" fill="#ffffff" />
      <path d="M8.5 11.5c6.2-3.2 12.8-3.2 19 0" stroke="var(--brand-blue-dark)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="15" cy="15.2" r="1.7" fill="var(--brand-blue)" />
      <circle cx="20.6" cy="16.4" r="1.5" fill="var(--brand-blue)" />
      <circle cx="17.6" cy="21.2" r="1.4" fill="var(--brand-blue)" />
    </svg>
  );
}

export function PizzaHutLogo({ compact = false }: { compact?: boolean }) {
  if (compact) return <PizzaHutSimbolo size={30} />;
  return (
    <div className="flex items-center gap-2.5">
      <PizzaHutSimbolo />
      <div className="leading-tight">
        <p className="text-[15px] font-extrabold tracking-tight text-[var(--text)]">Pizza Hut</p>
        <p className="text-[11px] font-semibold text-brand">Eventos</p>
      </div>
    </div>
  );
}
