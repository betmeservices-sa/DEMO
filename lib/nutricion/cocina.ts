// Cocina: el menú de la casa (8 desayunos, 8 almuerzos, 8 cenas y las
// meriendas), con alérgenos e insumos por porción; los planes de alimentación
// que arma la nutricionista eligiendo opciones por tiempo (con ajustes
// escritos por alergia o gusto), y los paquetes semanales de cada cliente.

import { CITAS, CLIENTES, STAFF } from "./seed";
import { textoFecha } from "./format";
import type { Alergeno, Cliente, DiaOrden, ItemOrden, Orden, PlanAlimentacion, PlanId, Plato, Tiempo } from "./types";

export const ALERGENOS: Record<Alergeno, string> = {
  lacteos: "Lácteos",
  gluten: "Gluten",
  huevo: "Huevo",
  mani: "Maní",
  nueces: "Nueces",
  soya: "Soya",
  pescado: "Pescado",
  mariscos: "Mariscos",
};

/** Tiempos de comida que incluye cada plan. */
export const TIEMPOS_PLAN: Record<PlanId, Tiempo[]> = {
  premium: ["Desayuno", "Merienda AM", "Almuerzo", "Merienda PM", "Cena"],
  two_meals: ["Desayuno", "Merienda AM", "Almuerzo", "Merienda PM", "Cena"],
  the_lunch: ["Almuerzo"],
};

/**
 * Tiempos que la nutricionista arma pero que no van incluidos en el plan: en
 * Two Meals el desayuno es una sugerencia del menú que el cliente prepara en casa.
 */
export const NO_INCLUIDOS: Record<PlanId, Tiempo[]> = { premium: [], two_meals: ["Desayuno"], the_lunch: [] };
export const incluido = (t: Tiempo, plan: PlanId) => !NO_INCLUIDOS[plan].includes(t);

/**
 * Lo que prepara la cocina según el plan: las meriendas son del plan pero no
 * las cocina el chef, y en Two Meals el desayuno no va incluido.
 */
export const enCocina = (t: Tiempo, plan: PlanId) => TIEMPOS_COCINA[plan].includes(t);

/** Tiempos que prepara la cocina en cada plan. */
export const TIEMPOS_COCINA: Record<PlanId, Tiempo[]> = {
  premium: ["Desayuno", "Almuerzo", "Cena"],
  two_meals: ["Almuerzo", "Cena"],
  the_lunch: ["Almuerzo"],
};

/** Lo que cocina el chef por día en cada plan. */
export const COCINA_PLAN: Record<PlanId, string> = {
  premium: "desayuno, almuerzo y cena",
  two_meals: "almuerzo y cena",
  the_lunch: "almuerzo",
};

/** Comidas por día de cada plan (incluye las meriendas del plan). */
export const COMIDAS_PLAN: Record<PlanId, string> = {
  premium: "3 tiempos + 2 meriendas al día",
  two_meals: "2 tiempos + 2 meriendas al día · desayuno sugerido (no incluido)",
  the_lunch: "1 almuerzo al día",
};

/** Tipo de plato que sirve para cada tiempo. */
export const TIPO_DE: Record<Tiempo, Plato["tiempo"]> = {
  Desayuno: "Desayuno",
  "Merienda AM": "Merienda",
  Almuerzo: "Almuerzo",
  "Merienda PM": "Merienda",
  Cena: "Cena",
};

type Ins = [string, number, string][];
const p = (
  id: string,
  numero: number | undefined,
  tiempo: Plato["tiempo"],
  nombre: string,
  componentes: [string, string, string, string] | null,
  contiene: Alergeno[],
  etiquetas: Plato["etiquetas"],
  insumos: Ins,
): Plato => ({
  id,
  numero,
  nombre,
  tiempo,
  componentes: componentes ? { proteina: componentes[0], carbohidrato: componentes[1], vegetales: componentes[2], grasa: componentes[3] } : undefined,
  contiene,
  etiquetas,
  insumos,
});

// El menú de la casa. Las cantidades por porción son una referencia para
// calcular la producción; se corrigen subiendo el menú por CSV.
export const RECETARIO: Plato[] = [
  p("D1", 1, "Desayuno", "Omelette de vegetales con tortilla", ["2 huevos", "1 tortilla de maíz", "Espinaca, tomate, cebolla", "¼ aguacate"], ["huevo"], ["Vegetariano"], [["Huevo", 2, "u"], ["Tortilla de maíz", 1, "u"], ["Espinaca", 30, "g"], ["Tomate", 40, "g"], ["Cebolla", 20, "g"], ["Aguacate", 0.25, "u"]]),
  p("D2", 2, "Desayuno", "Tostadas con requesón y huevo", ["1 huevo + requesón", "2 rebanadas de pan integral", "Tomate y pepino en rodajas", "1 cdta. aceite de oliva"], ["huevo", "lacteos", "gluten"], ["Vegetariano"], [["Huevo", 1, "u"], ["Requesón", 60, "g"], ["Pan integral", 2, "rebanadas"], ["Tomate", 40, "g"], ["Pepino", 40, "g"], ["Aceite de oliva", 5, "ml"]]),
  p("D3", 3, "Desayuno", "Bowl de yogurt griego", ["Yogurt griego natural", "Avena (½ taza) + fresas", "Pepino en rodajas al lado", "Almendras (10 unidades)"], ["lacteos", "gluten", "nueces"], ["Vegetariano"], [["Yogurt griego", 170, "g"], ["Avena", 40, "g"], ["Fresas", 80, "g"], ["Pepino", 50, "g"], ["Almendras", 10, "u"]]),
  p("D4", 4, "Desayuno", "Casamiento ligero con huevo", ["Huevo duro + frijoles", "Arroz del casamiento", "Chile verde y tomate salteados", "¼ aguacate"], ["huevo"], ["Vegetariano"], [["Huevo", 1, "u"], ["Frijoles cocidos", 80, "g"], ["Arroz cocido", 80, "g"], ["Chile verde", 30, "g"], ["Tomate", 40, "g"], ["Aguacate", 0.25, "u"]]),
  p("D5", 5, "Desayuno", "Wrap de pollo desayunero", ["Pollo desmenuzado", "Tortilla integral de harina", "Lechuga, chile morrón", "Queso fresco (porción pequeña)"], ["gluten", "lacteos"], ["Alto en proteína"], [["Pollo desmenuzado", 90, "g"], ["Tortilla integral de harina", 1, "u"], ["Lechuga", 20, "g"], ["Chile morrón", 30, "g"], ["Queso fresco", 20, "g"]]),
  p("D6", 6, "Desayuno", "Huevos rancheros ligeros", ["2 huevos estrellados", "1 tortilla de maíz tostada", "Salsa de tomate natural, cebolla", "¼ aguacate"], ["huevo"], ["Vegetariano"], [["Huevo", 2, "u"], ["Tortilla de maíz", 1, "u"], ["Salsa de tomate natural", 60, "ml"], ["Cebolla", 20, "g"], ["Aguacate", 0.25, "u"]]),
  p("D7", 7, "Desayuno", "Panqueques de avena y claras", ["Claras de huevo + yogurt griego", "Avena + banano", "Ensalada de pepino y tomate al lado", "Crema de maní (1 cda.)"], ["huevo", "lacteos", "gluten", "mani"], ["Vegetariano", "Alto en proteína"], [["Claras de huevo", 3, "u"], ["Yogurt griego", 60, "g"], ["Avena", 40, "g"], ["Banano", 1, "u"], ["Pepino", 40, "g"], ["Tomate", 40, "g"], ["Crema de maní", 15, "g"]]),
  p("D8", 8, "Desayuno", "Pupusa de frijol con queso + huevo", ["Huevo duro + frijol", "1 pupusa de maíz", "Curtido y salsa de tomate", "Queso de la pupusa"], ["huevo", "lacteos"], ["Vegetariano"], [["Huevo", 1, "u"], ["Pupusa de frijol con queso", 1, "u"], ["Curtido", 60, "g"], ["Salsa de tomate natural", 40, "ml"]]),

  p("A1", 1, "Almuerzo", "Pollo a la plancha con arroz", ["Pechuga de pollo", "Arroz integral (½ taza)", "Brócoli y zanahoria al vapor", "Aceite de oliva en el aderezo"], [], ["Alto en proteína"], [["Pechuga de pollo", 130, "g"], ["Arroz integral cocido", 90, "g"], ["Brócoli", 70, "g"], ["Zanahoria", 50, "g"], ["Aceite de oliva", 5, "ml"]]),
  p("A2", 2, "Almuerzo", "Pescado al ajillo con papa", ["Filete de tilapia", "Papa cocida o al horno", "Ensalada de lechuga y tomate", "Ajo dorado en aceite de oliva"], ["pescado"], ["Alto en proteína"], [["Filete de tilapia", 150, "g"], ["Papa", 150, "g"], ["Lechuga", 40, "g"], ["Tomate", 50, "g"], ["Ajo", 2, "dientes"], ["Aceite de oliva", 5, "ml"]]),
  p("A3", 3, "Almuerzo", "Carne asada con frijoles", ["Lomo de res magro", "Frijoles + 1 tortilla", "Curtido o ensalada fresca", "¼ aguacate"], [], ["Alto en proteína"], [["Lomo de res", 130, "g"], ["Frijoles cocidos", 100, "g"], ["Tortilla de maíz", 1, "u"], ["Curtido", 60, "g"], ["Aguacate", 0.25, "u"]]),
  p("A4", 4, "Almuerzo", "Pasta integral con pavo", ["Carne molida de pavo", "Pasta integral (1 taza)", "Salsa de tomate natural, calabacín, hongos", "Queso parmesano rallado"], ["gluten", "lacteos"], ["Alto en proteína"], [["Carne molida de pavo", 120, "g"], ["Pasta integral cocida", 140, "g"], ["Salsa de tomate natural", 80, "ml"], ["Calabacín", 60, "g"], ["Hongos", 40, "g"], ["Queso parmesano", 10, "g"]]),
  p("A5", 5, "Almuerzo", "Bowl de atún", ["Atún en agua", "Quinoa o arroz", "Pepino, maíz dulce, tomate cherry", "Aguacate + ajonjolí"], ["pescado"], ["Alto en proteína"], [["Atún en agua", 120, "g"], ["Quinoa cocida", 90, "g"], ["Pepino", 50, "g"], ["Maíz dulce", 40, "g"], ["Tomate cherry", 50, "g"], ["Aguacate", 0.25, "u"], ["Ajonjolí", 5, "g"]]),
  p("A6", 6, "Almuerzo", "Pollo guisado salvadoreño", ["Muslo de pollo sin piel", "Arroz (½ taza)", "Güisquil, zanahoria, papa pequeña en el guiso", "Aceite usado en el sofrito"], [], ["Alto en proteína"], [["Muslo de pollo", 150, "g"], ["Arroz cocido", 90, "g"], ["Güisquil", 60, "g"], ["Zanahoria", 40, "g"], ["Papa", 60, "g"], ["Aceite", 5, "ml"]]),
  p("A7", 7, "Almuerzo", "Salmón o macarela al horno", ["Filete de pescado azul", "Camote al horno", "Espárragos o ejotes", "Grasa natural del pescado + limón"], ["pescado"], ["Alto en proteína"], [["Salmón o macarela", 140, "g"], ["Camote", 120, "g"], ["Espárragos o ejotes", 80, "g"], ["Limón", 0.5, "u"]]),
  p("A8", 8, "Almuerzo", "Fajitas de res", ["Tiras de res magra", "2 tortillas de maíz", "Chile morrón, cebolla, lechuga", "Guacamole (2 cdas.)"], [], ["Alto en proteína"], [["Tiras de res", 130, "g"], ["Tortilla de maíz", 2, "u"], ["Chile morrón", 50, "g"], ["Cebolla", 40, "g"], ["Lechuga", 30, "g"], ["Guacamole", 30, "g"]]),

  p("C1", 1, "Cena", "Ensalada tibia de pollo", ["Pollo a la plancha", "Garbanzos (½ taza)", "Lechuga, espinaca, pepino", "Vinagreta de aceite de oliva"], [], ["Alto en proteína"], [["Pechuga de pollo", 110, "g"], ["Garbanzos cocidos", 80, "g"], ["Lechuga", 40, "g"], ["Espinaca", 30, "g"], ["Pepino", 40, "g"], ["Aceite de oliva", 10, "ml"]]),
  p("C2", 2, "Cena", "Tacos de pescado", ["Pescado desmenuzado", "2 tortillas de maíz pequeñas", "Repollo morado, pico de gallo", "Aguacate en láminas"], ["pescado"], ["Alto en proteína"], [["Pescado blanco", 120, "g"], ["Tortilla de maíz", 2, "u"], ["Repollo morado", 50, "g"], ["Pico de gallo", 50, "g"], ["Aguacate", 0.25, "u"]]),
  p("C3", 3, "Cena", "Tortitas de huevo con güisquil", ["2 huevos", "Camote pequeño al horno", "Güisquil y ejotes", "Aceite de oliva para cocinar"], ["huevo"], ["Vegetariano"], [["Huevo", 2, "u"], ["Camote", 100, "g"], ["Güisquil", 60, "g"], ["Ejotes", 50, "g"], ["Aceite de oliva", 5, "ml"]]),
  p("C4", 4, "Cena", "Salteado de res con vegetales", ["Tiras de res", "Arroz (½ taza)", "Chile morrón, cebolla, brócoli", "Aceite de ajonjolí"], [], ["Alto en proteína"], [["Tiras de res", 120, "g"], ["Arroz cocido", 90, "g"], ["Chile morrón", 40, "g"], ["Cebolla", 30, "g"], ["Brócoli", 60, "g"], ["Aceite de ajonjolí", 5, "ml"]]),
  p("C5", 5, "Cena", "Sándwich abierto de pavo", ["Jamón de pavo + queso fresco", "1 rebanada de pan integral", "Tomate, lechuga, pepino", "Hummus como untable"], ["gluten", "lacteos"], [], [["Jamón de pavo", 60, "g"], ["Queso fresco", 30, "g"], ["Pan integral", 1, "rebanadas"], ["Tomate", 40, "g"], ["Lechuga", 20, "g"], ["Pepino", 30, "g"], ["Hummus", 30, "g"]]),
  p("C6", 6, "Cena", "Sopa de pollo con vegetales", ["Pollo desmenuzado", "Elote en trozo o fideo integral", "Güisquil, zanahoria, ayote, repollo", "Aguacate al lado"], [], ["Bajo en azúcar"], [["Pollo desmenuzado", 100, "g"], ["Elote", 0.5, "u"], ["Güisquil", 50, "g"], ["Zanahoria", 40, "g"], ["Ayote", 50, "g"], ["Repollo", 40, "g"], ["Aguacate", 0.25, "u"]]),
  p("C7", 7, "Cena", "Quesadilla integral de champiñones", ["Queso fresco + pollo", "Tortilla integral", "Champiñones, espinaca, cebolla", "Queso de la quesadilla"], ["gluten", "lacteos"], [], [["Queso fresco", 40, "g"], ["Pollo desmenuzado", 60, "g"], ["Tortilla integral de harina", 1, "u"], ["Champiñones", 60, "g"], ["Espinaca", 30, "g"], ["Cebolla", 20, "g"]]),
  p("C8", 8, "Cena", "Camarones salteados con quinoa", ["Camarones", "Quinoa (½ taza)", "Calabacín, chile morrón, tomate", "Aceite de oliva + ajo"], ["mariscos"], ["Alto en proteína"], [["Camarones", 140, "g"], ["Quinoa cocida", 90, "g"], ["Calabacín", 60, "g"], ["Chile morrón", 40, "g"], ["Tomate", 40, "g"], ["Aceite de oliva", 5, "ml"], ["Ajo", 2, "dientes"]]),

  // Meriendas de la casa (el menú de la nutricionista no trae; Premium y Two Meals llevan 2 al día).
  p("m1", 1, "Merienda", "Fruta picada con limón y chile", null, [], ["Vegetariano", "Bajo en azúcar"], [["Fruta de temporada", 150, "g"], ["Limón", 0.5, "u"]]),
  p("m2", 2, "Merienda", "Hummus con bastones de vegetales", null, [], ["Vegetariano", "Bajo en azúcar"], [["Hummus", 60, "g"], ["Zanahoria", 60, "g"], ["Pepino", 60, "g"]]),
  p("m3", 3, "Merienda", "Mix de nueces y arándanos", null, ["nueces"], ["Vegetariano"], [["Nueces mixtas", 25, "g"], ["Arándanos deshidratados", 15, "g"]]),
  p("m4", 4, "Merienda", "Barrita de avena y maní", null, ["mani", "gluten"], ["Vegetariano"], [["Avena", 30, "g"], ["Crema de maní", 15, "g"], ["Miel", 10, "g"]]),
  p("m5", 5, "Merienda", "Gelatina sin azúcar con yogur natural", null, ["lacteos"], ["Bajo en azúcar"], [["Gelatina sin azúcar", 1, "u"], ["Yogur natural", 100, "g"]]),
  p("m6", 6, "Merienda", "Edamame con sal de mar", null, ["soya"], ["Vegetariano", "Alto en proteína"], [["Edamame", 100, "g"]]),
];

export function plato(id: string): Plato {
  return RECETARIO.find((x) => x.id === id) ?? RECETARIO[0];
}

/** Alérgenos del plato que el paciente no puede comer. */
export function conflictos(pl: Plato, alergias: Alergeno[]): Alergeno[] {
  return pl.contiene.filter((a) => alergias.includes(a));
}

/** Platos del recetario que sirven para un tiempo. */
export function opcionesDe(t: Tiempo): Plato[] {
  return RECETARIO.filter((x) => x.tiempo === TIPO_DE[t]);
}

/**
 * ¿Se le puede servir? Un plato con un alérgeno del paciente solo entra si la
 * nutricionista escribió el ajuste (qué cambiar para que sea seguro).
 */
export function servible(id: string, alergias: Alergeno[], ajustes: Record<string, string>): boolean {
  return conflictos(plato(id), alergias).length === 0 || !!ajustes[id]?.trim();
}

const NUT = STAFF.nutricionista.nombre;

const pa = (
  clienteId: string,
  plan: PlanId,
  opciones: Partial<Record<Tiempo, string[]>>,
  extra: Partial<PlanAlimentacion> & { kcal: number; proteinaG: number },
): PlanAlimentacion => ({
  clienteId,
  plan,
  tiempos: TIEMPOS_PLAN[plan],
  opciones,
  ajustes: {},
  porcion: "Regular",
  alergias: [],
  noLeGusta: [],
  leGusta: [],
  notasCocina: "",
  autor: NUT,
  actualizado: textoFecha(-7),
  ...extra,
});

/** Planes de alimentación ya asignados (uno por paciente con plan a domicilio). */
export const PLANES_ALIMENTACION: PlanAlimentacion[] = [
  pa("c1", "premium", { Desayuno: ["D1", "D3", "D4", "D6"], "Merienda AM": ["m1", "m2"], Almuerzo: ["A1", "A3", "A5"], "Merienda PM": ["m2", "m5"], Cena: ["C1", "C3", "C4"] }, {
    kcal: 1500, proteinaG: 110, alergias: ["nueces"], noLeGusta: ["Cebolla cruda"], leGusta: ["Pollo", "Aguacate"],
    ajustes: { D3: "Sin almendras: cambiar por semillas de girasol (alergia a nueces)." },
    notasCocina: "Alergia a nueces registrada hoy después de una reacción: revisar que ninguna merienda lleve nueces.", actualizado: "Hoy",
  }),
  pa("c2", "two_meals", { Desayuno: ["D1", "D4", "D6"], "Merienda AM": ["m6", "m1"], Almuerzo: ["A3", "A8", "A1"], "Merienda PM": ["m2"], Cena: ["C4", "C1", "C5"] }, {
    kcal: 2600, proteinaG: 170, porcion: "Grande", alergias: ["lacteos"], leGusta: ["Carne de res"],
    ajustes: { C5: "Sin queso fresco: doble porción de jamón de pavo y aguacate en lugar del queso." },
    notasCocina: "Sin lácteos en ninguna preparación (ni mantequilla). Porción grande de proteína.",
  }),
  pa("c3", "the_lunch", { Almuerzo: ["A1", "A2", "A5"] }, { kcal: 550, proteinaG: 40, noLeGusta: ["Picante"], notasCocina: "Entrega en oficina: empaque que no se derrame." }),
  pa("c4", "premium", { Desayuno: ["D1", "D4", "D6"], "Merienda AM": ["m1", "m2"], Almuerzo: ["A1", "A2", "A6"], "Merienda PM": ["m5", "m2"], Cena: ["C1", "C3", "C6"] }, { kcal: 1700, proteinaG: 120, noLeGusta: ["Berenjena"], notasCocina: "Bajo en azúcar: sin miel, sin jugos, sin salsas dulces. Usa insulina: la comida no puede faltar." }),
  pa("c6", "two_meals", { Desayuno: ["D4", "D1", "D6"], "Merienda AM": ["m1", "m2"], Almuerzo: ["A1", "A3", "A8"], "Merienda PM": ["m5", "m1"], Cena: ["C4", "C6", "C1"] }, { kcal: 1900, proteinaG: 130, porcion: "Grande", leGusta: ["Pollo", "Pescado"] }),
  pa("c10", "premium", { Desayuno: ["D4", "D6", "D1"], "Merienda AM": ["m1", "m2"], Almuerzo: ["A1", "A2", "A6"], "Merienda PM": ["m2", "m1"], Cena: ["C1", "C2", "C8"] }, {
    kcal: 1800, proteinaG: 120, alergias: ["mariscos"], noLeGusta: ["Hígado"],
    ajustes: { C8: "Cambiar camarones por pechuga de pollo en tiras (alergia a mariscos). Mismo salteado con quinoa." },
    notasCocina: "Bajo en grasa saturada (colesterol): nada frito.",
  }),
  pa("c11", "the_lunch", { Almuerzo: ["A1", "A4", "A5"] }, { kcal: 500, proteinaG: 35, porcion: "Pequeña" }),
  pa("c13", "two_meals", { Desayuno: ["D1", "D2", "D4"], "Merienda AM": ["m5", "m1"], Almuerzo: ["A1", "A5", "A7"], "Merienda PM": ["m1", "m2"], Cena: ["C1", "C6", "C2"] }, { kcal: 1800, proteinaG: 105, leGusta: ["Atún"], notasCocina: "Da lactancia: sin cafeína en ninguna preparación.", actualizado: "Hoy" }),
  pa("c17", "the_lunch", { Almuerzo: ["A4", "A1"] }, {
    kcal: 550, proteinaG: 25, noLeGusta: ["Hongos"],
    ajustes: { A4: "Vegetariana: lentejas en lugar de pavo y sin hongos.", A1: "Vegetariana: tofu a la plancha en lugar de pollo." },
    notasCocina: "Vegetariana: sin carne, pollo, pescado ni caldos de carne.",
  }),
  pa("c18", "premium", { Desayuno: ["D1", "D4", "D6"], "Merienda AM": ["m1", "m6"], Almuerzo: ["A1", "A3", "A6"], "Merienda PM": ["m6", "m1"], Cena: ["C1", "C4", "C6"] }, { kcal: 2000, proteinaG: 140, porcion: "Grande", alergias: ["gluten"], notasCocina: "Sin gluten: tortilla de maíz en lugar de pan." }),
  pa("c7", "two_meals", { Desayuno: ["D1", "D4"], "Merienda AM": ["m1"], Almuerzo: ["A1", "A2"], "Merienda PM": ["m2"], Cena: ["C1"] }, { kcal: 1500, proteinaG: 95, actualizado: textoFecha(-30) }),
];

/** Lunes de una semana (0 = esta), en días desde hoy. */
export function lunesDe(semana: number): number {
  const hoy = new Date().getDay();
  return (hoy === 0 ? -6 : 1 - hoy) + semana * 7;
}

/** "Semana del 20 oct" para un paquete. */
export function semanaTexto(semana: number): string {
  const t = textoFecha(lunesDe(semana)).split(" ");
  return `Semana del ${t[0]} ${t[1]}`;
}

/** Último día con entrega del plan, en días desde hoy. */
function finPlan(c: Cliente): number {
  if (!c.plan) return -Infinity;
  if (c.plan.plan === "the_lunch") return Infinity;
  return c.plan.inicio + c.plan.semanas * 7 - 1;
}

/**
 * Platos de un día: para cada tiempo del plan, la opción que le toca en la
 * rotación. Nunca entra un plato con sus alergias salvo que tenga ajuste escrito.
 */
export function itemsDelDia(pl: PlanAlimentacion, i: number): ItemOrden[] {
  return pl.tiempos.map((t, k) => {
    const ok = (pl.opciones[t] ?? []).filter((id) => servible(id, pl.alergias, pl.ajustes));
    const lista = ok.length ? ok : opcionesDe(t).filter((x) => !conflictos(x, pl.alergias).length).map((x) => x.id);
    const id = lista[(i + k) % lista.length];
    return { tiempo: t, platoId: id, ajuste: pl.ajustes[id] };
  });
}

/** Paquete semanal de un paciente: de lunes a sábado dentro de su plan. */
export function paqueteDe(c: Cliente, pl: PlanAlimentacion, semana: number, extra: Partial<Orden> = {}): Orden | null {
  if (!c.plan) return null;
  const lunes = lunesDe(semana);
  const fin = finPlan(c);
  const base = Number(c.id.replace(/\D/g, "")) || 0;
  const dias: DiaOrden[] = Array.from({ length: 6 }, (_, i) => lunes + i)
    .filter((d) => d >= c.plan!.inicio && d <= fin)
    .map((d) => {
      const cita = CITAS.find((x) => x.agenda === "entregas" && x.clienteId === c.id && x.dia === d);
      const hora = cita?.hora ?? c.plan!.horaEntrega;
      const estado: DiaOrden["estado"] = d < 0 || (d === 0 && Number(hora.slice(0, 2)) < 9) ? "entregada" : "pendiente";
      return { dia: d, hora, items: itemsDelDia(pl, d - lunes + base), estado };
    });
  if (!dias.length) return null;
  return {
    id: `o-${c.id}-s${semana}`,
    clienteId: c.id,
    semana,
    zona: c.plan.zona,
    plan: pl.plan,
    dias,
    diaLlegada: lunes - 2,
    llegada: "16:00",
    origen: semana === 0 ? "Paquete semanal · en curso" : "Paquete semanal · renovación automática",
    estado: semana === 0 ? "preparacion" : "nueva",
    ...(semana === 0 ? { confirmada: textoFecha(lunes - 2) } : {}),
    ...extra,
  };
}

// Lo que cambia la regla general de los paquetes (paciente|semana).
const ESPECIALES: Record<string, Partial<Orden>> = {
  "c13|0": { diaLlegada: 0, llegada: "09:40", origen: "Plan nuevo · Lda. Morales", estado: "nueva", confirmada: undefined, nota: "Primera semana del plan: arranca mañana." },
  "c2|0": { nota: "Mañana se entrega en Torre Futura, nivel 9, oficina 902, entre 6:50 y 7:10 (cambio por MIA)." },
  "c10|1": { diaLlegada: 0, llegada: "10:05", origen: "Cambio de menú por MIA", nota: "Pidió por chat camarones: por su alergia a mariscos, la cena de camarones va con pollo (ajuste de la nutricionista)." },
  "c17|1": { diaLlegada: 0, llegada: "10:12", origen: "Elección The Lunch pendiente", nota: "Todavía elige sus almuerzos con MIA: si no responde, va la rotación de su plan." },
  "c1|1": { diaLlegada: 0, llegada: "10:50", origen: "Plan actualizado · Lda. Morales", nota: "Se le registró alergia a nueces: el bowl de yogurt va sin almendras." },
  "c4|1": { diaLlegada: 0, llegada: "07:10", estado: "confirmada", confirmada: "Hoy 07:15" },
  "c6|1": { diaLlegada: 0, llegada: "07:12", estado: "confirmada", confirmada: "Hoy 07:18" },
};

export const ORDENES: Orden[] = CLIENTES.flatMap((c) => {
  const pl = PLANES_ALIMENTACION.find((x) => x.clienteId === c.id);
  if (!pl) return [];
  return [0, 1].flatMap((s) => {
    const o = paqueteDe(c, pl, s, ESPECIALES[`${c.id}|${s}`]);
    return o ? [o] : [];
  });
}).sort((a, b) => a.diaLlegada - b.diaLlegada || a.llegada.localeCompare(b.llegada));

/** Platos que cocina el chef en un paquete, con su cantidad en la semana (sin meriendas). */
export function platosDe(o: Orden): { tiempo: Tiempo; platoId: string; ajuste?: string; cantidad: number }[] {
  const m = new Map<string, { tiempo: Tiempo; platoId: string; ajuste?: string; cantidad: number }>();
  for (const d of o.dias)
    for (const i of d.items.filter((x) => enCocina(x.tiempo, o.plan))) {
      const k = `${i.tiempo}|${i.platoId}`;
      const x = m.get(k) ?? { tiempo: i.tiempo, platoId: i.platoId, ajuste: i.ajuste, cantidad: 0 };
      x.cantidad++;
      m.set(k, x);
    }
  const orden: Tiempo[] = ["Desayuno", "Merienda AM", "Almuerzo", "Merienda PM", "Cena"];
  return [...m.values()].sort((a, b) => orden.indexOf(a.tiempo) - orden.indexOf(b.tiempo) || b.cantidad - a.cantidad);
}

/** Partes del plato que se van marcando en la cola (solo las que trae). */
export const PARTES: { id: "proteina" | "carbohidrato" | "vegetales" | "grasa"; label: string }[] = [
  { id: "proteina", label: "Proteína" },
  { id: "carbohidrato", label: "Carbohidrato" },
  { id: "vegetales", label: "Vegetales" },
  { id: "grasa", label: "Grasa" },
];
export function partesDe(platoId: string): string[] {
  const c = plato(platoId).componentes;
  return c ? PARTES.filter((x) => c[x.id]?.trim()).map((x) => x.id) : [];
}

/**
 * Porciones de un plato ya preparadas un día: las marcadas como hechas más las
 * de entregas que ya están listas o entregadas.
 */
export function hechosDe(ordenes: Orden[], dia: number, platoId: string, clienteId?: string): number {
  let n = 0;
  for (const o of ordenes.filter((x) => !clienteId || x.clienteId === clienteId))
    for (const d of o.dias)
      if (d.dia === dia) for (const i of d.items) if (i.platoId === platoId && enCocina(i.tiempo, o.plan) && (i.hecho || d.estado !== "pendiente")) n++;
  return n;
}

/** Pacientes con plan de alimentación (para el perfil de cocina). */
export function conPlan(planes: PlanAlimentacion[]): { c: Cliente; p: PlanAlimentacion }[] {
  return planes.flatMap((x) => {
    const c = CLIENTES.find((y) => y.id === x.clienteId);
    return c ? [{ c, p: x }] : [];
  });
}
