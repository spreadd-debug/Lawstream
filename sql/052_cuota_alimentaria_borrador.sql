-- 052 · cuotas_alimentarias — estado 'borrador' (canasta de gastos previa)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- En la entrevista inicial / instrucción del caso el abogado todavía no
-- pidió cuota — está cargando los gastos reales del hijo (colegio,
-- actividades, salud) para fundar después un pedido de cuota provisoria.
-- Ese trabajo previo NO es una cuota fijada, pero el modelo actual
-- exige que estado ∈ {provisoria, definitiva, modificada, extinguida},
-- así que no había manera de representarlo sin "ensuciar" el historial
-- con cuotas falsas.
--
-- Agregamos 'borrador' como quinto valor: representa una canasta de
-- gastos en construcción. Cuando el abogado convierte el trabajo previo
-- en pedido formal, muta a 'provisoria' (o 'definitiva') desde el panel
-- y los conceptos en especie ya cargados quedan asociados.
--
-- ⚠️ Idempotente. Drop + recreate del CHECK porque PostgreSQL no permite
-- ALTER ... ADD VALUE en CHECK constraints (sólo en ENUMs nativos).

-- 1. Drop del CHECK viejo (si existe).
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'cuotas_alimentarias'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%estado%IN%provisoria%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE cuotas_alimentarias DROP CONSTRAINT %I', v_constraint_name);
    RAISE NOTICE '[052] CHECK viejo de estado eliminado: %', v_constraint_name;
  ELSE
    RAISE NOTICE '[052] No se encontró CHECK viejo de estado — asumiendo idempotencia.';
  END IF;
END $$;

-- 2. Recrear con 'borrador' incluido.
ALTER TABLE cuotas_alimentarias
  ADD CONSTRAINT cuotas_alimentarias_estado_check
  CHECK (estado IN ('borrador', 'provisoria', 'definitiva', 'modificada', 'extinguida'));

-- 3. Actualizar comentario (si la columna no lo tiene, lo agrega).
COMMENT ON COLUMN cuotas_alimentarias.estado IS
  'Estado del régimen alimentario:
   - borrador     → canasta de gastos en construcción, pre-pedido (GAP UX-29).
   - provisoria   → fijada por incidente o medida cautelar mientras dura el juicio.
   - definitiva   → fijada por sentencia.
   - modificada   → surge de un incidente de aumento/reducción posterior.
   - extinguida   → ya no rige (hijo cumplió 25, falleció obligado, etc.).';

-- 4. Diagnóstico
SELECT
  estado,
  COUNT(*)::TEXT AS cantidad
FROM cuotas_alimentarias
GROUP BY estado
ORDER BY estado;
