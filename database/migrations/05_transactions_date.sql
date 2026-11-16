-- ==============================================================================
-- 05. CAMPO FECHA REAL DE TRANSACCIÓN (tipo DATE)
-- ==============================================================================
-- 1. Agrega la columna `date` (tipo DATE, solo fecha: YYYY-MM-DD) si no existe.
--    Mantiene intacto `created_at` como la fecha y hora de registro en el sistema.
-- 2. Si `date` ya existía con otro tipo (ej. timestamptz o text), la convierte a DATE.
-- 3. Rellena las transacciones existentes que no tengan fecha usando la fecha de creación (created_at::date).
-- 4. Establece como valor por defecto CURRENT_DATE y la marca como NOT NULL.
-- ==============================================================================

DO $$
BEGIN
  -- 1. Si la columna 'date' no existe, agregarla como DATE con valor por defecto la fecha actual
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'date'
  ) THEN
    ALTER TABLE transactions ADD COLUMN date date DEFAULT CURRENT_DATE;
  ELSE
    -- Si ya existía con otro tipo de dato, asegurar la conversión limpia a DATE
    ALTER TABLE transactions ALTER COLUMN date TYPE date USING date::date;
    ALTER TABLE transactions ALTER COLUMN date SET DEFAULT CURRENT_DATE;
  END IF;

  -- 2. Backfill: Si existen filas históricas con date NULL, asignarles la fecha de created_at
  UPDATE transactions
  SET date = created_at::date
  WHERE date IS NULL;

  -- 3. Asegurar restricción NOT NULL
  ALTER TABLE transactions ALTER COLUMN date SET NOT NULL;

  RAISE NOTICE '✅ Columna date (tipo DATE) configurada con éxito en transactions.';
END $$;

NOTIFY pgrst, 'reload schema';

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name IN ('date', 'created_at');

