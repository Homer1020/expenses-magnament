-- ==============================================================================
-- ESQUEMA DE BASE DE DATOS (Supabase / PostgreSQL)
-- ==============================================================================
-- Fuente de verdad del esquema. Ejecutar completo en el SQL Editor de Supabase
-- sobre un proyecto nuevo (es idempotente: se puede re-ejecutar sin romper nada).
--
-- Contenido:
--   1. Tablas: categories, accounts, transactions, budget_goals, recurring_transactions
--   2. Índices
--   3. Row Level Security (cada usuario solo ve/modifica sus propias filas)
--   4. Función RPC reset_my_data()
-- ==============================================================================

-- 1. TABLAS --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  type integer NOT NULL,                       -- 1 = ingreso, 0 = egreso
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.accounts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying NOT NULL,
  percentage smallint NOT NULL,                -- % del ingreso asignado a la cuenta
  user_id uuid DEFAULT auth.uid(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  amount numeric NOT NULL,                     -- monto en USD
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL DEFAULT CURRENT_DATE,     -- fecha real de la transacción
  category_id bigint NOT NULL,
  account_id bigint,
  bs_amount numeric CHECK (bs_amount > 0::numeric),
  exchange_rate numeric CHECK (exchange_rate > 0::numeric),
  input_currency text NOT NULL DEFAULT 'USD'::text CHECK (input_currency = ANY (ARRAY['USD'::text, 'VES'::text])),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

CREATE TABLE IF NOT EXISTS public.budget_goals (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  category_id bigint NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT budget_goals_pkey PRIMARY KEY (id),
  CONSTRAINT budget_goals_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT budget_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  description text NOT NULL DEFAULT ''::text,
  category_id bigint NOT NULL,
  account_id bigint,
  frequency text NOT NULL CHECK (frequency = ANY (ARRAY['weekly'::text, 'monthly'::text, 'yearly'::text])),
  start_date date NOT NULL,
  next_run_date date NOT NULL,
  last_generated_at timestamp with time zone,
  active boolean NOT NULL DEFAULT true,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recurring_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT recurring_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT recurring_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 2. ÍNDICES -------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS categories_user_id_idx ON public.categories (user_id);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts (user_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_date_idx ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS budget_goals_user_id_idx ON public.budget_goals (user_id);
CREATE INDEX IF NOT EXISTS recurring_transactions_user_id_idx ON public.recurring_transactions (user_id);
CREATE INDEX IF NOT EXISTS recurring_transactions_next_run_idx
  ON public.recurring_transactions (next_run_date) WHERE active;

-- 3. ROW LEVEL SECURITY --------------------------------------------------------
-- Una política SELECT/INSERT/UPDATE/DELETE por tabla: solo filas propias.
-- Sin la de UPDATE, Supabase actualiza 0 filas y .single() falla con
-- "Cannot coerce the result to a single JSON object".

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories', 'accounts', 'transactions', 'budget_goals', 'recurring_transactions']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() = user_id)', t || '_select_own', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', t || '_insert_own', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t || '_update_own', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_own', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (auth.uid() = user_id)', t || '_delete_own', t);
  END LOOP;
END $$;

-- 4. FUNCIÓN RPC: REESTABLECER CUENTA A CERO -----------------------------------
-- Borra transacciones, recurrentes y metas del usuario autenticado.
-- Conserva categorías y cuentas.
-- SECURITY INVOKER: respeta RLS (usa las políticas DELETE "own" de arriba).

CREATE OR REPLACE FUNCTION public.reset_my_data()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  DELETE FROM public.transactions WHERE user_id = auth.uid();
  DELETE FROM public.recurring_transactions WHERE user_id = auth.uid();
  DELETE FROM public.budget_goals WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.reset_my_data() FROM public;
GRANT EXECUTE ON FUNCTION public.reset_my_data() TO authenticated;

-- Refrescar el schema cache de la API (para que PostgREST vea tablas y función)
NOTIFY pgrst, 'reload schema';
