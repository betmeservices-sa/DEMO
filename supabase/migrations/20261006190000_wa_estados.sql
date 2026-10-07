-- Lo que Meta avisa de cada mensaje que mandamos: enviado, entregado, leído o
-- fallido.
--
-- POR QUÉ EXISTE. Meta acepta el envío de una plantilla y devuelve su id aunque
-- después no la pueda entregar (el 2026-10-06 la cuenta de WhatsApp de Nissan
-- estaba bloqueada por el método de pago y el panel mostraba como enviadas
-- plantillas que nunca llegaron). La entrega real llega después, en el campo
-- `statuses` del webhook, y hasta ahora se descartaba. Con esta tabla se puede
-- confirmar que un mensaje llegó, o ver por qué no.

create table if not exists public.wa_estados (
  -- El id que devolvió Meta al enviar (wamid), el mismo de wa_messages.wa_id.
  wa_id         text        not null,
  -- sent | delivered | read | failed
  estado        text        not null,
  -- Cuándo pasó, según Meta.
  ts            timestamptz not null,
  destinatario  text,
  tenant        text,
  error_codigo  integer,
  error_titulo  text,
  recibido      timestamptz not null default now(),
  primary key (wa_id, estado)
);

create index if not exists wa_estados_destinatario on public.wa_estados (destinatario, ts desc);

comment on table public.wa_estados is
  'Estados de entrega de los mensajes salientes de WhatsApp (sent/delivered/read/failed), tal como los avisa Meta en el webhook.';
