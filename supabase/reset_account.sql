-- ==============================================================================
-- REESTABLECER CUENTA A CERO
-- Borra transacciones, recurrentes y metas de gasto del usuario autenticado.
-- Conserva categorías y cuentas. Ejecutar en el SQL Editor de Supabase.
-- SECURITY INVOKER: respeta RLS (requiere políticas DELETE "own" en las tablas).
-- ==============================================================================

CREATE OR REPLACE FUNCTION reset_my_data()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  DELETE FROM transactions WHERE user_id = auth.uid();
  DELETE FROM recurring_transactions WHERE user_id = auth.uid();
  DELETE FROM budget_goals WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION reset_my_data() FROM public;
GRANT EXECUTE ON FUNCTION reset_my_data() TO authenticated;

-- Refrescar el schema cache de la API (necesario para que la función sea visible por RPC)
NOTIFY pgrst, 'reload schema';
