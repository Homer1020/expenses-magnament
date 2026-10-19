-- ⚠️ Histórico: reemplazado por transactions_required_rate.sql (columnas obligatorias).
-- Agrega la columna bs_amount si hace falta y rellena el equivalente histórico
-- solo cuando la transacción ya tiene exchange_rate válido.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS bs_amount numeric
  CHECK (bs_amount IS NULL OR bs_amount > 0);

UPDATE transactions
SET bs_amount = amount * exchange_rate
WHERE bs_amount IS NULL
  AND exchange_rate IS NOT NULL
  AND exchange_rate > 0
  AND amount > 0;

SELECT count(*) AS sin_bs_amount
FROM transactions
WHERE bs_amount IS NULL;
