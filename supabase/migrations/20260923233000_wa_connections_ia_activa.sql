-- El interruptor de la IA de CADA número de WhatsApp conectado.
--
-- El interruptor global (ai_config, una sola fila) prende o apaga a los
-- agentes de TODOS los clientes del panel a la vez. Para encender a Mia en el
-- número propio de MiAgentIA (+503 6970 6697) sin prender a los demás hace
-- falta uno por número, igual que `ia_activa` de las páginas de Meta.
--
-- null = sigue el global (lo de siempre). true/false manda por encima del
-- global. El override de cada chat (ai_paused) sigue mandando sobre todo.

alter table public.wa_connections add column if not exists ia_activa boolean;

-- El mismo esquema en yali: el webhook busca el número en todos los esquemas
-- y lee las mismas columnas; sin la columna, esa consulta fallaría.
alter table yali.wa_connections add column if not exists ia_activa boolean;
