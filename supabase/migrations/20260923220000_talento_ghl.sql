-- Resultado de marcar en GHL la decision sobre un candidato (tag de
-- aprobado / rechazado). Va en su propia columna y no dentro de `perfil`:
-- el panel reescribe `perfil` entero al guardar, y pisaria este resultado,
-- que lo escribe el servidor despues de hablar con GHL.
alter table public.talento_candidatos add column if not exists ghl jsonb;
