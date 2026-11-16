-- ==============================================================================
-- 04. TASA Y MONTO EN BS OPCIONALES
-- ==============================================================================
-- Correr DESPUÉS de 03_transactions_required_rate.sql.
--
-- amount sigue siendo obligatorio; exchange_rate y bs_amount vuelven a ser
-- opcionales para transacciones 100% en dólares (comisiones PayPal, Zelle...).
-- Reglas:
--   - exchange_rate y bs_amount van juntos: los dos o ninguno.
--   - Una transacción digitada en Bs (input_currency = 'VES') siempre los tiene.
-- ==============================================================================

BEGIN;

ALTER TABLE transactions
  ALTER COLUMN exchange_rate DROP NOT NULL,
  ALTER COLUMN bs_amount DROP NOT NULL;

-- Comisiones PayPal (categoría 41): egresos 100% en dólares, sin tasa ni Bs.
UPDATE transactions
SET exchange_rate = NULL, bs_amount = NULL, input_currency = 'USD'
WHERE category_id = 41;

-- Los CHECK (> 0) existentes ya aceptan NULL; se agrega la coherencia entre columnas.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_bs_consistency_check;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_bs_consistency_check CHECK (
    (exchange_rate IS NULL) = (bs_amount IS NULL)
    AND (input_currency = 'USD' OR bs_amount IS NOT NULL)
  );

COMMIT;

NOTIFY pgrst, 'reload schema';

