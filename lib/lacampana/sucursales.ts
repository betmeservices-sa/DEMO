// Las 21 sucursales de Restaurante La Campana, como aparecen en el selector de
// retiro de lacampanacyt.com (noviembre de 2026). El sitio dice que todas abren
// a las 11:00 para pedidos en línea; no publica direcciones ni hora de cierre,
// así que el demo tampoco las inventa.
//
// `zona` agrupa las sucursales para el panel. Es una agrupación de demo, no un
// dato del cliente.

export interface SucursalCampana {
  id: string;
  nombre: string;
  zona: "San Salvador" | "La Libertad" | "Occidente" | "Oriente y Paracentral";
}

export const SUCURSALES_CAMPANA: SucursalCampana[] = [
  { id: "aguilares", nombre: "Aguilares", zona: "San Salvador" },
  { id: "altavista", nombre: "AltaVista", zona: "San Salvador" },
  { id: "apopa", nombre: "Apopa", zona: "San Salvador" },
  { id: "encuentro-san-marcos", nombre: "El Encuentro San Marcos", zona: "San Salvador" },
  { id: "encuentro-sonsonate", nombre: "El Encuentro Sonsonate", zona: "Occidente" },
  { id: "encuentro-zacatecoluca", nombre: "El Encuentro Zacatecoluca", zona: "Oriente y Paracentral" },
  { id: "lourdes", nombre: "Lourdes", zona: "La Libertad" },
  { id: "marsella", nombre: "Marsella", zona: "La Libertad" },
  { id: "metrocentro-santa-ana", nombre: "Metrocentro Santa Ana", zona: "Occidente" },
  { id: "metrocentro-sonsonate", nombre: "Metrocentro Sonsonate", zona: "Occidente" },
  { id: "navarra", nombre: "Navarra", zona: "San Salvador" },
  { id: "opico", nombre: "Opico", zona: "La Libertad" },
  { id: "plaza-centro", nombre: "Plaza Centro", zona: "San Salvador" },
  { id: "plaza-mundo-soyapango", nombre: "Plaza Mundo Soyapango", zona: "San Salvador" },
  { id: "plaza-mundo-usulutan", nombre: "Plaza Mundo Usulután", zona: "Oriente y Paracentral" },
  { id: "san-gabriel", nombre: "San Gabriel", zona: "San Salvador" },
  { id: "san-martin", nombre: "San Martín", zona: "San Salvador" },
  { id: "santo-tomas", nombre: "Santo Tomás", zona: "San Salvador" },
  { id: "unicentro-metropolis", nombre: "Unicentro Metrópolis", zona: "San Salvador" },
  { id: "valle-dulce", nombre: "Valle Dulce", zona: "San Salvador" },
  { id: "zacatecoluca", nombre: "Zacatecoluca", zona: "Oriente y Paracentral" },
];

export const HORA_APERTURA = "11:00 a.m.";

export function sucursalPorId(id: string): SucursalCampana | undefined {
  return SUCURSALES_CAMPANA.find((s) => s.id === id);
}
