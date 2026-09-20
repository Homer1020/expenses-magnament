import type { RecurringTransaction, RecurringFrequency } from '@/types'
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import DropdownAction from './DataTableDropdown.vue'
import { renderAmountCell } from '@/lib/renderAmountCell'
import { formatFullDate } from '@/lib/formatters'
import { Switch } from '@/components/ui/switch'

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
}

interface TableEmits {
  (e: 'edit', item: RecurringTransaction): void
  (e: 'delete'): void
  (e: 'toggle', item: RecurringTransaction): void
}

export const columns = (emit: TableEmits): ColumnDef<RecurringTransaction>[] => [
  {
    id: 'category',
    header: 'Categoría',
    cell: ({ row }) => {
      const item = row.original
      return h('div', [
        h('div', { class: 'font-medium text-foreground' }, item.categories?.name || 'Sin categoría'),
        h('div', { class: 'text-[11px] text-muted-foreground' }, item.description || undefined),
      ])
    },
  },
  {
    accessorKey: 'amount',
    header: 'Monto',
    cell: ({ row }) => {
      const isIncome = row.original.categories?.type === 1
      return renderAmountCell(row.original.amount || 0, {
        class: `font-medium ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`,
      })
    },
  },
  {
    accessorKey: 'frequency',
    header: 'Frecuencia',
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary' },
        FREQUENCY_LABELS[row.original.frequency]
      )
    },
  },
  {
    accessorKey: 'next_run_date',
    header: 'Próxima Ejecución',
    cell: ({ row }) => {
      return h('div', { class: 'text-sm' }, formatFullDate(row.original.next_run_date))
    },
  },
  {
    accessorKey: 'active',
    header: 'Estado',
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'flex items-center gap-2' }, [
        h(Switch, {
          modelValue: item.active,
          'onUpdate:modelValue': () => emit('toggle', item),
        }),
        h('span', { class: 'text-xs text-muted-foreground' }, item.active ? 'Activa' : 'Pausada'),
      ])
    },
  },
  {
    header: 'Acciones',
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const item = row.original

      return h(
        'div',
        { class: 'relative text-right' },
        h(DropdownAction, {
          item,
          onEdit: () => emit('edit', item),
          onDelete: () => emit('delete'),
        })
      )
    },
  },
]
