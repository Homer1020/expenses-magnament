<script setup lang="ts">
import { RouterView } from 'vue-router';
import { Toaster } from './components/ui/sonner';
import OfflineBanner from './components/OfflineBanner.vue';
</script>
<template>
  <Toaster class="pointer-events-auto" rich-colors close-button position="top-right" />
  <OfflineBanner />
  <RouterView />
</template>
