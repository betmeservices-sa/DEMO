"use client";

// El expediente: lo que el doctor hace con el paciente que ya llegó.
//
// Cuatro cosas puede dejarle escritas: exámenes de laboratorio, estudios de
// imagenología, procedimientos y la receta. Las tres primeras son la misma
// pantalla con distinto catálogo, porque el gesto es el mismo: marcar lo que se
// le va a hacer. Los exámenes van primero porque son los que más se usan y los
// que más tiempo cuestan escribir a mano.
//
// La hoja de exámenes está en columnas por área y no en una lista alfabética
// porque así es como se indican: nadie busca "TSH" entre ciento veinte
// estudios ordenados por letra, la busca en hormonas. Y la barra de acciones va
// pegada abajo porque la hoja es larga: con el botón al final, marcar el último
// examen obliga a un viaje de vuelta.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Receipt, TriangleAlert } from "lucide-react";
import { Encabezado } from "@/components/consultorio/Encabezado";
import {
  LADOS,
  NOMBRE_TIPO,
  agruparDe,
  areasDe,
  conLado,
  preparacionDe as preparacion,
  type Lado,
  type TipoOrden,
} from "@/lib/consultorio/catalogos";
import {
  edad,
  type Doctor,
  type Documento,
  type Medicamento,
  type Paciente,
} from "@/lib/consultorio/tipos";
import { Logo } from "@/components/consultorio/Logo";
import { BuscadorExamenes } from "@/components/consultorio/BuscadorExamenes";
import { CLINICA } from "@/lib/consultorio/marca";
import { cuantos, filtrarAreas } from "@/lib/consultorio/buscar";
import type { EnCola } from "@/lib/consultorio/cola";

type Pestana = TipoOrden | "receta" | "nota";

// Cómo se llama cada pestaña y qué se le dice al doctor cuando guarda.
const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: "orden", texto: "Exámenes" },
  { id: "imagen", texto: "Imagenología" },
  { id: "proceso", texto: "Procesos" },
  { id: "receta", texto: "Receta" },
  { id: "nota", texto: "Nota" },
];

const horaCorta = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-SV", { hour: "numeric", minute: "2-digit" });

const MED_VACIO: Medicamento = { nombre: "", dosis: "", frecuencia: "", duracion: "" };

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" });

export function Expediente({
  doctor,
  paciente,
  documentos: iniciales,
  enCola = null,
}: {
  doctor: Doctor;
  paciente: Paciente;
  documentos: Documento[];
  /** Si hoy ya pagó sus exámenes: viene con resultados. */
  enCola?: EnCola | null;
}) {
  // Si viene del laboratorio, lo que toca es anotar la consulta.
  const [pestana, setPestana] = useState<Pestana>(enCola ? "nota" : "orden");
  const [nota, setNota] = useState("");
  const [documentos, setDocumentos] = useState<Documento[]>(iniciales);
  const [marcados, setMarcados] = useState<string[]>([]);
  // De qué lado va cada estudio que lo pide. En la orden impresa es el "Der
  // Izq" que se circula, y acá es obligatorio: una placa de la rodilla
  // equivocada es un viaje perdido.
  const [lados, setLados] = useState<Record<string, Lado>>({});
  const [diagnostico, setDiagnostico] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([{ ...MED_VACIO }]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; tono: "bien" | "mal" } | null>(null);

  const anios = edad(paciente.nacimiento);
  const avisos = useMemo(() => preparacion(marcados), [marcados]);
  // Buscar en la hoja: lo marcado no se pierde al filtrar, solo se esconde.
  const [busca, setBusca] = useState("");
  const visibles = useMemo(
    () =>
      pestana === "receta" || pestana === "nota" ? [] : filtrarAreas(areasDe(pestana), busca),
    [pestana, busca],
  );

  function marcar(id: string) {
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
    setLados((l) => {
      if (!marcados.includes(id)) return l;
      const { [id]: _fuera, ...resto } = l;
      return resto;
    });
  }

  /** Los que están marcados, piden lado y todavía no lo tienen. */
  const sinLado = marcados.filter((id) => {
    const e = areasDe(pestana === "receta" || pestana === "nota" ? "orden" : pestana)
      .flatMap((a) => a.examenes)
      .find((x) => x.id === id);
    return e?.lado && !lados[id];
  });

  function cambiarMed(i: number, campo: keyof Medicamento, valor: string) {
    setMedicamentos((ms) => ms.map((m, j) => (j === i ? { ...m, [campo]: valor } : m)));
  }

  async function guardar(enviar: boolean) {
    setGuardando(true);
    setAviso(null);
    try {
      const cuerpo =
        pestana === "nota"
          ? { tipo: "nota", pacienteId: paciente.id, texto: nota }
          : pestana === "receta"
          ? { tipo: "receta", pacienteId: paciente.id, medicamentos, indicaciones }
          : {
              tipo: pestana,
              pacienteId: paciente.id,
              examenes: marcados,
              lados,
              diagnostico,
              indicaciones,
            };

      const r = await fetch("/api/consultorio/documentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = await r.json();
      if (!d.ok) {
        setAviso({ texto: d.error ?? "No se pudo guardar.", tono: "mal" });
        setGuardando(false);
        return;
      }

      let doc: Documento = d.documento;
      let texto =
        pestana === "nota" ? "Nota guardada." : pestana === "receta" ? "Receta guardada." : "Orden guardada.";

      if (enviar) {
        const e = await fetch(`/api/consultorio/documentos/${doc.id}/enviar`, { method: "POST" });
        const de = await e.json();
        if (!de.ok) {
          setAviso({ texto: `Se guardó, pero no se envió: ${de.error}`, tono: "mal" });
        } else if (doc.tipo !== "nota") {
          doc = {
            ...doc,
            enviado: { a: de.a, cuando: new Date().toISOString(), simulado: de.simulado },
          };
          texto = de.simulado
            ? `Guardada. El correo a ${de.a} NO salió: falta conectar el proveedor.`
            : `Guardada y enviada a ${de.a}.`;
        }
      }

      setDocumentos((prev) => [doc, ...prev]);
      setNota("");
      setMarcados([]);
      setLados({});
      setDiagnostico("");
      setIndicaciones("");
      setMedicamentos([{ ...MED_VACIO }]);
      setAviso((a) => a ?? { texto, tono: "bien" });
    } catch {
      setAviso({ texto: "No se pudo guardar: falló la conexión.", tono: "mal" });
    }
    setGuardando(false);
  }

  const puedeGuardar =
    pestana === "nota"
      ? nota.trim().length > 0
      : pestana === "receta"
        ? medicamentos.some((m) => m.nombre.trim())
        : marcados.length > 0 && sinLado.length === 0;

  return (
    <>
      <Encabezado
        titulo={paciente.nombre}
        detalle={[
          anios !== null ? `${anios} años` : null,
          paciente.sexo === "F" ? "femenino" : paciente.sexo === "M" ? "masculino" : null,
          paciente.telefono,
          paciente.correo || "sin correo",
        ]
          .filter(Boolean)
          .join("  ·  ")}
      >
        <Link href="/consultorio" className="boton-2 no-imprimir">
          <ArrowLeft size={15} /> Pacientes
        </Link>
      </Encabezado>

      <main className="px-6 py-6 pb-28">
        {enCola && (
          <p className="no-imprimir mb-5 flex flex-wrap items-center gap-2 border-l-2 border-[var(--exito)] bg-[var(--exito-claro)] px-4 py-3 text-[14px] text-[var(--texto)]">
            <Receipt size={15} className="shrink-0 text-[var(--exito)]" />
            <span>
              Ya pagó sus exámenes hoy a las {horaCorta(enCola.pagado)}
              {enCola.unidad ? ` en ${enCola.unidad}` : ""} (factura{" "}
              <span className="font-mono">{enCola.factura}</span>).
              {enCola.examenes.length > 0 && ` Se le hizo: ${enCola.examenes.join(", ")}.`}
            </span>
          </p>
        )}
        {(paciente.motivo || paciente.alergias) && (
          <div className="tarjeta mb-6 px-5 py-4">
            {paciente.motivo && (
              <p className="font-serif text-[16px] leading-relaxed text-[var(--texto)]">
                {paciente.motivo}
              </p>
            )}
            {paciente.alergias && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-[14px] text-[var(--texto)]">
                <span className="chip chip-rojo">
                  <TriangleAlert size={12} /> Alergias
                </span>
                {paciente.alergias}
              </p>
            )}
          </div>
        )}

        <div className="no-imprimir flex gap-6 border-b border-[var(--linea-2)]">
          {PESTANAS.map(({ id, texto }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPestana(id);
                setMarcados([]);
                setLados({});
                setBusca("");
              }}
              className={`-mb-px border-b-2 pb-2.5 font-serif text-[17px] transition ${
                pestana === id
                  ? "border-[var(--verde)] text-[var(--texto)]"
                  : "border-transparent text-[var(--texto-3)] hover:text-[var(--texto-2)]"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        {pestana === "nota" ? (
          <section className="tarjeta no-imprimir mt-5 px-6 py-5">
            <label className="block">
              <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
                Nota de la consulta
              </span>
              <span className="mt-0.5 block text-[12.5px] text-[var(--texto-3)]">
                Hallazgos, plan, lo que hay que recordar la próxima vez. Es interna: no se
                imprime ni se le envía al paciente.
              </span>
              <textarea
                rows={7}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="campo mt-2 resize-y font-serif text-[15.5px] leading-relaxed"
              />
            </label>
          </section>
        ) : pestana !== "receta" ? (
          <section className="tarjeta no-imprimir mt-5 px-6 py-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13.5px] text-[var(--texto-2)]">
                {busca.trim()
                  ? `${cuantos(visibles)} ${cuantos(visibles) === 1 ? "calza" : "calzan"} con “${busca.trim()}”`
                  : "Marcá lo que le vas a dejar, o buscalo por nombre."}
              </p>
              <BuscadorExamenes
                valor={busca}
                cambiar={setBusca}
                placeholder="Buscar examen"
                className="w-full sm:w-[300px]"
              />
            </div>
            {busca.trim() && cuantos(visibles) === 0 && (
              <p className="py-8 text-center text-[14px] text-[var(--texto-2)]">
                Nada calza con “{busca.trim()}”. Probá con otra palabra o con el código.
              </p>
            )}
            {/* Columnas de verdad (CSS multicolumna): así la hoja se lee como el
                formulario del laboratorio y cabe más en una pantalla sin
                volverse una lista infinita. */}
            <div className="columns-1 gap-9 sm:columns-2 lg:columns-3">
              {visibles.map((a) => {
                const n = a.examenes.filter((e) => marcados.includes(e.id)).length;
                return (
                  <div key={a.id} className="mb-7 break-inside-avoid">
                    <h3 className="flex items-baseline justify-between gap-2 border-b border-[var(--barra)] pb-1 font-serif text-[15.5px] text-[var(--texto)]">
                      {a.nombre}
                      {n > 0 && (
                        <span className="font-sans text-[12px] font-semibold text-[var(--verde)]">
                          {n}
                        </span>
                      )}
                    </h3>
                    <div className="mt-1.5">
                      {a.examenes.map((e) => (
                        <div key={e.id}>
                          <label className="casilla">
                            <input
                              type="checkbox"
                              checked={marcados.includes(e.id)}
                              onChange={() => marcar(e.id)}
                            />
                            <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-[var(--texto)]">
                              {e.nombre}
                              {e.nota && (
                                <span className="block text-[12px] text-[var(--texto-3)]">
                                  {e.nota}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 font-mono text-[12px] text-[var(--texto-3)]">
                              {e.estimado ? "~" : ""}
                              {e.precio}
                            </span>
                          </label>
                          {e.lado && marcados.includes(e.id) && (
                            <span className="mb-1 ml-8 flex gap-1">
                              {LADOS.map((l) => (
                                <button
                                  key={l.id}
                                  type="button"
                                  onClick={() => setLados((x) => ({ ...x, [e.id]: l.id }))}
                                  className={`rounded-[6px] border px-2 py-0.5 text-[11.5px] transition ${
                                    lados[e.id] === l.id
                                      ? "border-[var(--verde)] bg-[var(--verde-claro)] font-semibold text-[var(--verde-hondo)]"
                                      : "border-[var(--linea-2)] text-[var(--texto-2)] hover:border-[var(--texto-3)]"
                                  }`}
                                >
                                  {l.texto}
                                </button>
                              ))}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-1 grid gap-5 border-t border-[var(--linea)] pt-5 sm:grid-cols-2">
              <label className="block">
                <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
                  Diagnóstico presuntivo
                </span>
                <input
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  className="campo"
                />
              </label>
              <label className="block">
                <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
                  Indicaciones para el laboratorio
                </span>
                <input
                  value={indicaciones}
                  onChange={(e) => setIndicaciones(e.target.value)}
                  className="campo"
                />
              </label>
            </div>
          </section>
        ) : (
          <section className="tarjeta no-imprimir mt-5 px-6 py-5">
            <div className="space-y-4">
              {medicamentos.map((m, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr]">
                  <input
                    placeholder="Medicamento"
                    value={m.nombre}
                    onChange={(e) => cambiarMed(i, "nombre", e.target.value)}
                    className="campo font-serif text-[15.5px]"
                  />
                  <input
                    placeholder="Dosis"
                    value={m.dosis}
                    onChange={(e) => cambiarMed(i, "dosis", e.target.value)}
                    className="campo"
                  />
                  <input
                    placeholder="Cada cuánto"
                    value={m.frecuencia}
                    onChange={(e) => cambiarMed(i, "frecuencia", e.target.value)}
                    className="campo"
                  />
                  <input
                    placeholder="Por cuánto tiempo"
                    value={m.duracion}
                    onChange={(e) => cambiarMed(i, "duracion", e.target.value)}
                    className="campo"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMedicamentos((ms) => [...ms, { ...MED_VACIO }])}
              className="mt-4 text-[13.5px] font-medium text-[var(--verde)] underline underline-offset-4"
            >
              Agregar otro medicamento
            </button>

            <label className="mt-6 block border-t border-[var(--linea)] pt-5">
              <span className="block text-[13px] font-semibold text-[var(--texto-2)]">
                Indicaciones
              </span>
              <textarea
                rows={3}
                value={indicaciones}
                onChange={(e) => setIndicaciones(e.target.value)}
                className="campo resize-y"
              />
            </label>
          </section>
        )}

        {aviso && (
          <p
            className={`no-imprimir mt-4 border-l-2 px-4 py-3 text-[14px] text-[var(--texto)] ${
              aviso.tono === "bien"
                ? "border-[var(--verde)] bg-[var(--verde-claro)]"
                : "border-[var(--alerta)] bg-[var(--alerta-clara)]"
            }`}
          >
            {aviso.texto}
          </p>
        )}

        {documentos.length > 0 && (
          <section className="mt-9">
            <h2 className="font-serif text-[20px] text-[var(--texto)]">
              Lo que ya le dejaste escrito
            </h2>
            <div className="mt-4 space-y-5">
              {documentos.map((d) =>
                d.tipo === "nota" ? (
                  // La nota no es papel: no lleva membrete, ni código, ni firma.
                  <article key={d.id} className="tarjeta px-6 py-5">
                    <p className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-serif text-[16px] text-[var(--texto)]">Nota de consulta</span>
                      <span className="text-[12.5px] text-[var(--texto-2)]">{fechaLarga(d.fecha)}</span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[var(--texto)]">
                      {d.texto}
                    </p>
                  </article>
                ) : (
                <article key={d.id} className="documento px-6 py-5">
                  <header className="membrete flex flex-wrap items-start justify-between gap-3 pb-3">
                    <span className="flex items-center gap-3">
                      {/* El papel es de la clínica y la firma es del doctor, en
                          ese orden. Va el símbolo y no el logotipo completo:
                          a esta altura el nombre de abajo no se leería, así que
                          lo escribe la tipografía del documento. */}
                      <Logo alto={40} simbolo className="shrink-0" />
                      <span>
                      <span className="block font-serif text-[19px] text-[var(--texto)]">
                        {CLINICA}
                      </span>
                      <span className="block font-serif text-[15px] text-[var(--texto-2)]">
                        {doctor.nombre}
                      </span>
                      <span className="block font-sans text-[12.5px] text-[var(--texto-2)]">
                        {doctor.especialidad} · {doctor.registro} · {doctor.telefono}
                      </span>
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-serif text-[15px] text-[var(--texto)]">
                        {d.tipo === "receta" ? "Receta" : NOMBRE_TIPO[d.tipo]}
                      </span>
                      <span className="block font-sans text-[12.5px] text-[var(--texto-2)]">
                        {fechaLarga(d.fecha)}
                      </span>
                      {/* El código es lo que el paciente lleva al laboratorio:
                          lo dicta en el mostrador o lo escribe en su teléfono y
                          le salen marcados los exámenes de esta orden. Por eso
                          va grande y en mono, para copiarlo sin equivocarse. */}
                      {d.codigo && (
                        <span className="mt-1 block font-mono text-[14px] tracking-[0.1em] text-[var(--texto)]">
                          {d.codigo}
                        </span>
                      )}
                    </span>
                  </header>

                  <p className="mt-3 text-[13.5px] text-[var(--texto-2)]">
                    Para{" "}
                    <span className="font-serif text-[15px] text-[var(--texto)]">
                      {paciente.nombre}
                    </span>
                    {anios !== null ? `, ${anios} años` : ""}
                  </p>

                  {d.tipo === "receta" ? (
                    <ol className="mt-4 space-y-2.5">
                      {d.medicamentos.map((m, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="font-serif text-[15px] text-[var(--texto-3)]">
                            {i + 1}.
                          </span>
                          <span>
                            <span className="block font-serif text-[16px] leading-snug text-[var(--texto)]">
                              {m.nombre}
                            </span>
                            {[m.dosis, m.frecuencia, m.duracion].filter(Boolean).length > 0 && (
                              <span className="block text-[13.5px] text-[var(--texto-2)]">
                                {[m.dosis, m.frecuencia, m.duracion].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {agruparDe(d.tipo, d.examenes).map((g) => (
                        <div key={g.area}>
                          <p className="border-b border-[var(--linea)] pb-1 font-serif text-[14.5px] text-[var(--texto)]">
                            {g.area}
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {g.examenes.map((e) => (
                              <li key={e.id} className="text-[13.5px] text-[var(--texto-2)]">
                                {conLado(e.id, d.lados)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {d.tipo !== "receta" && d.diagnostico && (
                    <p className="mt-4 text-[13.5px] text-[var(--texto)]">
                      <span className="text-[var(--texto-2)]">Diagnóstico presuntivo:</span>{" "}
                      {d.diagnostico}
                    </p>
                  )}
                  {d.tipo !== "receta" && preparacion(d.examenes).length > 0 && (
                    <p className="mt-1 text-[13.5px] text-[var(--texto)]">
                      <span className="text-[var(--texto-2)]">Preparación:</span>{" "}
                      {preparacion(d.examenes).join(", ")}
                    </p>
                  )}
                  {d.indicaciones && (
                    <p className="mt-3 text-[14px] leading-relaxed text-[var(--texto)]">
                      {d.indicaciones}
                    </p>
                  )}

                  {/* La línea de firma: la documento se imprime y alguien la firma. */}
                  <div className="mt-8 ml-auto w-[230px] border-t border-[var(--barra)] pt-1 text-center">
                    <p className="font-serif text-[13.5px] text-[var(--texto)]">{doctor.nombre}</p>
                    <p className="text-[12px] text-[var(--texto-2)]">{doctor.registro}</p>
                  </div>

                  <footer className="no-imprimir mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--linea)] pt-3">
                    <span className="text-[12.5px] text-[var(--texto-2)]">
                      {!d.enviado ? (
                        "Sin enviar"
                      ) : d.enviado.simulado ? (
                        <span className="text-[var(--ambar)]">
                          No salió: falta conectar el correo ({d.enviado.a})
                        </span>
                      ) : (
                        `Enviada a ${d.enviado.a}`
                      )}
                    </span>
                    <button type="button" onClick={() => window.print()} className="boton-2">
                      Imprimir
                    </button>
                  </footer>
                </article>
                ),
              )}
            </div>
          </section>
        )}
      </main>

      {/* Pegada abajo: la hoja de exámenes es larga y el resumen tiene que estar
          a la vista mientras se marca, no al final del recorrido. */}
      <div className="no-imprimir fixed inset-x-0 bottom-0 border-t border-[var(--linea-2)] bg-[var(--panel)]/95 backdrop-blur lg:left-[236px]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
          <p className="text-[13.5px] text-[var(--texto-2)]">
            {sinLado.length > 0 ? (
              <span className="text-[var(--ambar)]">
                Falta decir de qué lado: {sinLado.map((id) => conLado(id)).join(", ")}
              </span>
            ) : pestana === "nota" ? (
              puedeGuardar ? (
                <span className="font-semibold text-[var(--texto)]">Nota lista para guardar</span>
              ) : (
                "Escribí la nota de la consulta."
              )
            ) : pestana !== "receta" ? (
              marcados.length === 0 ? (
                "Marcá los exámenes que le vas a dejar."
              ) : (
                <>
                  <span className="font-semibold text-[var(--texto)]">
                    {marcados.length} {marcados.length === 1 ? "examen" : "exámenes"}
                  </span>
                  {avisos.length > 0 && <> · Preparación: {avisos.join(", ")}</>}
                </>
              )
            ) : puedeGuardar ? (
              <span className="font-semibold text-[var(--texto)]">
                {medicamentos.filter((m) => m.nombre.trim()).length}{" "}
                {medicamentos.filter((m) => m.nombre.trim()).length === 1
                  ? "medicamento"
                  : "medicamentos"}
              </span>
            ) : (
              "Escribí al menos un medicamento."
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => guardar(false)}
              disabled={!puedeGuardar || guardando}
              className="boton-2"
            >
              Guardar
            </button>
            {pestana !== "nota" && (
              <button
                type="button"
                onClick={() => guardar(true)}
                disabled={!puedeGuardar || guardando || !paciente.correo}
                title={paciente.correo ? undefined : "Este paciente no dejó correo al registrarse"}
                className="boton"
              >
                {guardando ? "Guardando" : "Guardar y enviar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
