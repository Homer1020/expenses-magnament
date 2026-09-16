import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import supabase from '@/lib/supabase'
import { updateProfile } from '@/services/auth'
import { fetchBcvRate } from '@/services/exchangeRate'

export type ExchangeRateSource = 'bcv' | 'manual'

interface SettingsCache {
  currency: string
  exchangeRateSource: ExchangeRateSource
  manualRate: number | null
  showBsEquivalent: boolean
  bcvRate: number | null
  bcvRateUpdatedAt: string | null
  bcvRateFetchedAt: string | null
}

const DEFAULTS: SettingsCache = {
  currency: 'USD',
  exchangeRateSource: 'bcv',
  manualRate: null,
  showBsEquivalent: true,
  bcvRate: null,
  bcvRateUpdatedAt: null,
  bcvRateFetchedAt: null,
}

// Estado singleton a nivel de módulo: todo componente que importe useSettings()
// comparte las mismas referencias reactivas (sustituye a un store tipo Pinia).
const cache = useLocalStorage<SettingsCache>('expenses:settings:v1', { ...DEFAULTS }, { mergeDefaults: true })

const currency = computed({
  get: () => cache.value.currency,
  set: (value: string) => { cache.value.currency = value },
})
const exchangeRateSource = computed({
  get: () => cache.value.exchangeRateSource,
  set: (value: ExchangeRateSource) => { cache.value.exchangeRateSource = value },
})
const manualRate = computed({
  get: () => cache.value.manualRate,
  set: (value: number | null) => { cache.value.manualRate = value },
})
const showBsEquivalent = computed({
  get: () => cache.value.showBsEquivalent,
  set: (value: boolean) => { cache.value.showBsEquivalent = value },
})
const bcvRate = computed(() => cache.value.bcvRate)
const bcvRateUpdatedAt = computed(() => cache.value.bcvRateUpdatedAt)

const bcvRateLoading = ref(false)
const bcvRateError = ref<string | null>(null)
const bcvRateStale = ref(false)
const savingSettings = ref(false)
const initialized = ref(false)
let authListenerRegistered = false

const effectiveRate = computed<number | null>(() => {
  const rate = exchangeRateSource.value === 'manual' ? manualRate.value : bcvRate.value
  return rate && rate > 0 ? rate : null
})

const bsEquivalenceEnabled = computed(() =>
  showBsEquivalent.value && currency.value !== 'VES' && effectiveRate.value !== null
)

function convertToBs(amount: number): number | null {
  if (!bsEquivalenceEnabled.value || effectiveRate.value === null) return null
  return amount * effectiveRate.value
}

async function refreshBcvRate() {
  bcvRateLoading.value = true
  bcvRateError.value = null
  try {
    const { rate, fetchedAt } = await fetchBcvRate()
    cache.value.bcvRate = rate
    cache.value.bcvRateUpdatedAt = fetchedAt
    cache.value.bcvRateFetchedAt = new Date().toISOString()
    bcvRateStale.value = false
  } catch (error: any) {
    bcvRateError.value = error?.message || 'No se pudo obtener la tasa BCV'
    bcvRateStale.value = !!cache.value.bcvRate
  } finally {
    bcvRateLoading.value = false
  }
}

function applyUserMetadata(metadata: Record<string, any> | null | undefined) {
  if (!metadata) return
  if (typeof metadata.currency === 'string') cache.value.currency = metadata.currency
  if (metadata.exchange_rate_source === 'bcv' || metadata.exchange_rate_source === 'manual') {
    cache.value.exchangeRateSource = metadata.exchange_rate_source
  }
  if (typeof metadata.manual_exchange_rate === 'number') {
    cache.value.manualRate = metadata.manual_exchange_rate
  }
  if (typeof metadata.show_bs_equivalent === 'boolean') {
    cache.value.showBsEquivalent = metadata.show_bs_equivalent
  }
}

function resetToDefaults() {
  cache.value.currency = DEFAULTS.currency
  cache.value.exchangeRateSource = DEFAULTS.exchangeRateSource
  cache.value.manualRate = DEFAULTS.manualRate
  cache.value.showBsEquivalent = DEFAULTS.showBsEquivalent
}

async function initSettings() {
  if (initialized.value) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    applyUserMetadata(user?.user_metadata)
  } catch (error) {
    console.error('Error al cargar la configuración del usuario:', error)
  } finally {
    initialized.value = true
  }

  refreshBcvRate()

  if (!authListenerRegistered) {
    authListenerRegistered = true
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        applyUserMetadata(session?.user?.user_metadata)
      } else if (event === 'SIGNED_OUT') {
        resetToDefaults()
      }
    })
  }
}

async function saveSettings(partial: Partial<{
  currency: string
  exchangeRateSource: ExchangeRateSource
  manualRate: number | null
  showBsEquivalent: boolean
}>) {
  if (partial.currency !== undefined) cache.value.currency = partial.currency
  if (partial.exchangeRateSource !== undefined) cache.value.exchangeRateSource = partial.exchangeRateSource
  if (partial.manualRate !== undefined) cache.value.manualRate = partial.manualRate
  if (partial.showBsEquivalent !== undefined) cache.value.showBsEquivalent = partial.showBsEquivalent

  savingSettings.value = true
  try {
    await updateProfile({
      currency: cache.value.currency,
      exchange_rate_source: cache.value.exchangeRateSource,
      manual_exchange_rate: cache.value.manualRate ?? undefined,
      show_bs_equivalent: cache.value.showBsEquivalent,
    })
    return { synced: true }
  } catch (error) {
    console.error('Error al sincronizar la configuración con la cuenta:', error)
    return { synced: false }
  } finally {
    savingSettings.value = false
  }
}

export function useSettings() {
  return {
    currency,
    exchangeRateSource,
    manualRate,
    showBsEquivalent,
    bcvRate,
    bcvRateUpdatedAt,
    bcvRateLoading,
    bcvRateError,
    bcvRateStale,
    savingSettings,
    initialized,
    effectiveRate,
    bsEquivalenceEnabled,
    convertToBs,
    initSettings,
    refreshBcvRate,
    saveSettings,
  }
}
