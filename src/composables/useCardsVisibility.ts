import { useLocalStorage } from '@vueuse/core'

// Preferencia por página para mostrar u ocultar las cards de resumen.
export function useCardsVisibility(pageKey: string) {
  return useLocalStorage<boolean>(`expenses:cards:${pageKey}`, true)
}
