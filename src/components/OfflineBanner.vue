<script setup lang="ts">
import { ref, watch } from 'vue'
import { useOnline } from '@vueuse/core'
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-vue-next'

const isOnline = useOnline()
const showBanner = ref(false)
const wasOffline = ref(false)
const isRestoring = ref(false)
const dismissed = ref(false)

watch(
  isOnline,
  (online) => {
    if (!online) {
      showBanner.value = true
      wasOffline.value = true
      dismissed.value = false
    } else if (wasOffline.value) {
      // Show restored connection notification briefly
      isRestoring.value = true
      setTimeout(() => {
        isRestoring.value = false
        showBanner.value = false
        wasOffline.value = false
      }, 3500)
    }
  },
  { immediate: true }
)

const handleReload = () => {
  window.location.reload()
}

const dismiss = () => {
  dismissed.value = true
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4 sm:translate-y-6"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4 sm:translate-y-6"
  >
    <div
      v-if="showBanner && !dismissed"
      role="status"
      aria-live="polite"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
    >
      <div
        class="flex items-center gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-colors"
        :class="
          isRestoring
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/40'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200 dark:bg-amber-950/40'
        "
      >
        <!-- Icon -->
        <div
          class="shrink-0 p-2 rounded-lg"
          :class="
            isRestoring
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
          "
        >
          <Wifi v-if="isRestoring" class="w-5 h-5 animate-bounce" />
          <WifiOff v-else class="w-5 h-5" />
        </div>

        <!-- Text -->
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wider">
            {{ isRestoring ? 'Conexión Restablecida' : 'Modo Offline' }}
          </p>
          <p class="text-sm font-medium opacity-90 truncate">
            {{
              isRestoring
                ? 'Sincronizando los datos de la app...'
                : 'Sin conexión a internet. Usando datos locales.'
            }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 shrink-0">
          <button
            v-if="!isRestoring"
            @click="handleReload"
            type="button"
            title="Reintentar conexión"
            class="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCw class="w-4 h-4" />
          </button>
          <button
            @click="dismiss"
            type="button"
            title="Cerrar aviso"
            class="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
