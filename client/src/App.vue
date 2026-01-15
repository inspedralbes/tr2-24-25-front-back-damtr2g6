<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Aplicació Generalitat</v-toolbar-title>
      <template v-if="showNavigation">
        <v-btn variant="text" to="/home" class="mr-2">Extractor</v-btn>
        <v-btn variant="text" to="/search" class="mr-2">Cercador</v-btn>
        <v-btn v-if="isLoggedIn" variant="text" to="/my-pis" class="mr-2">Els meus PI's</v-btn>
        <v-btn v-if="isLoggedIn" variant="text" @click="logout" color="error">Tancar Sessió</v-btn>
      </template>
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
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const isLoggedIn = ref(false);

const showNavigation = computed(() => {
  return !['login', 'register'].includes(route.name);
});

const checkLoginStatus = () => {
  const user = localStorage.getItem('user');
  console.log('App.vue checking login status. User found:', user);
  isLoggedIn.value = !!user;
  console.log('isLoggedIn set to:', isLoggedIn.value);
};

const logout = () => {
  console.log('Logging out...');
  localStorage.removeItem('user');
  checkLoginStatus();
  router.push('/');
};

onMounted(() => {
  checkLoginStatus();
});

watch(route, () => {
  console.log('Route changed, checking login status...');
  checkLoginStatus();
});
</script>
<style>
body {
  font-family: 'Open Sans', sans-serif;
}
</style>
