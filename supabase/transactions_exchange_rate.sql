-- ⚠️ Histórico: reemplazado por transactions_required_rate.sql (columnas obligatorias).
-- Guarda la tasa Bs/USD vigente al registrar cada transacción, para poder
-- estimar cuántos Bs se gastaron en el tiempo aunque la tasa cambie.
-- En transacciones en Bs se cumple amount * exchange_rate = bs_amount.
-- Ejecutar este script en el SQL Editor de Supabase.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS exchange_rate numeric
  CHECK (exchange_rate IS NULL OR exchange_rate > 0);

-- Backfill: solo las transacciones registradas en Bs (tasa implícita exacta).
UPDATE transactions
  SET exchange_rate = bs_amount / amount
  WHERE exchange_rate IS NULL AND bs_amount IS NOT NULL AND amount > 0;

NOTIFY pgrst, 'reload schema';
