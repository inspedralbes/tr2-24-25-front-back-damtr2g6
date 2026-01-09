<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Aplicació Generalitat</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text to="/home" class="mr-2">Extractor</v-btn>
      <v-btn text to="/search" class="mr-2">Cercador</v-btn>
      <v-btn text @click="logout" color="error">Tancar Sessió</v-btn>
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
import { useRouter } from 'vue-router';

const router = useRouter();

const logout = () => {
  localStorage.removeItem('user');
  router.push('/');
};
</script>
<style>
body {
  font-family: 'Open Sans', sans-serif;
}
</style>
