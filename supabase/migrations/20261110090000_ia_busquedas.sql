-- Lo que el agente busca en la base de su cliente, búsqueda por búsqueda.
--
-- Para el dashboard del laboratorio (10/11/2026): "de qué preguntan" sale de
-- acá. Es lo que Valeria entendió que le pidieron, incluidos los exámenes que
-- leyó en la foto de una orden, que en el texto del chat no aparecen. Clasificar
-- el texto crudo de los mensajes daba falsos ("tengo media hora esperando"
-- caía en el test de O'Sullivan).
--
-- resultados: los primeros resultados de la búsqueda, [{tipo, id, nombre, score}].
-- Vacío = lo que preguntaron no está en la base.
--
-- Sin políticas: solo la llave secreta del servidor la ve.

create table if not exists public.ia_busquedas (
  id bigserial primary key,
  tenant text not null,
  wa_from text not null,
  consulta text not null,
  resultados jsonb not null default '[]'::jsonb,
  creado timestamptz not null default now()
);

create index if not exists ia_busquedas_tenant_creado on public.ia_busquedas (tenant, creado desc);

alter table public.ia_busquedas enable row level security;
