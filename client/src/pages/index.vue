<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card class="pa-4">
          <v-card-title class="text-h5 text-center">
            Extractor de Dades del PI
          </v-card-title>
          <v-card-subtitle class="text-center mb-4">
            (Processament en segon pla)
          </v-card-subtitle>

          <v-file-input
            v-model="filesToUpload"
            label="Selecciona un o més fitxers .docx"
            accept=".docx"
            multiple
            outlined
            dense
            @change="clearErrors"
          ></v-file-input>

          <v-btn block color="primary" :disabled="filesToUpload.length === 0 || isLoading" :loading="isLoading" @click="uploadFiles">
            {{ isLoading ? 'Pujant fitxers...' : 'Pujar i Encolar per Processar' }}
          </v-btn>

          <v-alert v-if="error" type="error" class="mt-4" variant="tonal">
            {{ error }}
          </v-alert>
          <v-alert v-if="wsStatus !== 'Connected'" type="warning" class="mt-4" variant="tonal">
            Estat del WebSocket: {{ wsStatus }}
          </v-alert>
        </v-card>

        <!-- Secció de cues de processament -->
        <div v-if="uploads.length > 0" class="mt-6">
          <h3 class="text-h6 mb-2">Cua de Processament</h3>
          <v-card v-for="upload in uploads" :key="upload.id" class="mb-3">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon>{{ getIconForStatus(upload.status) }}</v-icon>
              </template>

              <v-list-item-title>{{ upload.file.name }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip size="x-small" :color="getColorForStatus(upload.status)">{{ upload.status }}</v-chip>
                <span v-if="upload.message" class="ml-2 text-caption">{{ upload.message }}</span>
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-btn v-if="upload.status === 'completed'" size="small" color="primary" variant="tonal" @click="viewDetails(upload)">
                  Veure Dades
                </v-btn>
              </template>
            </v-list-item>
             <v-progress-linear
                :active="upload.status === 'uploading' || upload.status === 'processing'"
                indeterminate
                color="primary"
              ></v-progress-linear>
          </v-card>
        </div>

      </v-col>
    </v-row>

    <!-- Dialog Detalls -->
    <v-dialog v-model="detailsDialog" fullscreen transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="closeDetailsDialog"><v-icon>mdi-close</v-icon></v-btn>
          <v-toolbar-title>Detalls del PI: {{ selectedUpload?.file.name }}</v-toolbar-title>
        </v-toolbar>
        <v-container>
          <StudentDataDisplay v-if="selectedUpload?.result" :student-data="selectedUpload.result" />

          <!-- Secció per guardar a la Base de Dades -->
          <div v-if="selectedUpload?.result && Object.keys(selectedUpload.result).length > 0" class="mt-6 pa-4 border rounded">
            <h3 class="text-h6 mb-2">Desar a la Base de Dades</h3>
             <v-alert v-if="saveError" type="error" variant="tonal" class="mb-4">
                {{ saveError }}
            </v-alert>
            <v-text-field v-model="ralc" label="Introdueix el RALC de l'alumne" placeholder="Ex: 1234567890"
              variant="outlined" density="compact" hide-details="auto" class="mb-2"></v-text-field>
            <v-btn color="success" block :loading="isSaving" :disabled="!ralc" @click="saveToDatabase">
              Desar Dades de l'Alumne
            </v-btn>
          </div>
        </v-container>
      </v-card>
    </v-dialog>

     <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Tancar</v-btn>
      </template>
    </v-snackbar>

  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import StudentDataDisplay from '@/components/StudentDataDisplay.vue';

const currentUser = ref(null);
const filesToUpload = ref([]);
const uploads = ref([]); // Array to hold upload objects { id, file, status, jobId, result, message }
const isLoading = ref(false);
const error = ref(null);
const ws = ref(null);
const wsStatus = ref('Disconnected');
const apiUrl = '/upload';

// State for Details Dialog and Saving
const detailsDialog = ref(false);
const selectedUpload = ref(null);
const ralc = ref('');
const isSaving = ref(false);
const saveError = ref(null);

// State for Snackbar
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

let wsReconnectInterval = null;

const setupWebSocket = () => {
  if (!currentUser.value?.id) {
    wsStatus.value = "User not logged in";
    return;
  }
  
  const wsUrl = `ws://${window.location.hostname}:4001?userId=${currentUser.value.id}`;
  wsStatus.value = 'Connecting...';
  ws.value = new WebSocket(wsUrl);

  ws.value.onopen = () => {
    console.log('WebSocket connected');
    wsStatus.value = 'Connected';
    if(wsReconnectInterval) clearInterval(wsReconnectInterval);
  };

  ws.value.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    console.log('WebSocket: Notificación recibida:', notification);
    
    const upload = uploads.value.find(u => u.jobId === notification.jobId);
    
    if (upload) {
      console.log(`WebSocket: Encontrado trabajo ${notification.jobId}. Actualizando estado a ${notification.status}.`);
      upload.status = notification.status;
      upload.message = notification.message;
      if (notification.status === 'completed') {
        fetchJobResult(upload);
      }
    } else {
      console.warn(`WebSocket: No se encontró el trabajo ${notification.jobId}.`);
    }
  };

  ws.value.onclose = () => {
    console.log('WebSocket disconnected');
    wsStatus.value = 'Disconnected. Retrying...';
    if(!wsReconnectInterval) {
        wsReconnectInterval = setInterval(setupWebSocket, 5000);
    }
  };

  ws.value.onerror = (err) => {
    console.error('WebSocket error:', err);
    wsStatus.value = 'Error';
  };
};

const fetchJobResult = async (upload) => {
    try {
        const response = await fetch(`/api/jobs/${upload.jobId}?userId=${currentUser.value.id}`);
        if (!response.ok) throw new Error('Failed to fetch job result');
        const job = await response.json();
        upload.result = job.result;
    } catch(e) {
        console.error('Error fetching job result:', e);
        upload.status = 'failed';
        upload.message = 'Could not retrieve processed data.';
    }
};

onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    currentUser.value = JSON.parse(userStr);
    setupWebSocket();
  } else {
    error.value = 'No has iniciat sessió.';
  }
});

onUnmounted(() => {
  if (ws.value) ws.value.close();
  if(wsReconnectInterval) clearInterval(wsReconnectInterval);
});

const clearErrors = () => {
  error.value = null;
};

const uploadFiles = async () => {
  if (filesToUpload.value.length === 0) return;
  isLoading.value = true;
  error.value = null;

  for (const file of filesToUpload.value) {
    const uploadId = Date.now() + Math.random();
    const newUpload = { id: uploadId, file, status: 'uploading', message: '', jobId: null };
    uploads.value.unshift(newUpload);

    const formData = new FormData();
    formData.append('piFile', file);
    formData.append('userId', currentUser.value.id);

    try {
      const response = await fetch(apiUrl, { method: 'POST', body: formData });
      const data = await response.json();
      if (response.status !== 202) throw new Error(data.error || `Error ${response.status}`);
      
      newUpload.status = 'queued';
      newUpload.jobId = data.jobId;
      newUpload.message = 'Enqueued for processing.';
    } catch (err) {
      console.error('Error uploading file:', err);
      newUpload.status = 'failed';
      newUpload.message = err.message;
      if (!error.value) error.value = 'One or more files failed to upload.';
    }
  }
  filesToUpload.value = [];
  isLoading.value = false;
};

const saveToDatabase = async () => {
  if (!ralc.value || !selectedUpload.value) return;
  isSaving.value = true;
  saveError.value = null;

  try {
    if (!currentUser.value || !currentUser.value.id) {
       throw new Error('Usuari no identificat. Torna a iniciar sessió.');
    }

    const response = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ralc: ralc.value,
        extractedData: selectedUpload.value.result,
        userId: currentUser.value.id
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error desconegut al guardar');

    snackbarText.value = "Dades de l'alumne desades correctament!";
    snackbarColor.value = 'success';
    snackbar.value = true;
    closeDetailsDialog();
    
    // Optional: remove the completed upload from the list
    uploads.value = uploads.value.filter(u => u.id !== selectedUpload.value.id);

  } catch (err) {
    saveError.value = 'Error guardant a la BD: ' + err.message;
  } finally {
    isSaving.value = false;
  }
};

const viewDetails = (upload) => {
  selectedUpload.value = upload;
  ralc.value = '';
  saveError.value = null;
  detailsDialog.value = true;
};

const closeDetailsDialog = () => {
    detailsDialog.value = false;
    selectedUpload.value = null;
    ralc.value = '';
    saveError.value = null;
}

const getIconForStatus = (status) => ({
  uploading: 'mdi-upload',
  queued: 'mdi-clock-outline',
  processing: 'mdi-cogs',
  completed: 'mdi-check-circle',
  failed: 'mdi-alert-circle',
}[status] || 'mdi-file-question');

const getColorForStatus = (status) => ({
  uploading: 'blue',
  queued: 'grey',
  processing: 'orange',
  completed: 'success',
  failed: 'error',
}[status] || 'grey');
</script>

<style scoped>
/* Scoped styles */
</style>