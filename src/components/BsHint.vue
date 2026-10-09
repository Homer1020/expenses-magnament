<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '@/lib/formatters'
import { useSettings } from '@/composables/useSettings'

const props = defineProps<{
  value: number
  currency?: string
  inline?: boolean
  /** Monto exacto en Bs guardado en la transacción; reemplaza la estimación. */
  exactBs?: number | null
}>()

const { bsEquivalenceEnabled, convertToBs } = useSettings()

const isExact = computed(() => !!props.exactBs && props.exactBs > 0)

const bsAmount = computed(() => {
  if (isExact.value) return props.exactBs as number
  if (!bsEquivalenceEnabled.value) return null
  return convertToBs(props.value)
})

const formatted = computed(() => (bsAmount.value === null ? null : formatCurrency(bsAmount.value, 'VES')))
</script>

<template>
  <span
    v-if="formatted"
    :class="inline
      ? 'text-[11px] text-muted-foreground ml-1'
      : 'block text-[11px] text-muted-foreground mt-0.5'"
  >
    {{ isExact ? '' : '≈ ' }}{{ formatted }}
  </span>
</template>
