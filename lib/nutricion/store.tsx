"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fechaDe, iso } from "./format";
import { CAMPANAS, CITAS, CLIENTES, CONVERSACIONES, MAX_PLANTILLAS, MENUS, NOTAS, PLANTILLAS_WA, POSTS, RESUMENES, STAFF, VISITAS, cliente } from "./seed";
import { enCocina, ORDENES, paqueteDe, partesDe, PLANES_ALIMENTACION, RECETARIO } from "./cocina";
import type { Rol } from "./roles";
import type { Agenda, Campana, Cita, Cliente, Conversacion, DiaOrden, EstadoOrden, Incidencia, Mensaje, Menu, Nota, Orden, PlanAlimentacion, PlantillaWA, Plato, Post, Tanda, Tiempo, ResumenConsulta, Visita } from "./types";

/** Filtro global: todo, solo consultas o solo entregas. */
export type FiltroAgenda = "todas" | Agenda;

/** Lo que la nutricionista decidió sobre un caso urgente que marcó el agente. */
export interface UrgenciaDecision {
  estado: "en_agenda" | "atendida" | "sin_cita";
  hora?: string;
}

interface Estado {
  /** Perfil con el que entró: secretaria, nutricionista o chef. */
  rol: Rol;
  /** Sube cada vez que se crea un paciente, para repintar las listas. */
  clientesVersion: number;
  /** Crea el perfil de un paciente nuevo; con medidas, registra la evaluación inicial. */
  agregarCliente: (c: Cliente, medidas?: { pesoKg: string; grasaPct: string; musculoKg: string }) => void;
  planesAlim: PlanAlimentacion[];
  /** Crea o actualiza el plan de alimentación; la cocina lo ve al instante. */
  guardarPlanAlim: (p: PlanAlimentacion, orden?: Orden) => void;
  ordenes: Orden[];
  /** El chef confirma el paquete contra el plan; puede venir con menús cambiados. */
  confirmarOrden: (id: string, dias: DiaOrden[]) => void;
  /** Cambia el estado del paquete. "lista" deja listos todos los días que faltaban. */
  moverOrden: (id: string, estado: EstadoOrden) => void;
  /** Marca un día del paquete como listo (o lo regresa a pendiente). */
  marcarDia: (id: string, dia: number, lista: boolean) => void;
  /**
   * Marca o desmarca una parte de un plato de la orden (proteína, carbohidrato,
   * vegetales, grasa); sin parte, el plato entero. Con todas sus partes, el
   * plato queda hecho; con todos los platos hechos, la entrega queda lista.
   */
  marcarParte: (id: string, dia: number, tiempo: Tiempo, parte?: string) => void;
  /** Producciones que planificó el chef en su calendario. */
  tandas: Tanda[];
  guardarTanda: (t: Tanda) => void;
  eliminarTanda: (id: string) => void;
  /** Marca hechos todos los platos de cocina de un día del paquete: la entrega queda lista. */
  completarEntrega: (id: string, dia: number) => void;
  /** Entrega a reparto un día del paquete; con todos entregados, el paquete queda con el repartidor. */
  despacharDia: (id: string, dia: number) => void;
  /**
   * Marca porciones de un plato como preparadas ese día: primero las de órdenes
   * confirmadas (cuando una entrega tiene todo hecho, queda lista) y lo que
   * sobre, como porciones extra de la cocina.
   */
  marcarPlatoHecho: (dia: number, platoId: string, n: number, clienteId?: string) => void;
  /** Porciones extra preparadas por día y plato (no vienen de una orden). */
  extras: Record<number, Record<string, number>>;
  /** Plan de producción que editó el chef, por día: porciones por plato. Sin editar, sale de las órdenes. */
  produccion: Record<number, Record<string, number>>;
  setProduccion: (dia: number, porciones: Record<string, number> | null) => void;
  /** Sube cada vez que se cargan platos al recetario (por CSV). */
  recetarioVersion: number;
  agregarPlatos: (ps: Plato[]) => void;
  /** Quita un plato del recetario (solo si ningún paciente lo tiene asignado). */
  eliminarPlato: (id: string) => void;
  incidencias: Incidencia[];
  reportarIncidencia: (i: Incidencia) => void;
  resolverIncidencia: (id: string) => void;
  filtro: FiltroAgenda;
  setFiltro: (f: FiltroAgenda) => void;
  conversaciones: Conversacion[];
  tomar: (id: string) => void;
  devolverAIA: (id: string) => void;
  resolver: (id: string) => void;
  enviar: (id: string, texto: string) => void;
  marcarLeida: (id: string) => void;
  urgencias: Record<string, UrgenciaDecision>;
  agendarUrgencia: (id: string, hora: string) => void;
  cerrarUrgencia: (id: string, estado: "atendida" | "sin_cita") => void;
  menus: Menu[];
  agregarMenu: (m: Menu) => void;
  /** Calendario que se ve en /agendas (lo eligen los botones de la barra de arriba). */
  calendario: Agenda;
  setCalendario: (a: Agenda) => void;
  /** Día (offset desde hoy) que el calendario debe mostrar al abrirse; 0 = esta semana. */
  diaCalendario: number;
  setDiaCalendario: (d: number) => void;
  /** Conversación abierta en la bandeja. */
  convSel: string;
  /** Elige la conversación abierta; desde otra pantalla también pide abrir el chat en el teléfono. */
  setConvSel: (id: string) => void;
  /** Otra pantalla pidió abrir una conversación y la bandeja aún no la mostró. */
  convPedida: boolean;
  limpiarConvPedida: () => void;
  /** Id de la conversación del cliente; si no tiene, abre una nueva por su canal. */
  conversacionDe: (clienteId: string) => string;
  /** Consultas atendidas, incluidas las que se registran al resumir una consulta. */
  visitas: Visita[];
  /** Resúmenes de consulta por id de visita. */
  resumenes: Record<string, ResumenConsulta>;
  /** Guarda el resumen; si la visita es nueva (consulta sin cita), la agrega al historial. */
  guardarResumen: (visita: Visita, resumen: ResumenConsulta) => void;
  notas: Nota[];
  agregarNota: (n: Nota) => void;
  /** Agenda una cita nueva: aparece en el calendario, recordatorios y ficha del paciente. */
  agregarCita: (c: Cita) => void;
  /** Sube cada vez que cambian las citas, para que las vistas se vuelvan a pintar. */
  citasVersion: number;
  posts: Post[];
  agregarPost: (p: Post) => void;
  campanas: Campana[];
  agregarCampana: (c: Campana) => void;
  plantillas: PlantillaWA[];
  /** Crea o actualiza una plantilla. Devuelve false si ya hay el máximo guardado. */
  guardarPlantilla: (p: PlantillaWA) => boolean;
  eliminarPlantilla: (id: string) => void;
}

const Ctx = createContext<Estado | null>(null);

export function ahora() {
  return new Date().toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const sistema = (texto: string): Mensaje => ({
  id: `s${Date.now()}`,
  autor: "sistema",
  texto,
  hora: ahora(),
});

export function StoreProvider({ children, rol }: { children: ReactNode; rol: Rol }) {
  const [filtro, setFiltroState] = useState<FiltroAgenda>("todas");
  const [conversaciones, setConvs] = useState<Conversacion[]>(CONVERSACIONES);
  const [calendario, setCalendario] = useState<Agenda>(rol === "chef" ? "entregas" : "consultas");
  const [diaCalendario, setDiaCalendario] = useState(0);
  const [convSel, setConvSelState] = useState("v3");
  const [convPedida, setConvPedida] = useState(false);
  const setConvSel = useCallback((id: string) => {
    setConvSelState(id);
    setConvPedida(true);
  }, []);
  const limpiarConvPedida = useCallback(() => setConvPedida(false), []);

  // El filtro se recuerda por navegador: es una preferencia de vista.
  useEffect(() => {
    try {
      const f = localStorage.getItem("nutri-filtro") as FiltroAgenda | null;
      if (f) setFiltroState(f);
    } catch {}
  }, []);

  const setFiltro = useCallback((f: FiltroAgenda) => {
    setFiltroState(f);
    try {
      localStorage.setItem("nutri-filtro", f);
    } catch {}
  }, []);

  const editar = useCallback((id: string, fn: (c: Conversacion) => Conversacion) => {
    setConvs((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const tomar = useCallback(
    (id: string) =>
      editar(id, (c) => ({
        ...c,
        estado: "secretaria",
        esperaMin: undefined,
        noLeidos: 0,
        mensajes: [...c.mensajes, sistema("El equipo respondió. El agente queda en pausa en esta conversación.")],
      })),
    [editar],
  );

  const devolverAIA = useCallback(
    (id: string) =>
      editar(id, (c) => ({
        ...c,
        estado: "ia",
        motivo: undefined,
        mensajes: [...c.mensajes, sistema("El agente retomó la conversación.")],
      })),
    [editar],
  );

  const resolver = useCallback(
    (id: string) =>
      editar(id, (c) => ({ ...c, estado: "resuelta", mensajes: [...c.mensajes, sistema("Conversación marcada como resuelta.")] })),
    [editar],
  );

  const enviar = useCallback(
    (id: string, texto: string) =>
      editar(id, (c) => {
        const tomada = c.estado !== "secretaria";
        const extra: Mensaje[] = tomada
          ? [sistema("El equipo respondió. El agente queda en pausa en esta conversación.")]
          : [];
        return {
          ...c,
          estado: "secretaria",
          esperaMin: undefined,
          noLeidos: 0,
          hora: ahora(),
          mensajes: [...c.mensajes, ...extra, { id: `t${Date.now()}`, autor: "secretaria", texto, hora: ahora() }],
        };
      }),
    [editar],
  );

  // Urgencias: la nutricionista llama o atiende al paciente hoy y queda el
  // aviso en la conversación para decírselo.
  const [urgencias, setUrgencias] = useState<Record<string, UrgenciaDecision>>({});

  const agendarUrgencia = useCallback(
    (id: string, hora: string) => {
      setUrgencias((u) => ({ ...u, [id]: { estado: "en_agenda", hora } }));
      editar(id, (c) => ({ ...c, mensajes: [...c.mensajes, sistema(`${STAFF.nutricionista.nombre} reservó el caso en su agenda de hoy a las ${hora}.`)] }));
    },
    [editar],
  );

  const cerrarUrgencia = useCallback(
    (id: string, estado: "atendida" | "sin_cita") => {
      setUrgencias((u) => ({ ...u, [id]: { ...u[id], estado } }));
      if (estado === "sin_cita") editar(id, (c) => ({ ...c, mensajes: [...c.mensajes, sistema(`${STAFF.nutricionista.nombre} indicó que este caso no necesita consulta.`)] }));
    },
    [editar],
  );

  // Menús: se escriben en Acciones → Escribir menú y se consultan en el perfil del paciente.
  const [menus, setMenus] = useState<Menu[]>(MENUS);
  const agregarMenu = useCallback((m: Menu) => setMenus((ms) => [m, ...ms]), []);

  const marcarLeida = useCallback((id: string) => editar(id, (c) => (c.noLeidos ? { ...c, noLeidos: 0 } : c)), [editar]);

  // Historial: consultas, resúmenes de la nutricionista y notas internas.
  const [visitas, setVisitas] = useState<Visita[]>(VISITAS);
  const [resumenes, setResumenes] = useState<Record<string, ResumenConsulta>>(RESUMENES);
  const [notas, setNotas] = useState<Nota[]>(NOTAS);

  const guardarResumen = useCallback((visita: Visita, resumen: ResumenConsulta) => {
    setVisitas((vs) => (vs.some((v) => v.id === visita.id) ? vs : [visita, ...vs]));
    setResumenes((r) => ({ ...r, [visita.id]: resumen }));
  }, []);

  const agregarNota = useCallback((n: Nota) => setNotas((ns) => [n, ...ns]), []);

  // Las vistas de agenda leen CITAS directamente (lib/agenda), así que la cita
  // nueva se agrega a esa lista y el contador avisa que hay que repintar.
  const [citasVersion, setCitasVersion] = useState(0);
  const agregarCita = useCallback((c: Cita) => {
    CITAS.push(c);
    setCitasVersion((v) => v + 1);
  }, []);

  // Marketing: publicaciones en redes y campañas por WhatsApp.
  const [posts, setPosts] = useState<Post[]>(POSTS);
  const [campanas, setCampanas] = useState<Campana[]>(CAMPANAS);
  const agregarPost = useCallback((p: Post) => setPosts((ps) => [p, ...ps]), []);
  const agregarCampana = useCallback((c: Campana) => setCampanas((cs) => [c, ...cs]), []);

  // Plantillas de WhatsApp del equipo (máximo MAX_PLANTILLAS).
  const [plantillas, setPlantillas] = useState<PlantillaWA[]>(PLANTILLAS_WA);
  const guardarPlantilla = useCallback(
    (p: PlantillaWA) => {
      const existe = plantillas.some((x) => x.id === p.id);
      if (!existe && plantillas.length >= MAX_PLANTILLAS) return false;
      setPlantillas((ps) => (existe ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p]));
      return true;
    },
    [plantillas],
  );
  const eliminarPlantilla = useCallback((id: string) => setPlantillas((ps) => ps.filter((x) => x.id !== id)), []);

  // Pacientes nuevos: van a la lista común (como las citas) y se avisa para repintar.
  const [clientesVersion, setClientesVersion] = useState(0);
  const agregarCliente = useCallback((c: Cliente, medidas?: { pesoKg: string; grasaPct: string; musculoKg: string }) => {
    CLIENTES.push(c);
    if (medidas && (medidas.pesoKg || medidas.grasaPct || medidas.musculoKg)) {
      const hora = ahora();
      const v: Visita = { id: `ev-${c.id}`, clienteId: c.id, agenda: "consultas", fecha: iso(fechaDe(0)), hora, servicio: "Evaluación inicial", atendio: STAFF.nutricionista.nombre };
      setVisitas((vs) => [v, ...vs]);
      setResumenes((r) => ({
        ...r,
        [v.id]: {
          motivo: "Evaluación inicial al crear el perfil.",
          pesoKg: medidas.pesoKg || undefined,
          grasaPct: medidas.grasaPct || undefined,
          musculoKg: medidas.musculoKg || undefined,
          observaciones: c.alturaCm ? `Altura ${c.alturaCm} cm.` : "Medidas de la primera consulta.",
          objetivo: c.objetivo,
          indicaciones: "Pendiente asignar plan de alimentación.",
          proximoControl: "En 30 días",
          autor: STAFF.nutricionista.nombre,
          escrito: `Hoy · ${hora}`,
        },
      }));
    }
    setClientesVersion((n) => n + 1);
  }, []);

  // Cocina: planes de alimentación, órdenes en cola e incidencias para la nutricionista.
  const [planesAlim, setPlanesAlim] = useState<PlanAlimentacion[]>(PLANES_ALIMENTACION);
  const [ordenes, setOrdenes] = useState<Orden[]>(ORDENES);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const guardarPlanAlim = useCallback((p: PlanAlimentacion, orden?: Orden) => {
    setPlanesAlim((ps) => (ps.some((x) => x.clienteId === p.clienteId) ? ps.map((x) => (x.clienteId === p.clienteId ? p : x)) : [...ps, p]));
    // Las órdenes que la cocina todavía no confirma se rearman con el plan nuevo.
    setOrdenes((os) => {
      const rearmadas = os.map((o) => {
        if (o.clienteId !== p.clienteId || o.estado !== "nueva") return o;
        const n = paqueteDe(cliente(o.clienteId), p, o.semana, { id: o.id, diaLlegada: o.diaLlegada, llegada: o.llegada, origen: o.origen, nota: o.nota, estado: "nueva", confirmada: undefined });
        return n ?? o;
      });
      return orden ? [...rearmadas.filter((o) => o.id !== orden.id), orden] : rearmadas;
    });
  }, []);
  const confirmarOrden = useCallback(
    (id: string, dias: DiaOrden[]) => setOrdenes((os) => os.map((o) => (o.id === id ? { ...o, dias, estado: "confirmada", confirmada: `Hoy ${ahora()}` } : o))),
    [],
  );
  const moverOrden = useCallback(
    (id: string, estado: EstadoOrden) =>
      setOrdenes((os) =>
        os.map((o) => {
          if (o.id !== id) return o;
          if (estado === "lista") return { ...o, estado, lista: `Hoy ${ahora()}`, dias: o.dias.map((d) => (d.estado === "pendiente" ? { ...d, estado: "lista" } : d)) };
          if (estado === "despachada") return { ...o, estado, dias: o.dias.map((d) => ({ ...d, estado: "entregada" })) };
          return { ...o, estado };
        }),
      ),
    [],
  );
  // Calendario de producción del chef (una producción de ejemplo para hoy).
  const [tandas, setTandas] = useState<Tanda[]>([
    { id: "t-ej", dia: 0, nombre: "Carnes y arroz", claves: ["proteina|Lomo de res magro", "proteina|Tiras de res magra", "proteina|Tiras de res", "carbohidrato|Arroz (½ taza)", "carbohidrato|Arroz integral (½ taza)"] },
  ]);
  const guardarTanda = useCallback((t: Tanda) => setTandas((ts) => (ts.some((x) => x.id === t.id) ? ts.map((x) => (x.id === t.id ? t : x)) : [...ts, t])), []);
  const eliminarTanda = useCallback((id: string) => setTandas((ts) => ts.filter((x) => x.id !== id)), []);
  const completarEntrega = useCallback(
    (id: string, dia: number) =>
      setOrdenes((os) =>
        os.map((o) => {
          if (o.id !== id) return o;
          const dias = o.dias.map((d) =>
            d.dia === dia && d.estado === "pendiente"
              ? { ...d, estado: "lista" as const, items: d.items.map((i) => (enCocina(i.tiempo, o.plan) ? { ...i, hecho: true, partes: partesDe(i.platoId) } : i)) }
              : d,
          );
          const todos = dias.every((d) => d.estado !== "pendiente");
          // Dar por lista una orden sin confirmar también la confirma.
          const confirmada = o.confirmada ?? `Hoy ${ahora()}`;
          return { ...o, dias, confirmada, estado: todos ? ("lista" as const) : o.estado === "confirmada" || o.estado === "nueva" ? ("preparacion" as const) : o.estado, ...(todos ? { lista: `Hoy ${ahora()}` } : {}) };
        }),
      ),
    [],
  );
  const marcarParte = useCallback(
    (id: string, dia: number, tiempo: Tiempo, parte?: string) =>
      setOrdenes((os) =>
        os.map((o) => {
          if (o.id !== id) return o;
          const dias = o.dias.map((d) => {
            if (d.dia !== dia || d.estado === "entregada") return d;
            const items = d.items.map((i) => {
              if (i.tiempo !== tiempo) return i;
              const todas = partesDe(i.platoId);
              let partes: string[];
              if (!parte || !todas.length) partes = i.hecho ? [] : todas;
              else partes = (i.partes ?? []).includes(parte) ? (i.partes ?? []).filter((x) => x !== parte) : [...(i.partes ?? []), parte];
              const hecho = todas.length ? todas.every((x) => partes.includes(x)) : !i.hecho;
              return { ...i, partes, hecho };
            });
            const completa = items.filter((i) => enCocina(i.tiempo, o.plan)).every((i) => i.hecho);
            return { ...d, items, estado: completa ? ("lista" as const) : ("pendiente" as const) };
          });
          const todos = dias.every((d) => d.estado !== "pendiente");
          const estado = todos ? ("lista" as const) : o.estado === "lista" || o.estado === "confirmada" ? ("preparacion" as const) : o.estado;
          return { ...o, dias, estado, ...(todos ? { lista: `Hoy ${ahora()}` } : {}) };
        }),
      ),
    [],
  );
  const despacharDia = useCallback(
    (id: string, dia: number) =>
      setOrdenes((os) =>
        os.map((o) => {
          if (o.id !== id) return o;
          const dias = o.dias.map((d) => (d.dia === dia ? { ...d, estado: "entregada" as const } : d));
          return { ...o, dias, estado: dias.every((d) => d.estado === "entregada") ? ("despachada" as const) : o.estado };
        }),
      ),
    [],
  );
  const marcarDia = useCallback(
    (id: string, dia: number, lista: boolean) =>
      setOrdenes((os) =>
        os.map((o) => {
          if (o.id !== id) return o;
          const dias = o.dias.map((d) => (d.dia === dia && d.estado !== "entregada" ? { ...d, estado: lista ? ("lista" as const) : ("pendiente" as const) } : d));
          // Con todos los días listos, el paquete queda listo; si uno vuelve a pendiente, regresa a preparación.
          const todos = dias.every((d) => d.estado !== "pendiente");
          const estado: EstadoOrden = todos ? "lista" : o.estado === "lista" || o.estado === "confirmada" ? "preparacion" : o.estado;
          return { ...o, dias, estado, ...(todos ? { lista: `Hoy ${ahora()}` } : {}) };
        }),
      ),
    [],
  );
  const [extras, setExtras] = useState<Record<number, Record<string, number>>>({});
  const marcarPlatoHecho = useCallback(
    (dia: number, platoId: string, n: number, clienteId?: string) => {
      let falta = n;
      const nuevas = ordenes.map((o) => {
        if (falta <= 0 || (clienteId && o.clienteId !== clienteId) || !["confirmada", "preparacion", "lista"].includes(o.estado)) return o;
        let cambio = false;
        const dias = o.dias.map((d) => {
          if (d.dia !== dia || d.estado !== "pendiente") return d;
          const items = d.items.map((i) => {
            if (falta > 0 && i.platoId === platoId && !i.hecho && enCocina(i.tiempo, o.plan)) {
              falta--;
              cambio = true;
              return { ...i, hecho: true };
            }
            return i;
          });
          const completa = items.filter((i) => enCocina(i.tiempo, o.plan)).every((i) => i.hecho);
          return { ...d, items, estado: completa ? ("lista" as const) : d.estado };
        });
        if (!cambio) return o;
        const todos = dias.every((d) => d.estado !== "pendiente");
        return { ...o, dias, estado: todos ? ("lista" as const) : o.estado === "confirmada" ? ("preparacion" as const) : o.estado, ...(todos ? { lista: `Hoy ${ahora()}` } : {}) };
      });
      setOrdenes(nuevas);
      // Lo que sobra cuenta como porción extra de la cocina (no aplica al marcar por cliente).
      if (falta > 0 && !clienteId) setExtras((x) => ({ ...x, [dia]: { ...x[dia], [platoId]: (x[dia]?.[platoId] ?? 0) + falta } }));
    },
    [ordenes],
  );
  const [produccion, setProduccionState] = useState<Record<number, Record<string, number>>>({});
  const setProduccion = useCallback(
    (dia: number, porciones: Record<string, number> | null) =>
      setProduccionState((p) => {
        const n = { ...p };
        if (porciones) n[dia] = porciones;
        else delete n[dia];
        return n;
      }),
    [],
  );

  // Recetario: los platos nuevos van a la lista común; si el id ya existe, lo reemplazan.
  const [recetarioVersion, setRecetarioVersion] = useState(0);
  const agregarPlatos = useCallback((ps: Plato[]) => {
    for (const p of ps) {
      const i = RECETARIO.findIndex((x) => x.id === p.id);
      if (i >= 0) RECETARIO[i] = p;
      else RECETARIO.push(p);
    }
    setRecetarioVersion((n) => n + 1);
  }, []);
  const eliminarPlato = useCallback((id: string) => {
    const i = RECETARIO.findIndex((x) => x.id === id);
    if (i >= 0) RECETARIO.splice(i, 1);
    setRecetarioVersion((n) => n + 1);
  }, []);
  const reportarIncidencia = useCallback((i: Incidencia) => setIncidencias((xs) => [i, ...xs]), []);
  const resolverIncidencia = useCallback((id: string) => setIncidencias((xs) => xs.map((x) => (x.id === id ? { ...x, resuelta: true } : x))), []);

  const conversacionDe = useCallback(
    (clienteId: string) => {
      const existente = conversaciones.find((c) => c.clienteId === clienteId);
      if (existente) return existente.id;
      const id = `n-${clienteId}`;
      const cli = cliente(clienteId);
      setConvs((cs) => [
        {
          id,
          objetivo: "informacion",
          clienteId,
          canal: cli.canal,
          agenda: null,
          estado: "secretaria",
          noLeidos: 0,
          hora: ahora(),
          mensajes: [sistema("Conversación abierta desde Pacientes. MIA queda en pausa mientras el equipo escribe.")],
        },
        ...cs,
      ]);
      return id;
    },
    [conversaciones],
  );

  return (
    <Ctx.Provider
      value={{ rol, clientesVersion, agregarCliente, planesAlim, guardarPlanAlim, ordenes, confirmarOrden, moverOrden, marcarDia, despacharDia, completarEntrega, marcarParte, tandas, guardarTanda, eliminarTanda, incidencias, reportarIncidencia, resolverIncidencia, recetarioVersion, agregarPlatos, eliminarPlato, produccion, setProduccion, marcarPlatoHecho, extras, filtro, setFiltro, conversaciones, tomar, devolverAIA, resolver, enviar, marcarLeida, urgencias, agendarUrgencia, cerrarUrgencia, menus, agregarMenu, calendario, setCalendario, diaCalendario, setDiaCalendario, convSel, setConvSel, convPedida, limpiarConvPedida, conversacionDe, visitas, resumenes, guardarResumen, notas, agregarNota, agregarCita, citasVersion, posts, agregarPost, campanas, agregarCampana, plantillas, guardarPlantilla, eliminarPlantilla }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
}

/** ¿Pasa este elemento el filtro global? null = no tiene agenda (pasa siempre en "todas"). */
export function pasaFiltro(filtro: FiltroAgenda, agenda: Agenda | null | undefined) {
  return filtro === "todas" || agenda === filtro;
}
