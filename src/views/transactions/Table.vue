<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Transaction } from '@/types';
import { columns } from './columns';
import { FlexRender, getCoreRowModel, useVueTable, getPaginationRowModel, type ColumnFiltersState } from '@tanstack/vue-table';
import Button from '@/components/ui/button/Button.vue';
import { ref } from 'vue';
import { Input } from '@/components/ui/input';
import TablePicker from './TablePicker.vue';
import {
  CalendarDate,
} from '@internationalized/date'

const {
  transactions
} = defineProps<{transactions: Transaction[]}>()

const columnFilters = ref<ColumnFiltersState>([]) // can set initial column filter state here
const globalFilter = ref('')
const table = useVueTable({
  get data() { return transactions },
  get columns() { return columns },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  // getFilteredRowModel: getFilteredRowModel(),
  state: {
    get columnFilters() {
      return columnFilters.value
    },
    get globalFilter() {
      return globalFilter.value
    },
  },
  onColumnFiltersChange: updaterOrValue => {
    columnFilters.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(columnFilters.value)
        : updaterOrValue
  },
  onGlobalFilterChange: updaterOrValue => {
    globalFilter.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(globalFilter.value)
        : updaterOrValue
  },
})

const dateFilters = ref({
  start: new CalendarDate(2025, 5, 7),
  end: new CalendarDate(2025, 5, 7).add({ days: 20 }),
})

const emit = defineEmits(['updatedDate'])
</script>
<template>
  <div class="mb-3 flex gap-3">
    <Input
      placeholder="Buscar..."
      v-model="globalFilter"
      class="max-w-54"
      />

    <TablePicker
      v-model="dateFilters"
      @change="ev => { emit('updatedDate', ev) }"
      />
  </div>
  <Table>
    <TableHeader>
      <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
        <TableHead v-for="header in headerGroup.headers" :key="header.id">
          <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header"
            :props="header.getContext()" />
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <template v-if="table.getRowModel().rows?.length">
        <TableRow v-for="row in table.getRowModel().rows" :key="row.id"
          :data-state="row.getIsSelected() ? 'selected' : undefined">
          <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
            <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
          </TableCell>
        </TableRow>
      </template>
      <template v-else>
        <TableRow>
          <TableCell :colspan="columns.length" class="h-24 text-center">
            No results.
          </TableCell>
        </TableRow>
      </template>
    </TableBody>
  </Table>
  <div class="flex items-center justify-end py-4 space-x-2">
    <Button
      variant="outline"
      size="sm"
      :disabled="!table.getCanPreviousPage()"
      @click="table.previousPage()"
    >
      Previous
    </Button>
    <Button
      variant="outline"
      size="sm"
      :disabled="!table.getCanNextPage()"
      @click="table.nextPage()"
    >
      Next
    </Button>
  </div>
</template>