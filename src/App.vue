<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { Toaster } from './components/ui/sonner';
import OfflineBanner from './components/OfflineBanner.vue';
import { useSettings } from './composables/useSettings';
import { useTheme } from './composables/useTheme';

const { initSettings } = useSettings();
useTheme();

onMounted(() => {
  initSettings();
});
</script>
<template>
  <Toaster class="pointer-events-auto" rich-colors close-button position="top-right" />
  <OfflineBanner />
  <RouterView />
</template>
