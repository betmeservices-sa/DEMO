-- El consumo de IA de un cliente, agregado EN LA BASE.
--
-- POR QUÉ. El tablero traía las filas a la función y las sumaba en memoria, con
-- un tope: primero 1.000, después 5.000. Las dos veces el número se quedó
-- clavado en el tope y nadie se enteró, porque un contador que dice "5.000"
-- parece un número, no un error. El 21 de septiembre de 2026 Yali tenía 7.021
-- filas en 30 días: la vista de "30 días" mostraba los últimos ~21.
--
-- Subir el tope no arregla nada, solo mueve la fecha en que vuelve a mentir.
-- Contar acá sí: da lo mismo que haya mil filas o un millón, porque lo que
-- viaja es el resultado, no las filas.
--
-- LAS DOS TABLAS. Un cliente con esquema propio (Yali) tiene filas en su
-- esquema Y en public: registrarConsumo escribió en public hasta el 27 de
-- agosto de 2026. Se leen las dos y se unen sin duplicar.
--
-- LA COLUMNA `tipo` NO ESTÁ EN TODAS. Llegó con la medición de transcripciones
-- y hoy existe en el esquema de yali pero no en public. Se mira el catálogo y,
-- donde no está, todo cuenta como 'respuesta', que es lo que era antes de esa
-- migración. Sin esto la función revienta con "column tipo does not exist".
--
-- HORA DE EL SALVADOR. La serie se agrupa en la zona del negocio, no en UTC.
-- Agrupar en UTC corre el corte de las 6 p. m. al día siguiente y el tablero
-- muestra días que no existieron así.

create or replace function public.agencia_consumo(
  p_tenant text,
  p_desde  timestamptz,
  p_hasta  timestamptz,
  p_granularidad text default 'day',
  p_top_conversaciones int default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zona constant text := 'America/El_Salvador';
  v_esquema text;
  v_tipo text;
  v_res jsonb;
begin
  if p_granularidad not in ('hour', 'day') then
    raise exception 'granularidad no soportada: %', p_granularidad;
  end if;

  drop table if exists _filas;
  create temp table _filas (
    ts timestamptz, wa_from text, wa_id text, modelo text,
    input_tokens bigint, output_tokens bigint, cache_w bigint, cache_r bigint,
    imagenes bigint, costo_total numeric, tipo text
  ) on commit drop;

  -- Un recorrido por esquema: el del cliente (si tiene) y public.
  foreach v_esquema in array (
    case when p_tenant = 'yaly' then array['yali', 'public'] else array['public'] end
  ) loop
    -- ¿Existe la tabla en ese esquema? Si no, se salta sin romper.
    if not exists (
      select 1 from information_schema.tables
      where table_schema = v_esquema and table_name = 'ai_uso_tokens'
    ) then
      continue;
    end if;

    -- ¿Y la columna `tipo`? Donde no está, todo es respuesta.
    v_tipo := case when exists (
      select 1 from information_schema.columns
      where table_schema = v_esquema and table_name = 'ai_uso_tokens' and column_name = 'tipo'
    ) then 'coalesce(f.tipo, ''respuesta'')' else '''respuesta''' end;

    execute format($f$
      insert into _filas
      select f.ts, f.wa_from, f.wa_id, f.modelo,
             coalesce(f.input_tokens,0), coalesce(f.output_tokens,0),
             coalesce(f.cache_creation_input_tokens,0), coalesce(f.cache_read_input_tokens,0),
             coalesce(f.imagenes,0), coalesce(f.costo_total,0), %s
      from %I.ai_uso_tokens f
      where f.tenant = $1 and f.ts >= $2 and f.ts < $3
        and not exists (
          select 1 from _filas p
          where p.ts = f.ts
            and coalesce(p.wa_id,'') = coalesce(f.wa_id,'')
            and p.wa_from = f.wa_from
        )
    $f$, v_tipo, v_esquema) using p_tenant, p_desde, p_hasta;
  end loop;

  select jsonb_build_object(
    'totales', (
      select jsonb_build_object(
        'costo', coalesce(sum(costo_total),0),
        'respuestas', count(*) filter (where tipo <> 'transcripcion'),
        -- Solo respuestas, igual que totalesDe(): una transcripcion no abre
        -- conversacion ni suma imagenes.
        'conversaciones', count(distinct wa_from) filter (where tipo <> 'transcripcion'),
        'tokensEntradaSinCache', coalesce(sum(input_tokens),0),
        'tokensCacheEscritura', coalesce(sum(cache_w),0),
        'tokensCacheLectura', coalesce(sum(cache_r),0),
        'tokensSalida', coalesce(sum(output_tokens),0),
        'transcripcionesCantidad', count(*) filter (where tipo = 'transcripcion'),
        'transcripcionesCosto', coalesce(sum(costo_total) filter (where tipo = 'transcripcion'),0),
        'imagenes', coalesce(sum(imagenes) filter (where tipo <> 'transcripcion'),0),
        'respuestasConCache', count(*) filter (where tipo <> 'transcripcion' and cache_r > 0),
        'filas', count(*)
      ) from _filas
    ),
    'canales', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select case
                 when wa_from like 'instagram:%' then 'instagram'
                 when wa_from like 'facebook:%'  then 'facebook'
                 when wa_from ~ '^\+?[0-9]{7,}$' then 'whatsapp'
                 else 'otro'
               end as canal,
               count(*) filter (where tipo <> 'transcripcion') as respuestas,
               count(distinct wa_from) filter (where tipo <> 'transcripcion') as conversaciones,
               sum(costo_total) as costo
        from _filas group by 1 order by 4 desc
      ) x), '[]'::jsonb),
    'serie', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.clave) from (
        select to_char(date_trunc(p_granularidad, ts at time zone v_zona), 'YYYY-MM-DD"T"HH24:MI') as clave,
               count(*) filter (where tipo <> 'transcripcion') as respuestas,
               count(distinct wa_from) filter (where tipo <> 'transcripcion') as conversaciones,
               sum(costo_total) as costo,
               sum(input_tokens + cache_w + cache_r + output_tokens) as tokens
        from _filas
        group by date_trunc(p_granularidad, ts at time zone v_zona)
      ) x), '[]'::jsonb),
    'modelos', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select modelo,
               count(*) filter (where tipo <> 'transcripcion') as respuestas,
               sum(costo_total) as costo
        from _filas group by modelo order by 3 desc
      ) x), '[]'::jsonb),
    -- La LISTA de conversaciones sí se recorta, y es legítimo: es para mostrar,
    -- no para contar. El conteo exacto va en 'totales.conversaciones'.
    'conversaciones', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select wa_from,
               count(*) filter (where tipo <> 'transcripcion') as respuestas,
               sum(costo_total) as costo,
               sum(input_tokens + cache_w + cache_r + output_tokens) as tokens,
               min(ts) as primero, max(ts) as ultimo
        from _filas group by wa_from order by 3 desc limit p_top_conversaciones
      ) x), '[]'::jsonb)
  ) into v_res;

  drop table if exists _filas;
  return v_res;
end;
$$;

comment on function public.agencia_consumo is
  'Consumo de IA de un cliente en una ventana, agregado en la base. Sustituye a leer las filas y sumarlas en memoria, que tenía un tope y mentía al pasarlo.';
