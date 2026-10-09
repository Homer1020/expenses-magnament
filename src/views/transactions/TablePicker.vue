<script setup lang="ts">
import type { DateRange } from 'reka-ui'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import {
  DateFormatter,
  getLocalTimeZone,
  parseDate,
} from '@internationalized/date'
import { CalendarIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium',
})

const { modelValue } = defineProps<{
  modelValue: DateRange
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: DateRange): void
}>()

function onRangeChange(newValue: DateRange) {
  emit('update:modelValue', newValue)
}

// Inputs nativos (móvil): trabajan con 'YYYY-MM-DD'
const startValue = computed(() => modelValue.start?.toString() ?? '')
const endValue = computed(() => modelValue.end?.toString() ?? '')

function onNativeChange(edge: 'start' | 'end', value: string) {
  if (!value) return
  const picked = parseDate(value)
  let start = edge === 'start' ? picked : modelValue.start
  let end = edge === 'end' ? picked : modelValue.end
  if (start && end && start.compare(end) > 0) {
    // Rango invertido: el extremo que se acaba de elegir arrastra al otro
    if (edge === 'start') end = picked
    else start = picked
  }
  emit('update:modelValue', { start, end } as DateRange)
}
</script>

<template>
  <div class="grid grid-cols-2 gap-2 lg:hidden">
    <label class="space-y-1 text-xs text-muted-foreground">
      Desde
      <Input
        type="date"
        class="text-foreground"
        :model-value="startValue"
        :max="endValue || undefined"
        @update:model-value="onNativeChange('start', String($event))"
      />
    </label>
    <label class="space-y-1 text-xs text-muted-foreground">
      Hasta
      <Input
        type="date"
        class="text-foreground"
        :model-value="endValue"
        :min="startValue || undefined"
        @update:model-value="onNativeChange('end', String($event))"
      />
    </label>
  </div>

  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'max-lg:hidden w-full lg:w-[280px] justify-start text-left font-normal',
          !modelValue && 'text-muted-foreground',
        )"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        <template v-if="modelValue.start">
          <template v-if="modelValue.end">
            {{ df.format(modelValue.start.toDate(getLocalTimeZone())) }} - {{ df.format(modelValue.end.toDate(getLocalTimeZone())) }}
          </template>

          <template v-else>
            {{ df.format(modelValue.start.toDate(getLocalTimeZone())) }}
          </template>
        </template>
        <template v-else>
          Pick a date
        </template>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <RangeCalendar
        :model-value="modelValue"
        @update:modelValue="onRangeChange"
        initial-focus
        :number-of-months="2"
      />
    </PopoverContent>
  </Popover>
</template>