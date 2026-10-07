"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Un panel que se abre y se cierra solo al hacer clic afuera o con Escape.
 * Lo usan la campana, la busqueda y el menu del usuario de la barra de arriba.
 */
export function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  return { abierto, setAbierto, ref };
}
