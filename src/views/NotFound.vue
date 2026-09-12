<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Compass,
  Home,
  ArrowLeft,
  Receipt,
  FolderTree,
  Wallet,
  HelpCircle,
} from 'lucide-vue-next'

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const quickLinks = [
  { title: 'Dashboard', path: '/', icon: Home },
  { title: 'Transacciones', path: '/transactions', icon: Receipt },
  { title: 'Presupuestos', path: '/accounts', icon: Wallet },
  { title: 'Categorías', path: '/categories', icon: FolderTree },
]
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
    <!-- Ambient background glow -->
    <div
      class="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"
    />
    <div
      class="absolute -bottom-40 -right-40 w-96 h-96 bg-chart-1/5 rounded-full blur-3xl pointer-events-none"
    />

    <div class="w-full max-w-lg z-10 animate-in fade-in zoom-in-95 duration-300">
      <Card class="border-border shadow-xl backdrop-blur-sm bg-card/95">
        <CardHeader class="text-center pb-2">
          <!-- Illustration / Badge -->
          <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/60 text-primary border border-border shadow-inner">
            <Compass class="h-10 w-10 animate-spin" style="animation-duration: 20s;" />
          </div>

          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground mx-auto mb-2 border border-border">
            <HelpCircle class="w-3.5 h-3.5" />
            Error 404
          </div>

          <CardTitle class="text-2xl sm:text-3xl font-bold tracking-tight">
            Página no encontrada
          </CardTitle>
          <CardDescription class="text-sm sm:text-base text-muted-foreground mt-2 max-w-sm mx-auto">
            La ruta que buscas no existe o ha sido trasladada a otra ubicación.
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-6 pt-4">
          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-3">
            <Button
              variant="default"
              class="flex-1 cursor-pointer flex items-center justify-center gap-2 h-11"
              @click="router.push('/')"
            >
              <Home class="w-4 h-4" />
              Ir al Inicio
            </Button>
            <Button
              variant="outline"
              class="flex-1 cursor-pointer flex items-center justify-center gap-2 h-11"
              @click="goBack"
            >
              <ArrowLeft class="w-4 h-4" />
              Página anterior
            </Button>
          </div>

          <!-- Quick Navigation Links -->
          <div class="border-t border-border pt-4">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 text-center sm:text-left">
              Accesos rápidos
            </p>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="link in quickLinks"
                :key="link.path"
                type="button"
                @click="router.push(link.path)"
                class="flex items-center gap-2.5 p-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors border border-transparent hover:border-border text-left cursor-pointer"
              >
                <component :is="link.icon" class="w-4 h-4 shrink-0 text-foreground/70" />
                <span class="truncate">{{ link.title }}</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
