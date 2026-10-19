-- ==============================================================================
-- AMOUNT, EXCHANGE_RATE Y BS_AMOUNT OBLIGATORIOS
-- Reemplaza a transactions_exchange_rate.sql y transactions_bs_amount.sql.
--
-- 1. Agrega input_currency ('USD' | 'VES'): moneda en que se digitó la transacción.
--    Antes se deducía de bs_amount IS NOT NULL; ahora bs_amount siempre tiene valor.
-- 2. Rellena las tasas vacías:
--    a. bs_amount / amount (tasa exacta de las registradas en Bs).
--    b. Tasa de la transacción del mismo usuario con fecha más cercana.
--    c. fallback_rate (abajo) para usuarios sin ninguna tasa registrada.
-- 3. Rellena bs_amount = amount * exchange_rate.
-- 4. Hace NOT NULL las tres columnas.
--
-- Ejecutar en el SQL Editor de Supabase. Si algo falla no se aplica nada.
-- ==============================================================================

DO $$
DECLARE
  -- 👉 Tasa Bs/USD por defecto para transacciones sin ninguna referencia.
  --    Déjala en NULL si crees que no hace falta: el script avisará si sí.
  fallback_rate numeric := NULL;
  remaining int;
BEGIN
  -- 1. Moneda de origen (antes de rellenar bs_amount) ---------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'input_currency'
  ) THEN
    ALTER TABLE transactions
      ADD COLUMN input_currency text NOT NULL DEFAULT 'USD'
      CHECK (input_currency IN ('USD', 'VES'));

    UPDATE transactions SET input_currency = 'VES' WHERE bs_amount IS NOT NULL;
  END IF;

  -- 2a. Tasa implícita de las registradas en Bs --------------------------------
  UPDATE transactions
  SET exchange_rate = bs_amount / amount
  WHERE exchange_rate IS NULL AND bs_amount > 0 AND amount > 0;

  -- 2b. Tasa de la transacción más cercana en fecha del mismo usuario ----------
  UPDATE transactions t
  SET exchange_rate = nearest.exchange_rate
  FROM (
    SELECT t1.id, (
      SELECT t2.exchange_rate
      FROM transactions t2
      WHERE t2.user_id = t1.user_id
        AND t2.exchange_rate IS NOT NULL
      ORDER BY abs(extract(epoch FROM t2.date::timestamptz) - extract(epoch FROM t1.date::timestamptz))
      LIMIT 1
    ) AS exchange_rate
    FROM transactions t1
    WHERE t1.exchange_rate IS NULL
  ) nearest
  WHERE t.id = nearest.id AND nearest.exchange_rate IS NOT NULL;

  -- 2c. Tasa por defecto --------------------------------------------------------
  IF fallback_rate IS NOT NULL THEN
    UPDATE transactions SET exchange_rate = fallback_rate WHERE exchange_rate IS NULL;
  END IF;

  SELECT count(*) INTO remaining FROM transactions WHERE exchange_rate IS NULL;
  IF remaining > 0 THEN
    RAISE EXCEPTION '⚠️ % transacciones siguen sin tasa (usuarios sin ninguna tasa registrada). Define fallback_rate al inicio del script.', remaining;
  END IF;

  -- 3. Equivalente en Bs --------------------------------------------------------
  UPDATE transactions
  SET bs_amount = round(amount * exchange_rate, 2)
  WHERE bs_amount IS NULL;

  -- 4. Obligatorios -------------------------------------------------------------
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_exchange_rate_check;
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_bs_amount_check;

  ALTER TABLE transactions
    ALTER COLUMN amount SET NOT NULL,
    ALTER COLUMN exchange_rate SET NOT NULL,
    ALTER COLUMN bs_amount SET NOT NULL,
    ADD CONSTRAINT transactions_exchange_rate_check CHECK (exchange_rate > 0),
    ADD CONSTRAINT transactions_bs_amount_check CHECK (bs_amount > 0);

  RAISE NOTICE '✅ amount, exchange_rate y bs_amount ahora son obligatorios.';
END $$;

-- Verificación: todo en 0 excepto los conteos por moneda.
SELECT
  count(*) FILTER (WHERE exchange_rate IS NULL) AS sin_tasa,
  count(*) FILTER (WHERE bs_amount IS NULL) AS sin_bs_amount,
  count(*) FILTER (WHERE input_currency = 'VES') AS registradas_en_bs,
  count(*) FILTER (WHERE input_currency = 'USD') AS registradas_en_usd
FROM transactions;

NOTIFY pgrst, 'reload schema';
