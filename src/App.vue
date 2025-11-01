<script setup>
import { RouterView } from 'vue-router'
import { useThemeProvider } from '@/composables/useTheme'

useThemeProvider()
</script>

<template>
  <RouterView class="d-flex min-vh-100 body-bg m-0 p-0" />
</template>

<style>
@import '@/styles/index.less';

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>
