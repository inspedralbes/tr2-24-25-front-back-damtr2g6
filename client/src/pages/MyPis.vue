<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold mb-6 text-center text-primary">Els Meus PI's</h1>
        <v-alert v-if="isAdmin" type="info" variant="tonal" class="mb-4">
          👋 Hola Admin! Estàs veient tots els Projectes Individuals del centre. Pots gestionar permisos de qualsevol PI.
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" variant="tonal">
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-else-if="students.length === 0">
      <v-col cols="12" class="text-center">
        <v-empty-state
          icon="mdi-folder-open-outline"
          title="No tens cap PI"
          text="Encara no has pujat cap Projecte Individual o ningú t'ha autoritzat a veure'n cap."
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
        <v-card class="h-100 d-flex flex-column hover-card" elevation="2">
          <v-toolbar color="primary" density="comfortable">
            <v-toolbar-title class="text-subtitle-1 white--text">
              {{ student.name }}
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-chip size="small" variant="elevated" color="secondary" class="mr-2">
              {{ isOwner(student) ? 'Propietari' : 'Autoritzat' }}
            </v-chip>
          </v-toolbar>

          <v-card-text class="flex-grow-1 pt-4">
            <div class="mb-2"><strong>RALC:</strong> {{ student._id }}</div>
            <div class="mb-2"><strong>Data Naixement:</strong> {{ student.birthDate }}</div>
            <div class="mb-2 text-caption text-grey">
              Creat: {{ new Date(student.createdAt).toLocaleDateString() }}
            </div>
            
            <v-divider class="my-3"></v-divider>
            
            <div v-if="isOwner(student)">
              <strong>Usuaris Autoritzats:</strong>
              <div v-if="student.authorizedUsers && student.authorizedUsers.length > 0" class="d-flex flex-wrap gap-1 mt-1">
                 <v-chip v-for="uId in student.authorizedUsers" :key="uId" size="x-small" pill>
                   ID: {{ uId }}
                 </v-chip>
              </div>
              <div v-else class="text-caption font-italic text-grey mt-1">Cap usuari autoritzat.</div>
            </div>
          </v-card-text>

          <v-card-actions class="justify-space-between pa-4 bg-grey-lighten-4">
            <v-btn
              variant="text"
              color="primary"
              @click="viewDetails(student)"
              prepend-icon="mdi-eye"
            >
              Veure Detalls
            </v-btn>

            <v-btn
              v-if="isOwner(student)"
              variant="tonal"
              color="secondary"
              @click="openAuthorizeDialog(student)"
              prepend-icon="mdi-account-key"
              size="small"
            >
              Autoritzar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog Detalls -->
    <v-dialog v-model="detailsDialog" fullscreen transition="dialog-bottom-transition">
       <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="detailsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>Detalls del PI: {{ selectedStudent?.name }}</v-toolbar-title>
        </v-toolbar>

        <v-container>
           <StudentDataDisplay v-if="selectedStudent" :student-data="selectedStudent.extractedData" />
        </v-container>
      </v-card>
    </v-dialog>

    <!-- Dialog Autoritzar -->
    <v-dialog v-model="authDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h6 bg-secondary text-white pa-4">
          Autoritzar Usuari
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">Introdueix el nom d'usuari de la persona a qui vols donar accés a aquest PI.</p>
          <v-text-field
            v-model="targetUsername"
            label="Nom d'usuari"
            variant="outlined"
            prepend-inner-icon="mdi-account"
            placeholder="Ex: usuari123"
            :error-messages="authError"
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="authDialog = false">Cancel·lar</v-btn>
          <v-btn
            color="secondary"
            variant="elevated"
            :loading="authLoading"
            :disabled="!targetUsername"
            @click="authorizeUser"
          >
            Autoritzar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
      <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
    >
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Tancar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import StudentDataDisplay from '@/components/StudentDataDisplay.vue';

const students = ref([]);
const loading = ref(true);
const error = ref(null);
const currentUser = ref(null);

const detailsDialog = ref(false);
const selectedStudent = ref(null);

const authDialog = ref(false);
const targetUsername = ref('');
const authLoading = ref(false);
const authError = ref('');
const studentToAuth = ref(null);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

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
  try {
    const response = await fetch(`/api/my-students?userId=${currentUser.value.id}`);
    if (!response.ok) throw new Error('Error al carregar els PIs');
    students.value = await response.json();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const viewDetails = (student) => {
  selectedStudent.value = student;
  detailsDialog.value = true;
};

const openAuthorizeDialog = (student) => {
  studentToAuth.value = student;
  targetUsername.value = '';
  authError.value = '';
  authDialog.value = true;
};

const authorizeUser = async () => {
    if(!studentToAuth.value) return;

    authLoading.value = true;
    authError.value = '';

    try {
        const response = await fetch(`/api/students/${studentToAuth.value._id}/authorize`, {
            method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 userId: currentUser.value.id,
                 targetUsername: targetUsername.value
             })
        });

        const data = await response.json();

        if(!response.ok) {
            throw new Error(data.error || 'Error al autoritzar');
        }

        // Update local state
        const index = students.value.findIndex(s => s._id === studentToAuth.value._id);
        if(index !== -1) {
            // Refresh details or just close
            students.value[index].authorizedUsers = data.authorizedUsers;
        }

        snackbarText.value = `Usuari ${targetUsername.value} autoritzat correctament!`;
        snackbarColor.value = 'success';
        snackbar.value = true;
        authDialog.value = false;

    } catch (e) {
        authError.value = e.message;
    } finally {
        authLoading.value = false;
    }
}

</script>

<style scoped>
.hover-card {
  transition: transform 0.2s, box-shadow 0.2s;
}
.hover-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}
.gap-1 {
    gap: 4px;
}
</style>
