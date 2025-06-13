<script setup lang="ts">
import type { Account } from '@/types';
import { onMounted, ref } from 'vue';
import { columns } from './columns';
import DataTable from '@/components/DataTable.vue';
import * as categoriesService from '@/services/categories';
import Button from '@/components/ui/button/Button.vue';

const accounts = ref<Account[]>([
  {
    name: 'Gastos de mensualida UNI',
    id: 10
  }
]);

onMounted(() => {
  categoriesService.getAll().then(resp => { 
    accounts.value = resp;
  });
});

</script>

<template>
  <div class="flex items-center justify-between mb-3">
    <h1 class="font-medium text-lg">Cuentas</h1>
    <Button>Nueva Cuenta</Button>
  </div>

  <DataTable :data="accounts" :columns="columns" />
</template>