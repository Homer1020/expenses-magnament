import supabase from '@/lib/supabase'
import {
  PRESET_ACCOUNT_GROUPS,
  PRESET_CATEGORIES,
  type PresetAccount,
} from '@/constants/presets'

export interface OnboardingPayload {
  currency?: string
  accounts: PresetAccount[]
  categories: { name: string; type: number }[]
}

/**
 * Inserta en lote las cuentas y categorías elegidas por el usuario y actualiza su metadata.
 */
export async function initializeUserData(
  userId: string,
  payload: OnboardingPayload
): Promise<{ success: boolean; accountsCount: number; categoriesCount: number }> {
  try {
    // 1. Insertar categorías
    const categoriesToInsert = payload.categories.map((c) => ({
      name: c.name.trim(),
      type: c.type,
      user_id: userId,
    }))

    const { error: catError } = await supabase
      .from('categories')
      .insert(categoriesToInsert)

    if (catError) {
      console.error('Error al insertar categorías iniciales:', catError)
      throw catError
    }

    // 2. Insertar cuentas
    const accountsToInsert = payload.accounts.map((a) => ({
      name: a.name.trim(),
      percentage: Math.round(a.percentage),
      user_id: userId,
    }))

    const { error: accError } = await supabase
      .from('accounts')
      .insert(accountsToInsert)

    if (accError) {
      console.error('Error al insertar cuentas iniciales:', accError)
      throw accError
    }

    // 3. Actualizar metadata del usuario con moneda y flag de onboarding completado
    if (payload.currency) {
      await supabase.auth.updateUser({
        data: {
          currency: payload.currency,
          onboarding_completed: true,
        },
      })
    } else {
      await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
        },
      })
    }

    return {
      success: true,
      accountsCount: accountsToInsert.length,
      categoriesCount: categoriesToInsert.length,
    }
  } catch (error) {
    console.error('Error general en initializeUserData:', error)
    throw error
  }
}

/**
 * Inicialización rápida con la plantilla balanceada por defecto (1 Clic).
 */
export async function quickSetupDefault(userId: string, currency = 'USD') {
  const defaultAccounts = PRESET_ACCOUNT_GROUPS[0].accounts
  const defaultCategories = PRESET_CATEGORIES.map((c) => ({
    name: c.name,
    type: c.type,
  }))

  return await initializeUserData(userId, {
    currency,
    accounts: defaultAccounts,
    categories: defaultCategories,
  })
}

/**
 * Comprueba si el usuario actual necesita realizar el onboarding
 * (es decir, no tiene cuentas ni categorías configuradas).
 */
export async function checkNeedsOnboarding(): Promise<boolean> {
  try {
    const [catsRes, accsRes] = await Promise.all([
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('accounts').select('id', { count: 'exact', head: true }),
    ])

    const catCount = catsRes.count ?? 0
    const accCount = accsRes.count ?? 0

    return catCount === 0 && accCount === 0
  } catch (err) {
    console.error('Error al verificar estado de onboarding:', err)
    return false
  }
}
