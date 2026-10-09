import { h } from 'vue'
import { formatCurrency } from '@/lib/formatters'
import { useSettings } from '@/composables/useSettings'

interface RenderAmountCellOptions {
  class?: string
  bsClass?: string
  currency?: string
  /** Monto exacto en Bs guardado; reemplaza la estimación. */
  exactBs?: number | null
}

/**
 * Celda de DataTable con el monto principal y, si aplica, el equivalente en Bs
 * apilado debajo en un tono más tenue.
 */
export function renderAmountCell(amount: number, options: RenderAmountCellOptions = {}) {
  const { bsEquivalenceEnabled, convertToBs } = useSettings()
  const isExact = !!options.exactBs && options.exactBs > 0
  const bs = isExact ? options.exactBs! : bsEquivalenceEnabled.value ? convertToBs(amount) : null

  return h('div', [
    h('div', { class: options.class }, formatCurrency(amount, options.currency)),
    bs !== null
      ? h('div', { class: options.bsClass || 'text-[11px] text-muted-foreground font-normal' }, `${isExact ? '' : '≈ '}${formatCurrency(bs, 'VES')}`)
      : null,
  ])
}
