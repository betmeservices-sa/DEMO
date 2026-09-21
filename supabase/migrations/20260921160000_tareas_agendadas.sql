-- La cola de citas se generaliza: ya no es solo el recordatorio de CrediQ.
--
-- POR QUÉ. Aparecieron tres cosas que son la misma: "hacer algo dentro de N
-- minutos". El recordatorio de WhatsApp de CrediQ, la plantilla de Nissan al
-- minuto de colgar, y la llamada que alguien pide por escrito ("llámeme en 5
-- minutos"). Tres mecanismos distintos serían tres relojes que mantener; uno
-- solo con un campo `tipo` es una tabla, un vigía y un endpoint.
--
-- EL TIPO DECIDE QUÉ SE HACE. `plantilla` manda un WhatsApp aprobado;
-- `llamada` marca por Vapi. Lo que cada uno necesita (qué plantilla, con qué
-- agente) va en `datos`, que es libre a propósito: el día que aparezca un
-- tercer tipo no hay que migrar la tabla otra vez.

alter table public.recordatorios_agendados
  add column if not exists tipo text not null default 'plantilla',
  add column if not exists datos jsonb not null default '{}'::jsonb;

-- El índice de "una viva por número" pasa a ser por TIPO: una persona puede
-- tener a la vez una plantilla agendada y una llamada de vuelta, y son cosas
-- distintas. Sin esto, agendar la llamada borraría la plantilla.
drop index if exists public.recordatorios_agendados_uno_vivo;
create unique index if not exists recordatorios_agendados_uno_vivo
  on public.recordatorios_agendados (tenant, telefono, tipo)
  where procesado_ts is null;

comment on column public.recordatorios_agendados.tipo is
  'plantilla = mandar un WhatsApp aprobado; llamada = marcar por Vapi.';
comment on column public.recordatorios_agendados.datos is
  'Lo que ese tipo necesita: nombre de la plantilla y variables, o el agente y la línea con que devolver la llamada.';
