-- ==============================================================================
-- 01. POLÍTICAS RLS DE ACTUALIZACIÓN Y ELIMINACIÓN EN TRANSACCIONES
-- ==============================================================================
-- Permite editar y eliminar las transacciones propias (RLS).
-- Sin una política de UPDATE, Supabase actualiza 0 filas y .single() falla con
-- "Cannot coerce the result to a single JSON object".
-- ==============================================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_update_own" ON transactions;
CREATE POLICY "transactions_update_own" ON transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_delete_own" ON transactions;
CREATE POLICY "transactions_delete_own" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

