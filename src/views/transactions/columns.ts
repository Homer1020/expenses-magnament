import type { Transaction } from '@/types'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-vue-next'
import DropdownAction from './DataTableDropdown.vue'
import { renderAmountCell } from '@/lib/renderAmountCell'

interface TableEmits {
  (e: 'view', transaction: Transaction): void
  (e: 'edit', transaction: Transaction): void
  (e: 'delete'): void
}

export const columns = (emit: TableEmits): ColumnDef<Transaction>[] => [
  {
    accessorKey: 'date',
    header: 'Fecha',
    cell: ({row}) => {
      return h('div', row.getValue('date'))
    }
  },
  {
    accessorKey: 'description',
    header: 'Concepto',
    cell: ({ row }) => {
      const description = row.original.description?.trim()
      return h(
        'div',
        { class: description ? 'max-w-[200px] truncate' : 'text-muted-foreground' },
        description || '—'
      )
    },
  },
  {
    accessorKey: 'amount',
    header: () => 'Monto',
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue('amount'))
      const isIncome = !!row.original.categories.type
      return renderAmountCell(amount, {
        exactBs: row.original.bs_amount,
        icon: isIncome ? ArrowUpRight : ArrowDownLeft,
        class: isIncome
          ? 'font-medium text-green-600 dark:text-green-500'
          : 'font-medium text-red-600 dark:text-red-500',
      })
    },
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    cell: ({ row }) => h('div', row.getValue('category')),
    accessorFn: (row) => row.categories.name
  },
  {
    accessorKey: 'category_type',
    header: 'Tipo',
    cell: ({ row }) => h('div', row.getValue('category_type')),
    filterFn: 'equalsString',
    accessorFn: (row) => row.categories.type ? 'Ingreso' : 'Egreso'
  },
  {
    accessorKey: 'account',
    header: 'Presupuesto',
    cell: ({ row }) => {
      const account = row.original.accounts
      if (!account) {
        return h('span', { class: 'text-muted-foreground text-xs italic' }, '-')
      }
      return h(
        'span',
        {
          class:
            'inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20',
        },
        account.name
      )
    },
  },
  {
    header: 'Acciones',
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const transaction = row.original

      return h('div', { class: 'relative' }, h(DropdownAction, {
        transaction,
        onView: () => emit('view', transaction),
        onEdit: () => emit('edit', transaction),
        onDelete: () => emit('delete'),
      }))
    },
  },
]