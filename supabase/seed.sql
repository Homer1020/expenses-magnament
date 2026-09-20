-- ==============================================================================
-- SEEDER DE CATEGORÍAS Y CUENTAS CON TRUNCATE Y USER_ID
-- ==============================================================================

-- 1. LIMPIEZA DE TABLAS Y REINICIO DE IDS
TRUNCATE TABLE transactions, budget_goals, recurring_transactions, accounts, categories RESTART IDENTITY CASCADE;

-- 2. INSERCIÓN DE DATOS VINCULADOS A TU USER_ID
DO $$
DECLARE
  -- ============================================================================
  -- 👉 OPCIÓN 1: Pega tu user_id aquí:
  -- target_user_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
  --
  -- 👉 OPCIÓN 2: Si lo dejas en NULL, tomará el primer usuario registrado en auth.users:
  -- ============================================================================
  target_user_id uuid := NULL;

BEGIN
  -- Si no especificaste un UUID arriba, buscar el primer usuario en auth.users
  IF target_user_id IS NULL THEN
    SELECT id INTO target_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION '⚠️ No se encontró ningún user_id. Por favor especifícalo arriba o regístrate en la app primero.';
  END IF;

  RAISE NOTICE '🚀 Sembrando categorías y cuentas para el user_id: %', target_user_id;

  -- ==========================================================================
  -- A. CATEGORÍAS (type: 1 = Ingreso, 0 = Egreso)
  -- ==========================================================================
  INSERT INTO categories (name, type, user_id) VALUES
    -- Ingresos (type: 1)
    ('Salario / Sueldo', 1, target_user_id),
    ('Freelance / Servicios', 1, target_user_id),
    ('Inversiones y Rendimientos', 1, target_user_id),
    ('Ventas y Negocio', 1, target_user_id),
    ('Bonos y Gratificaciones', 1, target_user_id),
    ('Otros Ingresos', 1, target_user_id),

    -- Egresos (type: 0)
    ('Vivienda y Alquiler', 0, target_user_id),
    ('Alimentación y Supermercado', 0, target_user_id),
    ('Servicios Básicos (Luz, Agua, Internet)', 0, target_user_id),
    ('Transporte y Combustible', 0, target_user_id),
    ('Salud y Medicina', 0, target_user_id),
    ('Educación y Crecimiento', 0, target_user_id),
    ('Entretenimiento y Salidas', 0, target_user_id),
    ('Ropa y Cuidado Personal', 0, target_user_id),
    ('Suscripciones y Software', 0, target_user_id),
    ('Mascotas', 0, target_user_id),
    ('Mantenimiento del Hogar', 0, target_user_id),
    ('Deudas y Préstamos', 0, target_user_id),
    ('Ahorro e Inversión', 0, target_user_id),
    ('Otros Gastos', 0, target_user_id)
  ON CONFLICT DO NOTHING;

  -- ==========================================================================
  -- B. CUENTAS (Distribución porcentual = 100%)
  -- ==========================================================================
  INSERT INTO accounts (name, percentage, user_id) VALUES
    ('Gastos Fijos / Necesidades', 50, target_user_id),
    ('Estilo de Vida y Ocio', 20, target_user_id),
    ('Ahorro e Inversión', 15, target_user_id),
    ('Fondo de Emergencia', 10, target_user_id),
    ('Educación y Desarrollo', 5, target_user_id)
  ON CONFLICT DO NOTHING;

  -- ==========================================================================
  -- C. METAS DE GASTO (límite mensual por categoría de egreso)
  -- ==========================================================================
  INSERT INTO budget_goals (category_id, amount, user_id)
  SELECT c.id, g.amount, target_user_id
  FROM (VALUES
    ('Alimentación y Supermercado', 400),
    ('Transporte y Combustible', 150),
    ('Entretenimiento y Salidas', 100),
    ('Servicios Básicos (Luz, Agua, Internet)', 120)
  ) AS g(category_name, amount)
  JOIN categories c ON c.name = g.category_name AND c.user_id = target_user_id
  ON CONFLICT DO NOTHING;

  -- ==========================================================================
  -- D. TRANSACCIONES RECURRENTES (plantillas de ingresos/gastos fijos)
  -- ==========================================================================
  INSERT INTO recurring_transactions (amount, description, category_id, frequency, start_date, next_run_date, active, user_id)
  SELECT r.amount, r.description, c.id, r.frequency, date_trunc('month', now())::date, date_trunc('month', now())::date, true, target_user_id
  FROM (VALUES
    ('Salario / Sueldo', 1200, 'Nómina mensual', 'monthly'),
    ('Suscripciones y Software', 15, 'Streaming y software', 'monthly'),
    ('Vivienda y Alquiler', 350, 'Alquiler mensual', 'monthly')
  ) AS r(category_name, amount, description, frequency)
  JOIN categories c ON c.name = r.category_name AND c.user_id = target_user_id;

  RAISE NOTICE '✅ Seeder completado con éxito para el usuario: %', target_user_id;
END $$;
