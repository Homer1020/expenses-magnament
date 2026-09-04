<script setup lang="ts">
import { RouterView } from 'vue-router';
import { Toaster } from './components/ui/sonner';
</script>
<template>
  <Toaster class="pointer-events-auto" rich-colors close-button position="top-right" />
  <RouterView />
</template>
