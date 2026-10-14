-- Las corridas de la demo "alta de un número en vivo".
--
-- Hace falta una tabla y no memoria porque las dos mitades del flujo son
-- funciones serverless distintas: la pantalla pregunta por una ruta y el código
-- lo trae el webhook que llama Vapi cuando el agente lo oyó. En memoria, cada
-- una vería su propio proceso y la pantalla nunca se enteraría del código.

create table if not exists public.alta_numero_corridas (
  id text primary key,
  tenant text not null,
  numero text not null,
  phone_number_id text,
  paso text not null,
  estado text not null,
  codigo text,
  oido text,
  error text,
  iniciado_en timestamptz not null default now(),
  terminado_en timestamptz,
  marcas jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

-- El webhook del agente llega con la línea, no con el id de la corrida: busca
-- la corrida viva de ese número.
create index if not exists alta_numero_corridas_numero_idx
  on public.alta_numero_corridas (numero, iniciado_en desc);

create index if not exists alta_numero_corridas_tenant_idx
  on public.alta_numero_corridas (tenant, iniciado_en desc);

alter table public.alta_numero_corridas enable row level security;

-- Sin políticas a propósito: solo el servidor con la llave secreta. Acá queda
-- el código de verificación de un número, que no tiene por qué ver un navegador.
revoke all on table public.alta_numero_corridas from anon, authenticated;
