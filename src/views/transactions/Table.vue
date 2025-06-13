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
import { FlexRender, getCoreRowModel, useVueTable, getPaginationRowModel, type ColumnFiltersState, getFilteredRowModel } from '@tanstack/vue-table';
import Button from '@/components/ui/button/Button.vue';
import { ref } from 'vue';
import { Input } from '@/components/ui/input';
import TablePicker from './TablePicker.vue';
import type { DateRange } from 'reka-ui';
import ConfirmDialog from '@/components/ConfirmDialog.vue'
const {
  transactions,
  dateFilters
} = defineProps<{transactions: Transaction[], dateFilters: any}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void,
  (e: 'updatedFilters', dateRage: DateRange): void
}>()


const columnFilters = ref<ColumnFiltersState>([]) // can set initial column filter state here
const globalFilter = ref('')
const table = useVueTable({
  get data() { return transactions },
  get columns() { return columns(emit) },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
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

const updateFilters = (dateRange: DateRange) => {
  emit('updatedFilters', dateRange)
}

</script>
<template>
  <ConfirmDialog />
  <div class="mb-3 space-y-3 lg:space-y-0 lg:flex lg:gap-3">
    <Input
      placeholder="Buscar..."
      v-model="globalFilter"
      class="w-full lg:w-[280px]"
      />

    <TablePicker
      :modelValue="dateFilters"
      @update:modelValue="updateFilters"
      />
  </div>
  <div class="border rounded-md">
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
  </div>
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