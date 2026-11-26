import type { FilterFn } from '@tanstack/vue-table'
import type { Transaction } from '@/types'

/** Minúsculas y sin acentos (conserva la longitud 1:1 por carácter en la mayoría de casos). */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Divide la consulta en términos normalizados, sin vacíos ni duplicados. */
export function tokenize(query: string): string[] {
  return [...new Set(normalizeText(query).split(/\s+/).filter(Boolean))]
}

function searchableText(t: Transaction): string {
  const date = (t.date || t.created_at || '').split('T')[0]
  return normalizeText(
    [
      t.description,
      t.categories?.name,
      t.accounts?.name,
      t.categories?.type ? 'ingreso' : 'egreso',
      String(t.amount),
      date,
    ]
      .filter(Boolean)
      .join(' ')
  )
}

/**
 * Filtro global: la fila coincide si TODOS los términos aparecen
 * en alguno de sus campos (concepto, categoría, presupuesto, tipo, monto, fecha).
 */
export const multiTermFilter: FilterFn<Transaction> = (row, _columnId, filterValue) => {
  const terms = tokenize(String(filterValue ?? ''))
  if (!terms.length) return true
  const text = searchableText(row.original)
  return terms.every((term) => text.includes(term))
}
