import type { Account, Transaction } from '@/types'

export interface AccountMetrics {
  allocatedBudget: number
  directIncome: number
  spent: number
  sharedExpenses: number
  available: number
  spentRatio: number
}

const sum = (txs: Transaction[]) => txs.reduce((s, t) => s + (Number(t.amount) || 0), 0)

/**
 * Fuente única del cálculo de presupuesto por cuenta.
 * Asignado = % de ingresos sin presupuesto + ingresos directos.
 * Disponible = asignado - gastos propios - % de gastos sin presupuesto.
 */
export function computeAccountMetrics(
  acc: Pick<Account, 'id' | 'percentage'>,
  txs: Transaction[],
  opts: { excludeTxId?: number | string | null } = {},
): AccountMetrics {
  const list = opts.excludeTxId != null ? txs.filter((t) => t.id !== opts.excludeTxId) : txs
  const pct = (acc.percentage || 0) / 100

  const unassignedIncome = sum(list.filter((t) => t.categories?.type === 1 && !t.account_id))
  const unassignedExpenses = sum(list.filter((t) => t.categories?.type !== 1 && !t.account_id))

  const directIncome = sum(list.filter((t) => t.account_id === acc.id && t.categories?.type === 1))
  const spent = sum(list.filter((t) => t.account_id === acc.id && t.categories?.type !== 1))

  const allocatedBudget = unassignedIncome * pct + directIncome
  const sharedExpenses = unassignedExpenses * pct
  const available = allocatedBudget - spent - sharedExpenses
  const spentRatio = allocatedBudget > 0 ? ((spent + sharedExpenses) / allocatedBudget) * 100 : 0

  return { allocatedBudget, directIncome, spent, sharedExpenses, available, spentRatio }
}
