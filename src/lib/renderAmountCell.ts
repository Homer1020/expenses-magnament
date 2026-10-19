import { h, type Component } from 'vue'
import { formatCurrency } from '@/lib/formatters'
import { useSettings } from '@/composables/useSettings'

interface RenderAmountCellOptions {
  class?: string
  bsClass?: string
  currency?: string
  /** Monto exacto en Bs guardado; se muestra como monto principal. */
  exactBs?: number | null
  /** Tasa Bs/USD guardada en la transacción; reemplaza la tasa actual en la estimación. */
  rate?: number | null
  /** Transacción solo en dólares: no muestra equivalente en Bs. */
  usdOnly?: boolean
  /** Icono (componente) que se muestra antes del monto. */
  icon?: Component
}

/**
 * Celda de DataTable con el monto principal y, si aplica, el monto secundario
 * apilado debajo en un tono más tenue. Si la transacción se registró en Bs,
 * el Bs es el principal y la moneda global queda debajo.
 */
export function renderAmountCell(amount: number, options: RenderAmountCellOptions = {}) {
  const { bsEquivalenceEnabled, convertToBs } = useSettings()
  const isExact = !!options.exactBs && options.exactBs > 0
  const secondaryClass = options.bsClass || 'text-[11px] text-muted-foreground font-normal'

  const main = (text: string) =>
    h('div', { class: ['flex items-center gap-1', options.class] }, [
      options.icon ? h(options.icon, { class: 'size-3.5 shrink-0' }) : null,
      text,
    ])

  if (isExact) {
    return h('div', [
      main(formatCurrency(options.exactBs!, 'VES')),
      h('div', { class: secondaryClass }, formatCurrency(amount, options.currency)),
    ])
  }

  const bs = options.usdOnly || !bsEquivalenceEnabled.value
    ? null
    : options.rate && options.rate > 0
      ? amount * options.rate
      : convertToBs(amount)

  return h('div', [
    main(formatCurrency(amount, options.currency)),
    bs !== null ? h('div', { class: secondaryClass }, `≈ ${formatCurrency(bs, 'VES')}`) : null,
  ])
}
