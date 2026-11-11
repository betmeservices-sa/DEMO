"use client";

// El portal del cliente de La Campana: una sola pantalla con cinco pestañas.
//
// Una página que se abre desde el enlace que manda Sofía por WhatsApp, con la
// barra de pulgar abajo en el teléfono y arriba en pantallas grandes: el menú
// real del restaurante, un carrito y la elección entre domicilio o retiro.
//
// ES UN DEMO: el pedido NO sale a ninguna sucursal. Al confirmarlo se le
// muestra un número de orden de ejemplo y nada más. El WhatsApp público del
// restaurante es real, así que el portal nunca le manda nada.

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bike, Home, MapPin, Minus, MessageCircle, Plus, Send, ShoppingBag, Store, UtensilsCrossed } from "lucide-react";
import { LaCampanaMarca } from "@/components/ui/LaCampanaLogo";
import { CATEGORIAS, platoPorId, platosDe, precio, type Plato } from "@/lib/lacampana/menu";
import { HORA_APERTURA, SUCURSALES_CAMPANA } from "@/lib/lacampana/sucursales";
import { lacampanaSimulacion } from "@/lib/tenants/simulacion/lacampana";

export type VistaCampana = "inicio" | "menu" | "pedido" | "sucursales" | "chat";

const PESTANAS: Array<{ id: VistaCampana; rotulo: string; Icono: typeof Home }> = [
  { id: "inicio", rotulo: "Inicio", Icono: Home },
  { id: "menu", rotulo: "Menú", Icono: UtensilsCrossed },
  { id: "pedido", rotulo: "Mi pedido", Icono: ShoppingBag },
  { id: "sucursales", rotulo: "Sucursales", Icono: MapPin },
  { id: "chat", rotulo: "Chat", Icono: MessageCircle },
];

const CARRITO_GUARDADO = "lacampana-carrito";

type Carrito = Record<string, number>;

export function PortalCampana() {
  const [vista, setVista] = useState<VistaCampana>("inicio");
  const [carrito, setCarrito] = useState<Carrito>({});
  const [categoria, setCategoria] = useState<string>(CATEGORIAS[0].id);

  useEffect(() => {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("v");
    if (v && PESTANAS.some((p) => p.id === v)) setVista(v as VistaCampana);
    try {
      const g = localStorage.getItem(CARRITO_GUARDADO);
      if (g) setCarrito(JSON.parse(g) as Carrito);
    } catch {
      // Sin almacenamiento el carrito arranca vacío y el portal anda igual.
    }
  }, []);

  const guardar = useCallback((c: Carrito) => {
    setCarrito(c);
    try {
      localStorage.setItem(CARRITO_GUARDADO, JSON.stringify(c));
    } catch {
      // Ventana privada: el carrito vive solo mientras la página esté abierta.
    }
  }, []);

  const cambiar = useCallback(
    (id: string, delta: number) => {
      const n = Math.max(0, (carrito[id] ?? 0) + delta);
      const c = { ...carrito };
      if (n === 0) delete c[id];
      else c[id] = n;
      guardar(c);
    },
    [carrito, guardar],
  );

  const irA = useCallback((v: VistaCampana) => {
    setVista(v);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("v", v);
      window.history.replaceState(null, "", url);
    } catch {
      // Si el navegador no deja tocar la URL, la pestaña igual cambia.
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const verCategoria = useCallback(
    (id: string) => {
      setCategoria(id);
      irA("menu");
    },
    [irA],
  );

  const unidades = Object.values(carrito).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[560px] bg-[var(--p-fondo)] lg:max-w-[1120px]">
      <Encabezado vista={vista} irA={irA} unidades={unidades} />

      <main className="px-4 pb-[calc(var(--p-nav)+28px)] pt-4 lg:px-8 lg:pb-16 lg:pt-7">
        {vista === "inicio" ? (
          <Inicio irA={irA} verCategoria={verCategoria} carrito={carrito} cambiar={cambiar} />
        ) : vista === "menu" ? (
          <Menu categoria={categoria} setCategoria={setCategoria} carrito={carrito} cambiar={cambiar} />
        ) : vista === "pedido" ? (
          <Pedido carrito={carrito} cambiar={cambiar} vaciar={() => guardar({})} irA={irA} />
        ) : vista === "sucursales" ? (
          <Sucursales />
        ) : (
          <ChatDemo />
        )}
      </main>

      {unidades > 0 && vista !== "pedido" && vista !== "chat" ? (
        <button
          type="button"
          onClick={() => irA("pedido")}
          className="fixed bottom-[calc(var(--p-nav)+12px)] left-1/2 z-40 flex w-[calc(100%-32px)] max-w-[528px] -translate-x-1/2 items-center justify-between rounded-2xl bg-[var(--p-azul)] px-4 py-3 text-white shadow-lg lg:bottom-6"
        >
          <span className="text-[14px] font-semibold">
            Ver mi pedido · {unidades} {unidades === 1 ? "plato" : "platos"}
          </span>
          <span className="text-[15px] font-bold">{precio(totalDe(carrito))}</span>
        </button>
      ) : null}

      <BarraInferior vista={vista} irA={irA} unidades={unidades} />
    </div>
  );
}

function totalDe(c: Carrito): number {
  return Object.entries(c).reduce((t, [id, n]) => t + (platoPorId(id)?.precio ?? 0) * n, 0);
}

function Encabezado({ vista, irA, unidades }: { vista: VistaCampana; irA: (v: VistaCampana) => void; unidades: number }) {
  return (
    <header className="sticky top-0 z-30 bg-[var(--p-azul-hondo)] px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+14px)] text-white lg:px-8 lg:pb-0 lg:pt-5">
      <div className="flex items-center justify-between">
        <div className="text-white">
          <LaCampanaMarca height={30} />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/75">
          {SUCURSALES_CAMPANA.length} sucursales
        </span>
      </div>
      <nav className="mt-4 hidden lg:block">
        <ul className="flex gap-1">
          {PESTANAS.map(({ id, rotulo, Icono }) => {
            const activa = vista === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => irA(id)}
                  aria-current={activa ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-[14px] font-semibold transition-colors ${
                    activa ? "bg-[var(--p-fondo)] text-[var(--p-azul-hondo)]" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  <Icono size={17} strokeWidth={activa ? 2.3 : 1.9} />
                  {rotulo}
                  {id === "pedido" && unidades > 0 ? (
                    <span className="rounded-full bg-[var(--p-arena)] px-1.5 text-[11px] text-white">{unidades}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function BarraInferior({ vista, irA, unidades }: { vista: VistaCampana; irA: (v: VistaCampana) => void; unidades: number }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[560px] -translate-x-1/2 border-t border-[var(--p-borde)] bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden">
      <ul className="flex">
        {PESTANAS.map(({ id, rotulo, Icono }) => {
          const activa = vista === id;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => irA(id)}
                aria-current={activa ? "page" : undefined}
                className={`relative flex h-[var(--p-nav)] w-full flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors ${
                  activa ? "text-[var(--p-azul)]" : "text-[var(--p-tinta-3)]"
                }`}
              >
                <Icono size={21} strokeWidth={activa ? 2.4 : 1.9} />
                {rotulo}
                {id === "pedido" && unidades > 0 ? (
                  <span className="absolute right-[calc(50%-20px)] top-2 rounded-full bg-[var(--p-arena)] px-1.5 text-[10px] leading-4 text-white">
                    {unidades}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ───────────────────────────── Inicio ───────────────────────────── */

const DESTACADOS = ["parrillada-para-2", "campacheros", "promo-burritos", "tacos-de-birria", "churrasco-campana", "mi-media-campana"];

function Inicio({
  irA,
  verCategoria,
  carrito,
  cambiar,
}: {
  irA: (v: VistaCampana) => void;
  verCategoria: (id: string) => void;
  carrito: Carrito;
  cambiar: (id: string, d: number) => void;
}) {
  const destacados = DESTACADOS.map(platoPorId).filter((p): p is Plato => Boolean(p));
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[var(--p-azul-hondo)] text-white">
        <Image
          src="/fotos/lc/parrillada-para-4.jpg"
          alt="Parrillada para 4 de La Campana"
          width={1120}
          height={560}
          priority
          className="h-56 w-full object-cover opacity-60 lg:h-72"
        />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 lg:p-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/80">Carnes, Tacos y más</p>
          <h1 className="mt-1 text-[26px] font-extrabold leading-tight lg:text-[34px]">¿Qué se le antoja hoy?</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => irA("menu")}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-bold text-[var(--p-azul-hondo)]"
            >
              <Bike size={17} /> Pedir a domicilio
            </button>
            <button
              type="button"
              onClick={() => irA("sucursales")}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[14px] font-semibold text-white"
            >
              <Store size={17} /> Retirar en sucursal
            </button>
          </div>
        </div>
      </section>

      <section>
        <Titulo texto="Promos y favoritos" bajada="Lo que más se pide esta semana" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {destacados.map((p) => (
            <TarjetaPlato key={p.id} plato={p} cantidad={carrito[p.id] ?? 0} cambiar={cambiar} />
          ))}
        </div>
      </section>

      <section>
        <Titulo texto="Explore el menú" />
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => verCategoria(c.id)}
              className="rounded-full border border-[var(--p-borde-2)] bg-white px-3.5 py-2 text-[13px] font-semibold text-[var(--p-azul)]"
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </section>

      <Tarjeta className="flex items-center gap-3 p-4">
        <MessageCircle className="shrink-0 text-[var(--p-azul)]" size={22} />
        <div className="flex-1">
          <p className="text-[14px] font-bold">¿Un evento o un pedido grande?</p>
          <p className="text-[13px] text-[var(--p-tinta-2)]">Escríbale a Sofía y un asesor de eventos le cotiza.</p>
        </div>
        <button type="button" onClick={() => irA("chat")} className="rounded-xl bg-[var(--p-azul)] px-3 py-2 text-[13px] font-bold text-white">
          Chatear
        </button>
      </Tarjeta>
    </div>
  );
}

/* ───────────────────────────── Menú ───────────────────────────── */

function Menu({
  categoria,
  setCategoria,
  carrito,
  cambiar,
}: {
  categoria: string;
  setCategoria: (id: string) => void;
  carrito: Carrito;
  cambiar: (id: string, d: number) => void;
}) {
  const platos = platosDe(categoria);
  const nombre = CATEGORIAS.find((c) => c.id === categoria)?.nombre ?? "";
  return (
    <div>
      <div className="portal-carrusel -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        {CATEGORIAS.map((c) => {
          const activa = c.id === categoria;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoria(c.id)}
              aria-pressed={activa}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                activa ? "bg-[var(--p-azul)] text-white" : "border border-[var(--p-borde-2)] bg-white text-[var(--p-tinta-2)]"
              }`}
            >
              {c.nombre}
            </button>
          );
        })}
      </div>
      <Titulo texto={nombre} bajada={`${platos.length} opciones`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {platos.map((p) => (
          <TarjetaPlato key={p.id} plato={p} cantidad={carrito[p.id] ?? 0} cambiar={cambiar} />
        ))}
      </div>
    </div>
  );
}

function TarjetaPlato({ plato, cantidad, cambiar }: { plato: Plato; cantidad: number; cambiar: (id: string, d: number) => void }) {
  return (
    <Tarjeta className="flex flex-col overflow-hidden">
      {plato.foto ? (
        <Image src={plato.foto} alt={plato.nombre} width={400} height={300} className="h-32 w-full object-cover lg:h-40" />
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-[var(--p-arena-suave)] text-[var(--p-arena-honda)] lg:h-40">
          <UtensilsCrossed size={28} />
        </div>
      )}
      <div className="flex flex-1 flex-col p-3">
        <p className="text-[14px] font-bold leading-snug">{plato.nombre}</p>
        {plato.descripcion ? (
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--p-tinta-2)]">{plato.descripcion}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-[15px] font-extrabold text-[var(--p-azul)]">{precio(plato.precio)}</span>
          {cantidad === 0 ? (
            <button
              type="button"
              onClick={() => cambiar(plato.id, 1)}
              aria-label={`Agregar ${plato.nombre}`}
              className="rounded-full bg-[var(--p-azul)] p-1.5 text-white"
            >
              <Plus size={16} />
            </button>
          ) : (
            <Contador cantidad={cantidad} onMenos={() => cambiar(plato.id, -1)} onMas={() => cambiar(plato.id, 1)} nombre={plato.nombre} />
          )}
        </div>
      </div>
    </Tarjeta>
  );
}

function Contador({ cantidad, onMenos, onMas, nombre }: { cantidad: number; onMenos: () => void; onMas: () => void; nombre: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--p-borde-2)] px-1 py-0.5">
      <button type="button" onClick={onMenos} aria-label={`Quitar ${nombre}`} className="p-1 text-[var(--p-azul)]">
        <Minus size={14} />
      </button>
      <span className="min-w-[1ch] text-center text-[13px] font-bold">{cantidad}</span>
      <button type="button" onClick={onMas} aria-label={`Agregar ${nombre}`} className="p-1 text-[var(--p-azul)]">
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ───────────────────────────── Pedido ───────────────────────────── */

function Pedido({
  carrito,
  cambiar,
  vaciar,
  irA,
}: {
  carrito: Carrito;
  cambiar: (id: string, d: number) => void;
  vaciar: () => void;
  irA: (v: VistaCampana) => void;
}) {
  const [modo, setModo] = useState<"domicilio" | "retiro">("domicilio");
  const [sucursal, setSucursal] = useState("");
  const [direccion, setDireccion] = useState("");
  const [nombre, setNombre] = useState("");
  const [pago, setPago] = useState<"efectivo" | "tarjeta">("tarjeta");
  const [orden, setOrden] = useState<number | null>(null);

  const lineas = useMemo(
    () =>
      Object.entries(carrito)
        .map(([id, n]) => ({ plato: platoPorId(id), n }))
        .filter((l): l is { plato: Plato; n: number } => Boolean(l.plato)),
    [carrito],
  );
  const total = totalDe(carrito);
  const listo = lineas.length > 0 && nombre.trim() && (modo === "domicilio" ? direccion.trim() : sucursal);

  if (orden) {
    return (
      <Tarjeta className="mx-auto max-w-[520px] p-6 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--p-arena-honda)]">Pedido recibido</p>
        <p className="mt-2 text-[30px] font-extrabold">#{orden}</p>
        <p className="mt-2 text-[14px] text-[var(--p-tinta-2)]">
          {modo === "domicilio"
            ? "La sucursal más cercana ya lo está preparando. Le avisamos por WhatsApp cuando vaya en camino."
            : `Lo dejamos listo en ${SUCURSALES_CAMPANA.find((s) => s.id === sucursal)?.nombre}. Le avisamos por WhatsApp cuando esté para retirar.`}
        </p>
        <p className="mt-4 rounded-xl bg-[var(--p-arena-suave)] px-3 py-2 text-[12px] text-[var(--p-arena-honda)]">
          Demostración: este pedido no se envió a ninguna sucursal.
        </p>
        <button
          type="button"
          onClick={() => {
            setOrden(null);
            irA("inicio");
          }}
          className="mt-5 rounded-xl bg-[var(--p-azul)] px-4 py-2.5 text-[14px] font-bold text-white"
        >
          Volver al inicio
        </button>
      </Tarjeta>
    );
  }

  if (lineas.length === 0) {
    return (
      <Tarjeta className="mx-auto max-w-[520px] p-6 text-center">
        <ShoppingBag className="mx-auto text-[var(--p-tinta-3)]" size={34} />
        <p className="mt-3 text-[16px] font-bold">Su pedido está vacío</p>
        <p className="mt-1 text-[13px] text-[var(--p-tinta-2)]">Agregue platos desde el menú.</p>
        <button type="button" onClick={() => irA("menu")} className="mt-4 rounded-xl bg-[var(--p-azul)] px-4 py-2.5 text-[14px] font-bold text-white">
          Ver el menú
        </button>
      </Tarjeta>
    );
  }

  const campo =
    "w-full rounded-xl border border-[var(--p-borde-2)] bg-white px-3 py-2.5 text-[15px] text-[var(--p-tinta)] outline-none focus:border-[var(--p-azul)]";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <Tarjeta className="p-4">
          <Titulo texto="¿Cómo quiere recibir su pedido?" />
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["domicilio", "Entrega a domicilio", Bike],
                ["retiro", "Retiro en sucursal", Store],
              ] as const
            ).map(([id, rotulo, Icono]) => (
              <button
                key={id}
                type="button"
                onClick={() => setModo(id)}
                aria-pressed={modo === id}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[14px] font-semibold ${
                  modo === id ? "border-[var(--p-azul)] bg-[var(--p-arena-suave)] text-[var(--p-azul)]" : "border-[var(--p-borde-2)] text-[var(--p-tinta-2)]"
                }`}
              >
                <Icono size={18} /> {rotulo}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-3">
            {modo === "domicilio" ? (
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-[var(--p-tinta-2)]">Dirección y punto de referencia</span>
                <textarea rows={2} value={direccion} onChange={(e) => setDireccion(e.target.value)} className={campo} placeholder="Colonia, calle, número de casa…" />
              </label>
            ) : (
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold text-[var(--p-tinta-2)]">Sucursal de retiro</span>
                <select value={sucursal} onChange={(e) => setSucursal(e.target.value)} className={campo}>
                  <option value="">Seleccione sucursal</option>
                  {SUCURSALES_CAMPANA.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} · abre a las {HORA_APERTURA}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-[var(--p-tinta-2)]">Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} placeholder="¿A nombre de quién?" />
            </label>
            <div>
              <span className="mb-1 block text-[13px] font-semibold text-[var(--p-tinta-2)]">Forma de pago</span>
              <div className="flex gap-2">
                {(["tarjeta", "efectivo"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setPago(f)}
                    aria-pressed={pago === f}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold capitalize ${
                      pago === f ? "bg-[var(--p-azul)] text-white" : "border border-[var(--p-borde-2)] text-[var(--p-tinta-2)]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Tarjeta>
      </div>

      <Tarjeta className="h-fit p-4 lg:sticky lg:top-28">
        <div className="flex items-center justify-between">
          <Titulo texto="Su pedido" />
          <button type="button" onClick={vaciar} className="mb-3 text-[12px] font-semibold text-[var(--p-tinta-3)] underline">
            Vaciar
          </button>
        </div>
        <ul className="divide-y divide-[var(--p-borde)]">
          {lineas.map(({ plato, n }) => (
            <li key={plato.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1">
                <p className="text-[14px] font-semibold leading-snug">{plato.nombre}</p>
                <p className="text-[12px] text-[var(--p-tinta-3)]">{precio(plato.precio)} c/u</p>
              </div>
              <Contador cantidad={n} onMenos={() => cambiar(plato.id, -1)} onMas={() => cambiar(plato.id, 1)} nombre={plato.nombre} />
              <span className="w-16 text-right text-[14px] font-bold">{precio(plato.precio * n)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--p-borde)] pt-3">
          <span className="text-[14px] font-semibold">Total</span>
          <span className="text-[20px] font-extrabold text-[var(--p-azul)]">{precio(total)}</span>
        </div>
        {modo === "domicilio" ? (
          <p className="mt-1 text-[12px] text-[var(--p-tinta-3)]">El costo de envío lo confirma la sucursal.</p>
        ) : null}
        <button
          type="button"
          disabled={!listo}
          onClick={() => {
            setOrden(4800 + Math.floor(Math.random() * 190));
            vaciar();
          }}
          className="mt-4 w-full rounded-xl bg-[var(--p-azul)] py-3 text-[15px] font-bold text-white disabled:bg-[#c9b6a8]"
        >
          Confirmar pedido
        </button>
        <div className="mt-2 flex justify-center">
          <Pastilla>Demo · no se envía a la sucursal</Pastilla>
        </div>
      </Tarjeta>
    </div>
  );
}

/* ───────────────────────────── Sucursales ───────────────────────────── */

function Sucursales() {
  const zonas = Array.from(new Set(SUCURSALES_CAMPANA.map((s) => s.zona)));
  return (
    <div className="space-y-5">
      <Titulo
        texto={`Nuestras ${SUCURSALES_CAMPANA.length} sucursales`}
        bajada={`Pedidos en línea desde las ${HORA_APERTURA} Elija una al confirmar su pedido para retirar.`}
      />
      {zonas.map((z) => (
        <section key={z}>
          <h3 className="mb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--p-arena-honda)]">{z}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SUCURSALES_CAMPANA.filter((s) => s.zona === z).map((s) => (
              <Tarjeta key={s.id} className="flex items-center gap-3 p-3.5">
                <span className="rounded-full bg-[var(--p-arena-suave)] p-2 text-[var(--p-azul)]">
                  <Store size={18} />
                </span>
                <div>
                  <p className="text-[14px] font-bold">{s.nombre}</p>
                  <p className="text-[12px] text-[var(--p-tinta-3)]">Abre a las {HORA_APERTURA}</p>
                </div>
              </Tarjeta>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ───────────────────────────── Chat ─────────────────────────────
   El demo no tiene modelo conectado: Sofía contesta con las respuestas de la
   bandeja en vivo (lib/tenants/simulacion/lacampana.ts). Las sugerencias son
   esas mismas preguntas; lo que se escriba a mano recibe la más parecida. */

function respuestaDemo(texto: string): string {
  const palabras = texto
    .toLowerCase()
    .split(/[^a-záéíóúñü0-9]+/)
    .filter((w) => w.length > 3);
  let mejor = lacampanaSimulacion.turnos[0];
  let puntos = 0;
  for (const turno of lacampanaSimulacion.turnos) {
    const e = turno.entra.toLowerCase();
    const p = palabras.filter((w) => e.includes(w)).length;
    if (p > puntos) {
      puntos = p;
      mejor = turno;
    }
  }
  return mejor.responde;
}

function ChatDemo() {
  const [mensajes, setMensajes] = useState<Array<{ autor: "cliente" | "sofia"; texto: string }>>([]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, escribiendo]);

  function enviar(t: string) {
    const limpio = t.trim();
    if (!limpio || escribiendo) return;
    setMensajes((m) => [...m, { autor: "cliente", texto: limpio }]);
    setTexto("");
    setEscribiendo(true);
    window.setTimeout(() => {
      setMensajes((m) => [...m, { autor: "sofia", texto: respuestaDemo(limpio) }]);
      setEscribiendo(false);
    }, 900);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-230px)] w-full flex-col lg:min-h-[60vh] lg:max-w-[780px]">
      <div className="flex-1 space-y-3">
        {mensajes.length === 0 ? (
          <div className="rounded-2xl border border-[var(--p-borde)] bg-white p-4">
            <p className="text-[15px] font-bold">Hola, soy Sofía</p>
            <p className="mt-1 text-[13.5px] leading-snug text-[var(--p-tinta-2)]">
              Le atiendo de La Campana. Pregúnteme por el menú, las promos, su pedido o nuestras sucursales.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["¿Cuánto cuesta la parrillada para 2?", "¿Tienen tacos de birria?", "Queremos cotizar comida para 40 personas"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="rounded-full border border-[var(--p-borde-2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--p-azul)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {mensajes.map((m, i) => (
          <div key={i} className={m.autor === "cliente" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-snug ${
                m.autor === "cliente"
                  ? "rounded-br-md bg-[var(--p-azul)] text-white"
                  : "rounded-bl-md border border-[var(--p-borde)] bg-white text-[var(--p-tinta)]"
              }`}
            >
              {m.texto}
            </div>
          </div>
        ))}
        {escribiendo ? (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-md border border-[var(--p-borde)] bg-white px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--p-tinta-3)]" style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          </div>
        ) : null}
        <div ref={fin} />
      </div>
      <div className="sticky bottom-[calc(var(--p-nav)+8px)] mt-3 flex items-end gap-2 rounded-2xl border border-[var(--p-borde)] bg-white p-2 lg:bottom-6">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(texto);
            }
          }}
          rows={1}
          placeholder="Escriba su mensaje…"
          className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-[var(--p-tinta)] outline-none placeholder:text-[var(--p-tinta-3)]"
        />
        <button
          type="button"
          onClick={() => enviar(texto)}
          disabled={!texto.trim() || escribiendo}
          aria-label="Enviar"
          className="rounded-xl bg-[var(--p-azul)] p-2.5 text-white disabled:bg-[#c9b6a8]"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────── Piezas ───────────────────────────── */

function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`w-full rounded-2xl border border-[var(--p-borde)] bg-[var(--p-tarjeta)] text-left shadow-[0_1px_2px_rgba(42,23,18,0.04),0_8px_24px_-16px_rgba(42,23,18,0.18)] ${className}`}
    >
      {children}
    </div>
  );
}

function Pastilla({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--p-arena-suave)] px-2.5 py-1 text-[11px] font-semibold text-[var(--p-arena-honda)]">
      {children}
    </span>
  );
}

function Titulo({ texto, bajada }: { texto: string; bajada?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[17px] font-bold tracking-tight text-[var(--p-tinta)]">{texto}</h2>
      {bajada ? <p className="mt-0.5 text-[13px] leading-snug text-[var(--p-tinta-2)]">{bajada}</p> : null}
    </div>
  );
}
