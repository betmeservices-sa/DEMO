/* eslint-disable @next/next/no-img-element */

// El logotipo del cliente, para los papeles y las pantallas del módulo.
//
// Va como <img> y no como SVG en línea a propósito: el archivo es el que mandó
// el cliente, tal cual, y el día que cambie la marca se reemplaza el archivo y
// no hay que tocar ningún componente.
//
// DOS VERSIONES, y no es capricho: el logotipo es monocromo, así que sobre
// papel blanco va en el azul de la marca y sobre la barra oscura del
// laboratorio va en blanco. El mismo archivo en el color equivocado
// desaparece.

import { CLINICA, LOGO, SIMBOLO } from "@/lib/consultorio/marca";

export function Logo({
  alto = 46,
  variante = "azul",
  simbolo = false,
  className,
}: {
  /** Alto en píxeles. El ancho sale solo. */
  alto?: number;
  variante?: "azul" | "blanco";
  /** Solo el símbolo, sin el nombre debajo: para barras y espacios apretados. */
  simbolo?: boolean;
  className?: string;
}) {
  return (
    <img
      src={simbolo ? SIMBOLO[variante] : LOGO[variante]}
      alt={CLINICA}
      style={{ height: alto }}
      className={className ? `w-auto ${className}` : "w-auto"}
    />
  );
}
