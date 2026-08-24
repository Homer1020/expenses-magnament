import type { TransactionCategory } from '@/types'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import DropdownAction from './DataTableDropdown.vue'

interface TableEmits {
  (e: 'edit', category: TransactionCategory): void
  (e: 'delete'): void
}

export const columns = (emit: TableEmits): ColumnDef<TransactionCategory>[] => [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => h('div', String(row.getValue('id'))),
  },
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => h('div', row.getValue('name')),
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue('type') as number
      return h('div', type ? 'Ingreso' : 'Egreso')
    },
  },
  {
    header: 'Acciones',
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const category = row.original

      return h('div', { class: 'relative' }, h(DropdownAction, {
        category,
        onEdit: () => emit('edit', category),
        onDelete: () => emit('delete'),
      }))
    },
  },
]
