import type { BudgetGoal } from '@/types'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import DropdownAction from './DataTableDropdown.vue'
import { renderAmountCell } from '@/lib/renderAmountCell'

export interface BudgetGoalWithMetrics extends BudgetGoal {
  spent: number
  available: number
  spentRatio: number
}

interface TableEmits {
  (e: 'edit', goal: BudgetGoal): void
  (e: 'delete'): void
}

export const columns = (emit: TableEmits): ColumnDef<BudgetGoalWithMetrics>[] => [
  {
    id: 'category',
    header: 'Categoría',
    cell: ({ row }) => {
      return h('div', { class: 'font-medium text-foreground' }, row.original.categories?.name || 'Sin categoría')
    },
  },
  {
    accessorKey: 'amount',
    header: 'Límite Mensual',
    cell: ({ row }) => {
      return renderAmountCell(row.original.amount || 0, { class: 'font-medium' })
    },
  },
  {
    accessorKey: 'spent',
    header: 'Gastado este Mes',
    cell: ({ row }) => {
      return renderAmountCell(row.original.spent || 0, { class: 'text-rose-500 font-medium' })
    },
  },
  {
    accessorKey: 'available',
    header: 'Disponible',
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
      const goal = row.original

      return h(
        'div',
        { class: 'relative text-right' },
        h(DropdownAction, {
          goal,
          onEdit: () => emit('edit', goal),
          onDelete: () => emit('delete'),
        })
      )
    },
  },
]
