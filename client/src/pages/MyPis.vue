<template>
  <v-container class="py-8">
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between border-b pb-4">
          <div>
            <h2 class="text-h4 font-weight-regular text-grey-darken-3">
              Els Meus Expedients
            </h2>
            <span class="text-subtitle-1 text-grey-darken-1"
              >Gestió i custòdia de Plans Individualitzats</span
            >
          </div>
          <v-btn
            variant="outlined"
            color="#005982"
            prepend-icon="mdi-refresh"
            @click="fetchMyStudents"
            :loading="loading"
          >
            Actualitzar
          </v-btn>
        </div>
        <v-alert v-if="isAdmin" type="info" variant="tonal" class="mb-4">
          👋 Hola Admin! Estàs veient tots els Projectes Individuals del centre. Pots gestionar permisos de qualsevol PI.
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-12">
        <v-progress-circular
          indeterminate
          color="#005982"
          size="64"
        ></v-progress-circular>
        <p class="mt-4 text-grey">Carregant expedients...</p>
      </v-col>
    </v-row>

    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" variant="tonal" icon="mdi-alert-circle">
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-else-if="students.length === 0">
      <v-col cols="12">
        <v-empty-state
          icon="mdi-folder-open-outline"
          headline="Sense Expedients"
          title="No hi ha documents disponibles"
          text="Encara no has processat cap Pla Individualitzat o no tens permisos delegats."
          action-text="Anar a l'Extractor"
          @click:action="$router.push('/home')"
          color="#005982"
        ></v-empty-state>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col
        v-for="student in students"
        :key="student._id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card
          class="h-100 d-flex flex-column hover-card border"
          variant="flat"
        >
          <v-card-item>
            <template v-slot:prepend>
              <v-avatar color="blue-lighten-5" rounded="lg">
                <v-icon color="#005982">mdi-account-school</v-icon>
              </v-avatar>
            </template>
            <v-card-title class="font-weight-bold text-subtitle-1">{{
              student.name
            }}</v-card-title>
            <v-card-subtitle>
              <v-icon size="small" class="mr-1">mdi-identifier</v-icon> RALC:
              {{ student._id }}
            </v-card-subtitle>
          </v-card-item>

          <v-divider class="mx-4"></v-divider>

          <v-card-text class="flex-grow-1 pt-3">
            <div
              class="d-flex align-center text-caption text-grey-darken-1 mb-2"
            >
              <v-icon size="small" class="mr-2">mdi-calendar</v-icon>
              Data Naixement: {{ student.birthDate }}
            </div>

            <div class="mt-3">
              <v-chip
                size="small"
                :color="isOwner(student) ? 'green-darken-1' : 'blue-grey'"
                variant="flat"
                class="text-white font-weight-medium"
              >
                {{ isOwner(student) ? "Propietari" : "Accés Autoritzat" }}
              </v-chip>
            </div>
          </v-card-text>

          <v-card-actions class="bg-grey-lighten-5 px-4 py-3">
            <v-btn
              variant="text"
              color="#005982"
              size="small"
              prepend-icon="mdi-file-document-outline"
              @click="$router.push(`/search?ralc=${student._id}`)"
            >
              Veure Detall
            </v-btn>

            <v-spacer></v-spacer>

            <v-btn
              v-if="isOwner(student)"
              variant="text"
              color="orange-darken-4"
              size="small"
              icon="mdi-account-key"
              title="Gestionar Permisos"
              @click="openAuthDialog(student)"
            ></v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="authDialog" max-width="500">
      <v-card class="rounded-lg">
        <v-toolbar
          color="#005982"
          density="compact"
          title="Gestió de Permisos"
          class="text-white"
        ></v-toolbar>
        <v-card-text class="pa-4">
          <p class="text-body-2 mb-4">
            Autoritzar l'accés a l'expedient de
            <strong>{{ studentToAuth?.name }}</strong> a un altre professional.
          </p>
          <v-text-field
            v-model="targetUsername"
            label="Nom d'usuari del docent"
            prepend-inner-icon="mdi-account-search"
            variant="outlined"
            density="comfortable"
            color="#005982"
            placeholder="Ex: jgarcia"
          ></v-text-field>

          <v-alert
            v-if="authError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2"
            >{{ authError }}</v-alert
          >
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="authDialog = false">Cancel·lar</v-btn>
          <v-btn
            color="#005982"
            variant="flat"
            :loading="authLoading"
            :disabled="!targetUsername"
            @click="authorizeUser"
          >
            Autoritzar Accés
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" location="top right">
      {{ snackbarText }}
      <template v-slot:actions
        ><v-btn
          variant="text"
          icon="mdi-close"
          @click="snackbar = false"
        ></v-btn
      ></template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";

const students = ref([]);
const loading = ref(true);
const error = ref(null);
const currentUser = ref(null);

const authDialog = ref(false);
const authLoading = ref(false);
const authError = ref("");
const studentToAuth = ref(null);
const targetUsername = ref("");
const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");

onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    currentUser.value = JSON.parse(userStr);
    fetchMyStudents();
  } else {
    error.value = 'No has iniciat sessió.';
    loading.value = false;
  }
});

const isAdmin = computed(() => currentUser.value?.role === 'admin');

const isOwner = (student) => {
  return isAdmin.value || (currentUser.value && student.ownerId === currentUser.value.id);
};

const fetchMyStudents = async () => {
  loading.value = true;
  error.value = null;

  const userStr = localStorage.getItem("user");
  if (!userStr) {
    error.value = "Sessió no iniciada.";
    loading.value = false;
    return;
  }
  currentUser.value = JSON.parse(userStr);

  try {
    const response = await fetch(
      `/api/my-students?userId=${currentUser.value.id}`
    );
    if (!response.ok) throw new Error("Error al recuperar els expedients");
    students.value = await response.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchMyStudents();
});

const openAuthDialog = (student) => {
  studentToAuth.value = student;
  targetUsername.value = "";
  authError.value = "";
  authDialog.value = true;
};

const authorizeUser = async () => {
  if (!studentToAuth.value) return;
  authLoading.value = true;
  authError.value = "";

  try {
    const response = await fetch(
      `/api/students/${studentToAuth.value._id}/authorize`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.value.id,
          targetUsername: targetUsername.value,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al autoritzar");

    snackbarText.value = `Permís concedit a l'usuari ${targetUsername.value}`;
    snackbarColor.value = "success";
    snackbar.value = true;
    authDialog.value = false;
  } catch (e) {
    authError.value = e.message;
  } finally {
    authLoading.value = false;
  }
};
</script>

<style scoped>
.hover-card {
  transition: all 0.2s ease-in-out;
}
.hover-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
  border-color: #005982 !important;
}
</style>
