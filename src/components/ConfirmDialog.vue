<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
</script>
<template>
  <Dialog>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Seguro!</DialogTitle>
        <DialogDescription>
          Esta acción no se puede revertir
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button>
          Si eliminar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>