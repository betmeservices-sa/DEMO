import { notFound } from "next/navigation";
import { esDeLaClinica } from "@/lib/consultorio/guardia";

// El módulo del consultorio trae su propia hoja de estilos, encerrada en
// ".cons" (ver globals.css). No es capricho: la receta y la orden de exámenes
// se imprimen y se firman, así que se ven como papel, y el resto de la app no
// tiene por qué heredar eso.
//
// Y acá está la puerta del módulo: estas páginas arman los datos en el
// servidor, así que la sesión de otro cliente tiene que rebotar ANTES de que se
// pinte nada. Vale para todo lo que cuelga de /consultorio.
export default async function LayoutConsultorio({ children }: { children: React.ReactNode }) {
  if (!(await esDeLaClinica())) notFound();
  return <div className="cons">{children}</div>;
}
