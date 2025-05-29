<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup>
import { useTheme } from 'vuetify'
const theme = useTheme()
theme.global.name.value = 'light';
</script>

<style>

</style>

