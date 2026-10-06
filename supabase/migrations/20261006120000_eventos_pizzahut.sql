-- Tablero de eventos de Pizza Hut: lo que deja cada llamada de Daniela (la
-- agente de voz), las propuestas reales y lo que el equipo hace encima.
--
-- La muestra del demo NO vive aquí: se genera en el servidor, relativa a hoy.
-- Aquí va lo real y los movimientos (etapa, notas, asesor) de cualquier
-- propuesta, sea de muestra o real.
--
-- Solo el servidor lee y escribe, con la llave secreta (salta RLS). RLS
-- encendido y SIN policies: la llave publicable no ve ni una fila. Son datos
-- de contacto de personas reales.
--
-- Idempotente: se puede correr dos veces.

create table if not exists public.eventos_llamadas (
  id text primary key,                 -- id de la llamada en la plataforma de voz
  tenant text not null default 'pizzahut',
  assistant_id text,
  numero text,                         -- el que llamó, tal como llegó
  inicio timestamptz not null,
  fin timestamptz not null,
  duracion_seg integer not null default 0,
  resumen text,
  transcripcion text,
  motivo text,                         -- propuesta | pedido | sucursal | seguimiento | proveedor | equivocado | otro
  es_propuesta boolean not null default false,
  propuesta_id text,
  datos jsonb not null default '{}'::jsonb,  -- el structuredData tal como llegó
  grabacion_urls jsonb not null default '[]'::jsonb,
  grabacion_path text,                 -- copia propia en el bucket eventos-grabaciones
  prueba boolean not null default false,
  recibido timestamptz not null default now()
);

create index if not exists eventos_llamadas_tenant_inicio on public.eventos_llamadas (tenant, inicio desc);

create table if not exists public.eventos_propuestas (
  id text primary key,                 -- ph-<id de la llamada>
  tenant text not null default 'pizzahut',
  llamada_id text unique,
  canal text not null default 'llamada',
  creada timestamptz not null,
  datos jsonb not null,                -- el contrato normalizado (DatosEvento)
  resumen text,
  asesor_id text not null,
  prueba boolean not null default false,
  recibido timestamptz not null default now()
);

create index if not exists eventos_propuestas_tenant_creada on public.eventos_propuestas (tenant, creada desc);

create table if not exists public.eventos_movimientos (
  id text primary key,
  tenant text not null default 'pizzahut',
  propuesta_id text not null,          -- s01..s31 (muestra) o ph-<id> (real)
  tipo text not null check (tipo in ('etapa', 'nota', 'asesor', 'contactado', 'dato')),
  valor jsonb not null default '{}'::jsonb,
  actor text not null,
  ts timestamptz not null default now()
);

create index if not exists eventos_movimientos_tenant_ts on public.eventos_movimientos (tenant, ts);
create index if not exists eventos_movimientos_propuesta on public.eventos_movimientos (propuesta_id);

alter table public.eventos_llamadas enable row level security;
alter table public.eventos_propuestas enable row level security;
alter table public.eventos_movimientos enable row level security;

revoke all on public.eventos_llamadas from anon, authenticated;
revoke all on public.eventos_propuestas from anon, authenticated;
revoke all on public.eventos_movimientos from anon, authenticated;

-- El audio de cada llamada, copiado antes de que la plataforma de voz lo
-- borre (14 días). Bucket privado: se sirve con URL firmada desde el servidor.
insert into storage.buckets (id, name, public)
values ('eventos-grabaciones', 'eventos-grabaciones', false)
on conflict (id) do nothing;
