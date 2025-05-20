<script setup lang="ts">
import type { DateRange } from 'reka-ui'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import {
  DateFormatter,
  getLocalTimeZone,
} from '@internationalized/date'
import { CalendarIcon } from 'lucide-vue-next'

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
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'w-full lg:w-[280px] justify-start text-left font-normal',
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