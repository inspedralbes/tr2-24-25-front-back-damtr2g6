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
          prepend-icon="mdi-text-box-search-outline"
          title="Consulta d'Expedients"
          to="/search"
          color="primary"
        ></v-list-item>
        <v-list-item
          v-if="isLoggedIn"
          prepend-icon="mdi-folder-account-outline"
          title="Els Meus Expedients"
          to="/my-pis"
          color="primary"
        ></v-list-item>
        <v-divider class="my-2"></v-divider>
        <v-btn v-if="isLoggedIn" variant="text" to="/profile" class="mr-2">Perfil</v-btn>
        <v-list-item
          v-if="isLoggedIn"
          prepend-icon="mdi-logout-variant"
          title="Desconnectar"
          @click="logout"
          color="error"
        ></v-list-item>
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

      <v-avatar class="ml-2 mr-3" color="white" rounded="0" size="45">
        <v-img
          src="https://www.edubcn.cat/img/hdr_logo_ceb_2019.svg"
          contain
          class="pa-1"
        ></v-img>
      </v-avatar>

      <div class="d-flex flex-column">
        <v-toolbar-title class="font-weight-bold text-white text-body-1">
          Consorci d'Educació de Barcelona
        </v-toolbar-title>
        <span
          class="text-caption text-white d-none d-sm-block ml-4"
          style="margin-top: -4px; opacity: 0.9"
        >
          Gestió de Plans Individualitzats (PI)
        </span>
      </div>

      <v-spacer></v-spacer>

      <div v-if="showNavigation" class="d-none d-md-flex align-center">
        <v-btn variant="text" to="/home" class="text-white text-capitalize mx-1"
          >Extractor</v-btn
        >
        <v-btn
          variant="text"
          to="/search"
          class="text-white text-capitalize mx-1"
          >Cercador</v-btn
        >
        <v-btn
          v-if="isLoggedIn"
          variant="text"
          to="/my-pis"
          class="text-white text-capitalize mx-1"
          >Expedients</v-btn
        >

        <v-divider
          vertical
          class="mx-3 border-opacity-50"
          color="white"
        ></v-divider>

        <v-btn
          v-if="isLoggedIn"
          variant="outlined"
          @click="logout"
          color="white"
          size="small"
          prepend-icon="mdi-logout"
        >
          Sortir
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

const router = useRouter();
const route = useRoute();
const { mdAndUp } = useDisplay();

const drawer = ref(false);
const isLoggedIn = ref(false);

const showNavigation = computed(() => {
  return !["login", "register"].includes(route.name);
});

const checkLoginStatus = () => {
  const user = localStorage.getItem("user");
  isLoggedIn.value = !!user;
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
