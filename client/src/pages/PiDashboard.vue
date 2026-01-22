<template>
  <v-container class="py-8 bg-grey-lighten-4">
    <div class="w-100 max-w-screen-xl mx-auto">
      <!-- HEADER -->
      <div class="mb-8">
        <v-row align="center">
          <v-col cols="12" md="8">
             <div class="d-flex align-center mb-2">
                <v-icon color="indigo-darken-2" size="x-large" class="mr-3">mdi-view-dashboard</v-icon>
                <h1 class="text-h4 font-weight-bold text-grey-darken-3 mb-0">Dashboard del Centre</h1>
             </div>
             <p class="text-subtitle-1 text-grey-darken-1 ml-11">
                Resum de dades dels Plans Individualitzats i usuaris del teu centre
             </p>
          </v-col>
          <v-col cols="12" md="4" class="text-right">
             <v-btn
                prepend-icon="mdi-refresh"
                variant="outlined"
                color="indigo-darken-2"
                rounded="pill"
                @click="fetchDashboardSummary"
                :loading="loadingDashboard"
              >
                Actualitzar Dades
             </v-btn>
          </v-col>
        </v-row>
      </div>

      <!-- DASHBOARD SUMMARY CARDS -->
      <v-row class="mb-6">
          <v-col cols="12" sm="4">
              <v-card class="py-6 px-4 text-center rounded-xl elevation-3 border" color="white" :loading="loadingDashboard">
                  <v-icon color="blue" size="large" class="mb-2">mdi-school-outline</v-icon>
                  <p class="text-h4 font-weight-bold mb-0 text-blue-darken-2">{{ dashboardSummary.totalUsers }}</p>
                  <p class="text-caption text-grey font-weight-bold uppercase">ALUMNES TOTALS</p>
              </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card class="rounded-xl elevation-3 border" color="white" :loading="loadingDashboard">
              <v-card-title class="text-subtitle-1 font-weight-bold text-grey-darken-3 d-flex align-center">
                <v-icon start color="orange-darken-2">mdi-medical-bag</v-icon> PIs per Tipus de Diagnòstic
              </v-card-title>
              <v-card-text class="py-0">
                <v-list density="compact" class="bg-transparent">
                  <v-list-item v-for="item in dashboardSummary.piSummaryByType" :key="item._id">
                    <v-list-item-title>{{ item._id || 'Sense Diagnòstic' }}</v-list-item-title>
                    <template v-slot:append><v-chip size="small" color="orange-lighten-5" class="text-orange-darken-2 font-weight-bold">{{ item.count }}</v-chip></template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card class="rounded-xl elevation-3 border" color="white" :loading="loadingDashboard">
              <v-card-title class="text-subtitle-1 font-weight-bold text-grey-darken-3 d-flex align-center">
                <v-icon start color="green-darken-2">mdi-school</v-icon> Alumnes per Curs
              </v-card-title>
              <v-card-text class="py-0">
                <v-list density="compact" class="bg-transparent">
                  <v-list-item v-for="item in dashboardSummary.studentsByCourse" :key="item._id">
                    <v-list-item-title>{{ item._id || 'Sense Curs' }}</v-list-item-title>
                    <template v-slot:append><v-chip size="small" color="green-lighten-5" class="text-green-darken-2 font-weight-bold">{{ item.count }}</v-chip></template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
      </v-row>

      <v-alert v-if="!isAdmin" type="warning" variant="tonal" class="mb-4">
        ⚠️ Aquest dashboard només és visible per a administradors.
      </v-alert>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>

    </div>
    <v-snackbar v-model="snackbar" :color="snackbarColor" location="bottom right" timeout="3000">
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" icon="mdi-close" @click="snackbar = false"></v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const loadingDashboard = ref(false);
const dashboardSummary = ref({ totalUsers: 0, piSummaryByType: [], studentsByCourse: [] });
const currentUser = ref(null);
const error = ref(null);

const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");

const isAdmin = computed(() => currentUser.value?.role === 'admin');

onMounted(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        currentUser.value = JSON.parse(userStr);
        if (isAdmin.value) {
            fetchDashboardSummary();
        } else {
            error.value = "No tens permisos per veure aquest dashboard.";
        }
    } else {
        error.value = "Sessió no iniciada.";
    }
});

const fetchDashboardSummary = async () => {
    loadingDashboard.value = true;
    error.value = null;
    try {
        const res = await fetch(`/api/dashboard/summary?userId=${currentUser.value.id}`);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Error al recuperar el resum del dashboard");
        }
        dashboardSummary.value = await res.json();
    } catch (e) {
        console.error("Error fetching dashboard summary:", e);
        error.value = e.message;
        showSnackbar("Error carregant el resum del dashboard", "error");
    } finally {
        loadingDashboard.value = false;
    }
};

const showSnackbar = (text, color) => {
    snackbarText.value = text;
    snackbarColor.value = color;
    snackbar.value = true;
};
</script>

<style scoped>
/* Add any specific styles for this dashboard page here */
</style>