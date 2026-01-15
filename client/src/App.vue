<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Aplicació Generalitat</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn text to="/home" class="mr-2">Extractor</v-btn>
      <v-btn text to="/search" class="mr-2">Cercador</v-btn>
      <v-btn v-if="isLoggedIn" text @click="logout" color="error">Tancar Sessió</v-btn>
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
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const isLoggedIn = ref(false);

const checkLoginStatus = () => {
  isLoggedIn.value = !!localStorage.getItem('user');
};

const logout = () => {
  localStorage.removeItem('user');
  checkLoginStatus();
  router.push('/');
};

onMounted(() => {
  checkLoginStatus();
});

watch(route, () => {
  checkLoginStatus();
});
</script>
<style>
body {
  font-family: 'Open Sans', sans-serif;
}
</style>