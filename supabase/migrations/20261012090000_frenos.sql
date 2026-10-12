-- Frenos compartidos entre instancias: cuántas veces pasó algo por una clave
-- (una IP, un correo) en una ventana, y hasta cuándo está bloqueada.
--
-- Antes el freno del login y el de las rutas públicas vivían en un Map del
-- proceso. En Vercel cada instancia tiene el suyo y se reinicia solo, así que
-- no frenaba a nadie con paciencia. Acá la cuenta es una sola para todos.
--
-- Sin políticas: solo la llave secreta del servidor la ve.

create table if not exists public.frenos (
  clave text primary key,
  cuenta integer not null default 0,
  ventana_desde timestamptz not null default now(),
  bloqueado_hasta timestamptz,
  actualizado timestamptz not null default now()
);

alter table public.frenos enable row level security;

-- Un golpe más sobre la clave, de forma atómica: si la ventana ya venció, la
-- cuenta arranca de nuevo en 1. Devuelve cómo queda la fila. De paso borra
-- filas viejas de vez en cuando para que la tabla no crezca sin fin.
create or replace function public.freno_tocar(p_clave text, p_ventana_seg integer)
returns table (cuenta integer, bloqueado_hasta timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if random() < 0.02 then
    delete from public.frenos
      where actualizado < now() - interval '2 days'
        and (public.frenos.bloqueado_hasta is null or public.frenos.bloqueado_hasta < now());
  end if;

  insert into public.frenos as f (clave, cuenta, ventana_desde, actualizado)
  values (p_clave, 1, now(), now())
  on conflict (clave) do update set
    cuenta = case
      when f.ventana_desde < now() - make_interval(secs => p_ventana_seg) then 1
      else f.cuenta + 1
    end,
    ventana_desde = case
      when f.ventana_desde < now() - make_interval(secs => p_ventana_seg) then now()
      else f.ventana_desde
    end,
    actualizado = now();

  return query
    select f.cuenta, f.bloqueado_hasta from public.frenos f where f.clave = p_clave;
end;
$$;

revoke all on function public.freno_tocar(text, integer) from public, anon, authenticated;
grant execute on function public.freno_tocar(text, integer) to service_role;
