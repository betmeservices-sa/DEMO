"use client";

// Una ventana encima de la pantalla, para los altas a mano del módulo.
//
// Se cierra con Escape y con clic afuera, y bloquea el scroll de atrás
// mientras está abierta: un formulario que se desliza por debajo de su propio
// fondo es la forma más rápida de perder lo que ya se escribió.

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  titulo,
  detalle,
  cerrar,
  children,
  ancho = "max-w-xl",
}: {
  titulo: string;
  detalle?: string;
  cerrar: () => void;
  children: React.ReactNode;
  ancho?: string;
}) {
  useEffect(() => {
    const escape = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", escape);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = previo;
    };
  }, [cerrar]);

  return (
    <div
      className="cons fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(15,35,64,0.45)] p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && cerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`tarjeta flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-b-[var(--r)] ${ancho}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--linea)] px-6 py-4">
          <div className="min-w-0">
            <h2 className="font-serif text-[21px] leading-tight text-[var(--texto)]">{titulo}</h2>
            {detalle && <p className="mt-0.5 text-[13.5px] text-[var(--texto-2)]">{detalle}</p>}
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-[var(--r2)] p-1 text-[var(--texto-3)] transition hover:bg-[var(--panel-2)] hover:text-[var(--texto)]"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
