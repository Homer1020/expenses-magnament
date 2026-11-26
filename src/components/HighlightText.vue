<script setup lang="ts">
import { computed } from 'vue'
import { normalizeText } from '@/lib/search'

const props = defineProps<{
  text: string
  terms?: string[]
}>()

// Segmentos { value, match } sobre el texto original; la búsqueda ignora acentos y mayúsculas.
const segments = computed(() => {
  const text = props.text ?? ''
  const terms = (props.terms ?? []).filter(Boolean)
  if (!terms.length || !text) return [{ value: text, match: false }]

  // Normalización carácter a carácter para conservar los índices del texto original
  const normalized = Array.from(text).map((ch) => normalizeText(ch) || ch).join('')
  if (normalized.length !== text.length) return [{ value: text, match: false }]

  const marked = new Array<boolean>(text.length).fill(false)
  for (const term of terms) {
    let from = 0
    let idx: number
    while ((idx = normalized.indexOf(term, from)) !== -1) {
      for (let i = idx; i < idx + term.length; i++) marked[i] = true
      from = idx + term.length
    }
  }

  const result: { value: string; match: boolean }[] = []
  for (let i = 0; i < text.length; i++) {
    const last = result[result.length - 1]
    if (last && last.match === marked[i]) last.value += text[i]
    else result.push({ value: text[i], match: marked[i] })
  }
  return result
})
</script>

<template>
  <template v-for="(seg, i) in segments" :key="i">
    <mark
      v-if="seg.match"
      class="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/40"
    >{{ seg.value }}</mark>
    <template v-else>{{ seg.value }}</template>
  </template>
</template>
