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

    <v-app-bar app color="white" height="64" class="border-b" elevation="0">
      <v-container class="d-flex align-center pa-0 h-100" fluid>

        <v-app-bar-nav-icon
          v-if="showNavigation"
          @click.stop="drawer = !drawer"
          class="d-md-none"
        ></v-app-bar-nav-icon>

        <router-link to="/" class="d-flex align-center text-decoration-none mr-4">
          <v-img
            src="https://www.edubcn.cat/img/hdr_logo_ceb_2019.svg"
            contain
            width="170"
            height="50"
            class="ml-2"
          ></v-img>
        </router-link>

        <div v-if="showNavigation" class="d-none d-md-flex align-center">
          <v-btn
            variant="text"
            to="/home"
            class="text-grey-darken-2"
            >Extractor</v-btn
          >
          <v-btn
            variant="text"
            to="/search"
            class="text-grey-darken-2"
            >Cercador</v-btn
          >
          <v-btn
            v-if="isLoggedIn"
            variant="text"
            to="/my-pis"
            class="text-grey-darken-2"
            >Expedients</v-btn
          >
        </div>

        <v-spacer></v-spacer>

        <div v-if="showNavigation" class="d-none d-md-flex align-center mr-4">
          <v-menu v-if="isLoggedIn" location="bottom" offset="8">
            <template v-slot:activator="{ props }">
               <v-avatar color="grey-lighten-3" size="36" v-bind="props" style="cursor: pointer;">
                  <v-icon color="grey-darken-1">mdi-account-circle-outline</v-icon>
                </v-avatar>
            </template>
            <v-list density="compact" class="mt-2 py-1">
              <v-list-subheader class="font-weight-bold">Connectat</v-list-subheader>
              <v-list-item to="/profile" title="El meu perfil" prepend-icon="mdi-account-box-outline"></v-list-item>
              <v-divider class="my-1"></v-divider>
              <v-list-item @click="logout" prepend-icon="mdi-logout-variant">
                <v-list-item-title class="text-red-darken-2">Desconnectar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>

      </v-container>
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
