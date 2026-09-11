export interface PresetAccount {
  name: string
  percentage: number
  description?: string
}

export interface PresetAccountGroup {
  id: string
  name: string
  description: string
  badge?: string
  accounts: PresetAccount[]
}

export interface PresetCategoryItem {
  name: string
  type: 0 | 1 // 0 = Egreso, 1 = Ingreso
  group?: string
  defaultSelected?: boolean
}

export interface CurrencyOption {
  code: string
  symbol: string
  name: string
}

export const PRESET_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'USD - Dólar Estadounidense' },
  { code: 'EUR', symbol: '€', name: 'EUR - Euro' },
  { code: 'MXN', symbol: '$', name: 'MXN - Peso Mexicano' },
  { code: 'COP', symbol: '$', name: 'COP - Peso Colombiano' },
  { code: 'CLP', symbol: '$', name: 'CLP - Peso Chileno' },
  { code: 'PEN', symbol: 'S/', name: 'PEN - Sol Peruano' },
  { code: 'ARS', symbol: '$', name: 'ARS - Peso Argentino' },
  { code: 'BRL', symbol: 'R$', name: 'BRL - Real Brasileño' },
]

export const PRESET_ACCOUNT_GROUPS: PresetAccountGroup[] = [
  {
    id: 'balanced',
    name: 'Finanzas Equilibradas (5 Fondos)',
    description: 'Distribución completa para control de fijos, ocio, ahorro, emergencias y educación.',
    badge: 'Recomendado',
    accounts: [
      { name: 'Gastos Fijos / Necesidades', percentage: 50, description: 'Vivienda, comida, servicios esenciales' },
      { name: 'Estilo de Vida y Ocio', percentage: 20, description: 'Salidas, entretenimiento y gustos personales' },
      { name: 'Ahorro e Inversión', percentage: 15, description: 'Fondos de inversión a mediano/largo plazo' },
      { name: 'Fondo de Emergencia', percentage: 10, description: 'Colchón de seguridad para imprevistos' },
      { name: 'Educación y Desarrollo', percentage: 5, description: 'Cursos, libros y crecimiento profesional' },
    ],
  },
  {
    id: 'classic_50_30_20',
    name: 'Regla Clásica 50 / 30 / 20',
    description: 'El modelo popular más simple y directo para estructurar tus finanzas personales.',
    accounts: [
      { name: 'Necesidades Básicas', percentage: 50, description: 'Alquiler, facturas y alimentos indispensables' },
      { name: 'Deseos y Ocio', percentage: 30, description: 'Hobbies, compras no esenciales y viajes' },
      { name: 'Ahorros y Deudas', percentage: 20, description: 'Ahorro o amortización de deudas' },
    ],
  },
  {
    id: 'aggressive_saver',
    name: 'Ahorrador e Inversionista (40 / 30 / 20 / 10)',
    description: 'Enfocado en maximizar el patrimonio y acelerar la libertad financiera.',
    accounts: [
      { name: 'Gastos Operativos', percentage: 40, description: 'Costos fijos optimizados al máximo' },
      { name: 'Inversión y Patrimonio', percentage: 30, description: 'Inversiones en bolsa, activos y capital' },
      { name: 'Estilo de Vida', percentage: 20, description: 'Disfrute y recreación equilibrada' },
      { name: 'Fondo de Emergencia', percentage: 10, description: 'Protección de liquidez' },
    ],
  },
  {
    id: 'minimalist',
    name: 'Estructura Minimalista (70 / 30)',
    description: 'Para quienes prefieren la máxima simplicidad sin tantas subcuentas.',
    accounts: [
      { name: 'Gastos Totales', percentage: 70, description: 'Todos tus gastos fijos y variables' },
      { name: 'Ahorro y Futuro', percentage: 30, description: 'Ahorro, emergencia e inversión' },
    ],
  },
]

export const PRESET_CATEGORIES: PresetCategoryItem[] = [
  // --- INGRESOS (Type 1) ---
  { name: 'Salario / Sueldo', type: 1, group: 'Ingresos', defaultSelected: true },
  { name: 'Freelance / Servicios', type: 1, group: 'Ingresos', defaultSelected: true },
  { name: 'Inversiones y Rendimientos', type: 1, group: 'Ingresos', defaultSelected: true },
  { name: 'Ventas y Negocio', type: 1, group: 'Ingresos', defaultSelected: true },
  { name: 'Bonos y Gratificaciones', type: 1, group: 'Ingresos', defaultSelected: true },
  { name: 'Otros Ingresos', type: 1, group: 'Ingresos', defaultSelected: true },

  // --- EGRESOS (Type 0) ---
  { name: 'Vivienda y Alquiler', type: 0, group: 'Básicos', defaultSelected: true },
  { name: 'Alimentación y Supermercado', type: 0, group: 'Básicos', defaultSelected: true },
  { name: 'Servicios Básicos (Luz, Agua, Internet)', type: 0, group: 'Básicos', defaultSelected: true },
  { name: 'Transporte y Combustible', type: 0, group: 'Básicos', defaultSelected: true },
  { name: 'Salud y Medicina', type: 0, group: 'Bienestar', defaultSelected: true },
  { name: 'Educación y Crecimiento', type: 0, group: 'Desarrollo', defaultSelected: true },
  { name: 'Entretenimiento y Salidas', type: 0, group: 'Estilo de Vida', defaultSelected: true },
  { name: 'Ropa y Cuidado Personal', type: 0, group: 'Estilo de Vida', defaultSelected: true },
  { name: 'Suscripciones y Software', type: 0, group: 'Estilo de Vida', defaultSelected: true },
  { name: 'Mascotas', type: 0, group: 'Hogar', defaultSelected: true },
  { name: 'Mantenimiento del Hogar', type: 0, group: 'Hogar', defaultSelected: true },
  { name: 'Deudas y Préstamos', type: 0, group: 'Finanzas', defaultSelected: true },
  { name: 'Ahorro e Inversión', type: 0, group: 'Finanzas', defaultSelected: true },
  { name: 'Otros Gastos', type: 0, group: 'General', defaultSelected: true },
]
