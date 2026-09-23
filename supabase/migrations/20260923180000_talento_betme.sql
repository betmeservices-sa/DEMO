-- Centro de reclutamiento de BetMe: candidatos REALES del formulario de
-- carreras, su estado en el pipeline y la decision Aprobado / Rechazado.
--
-- Solo el servidor lee y escribe (con la llave secreta, que salta RLS). RLS
-- encendido y SIN policies: la llave publicable (anon) no ve ni una fila.
-- Son datos personales de gente real; el panel los pide con sesion.
--
-- Idempotente: se puede correr dos veces.

create table if not exists public.talento_candidatos (
  id text primary key,
  tenant text not null default 'betme',
  -- En minusculas. Es la llave de "ya aplico antes".
  email text,
  -- El perfil completo tal como lo usa el panel (tipo Candidato).
  perfil jsonb not null,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

create unique index if not exists talento_candidatos_tenant_email
  on public.talento_candidatos (tenant, email)
  where email is not null;

create table if not exists public.talento_postulaciones (
  id text primary key,
  tenant text not null default 'betme',
  candidato_id text not null references public.talento_candidatos(id) on delete cascade,
  vacante_id text,
  -- La postulacion completa (etapa, historial, motivo), tipo Postulacion.
  datos jsonb not null,
  creada timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

create index if not exists talento_postulaciones_candidato on public.talento_postulaciones (candidato_id);

-- Cada envio del formulario, tal como llego. Si alguien reaplica, su perfil
-- se actualiza y aca queda el envio nuevo.
create table if not exists public.talento_envios (
  id bigserial primary key,
  tenant text not null default 'betme',
  candidato_id text references public.talento_candidatos(id) on delete cascade,
  email text,
  puesto text,
  origen text,
  payload jsonb not null,
  recibido timestamptz not null default now()
);

create index if not exists talento_envios_candidato on public.talento_envios (candidato_id);

alter table public.talento_candidatos enable row level security;
alter table public.talento_postulaciones enable row level security;
alter table public.talento_envios enable row level security;

revoke all on public.talento_candidatos from anon, authenticated;
revoke all on public.talento_postulaciones from anon, authenticated;
revoke all on public.talento_envios from anon, authenticated;
revoke all on sequence public.talento_envios_id_seq from anon, authenticated;
