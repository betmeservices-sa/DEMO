-- Cada panel (tenant) es independiente.
--
-- Hasta hoy tres cosas se guardaban SIN tenant y cruzaban de un panel a otro:
--   * ai_paused (wa_from): encender o apagar la IA en el chat de una persona
--     la cambiaba en TODOS los paneles donde esa persona escribe. Asi Mia le
--     contesto a un telefono en el numero comercial, que tenia la IA apagada,
--     porque una prueba en otro panel la habia encendido para ese telefono.
--   * ai_config (fila 1): el "Modo IA" de arriba era uno solo para toda la demo.
--   * wa_conversaciones (wa_from): resolver o asignar un chat en un panel lo
--     resolvia o asignaba en todos, y la ruta devolvia los de todos.
--
-- Tablas nuevas con tenant en la llave. Las viejas NO se borran: quedan como
-- respaldo y el codigo ya no las lee.

create table if not exists public.ai_chat (
  tenant     text not null,
  wa_from    text not null,
  activa     boolean not null,
  updated_at timestamptz not null default now(),
  primary key (tenant, wa_from)
);

create table if not exists public.ai_config_tenant (
  tenant     text primary key,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.wa_conversacion_estado (
  tenant       text not null,
  wa_from      text not null,
  asignado_a   text,
  estado       text,
  departamento text,
  updated_at   timestamptz not null default now(),
  primary key (tenant, wa_from)
);

-- Mismo acceso que el resto de las tablas del panel (la app entra con la llave
-- publica desde el servidor).
alter table public.ai_chat enable row level security;
alter table public.ai_config_tenant enable row level security;
alter table public.wa_conversacion_estado enable row level security;
drop policy if exists "anon todo" on public.ai_chat;
drop policy if exists "anon todo" on public.ai_config_tenant;
drop policy if exists "anon todo" on public.wa_conversacion_estado;
create policy "anon todo" on public.ai_chat for all to anon using (true) with check (true);
create policy "anon todo" on public.ai_config_tenant for all to anon using (true) with check (true);
create policy "anon todo" on public.wa_conversacion_estado for all to anon using (true) with check (true);
grant select, insert, update, delete on public.ai_chat, public.ai_config_tenant, public.wa_conversacion_estado
  to anon, authenticated, service_role;

-- ── Copia de lo que habia ──
-- Para que ninguna demo cambie de comportamiento hoy, cada ajuste viejo se
-- copia a CADA panel donde esa persona ya tiene mensajes. De aqui en adelante
-- cada copia cambia por su lado. Se puede correr de nuevo sin pisar nada
-- (on conflict do nothing): lo que el codigo nuevo ya escribio, manda.

-- IA por chat de WhatsApp (wa_from = telefono).
insert into public.ai_chat (tenant, wa_from, activa, updated_at)
select distinct m.tenant, p.wa_from, p.activa, p.created_at
from public.ai_paused p
join public.wa_messages m on m.wa_from = p.wa_from
where m.tenant is not null and p.wa_from ~ '^[0-9]+$'
on conflict do nothing;

-- IA por chat de Messenger e Instagram (wa_from = "canal:pagina:persona"): el
-- panel es el de la pagina.
insert into public.ai_chat (tenant, wa_from, activa, updated_at)
select distinct c.tenant, p.wa_from, p.activa, p.created_at
from public.ai_paused p
join public.meta_connections c on c.page_id = split_part(p.wa_from, ':', 2)
where p.wa_from like '%:%:%'
on conflict do nothing;

-- Modo IA: cada panel arranca con lo que tenia el global.
insert into public.ai_config_tenant (tenant, enabled)
select t.tenant, coalesce((select enabled from public.ai_config where id = 1), false)
from (
  select distinct tenant from public.wa_messages where tenant is not null
  union select distinct tenant from public.wa_connections
  union select distinct tenant from public.meta_connections
) t
on conflict do nothing;

-- Estado, asignacion y departamento de cada chat.
insert into public.wa_conversacion_estado (tenant, wa_from, asignado_a, estado, departamento, updated_at)
select distinct on (m.tenant, c.wa_from) m.tenant, c.wa_from, c.asignado_a, c.estado, c.departamento, c.updated_at
from public.wa_conversaciones c
join public.wa_messages m on m.wa_from = c.wa_from
where m.tenant is not null
on conflict do nothing;

-- Yali guarda sus mensajes y sus paginas en el esquema `yali`: sus ajustes van
-- al panel de Yali con el tenant que diga su propia tabla.
insert into public.ai_chat (tenant, wa_from, activa, updated_at)
select distinct coalesce(y.tenant, 'yaly'), p.wa_from, p.activa, p.created_at
from public.ai_paused p
join yali.wa_messages y on y.wa_from = p.wa_from
where p.wa_from ~ '^[0-9]+$'
on conflict do nothing;

insert into public.ai_chat (tenant, wa_from, activa, updated_at)
select distinct c.tenant, p.wa_from, p.activa, p.created_at
from public.ai_paused p
join yali.meta_connections c on c.page_id = split_part(p.wa_from, ':', 2)
where p.wa_from like '%:%:%'
on conflict do nothing;
