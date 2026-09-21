-- Quién despierta la cola de recordatorios.
--
-- LA PARTE QUE FALTABA. La migración 20260921120000 dejó escrito que "lo
-- despierta pg_cron", y pg_cron no estaba instalado. O sea: el barrido de
-- Vercel se quitó y no quedó nada llamando a la ruta. La cola se llenaba y
-- nadie la vaciaba. Esto lo pone de verdad.
--
-- POR QUÉ POSTGRES Y NO VERCEL. Un cron de Vercel cada minuto son ~43.000
-- invocaciones al mes por proyecto, se llame o no a alguien, y este repo se
-- despliega en dos proyectos: eran ~86.000. Postgres ya está encendido, mirar
-- un índice suyo no cuesta nada, y solo levanta a Vercel cuando de verdad hay
-- una cita vencida. Sin llamadas en el día, cero invocaciones.
--
-- EL `where exists` ES EL AHORRO ENTERO, no un detalle: sin él, esto sería el
-- mismo barrido de antes con otro reloj. `net.http_get` solo se ejecuta si la
-- consulta devuelve fila, y la consulta usa el índice parcial de pendientes.
--
-- EL SECRETO NO VA ACÁ. Vive en el vault del proyecto bajo el nombre
-- `cola_secret` y tiene que coincidir con la variable COLA_SECRET de Vercel.
-- Para (re)crearlo, con el valor nuevo:
--
--   select vault.create_secret('<el valor>', 'cola_secret', 'Bearer de /api/cron/plantilla-recordatorio');
--
-- CRON_SECRET no sirve para esto: está marcada "sensitive" en Vercel y su
-- valor no se puede volver a leer, así que compartirla obligaba a rotarla, y
-- rotarla se lleva por delante a los otros crons que la usan.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('cola-recordatorios')
where exists (select 1 from cron.job where jobname = 'cola-recordatorios');

select cron.schedule(
  'cola-recordatorios',
  '* * * * *',
  $vigia$
  select net.http_get(
    url := 'https://demo.miagentia.com/api/cron/plantilla-recordatorio',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cola_secret')
    ),
    timeout_milliseconds := 20000
  )
  where exists (
    select 1
    from public.recordatorios_agendados
    where procesado_ts is null
      and enviar_a <= now()
  );
  $vigia$
);

comment on table public.recordatorios_agendados is
  'Citas para el WhatsApp que sale un rato después de la llamada. Las crea el webhook de fin de llamada; las consume /api/cron/plantilla-recordatorio, al que despierta el job pg_cron "cola-recordatorios" SOLO cuando hay filas vencidas.';
