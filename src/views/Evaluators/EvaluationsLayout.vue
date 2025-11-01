<template>
  <div class="evaluations-layout">
    <TopBar />

    <main class="container-fluid mt-3">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import TopBar from '@/components/TopBar.vue'
</script>

<style scoped>
.evaluations-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main.container-fluid {
  padding: 0 1rem;
}
</style>
