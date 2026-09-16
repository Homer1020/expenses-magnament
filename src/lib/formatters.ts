import { useSettings } from '@/composables/useSettings'

export function formatCurrency(value: number, currency?: string): string {
  const code = currency || useSettings().currency.value

  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0)
  } catch (error) {
    console.error(`Código de moneda inválido "${code}", usando USD:`, error)
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0)
  }
}

export function formatCurrencyWithBs(value: number, currency?: string): string {
  const { bsEquivalenceEnabled, convertToBs } = useSettings()
  const base = formatCurrency(value, currency)

  if (!bsEquivalenceEnabled.value) return base

  const bs = convertToBs(value)
  if (bs === null) return base

  return `${base} (≈ ${formatCurrency(bs, 'VES')})`
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value || 0).toFixed(decimals)}%`
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function formatFullDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
