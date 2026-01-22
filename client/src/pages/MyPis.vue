<template>
  <v-container class="py-8">
    <!-- STUDENT DETAIL VIEW -->
    <div v-if="selectedStudent">
      <v-btn
        class="mb-4"
        prepend-icon="mdi-arrow-left"
        variant="text"
        @click="selectedStudent = null"
      >
        Tornar a la llista
      </v-btn>
      <v-card class="border rounded-lg elevation-1 overflow-hidden">
        <v-card-title class="bg-grey-lighten-4 py-3 px-4 d-flex align-center">
             <v-icon color="#005982" class="mr-2">mdi-file-document-check-outline</v-icon>
             <span class="text-h6 text-grey-darken-3">Detall de l'Expedient</span>
        </v-card-title>
        <v-divider></v-divider>
        <StudentDataDisplay :student-data="selectedStudent.extractedData" />
      </v-card>
    </div>

    <!-- STUDENT LIST VIEW -->
    <div v-else>
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
            <div>
              <v-btn
                v-if="isAdmin"
                variant="flat"
                color="indigo-darken-2"
                prepend-icon="mdi-view-dashboard"
                class="mr-3"
                @click="router.push('/dashboard')"
              >
                Anar al Dashboard
              </v-btn>
              <v-btn
                v-if="isAdmin"
                variant="flat"
                color="blue-grey-darken-2"
                prepend-icon="mdi-download"
                class="mr-3"
                @click="downloadTestPi()"
              >
                Descargar PI de Prueba
              </v-btn>
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
          </div>
          <v-alert v-if="isAdmin" type="info" variant="tonal" class="mb-4">
            👋 Hola Admin! Estàs veient tots els Projectes Individuals del centre. Pots gestionar permisos de qualsevol PI.
          </v-alert>

          <!-- Search Bar -->
          <v-text-field
            v-model="searchQuery"
            label="Cercar per Nom o RALC"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            color="#005982"
            clearable
            class="mb-4"
            hide-details
          ></v-text-field>
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

      <v-row v-else-if="filteredStudents.length === 0">
        <v-col cols="12">
          <v-empty-state
            icon="mdi-magnify-remove-outline"
            headline="Sense Resultats"
            title="No s'han trobat expedients"
            :text="students.length > 0 ? 'Prova amb un altre criteri de cerca.' : 'Encara no has processat cap Pla Individualitzat o no tens permisos delegats.'"
            :action-text="students.length === 0 ? 'Anar a l\'Extractor' : undefined"
            @click:action="students.length === 0 ? $router.push('/home') : undefined"
            color="#005982"
          ></v-empty-state>
        </v-col>
      </v-row>

      <v-row v-else>
        <v-col
          v-for="student in filteredStudents"
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
              <!-- Details button functionality -->
               <v-btn
                variant="text"
                color="#005982"
                size="small"
                prepend-icon="mdi-eye"
                @click="selectedStudent = student"
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

              <v-btn
                v-if="isOwner(student) || isAuthorized(student)"
                variant="text"
                color="indigo-darken-2"
                size="small"
                icon="mdi-domain"
                title="Traspassar a un altre Centre"
                @click="openTransferDialog(student)"
              ></v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- AUTH DIALOG -->
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

    <!-- TRANSFER DIALOG -->
    <v-dialog v-model="transferDialog" max-width="500">
      <v-card class="rounded-lg">
        <v-toolbar
          color="indigo-darken-2"
          density="compact"
          title="Traspassar Expedient"
          class="text-white"
        ></v-toolbar>
        <v-card-text class="pa-4">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4" icon="mdi-alert">
             Atenció: Estàs a punt de moure aquest expedient a la jurisdicció d'un altre centre.
          </v-alert>
          <p class="text-body-2 mb-4">
            Selecciona el centre de destinació per a l'alumne 
            <strong>{{ studentToTransfer?.name }}</strong>.
          </p>
          
          <v-autocomplete
            v-model="targetCenterCode"
            :items="centrosList"
            item-title="name"
            item-value="code"
            label="Cercar centre educatiu"
            prepend-inner-icon="mdi-school"
            variant="outlined"
            density="comfortable"
            color="indigo-darken-2"
            placeholder="Escriu el nom del centre..."
            no-data-text="No s'han trobat centres"
          ></v-autocomplete>

          <v-alert
            v-if="transferError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2"
            >{{ transferError }}</v-alert
          >
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="transferDialog = false">Cancel·lar</v-btn>
          <v-btn
            color="indigo-darken-2"
            variant="flat"
            :loading="transferLoading"
            :disabled="!targetCenterCode"
            @click="transferStudent"
          >
            Confirmar Traspàs
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
import StudentDataDisplay from "@/components/StudentDataDisplay.vue";
import { useRouter } from "vue-router";

const router = useRouter();
const students = ref([]);
const selectedStudent = ref(null);
const filteredStudents = computed(() => {
  if (!searchQuery.value) return students.value;
  const q = searchQuery.value.toLowerCase();
  return students.value.filter(s => 
    s.name?.toLowerCase().includes(q) || 
    s._id?.toLowerCase().includes(q)
  );
});
const searchQuery = ref("");
const loading = ref(true);
const error = ref(null);
const currentUser = ref(null);

const authDialog = ref(false);
const authLoading = ref(false);
const authError = ref("");
const studentToAuth = ref(null);
const targetUsername = ref("");

const transferDialog = ref(false);
const transferLoading = ref(false);
const transferError = ref("");
const studentToTransfer = ref(null);
const targetCenterCode = ref(null);
const centrosList = ref([]);

const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");

onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    currentUser.value = JSON.parse(userStr);
    fetchMyStudents();
    fetchCentros();
  } else {
    error.value = 'No has iniciat sessió.';
    loading.value = false;
  }
});

const isAdmin = computed(() => currentUser.value?.role === 'admin');

const isOwner = (student) => {
  return isAdmin.value || (currentUser.value && String(student.ownerId) === String(currentUser.value.id));
};

const isAuthorized = (student) => {
    return currentUser.value && student.authorizedUsers && student.authorizedUsers.includes(currentUser.value.id);
};

const fetchCentros = async () => {
  try {
    const res = await fetch('/api/centros');
    if (res.ok) {
      centrosList.value = await res.json();
    }
  } catch (e) {
    console.error("Error fetching centros", e);
  }
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

const downloadTestPi = () => {
    // Abre una nueva ventana/pestaña para iniciar la descarga del archivo de prueba
    window.open(`/api/download-test-pi?userId=${currentUser.value.id}`, '_blank');
    showSnackbar("Descargando archivo de prueba...", "info");
};

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

const openTransferDialog = (student) => {
  studentToTransfer.value = student;
  targetCenterCode.value = null;
  transferError.value = "";
  transferDialog.value = true;
};

const transferStudent = async () => {
  if (!studentToTransfer.value || !targetCenterCode.value) return;
  transferLoading.value = true;
  transferError.value = "";

  try {
    const response = await fetch(
      `/api/students/${studentToTransfer.value._id}/transfer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.value.id,
          targetCenterCode: targetCenterCode.value,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al traspassar");

    snackbarText.value = `Expedient traspassat correctament.`;
    snackbarColor.value = "success";
    snackbar.value = true;
    transferDialog.value = false;
    // Optionally refresh list or remove item?
    // fetchMyStudents(); 
  } catch (e) {
    transferError.value = e.message;
  } finally {
    transferLoading.value = false;
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
