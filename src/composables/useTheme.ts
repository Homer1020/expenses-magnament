import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'

export type ThemePreference = 'light' | 'dark' | 'auto'

// Singleton a nivel de módulo: aplica/quita la clase `dark` en <html> y persiste
// la preferencia en localStorage. La clave debe coincidir con el script de index.html.
const mode = useColorMode({ storageKey: 'expenses:theme' })

const preference = computed<ThemePreference>({
  get: () => mode.store.value as ThemePreference,
  set: (value) => { mode.store.value = value },
})

const isDark = computed(() => mode.state.value === 'dark')

function toggleTheme() {
  preference.value = isDark.value ? 'light' : 'dark'
}

export function useTheme() {
  return { preference, isDark, toggleTheme }
}
