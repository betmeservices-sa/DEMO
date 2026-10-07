-- Lo que se hablo por telefono, para que el agente de WhatsApp del MISMO panel
-- lo sepa (en el panel comercial, la Sofia de voz y la de WhatsApp son una sola).
-- Ultima llamada de cada telefono en cada panel. Ver lib/llamada-contexto.ts.
create table if not exists public.llamada_contexto (
  tenant      text not null,
  telefono    text not null,
  call_id     text,
  resumen     text,
  transcript  text,
  actualizado timestamptz not null default now(),
  primary key (tenant, telefono)
);
alter table public.llamada_contexto enable row level security;
drop policy if exists "anon todo" on public.llamada_contexto;
create policy "anon todo" on public.llamada_contexto for all to anon using (true) with check (true);
grant select, insert, update, delete on public.llamada_contexto to anon, authenticated, service_role;
