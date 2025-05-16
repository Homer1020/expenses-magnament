import type { Transaction } from '@/types'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import DropdownAction from './DataTableDropdown.vue'

export const columns: ColumnDef<Transaction>[] = [
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
  // ...
  {
    header: 'Acciones',
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const transaction = row.original

      return h('div', { class: 'relative' }, h(DropdownAction, { transaction }))
    },
  },
]