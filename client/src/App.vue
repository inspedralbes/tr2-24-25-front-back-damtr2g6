<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Aplicació Generalitat</v-toolbar-title>
      <v-spacer></v-spacer>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <v-footer app>
      <span>&copy; {{ new Date().getFullYear() }} Generalitat de Catalunya</span>
    </v-footer>
  </v-app>
</template>

<script setup>
  //
</script>
<style>
body {
  font-family: 'Open Sans', sans-serif;
}
</style>
