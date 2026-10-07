/* eslint-disable @next/next/no-img-element */
// Marca de la Caja de Credito de Chalatenango.
//
// El simbolo es el de su favicon (256 px, el unico archivo publicado con
// resolucion suficiente), y el nombre va como texto del DOM: el logotipo que
// publican es un PNG de 200x66 con el fondo blanco quemado, que en el riel
// oscuro o en una tarjeta se ve como un parche.

export function CajaSimbolo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/chalatenango/simbolo.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
    />
  );
}

export function CajaLogo({ compact = false }: { compact?: boolean }) {
  if (compact) return <CajaSimbolo size={32} />;
  return (
    <div className="flex items-center gap-2.5">
      <CajaSimbolo size={36} />
      <div className="leading-tight">
        <p className="text-[14.5px] font-extrabold tracking-tight text-[var(--brand-blue)]">Caja de Crédito</p>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-2)]">Chalatenango</p>
      </div>
    </div>
  );
}
