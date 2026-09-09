import type { Transaction } from '@/types'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import DropdownAction from './DataTableDropdown.vue'

interface TableEmits {
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
    accessorKey: 'amount',
    header: () => 'Monto',
    cell: ({ row }) => {
      const amount = Number.parseFloat(row.getValue('amount'))
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)

      return h('div', formatted)
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
        onEdit: () => emit('edit', transaction),
        onDelete: () => emit('delete'),
      }))
    },
  },
]