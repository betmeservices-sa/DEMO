// Los números de cuenta que Sofía le pasa al huésped para que pague, por
// cliente. Sirven para saber si fue ELLA quien mandó la cuenta en un chat
// (ver lib/cierre-de-reserva.ts, "Quién cerró").
//
// Copia de yali/lib/yali-datos-pago.ts (repo betmeservices-sa/yali), que es
// donde viven de verdad: si el hotel cambia una cuenta, hay que cambiarla allá
// y acá. Las tres son de BAC, a nombre de DIJOSA S.A. de C.V.

export const CUENTAS_DE_PAGO: Record<string, readonly string[]> = {
  yaly: [
    "125266585", // Yalí
    "201530755", // Costa del Surf
    "125265819", // Playa Linda
  ],
};
