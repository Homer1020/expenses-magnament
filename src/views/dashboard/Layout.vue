<script lang="ts">
export const iframeHeight = '800px'
export const description
  = 'A simple sidebar with navigation grouped by section.'
</script>

<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { computed } from 'vue'

import { RouterView } from 'vue-router'

import { useRoute } from 'vue-router'

const route = useRoute();
const breadcrumb = computed<Array<{title: string, href?: string}>>(() => {
  return route.meta.breadcrumb || []
})
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem :class="{ 'hidden md:block': index !== breadcrumb.length - 1 }" v-for="(crumb, index) in breadcrumb" :key="index">
              <BreadcrumbLink v-if="crumb.href" :href="crumb.href">
                {{ crumb.title }}
              </BreadcrumbLink>
              <template v-else>
                <BreadcrumbSeparator class="hidden md:block" v-if="index !== 0" />
                <BreadcrumbPage>
                  {{ crumb.title }}
                </BreadcrumbPage>
              </template>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <div class="flex flex-1 flex-col gap-4 p-4">
        <RouterView />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
