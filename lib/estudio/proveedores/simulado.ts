// Los proveedores de la muestra: contestan como lo harían los reales, con la
// misma forma y una espera parecida, pero sin salir a la red ni gastar saldo.
// El texto sale del banco de cada marca (banco.ts).

import { CREDITOS, TARIFA, generarPiezas, reescribir, usoDeGeneracion } from "../generador";
import type { Proveedores } from "./tipos";

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function idCorto(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const simulados: Proveedores = {
  texto: {
    nombre: "Claude",
    async generar(pedido) {
      await esperar(900 + Math.random() * 600);
      const ahoraIso = new Date().toISOString();
      const piezas = generarPiezas({ ...pedido, ahoraIso });
      return { piezas, uso: piezas.flatMap((p) => usoDeGeneracion(p, ahoraIso)) };
    },
    async reescribir(pieza, marca, motivo) {
      await esperar(700 + Math.random() * 500);
      const ahoraIso = new Date().toISOString();
      return {
        pieza: reescribir(pieza, marca, motivo, ahoraIso),
        uso: [
          {
            marcaId: pieza.marcaId,
            servicio: "texto",
            proveedor: "Claude",
            unidades: 1,
            unidad: "pieza",
            creditos: CREDITOS.texto,
            costoUsd: TARIFA.textoPorPieza,
            fecha: ahoraIso,
            piezaId: pieza.id,
          },
        ],
      };
    },
  },
  avatar: {
    nombre: "HeyGen",
    async armarVideo(pieza) {
      await esperar(400);
      return { trabajoId: `rd-${idCorto()}`, minutos: Math.round(((pieza.duracion ?? 30) / 60) * 100) / 100, uso: [] };
    },
  },
  publicador: {
    nombre: "Planificador",
    async programar(pieza, marca) {
      await esperar(350 + Math.random() * 300);
      const postIds: Partial<Record<(typeof pieza.redes)[number], string>> = {};
      const errores: Partial<Record<(typeof pieza.redes)[number], string>> = {};
      for (const red of pieza.redes) {
        const cuenta = marca.redes.find((r) => r.red === red);
        if (cuenta?.estado === "vencida") errores[red] = "La sesión de la cuenta venció. Reconéctala para programar aquí.";
        else postIds[red] = `sp_${idCorto()}`;
      }
      return { postIds, errores };
    },
  },
};
