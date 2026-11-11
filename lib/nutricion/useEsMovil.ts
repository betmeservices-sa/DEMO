"use client";

import { useEffect, useState } from "react";

/** true en pantallas de teléfono (menos de 768 px, el punto `md` de Tailwind). */
export function useEsMovil() {
  const [movil, setMovil] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const actualizar = () => setMovil(mq.matches);
    actualizar();
    mq.addEventListener("change", actualizar);
    return () => mq.removeEventListener("change", actualizar);
  }, []);
  return movil;
}
