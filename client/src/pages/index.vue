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
          <v-btn icon dark @click="detailsDialog = false"><v-icon>mdi-close</v-icon></v-btn>
          <v-toolbar-title>Detalls del PI: {{ selectedUpload?.file.name }}</v-toolbar-title>
        </v-toolbar>
        <v-container>
          <StudentDataDisplay v-if="selectedUpload?.result" :student-data="selectedUpload.result" />
        </v-container>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import StudentDataDisplay from '@/components/StudentDataDisplay.vue';

const router = useRouter();
const currentUser = ref(null);
const filesToUpload = ref([]);
const uploads = ref([]); // Array to hold upload objects { id, file, status, jobId, result, message }
const isLoading = ref(false);
const error = ref(null);
const ws = ref(null);
const wsStatus = ref('Disconnected');
const apiUrl = '/upload';

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
    if(wsReconnectInterval) clearInterval(wsReconnectInterval); // Clear reconnect interval on success
  };

  ws.value.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    console.log('Notification received:', notification);
    const upload = uploads.value.find(u => u.jobId === notification.jobId);
    if (upload) {
      upload.status = notification.status;
      upload.message = notification.message;
      if (notification.status === 'completed') {
        // We need to fetch the full data as it's not sent over WS
        fetchJobResult(upload);
      }
    }
  };

  ws.value.onclose = () => {
    console.log('WebSocket disconnected');
    wsStatus.value = 'Disconnected. Retrying...';
    if(!wsReconnectInterval) {
        wsReconnectInterval = setInterval(setupWebSocket, 5000); // Retry every 5 seconds
    }
  };

  ws.value.onerror = (err) => {
    console.error('WebSocket error:', err);
    wsStatus.value = 'Error';
  };
};

const fetchJobResult = async (upload) => {
    try {
        // Assuming there is an endpoint to get job results by ID
        // This endpoint needs to be created in the backend.
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
  if (ws.value) {
    ws.value.close();
  }
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
    const newUpload = { id: uploadId, file, status: 'uploading', message: '' };
    uploads.value.unshift(newUpload); // Add to the top of the list

    const formData = new FormData();
    formData.append('piFile', file);
    formData.append('userId', currentUser.value.id);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      if (response.status !== 202) { // 202 Accepted
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
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

  filesToUpload.value = []; // Clear the input
  isLoading.value = false;
};

// UI Helpers
const getIconForStatus = (status) => {
  const icons = {
    uploading: 'mdi-upload',
    queued: 'mdi-clock-outline',
    processing: 'mdi-cogs',
    completed: 'mdi-check-circle',
    failed: 'mdi-alert-circle',
  };
  return icons[status] || 'mdi-file-question';
};

const getColorForStatus = (status) => {
    const colors = {
    uploading: 'blue',
    queued: 'grey',
    processing: 'orange',
    completed: 'success',
    failed: 'error',
  };
  return colors[status] || 'grey';
}

const detailsDialog = ref(false);
const selectedUpload = ref(null);

const viewDetails = (upload) => {
  selectedUpload.value = upload;
  detailsDialog.value = true;
};
</script>

<style scoped>
/* Scoped styles */
</style>