// La base completa del laboratorio, tal como la consulta `kb_buscar`.
//
// Los datos salen del respaldo del WhatsApp de la Sucursal Escalón (1,803 chats
// de 2022 a octubre de 2026), cruzados con la base del hospital del mismo grupo.
// Cada registro dice su fuente; lo que no cuadra queda en `notas`, que el
// modelo no ve. Para cambiar un precio se cambia aquí y se despliega.

import type { BaseLab } from "./lab-kb";
import { EXAMENES_LAB } from "./lab-kb-examenes";
import { CONVENIOS_LAB, PROMOCIONES_LAB, SUCURSALES_LAB, TEMAS_LAB } from "./lab-kb-negocio";

export const BASE_LAB: BaseLab = {
  examenes: EXAMENES_LAB,
  sucursales: SUCURSALES_LAB,
  convenios: CONVENIOS_LAB,
  temas: TEMAS_LAB,
  promociones: PROMOCIONES_LAB,
};
