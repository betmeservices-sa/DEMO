-- La cola de recordatorios de WhatsApp tras la llamada de CrediQ.
--
-- POR QUÉ EXISTE. Antes esto era un cron de Vercel corriendo `* * * * *`: cada
-- minuto, hubiera llamadas o no, recorría TODAS las conversaciones de Grupo Q
-- preguntando si alguien cumplía el minuto de espera. Casi siempre la respuesta
-- era no. Eran ~86.000 ejecuciones al mes, y como los proyectos grupo-q-yoim y
-- grupo-q-docs despliegan el MISMO repo, corría dos veces en paralelo.
--
-- Ahora el disparador es la llamada: al colgar se agenda UNA fila con la hora
-- exacta en que toca escribir. Quien vigila el reloj es Postgres, que ya está
-- encendido y no cobra por consultarse a sí mismo, y solo despierta a Vercel
-- cuando de verdad hay algo que mandar. Sin llamadas, no se ejecuta nada.
--
-- El minuto de espera deja de ser aproximado: antes caía entre 1 y 2 minutos
-- (dependía de cuándo pasara el barrido), ahora cae en el minuto pedido.

create table if not exists public.recordatorios_agendados (
  id           bigserial primary key,
  tenant       text        not null,
  telefono     text        not null,
  -- Cuándo toca escribirle. Es la hora exacta, no un rango.
  enviar_a     timestamptz not null,
  creado       timestamptz not null default now(),
  -- Se marca SIEMPRE que se intenta, haya salido o no. El motivo queda acá para
  -- poder auditar sin abrir los logs de Vercel.
  procesado_ts timestamptz,
  resultado    text
);

-- El índice que usa el vigía: solo mira lo pendiente y vencido, así la consulta
-- cada minuto es barata aunque la tabla crezca.
create index if not exists recordatorios_agendados_pendientes
  on public.recordatorios_agendados (enviar_a)
  where procesado_ts is null;

-- UNA fila viva por número y tenant. Si la persona llama dos veces seguidas, la
-- segunda llamada reemplaza la cita anterior en vez de encolar dos mensajes.
create unique index if not exists recordatorios_agendados_uno_vivo
  on public.recordatorios_agendados (tenant, telefono)
  where procesado_ts is null;

comment on table public.recordatorios_agendados is
  'Citas para el recordatorio de WhatsApp tras la llamada. Las crea el webhook de fin de llamada; las consume /api/cron/plantilla-recordatorio, al que despierta pg_cron solo cuando hay filas vencidas.';
