-- ==============================================================================
-- SEEDER DE CATEGORÍAS Y CUENTAS CON TRUNCATE Y USER_ID
-- ==============================================================================

-- 1. LIMPIEZA DE TABLAS Y REINICIO DE IDS
TRUNCATE TABLE transactions, accounts, categories RESTART IDENTITY CASCADE;

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

  RAISE NOTICE '✅ Seeder completado con éxito para el usuario: %', target_user_id;
END $$;
