-- Permite guardar el monto exacto en Bs de una transacción.
-- `amount` sigue siendo el valor en la moneda global (USD) para que los totales
-- no cambien; `bs_amount` es NULL cuando la transacción se registró en USD.
-- Ejecutar este script en el SQL Editor de Supabase.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS bs_amount numeric
  CHECK (bs_amount IS NULL OR bs_amount > 0);

NOTIFY pgrst, 'reload schema';
