import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cargar variables de entorno desde .env manualmente
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env')
  if (!fs.existsSync(envPath)) {
    console.error('❌ Archivo .env no encontrado en la raíz del proyecto.')
    process.exit(1)
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...values] = trimmed.split('=')
    if (key) {
      env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
  return env
}

const env = loadEnv()
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el .env')
  process.exit(1)
}

// Cliente inicial
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

// Obtener parámetros desde CLI o .env
function getParam(flags, envKeys) {
  const args = process.argv.slice(2)
  for (const flag of flags) {
    const directMatch = args.find((a) => a.startsWith(`${flag}=`))
    if (directMatch) return directMatch.split('=')[1].trim()
    
    const index = args.indexOf(flag)
    if (index !== -1 && args[index + 1]) return args[index + 1].trim()
  }

  for (const envKey of envKeys) {
    if (env[envKey]) return env[envKey]
    if (process.env[envKey]) return process.env[envKey]
  }

  return null
}

function getTargetUserId() {
  const customId = getParam(['--user-id', '--user', '-u'], ['SEED_USER_ID', 'USER_ID'])
  if (customId) return customId

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const args = process.argv.slice(2)
  const positionalUuid = args.find((arg) => uuidRegex.test(arg))
  if (positionalUuid) return positionalUuid.trim()

  return null
}

const initialCategories = [
  // Ingresos (type: 1)
  { name: 'Salario / Sueldo', type: 1 },
  { name: 'Freelance / Servicios', type: 1 },
  { name: 'Inversiones y Rendimientos', type: 1 },
  { name: 'Ventas y Negocio', type: 1 },
  { name: 'Bonos y Gratificaciones', type: 1 },
  { name: 'Otros Ingresos', type: 1 },

  // Egresos (type: 0)
  { name: 'Vivienda y Alquiler', type: 0 },
  { name: 'Alimentación y Supermercado', type: 0 },
  { name: 'Servicios Básicos (Luz, Agua, Internet)', type: 0 },
  { name: 'Transporte y Combustible', type: 0 },
  { name: 'Salud y Medicina', type: 0 },
  { name: 'Educación y Crecimiento', type: 0 },
  { name: 'Entretenimiento y Salidas', type: 0 },
  { name: 'Ropa y Cuidado Personal', type: 0 },
  { name: 'Suscripciones y Software', type: 0 },
  { name: 'Mascotas', type: 0 },
  { name: 'Mantenimiento del Hogar', type: 0 },
  { name: 'Deudas y Préstamos', type: 0 },
  { name: 'Ahorro e Inversión', type: 0 },
  { name: 'Otros Gastos', type: 0 },
]

const initialAccounts = [
  { name: 'Gastos Fijos / Necesidades', percentage: 50 },
  { name: 'Estilo de Vida y Ocio', percentage: 20 },
  { name: 'Ahorro e Inversión', percentage: 15 },
  { name: 'Fondo de Emergencia', percentage: 10 },
  { name: 'Educación y Desarrollo', percentage: 5 },
]

async function authenticateIfProvided() {
  const email = getParam(['--email', '-e'], ['SEED_EMAIL', 'USER_EMAIL'])
  const password = getParam(['--password', '-p'], ['SEED_PASSWORD', 'USER_PASSWORD'])

  if (email && password) {
    console.log(`🔐 Autenticando con usuario: ${email}...`)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.warn(`⚠️ Error de autenticación: ${error.message}`)
    } else if (data.user) {
      console.log(`✅ Autenticado exitosamente como ${data.user.email} (ID: ${data.user.id})`)
      return data.user.id
    }
  }
  return null
}

async function seed() {
  console.log('🚀 Iniciando seeder...')

  // 1. Verificar autenticación o service key
  const authenticatedUserId = await authenticateIfProvided()
  const targetUserId = authenticatedUserId || getTargetUserId()

  if (supabaseServiceKey) {
    console.log('🔑 Usando SUPABASE_SERVICE_ROLE_KEY (RLS bypass activado).')
  } else if (authenticatedUserId) {
    console.log('🔑 Sesión autenticada activa (cumple con políticas RLS).')
  } else {
    console.log('⚠️ Ejecutando con clave pública (anon key) sin sesión activa.')
  }

  if (targetUserId) {
    console.log(`👤 ID de usuario destino: ${targetUserId}`)
  }

  // 2. LIMPIEZA (TRUNCATE / DELETE)
  console.log('\n🧹 Limpiando datos previos...')
  
  let deleteTx = supabase.from('transactions').delete()
  deleteTx = targetUserId ? deleteTx.eq('user_id', targetUserId) : deleteTx.neq('id', 0)
  const { error: errTx } = await deleteTx
  if (errTx) console.warn('⚠️ Nota al limpiar transactions:', errTx.message)
  else console.log('✅ Tabla transactions limpiada.')

  let deleteAcc = supabase.from('accounts').delete()
  deleteAcc = targetUserId ? deleteAcc.eq('user_id', targetUserId) : deleteAcc.neq('id', 0)
  const { error: errAcc } = await deleteAcc
  if (errAcc) console.warn('⚠️ Nota al limpiar accounts:', errAcc.message)
  else console.log('✅ Tabla accounts limpiada.')

  let deleteCat = supabase.from('categories').delete()
  deleteCat = targetUserId ? deleteCat.eq('user_id', targetUserId) : deleteCat.neq('id', 0)
  const { error: errCat } = await deleteCat
  if (errCat) console.warn('⚠️ Nota al limpiar categories:', errCat.message)
  else console.log('✅ Tabla categories limpiada.')

  // 3. INSERTAR CATEGORÍAS
  console.log('\n📦 Insertando categorías...')
  const categoriesToInsert = initialCategories.map((c) => ({
    ...c,
    ...(targetUserId ? { user_id: targetUserId } : {}),
  }))

  const { data: catData, error: catError } = await supabase
    .from('categories')
    .insert(categoriesToInsert)
    .select()

  let hasRlsError = false
  if (catError) {
    console.error('❌ Error al insertar categorías:', catError.message)
    if (catError.message.includes('row-level security')) hasRlsError = true
  } else {
    console.log(`✅ ${catData.length} categorías creadas con éxito.`)
  }

  // 4. INSERTAR CUENTAS
  console.log('\n💳 Insertando cuentas...')
  const accountsToInsert = initialAccounts.map((a) => ({
    ...a,
    ...(targetUserId ? { user_id: targetUserId } : {}),
  }))

  const { data: accData, error: accError } = await supabase
    .from('accounts')
    .insert(accountsToInsert)
    .select()

  if (accError) {
    console.error('❌ Error al insertar cuentas:', accError.message)
    if (accError.message.includes('row-level security')) hasRlsError = true
  } else {
    console.log(`✅ ${accData.length} cuentas creadas con éxito.`)
  }

  // Mensaje de guía si falló por RLS
  if (hasRlsError) {
    console.log('\n=============================================================================')
    console.log('💡 ¿POR QUÉ OCURRE EL ERROR DE ROW-LEVEL SECURITY (RLS)?')
    console.log('Supabase bloquea las inserciones anónimas cuando las tablas tienen RLS activo.')
    console.log('Para solucionarlo, tienes 3 opciones:')
    console.log('-----------------------------------------------------------------------------')
    console.log('1. (Recomendado) Agrega tu SUPABASE_SERVICE_ROLE_KEY al .env:')
    console.log('   SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"')
    console.log('   (La encuentras en Supabase > Project Settings > API > service_role secret)')
    console.log('')
    console.log('2. O pasa tus credenciales para autenticar en el comando:')
    console.log('   npm run seed -- --email=tu@correo.com --password=tu_contraseña')
    console.log('')
    console.log('3. O ejecuta directamente el script SQL en el SQL Editor de Supabase:')
    console.log('   Archivo: seed.sql')
    console.log('=============================================================================\n')
  } else {
    console.log('\n🎉 ¡Proceso de seeding finalizado exitosamente!')
  }
}

seed().catch((err) => {
  console.error('❌ Error inesperado en el seeder:', err)
  process.exit(1)
})
