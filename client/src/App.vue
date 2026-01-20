<template>
  <v-app class="d-flex flex-column min-vh-100 bg-grey-lighten-5">
    <v-navigation-drawer
      v-if="showNavigation"
      v-model="drawer"
      temporary
      class="elevation-2"
    >
      <div class="pa-4 text-center">
        <v-img
          src="https://www.edubcn.cat/img/hdr_logo_ceb_2019.svg"
          height="40"
          contain
        ></v-img>
      </div>
      <v-divider></v-divider>
      <v-list nav density="compact" class="mt-2">
        <v-list-item
          prepend-icon="mdi-file-document-arrow-right"
          title="Digitalització (Extractor)"
          to="/home"
          color="primary"
        ></v-list-item>

        <v-list-item
          v-if="isLoggedIn"
          prepend-icon="mdi-folder-account-outline"
          title="Els Meus Expedients"
          to="/my-pis"
          color="primary"
        ></v-list-item>
        <div v-if="isLoggedIn">
          <v-divider class="my-2"></v-divider>
          <v-list-item
            prepend-icon="mdi-account-box-outline"
            title="Perfil"
            to="/profile"
          ></v-list-item>
          <v-list-item
            prepend-icon="mdi-logout-variant"
            title="Desconnectar"
            @click="logout"
            class="text-red"
          ></v-list-item>
        </div>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar elevation="1" color="#005982" density="comfortable">
      <template v-slot:prepend>
        <v-app-bar-nav-icon
          v-if="showNavigation"
          @click.stop="drawer = !drawer"
          class="d-md-none text-white"
        ></v-app-bar-nav-icon>
      </template>

      <!-- Logo -->
      <div 
        class="d-flex align-center mr-4" 
        style="height: 48px; min-width: 150px;"
      >
        <v-img
          :src="logoWhite"
          height="45"
          width="150"
          contain
        ></v-img>
      </div>

      <div class="d-flex flex-column">
        <v-toolbar-title class="font-weight-bold text-white text-body-1 d-none d-sm-block">
          Consorci d'Educació de Barcelona
        </v-toolbar-title>
        <span
          class="text-caption text-white d-none d-md-block"
          style="margin-top: -4px; opacity: 0.9"
        >
          Gestió de Plans Individualitzats (PI)
        </span>
      </div>

      <v-spacer></v-spacer>

      <div v-if="showNavigation" class="d-flex align-center">
        <!-- Desktop Navigation Links -->
        <div class="d-none d-md-flex mr-4">
          <v-btn variant="text" to="/home" class="text-white text-capitalize mx-1" rounded="pill">
            Extractor
          </v-btn>
          <v-btn
            v-if="isLoggedIn"
            variant="text"
            to="/my-pis"
            class="text-white text-capitalize mx-1"
            rounded="pill"
          >
            Expedients
          </v-btn>
        </div>

        <!-- Profile Dropdown -->
        <v-menu v-if="isLoggedIn" min-width="200px" rounded>
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" class="ml-2">
              <v-avatar color="grey-lighten-2" size="40" class="elevation-2">
                <v-icon icon="mdi-account" size="28" color="grey-darken-3"></v-icon>
              </v-avatar>
            </v-btn>
          </template>
          <v-card>
            <v-list-item class="px-4 pt-3 pb-2">
              <template v-slot:prepend>
                 <v-avatar color="#005982" size="40">
                    <span class="text-h6 text-white font-weight-bold">{{ userData.name.charAt(0).toUpperCase() }}</span>
                 </v-avatar>
              </template>
              <v-list-item-title class="font-weight-bold">{{ userData.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ userData.email }}</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-1"></v-divider>
            <v-list density="compact" nav>
              <v-list-item prepend-icon="mdi-account-circle-outline" value="profile" to="/profile" color="primary">
                <v-list-item-title>Veure perfil</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-logout" value="logout" @click="logout" color="error">
                <v-list-item-title>Tancar sessió</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
        
        <!-- Login Button if not logged in -->
        <v-btn
          v-else
          variant="outlined"
          to="/login"
          class="text-white text-capitalize"
          rounded="pill"
        >
          Iniciar Sessió
        </v-btn>
      </div>
    </v-app-bar>

    <v-main>
      <router-view v-slot="{ Component }">
        <v-fade-transition mode="out-in">
          <component :is="Component" />
        </v-fade-transition>
      </router-view>
    </v-main>

    <v-footer color="#333333" class="text-white flex-grow-0 py-1 text-caption">
      <v-container class="py-0">
        <v-row align="center" justify="space-between" no-gutters>
          <v-col cols="12" md="auto" class="text-center text-md-left">
            &copy; {{ new Date().getFullYear() }} —
            <strong>Consorci d'Educació de Barcelona</strong>
          </v-col>
          <v-col
            cols="12"
            md="auto"
            class="text-center text-md-right mt-1 mt-md-0"
          >
            <span class="mr-3">Avís Legal</span>
            <span>Accessibilitat</span>
          </v-col>
        </v-row>
      </v-container>
    </v-footer>
  </v-app>
</template>

<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useDisplay } from "vuetify";
import logoWhite from "@/assets/logo_white.svg";

const router = useRouter();
const route = useRoute();
const { mdAndUp } = useDisplay();

const drawer = ref(false);
const isLoggedIn = ref(false);
const userData = ref({ name: 'Usuari', email: '' });

const showNavigation = computed(() => {
  return !["login", "register"].includes(route.name);
});

const checkLoginStatus = () => {
  const user = localStorage.getItem("user");
  isLoggedIn.value = !!user;
  if (user) {
    try {
      const parsed = JSON.parse(user);
      userData.value = {
        name: parsed.name || parsed.username || 'Usuari',
        email: parsed.email || ''
      };
    } catch (e) {
      userData.value = { name: 'Usuari', email: '' }; // Fallback
    }
  }
};

const logout = () => {
  localStorage.removeItem("user");
  checkLoginStatus();
  router.push("/login");
};

onMounted(() => {
  checkLoginStatus();
});

watch(route, () => {
  checkLoginStatus();
});

watch(mdAndUp, (isDesktop) => {
  if (isDesktop) drawer.value = false;
});
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap");

body {
  font-family: "Roboto", sans-serif;
  background-color: #f5f5f5;
}
.min-vh-100 {
  min-height: 100vh;
}
</style>
