<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '@/lib/formatters'
import { useSettings } from '@/composables/useSettings'

const props = defineProps<{
  value: number
  currency?: string
  inline?: boolean
}>()

const { bsEquivalenceEnabled, convertToBs } = useSettings()

const bsAmount = computed(() => {
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
    ≈ {{ formatted }}
  </span>
</template>
