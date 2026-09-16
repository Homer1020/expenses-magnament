import type { Account } from '@/types'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import DropdownAction from './DataTableDropdown.vue'
import { renderAmountCell } from '@/lib/renderAmountCell'

export interface AccountWithMetrics extends Account {
  allocatedBudget: number
  spent: number
  available: number
  spentRatio: number
  fundBalance: number
}

export type PeriodView = 'month' | 'accumulated'

interface TableEmits {
  (e: 'edit', account: Account): void
  (e: 'delete'): void
}

export const columns = (emit: TableEmits, periodView: PeriodView): ColumnDef<AccountWithMetrics>[] => [
  {
    accessorKey: 'name',
    header: 'Nombre del Presupuesto',
    cell: ({ row }) => {
      return h('div', { class: 'font-medium text-foreground' }, row.getValue('name'))
    },
  },
  {
    accessorKey: 'percentage',
    header: 'Asignación',
    cell: ({ row }) => {
      return h(
        'span',
        {
          class:
            'inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary',
        },
        `${row.getValue('percentage')}%`
      )
    },
  },
  {
    accessorKey: 'allocatedBudget',
    header: periodView === 'month' ? 'Presupuesto Mes' : 'Presupuesto Acumulado',
    cell: ({ row }) => {
      const budget = row.original.allocatedBudget || 0
      return renderAmountCell(budget, { class: 'font-medium' })
    },
  },
  {
    accessorKey: 'spent',
    header: periodView === 'month' ? 'Gastado este Mes' : 'Gastado Acumulado',
    cell: ({ row }) => {
      const spent = row.original.spent || 0
      return renderAmountCell(spent, { class: 'text-rose-500 font-medium' })
    },
  },
  {
    accessorKey: 'available',
    header: 'Saldo Disponible',
    cell: ({ row }) => {
      const available = row.original.available || 0
      const isPositive = available >= 0
      return renderAmountCell(available, {
        class: `font-bold ${
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`,
      })
    },
  },
  {
    accessorKey: 'fundBalance',
    header: 'Saldo del Fondo',
    cell: ({ row }) => {
      const fundBalance = row.original.fundBalance || 0
      const isPositive = fundBalance >= 0
      return renderAmountCell(fundBalance, {
        class: `font-bold ${
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`,
      })
    },
  },
  {
    accessorKey: 'spentRatio',
    header: 'Consumo',
    cell: ({ row }) => {
      const ratio = Math.round(row.original.spentRatio || 0)
      const isOver = ratio > 100
      const isWarning = ratio >= 80 && ratio <= 100

      const barColor = isOver
        ? 'bg-rose-500'
        : isWarning
        ? 'bg-amber-500'
        : 'bg-emerald-500'

      return h('div', { class: 'w-28 space-y-1' }, [
        h('div', { class: 'flex justify-between text-[11px] font-medium' }, [
          h('span', { class: isOver ? 'text-rose-500 font-semibold' : 'text-muted-foreground' }, `${ratio}%`),
        ]),
        h(
          'div',
          { class: 'h-1.5 w-full overflow-hidden rounded-full bg-secondary' },
          h('div', {
            class: `h-full rounded-full ${barColor} transition-all duration-300`,
            style: { width: `${Math.min(100, ratio)}%` },
          })
        ),
      ])
    },
  },
  {
    header: 'Acciones',
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const account = row.original

      return h(
        'div',
        { class: 'relative text-right' },
        h(DropdownAction, {
          account,
          onEdit: () => emit('edit', account),
          onDelete: () => emit('delete'),
        })
      )
    },
  },
]