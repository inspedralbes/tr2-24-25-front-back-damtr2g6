<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card class="pa-4">
          <v-card-title class="text-h5 text-center">
            Extractor de Dades del PI
          </v-card-title>
          <v-card-subtitle class="text-center mb-4">
            (Amb IA Local)
          </v-card-subtitle>

          <v-file-input
            v-model="file"
            label="Selecciona un fitxer .docx"
            accept=".docx"
            outlined
            dense
            @change="handleFileUpload"
          ></v-file-input>

          <v-btn
            block
            color="primary"
            :disabled="!file || isLoading"
            :loading="isLoading"
            @click="uploadFile"
            class="mt-4"
          >
            {{ isLoading ? 'Processant amb IA...' : 'Pujar i Extreure Dades' }}
          </v-btn>

          <v-alert v-if="error" type="error" class="mt-4" variant="tonal">
            {{ error }}
          </v-alert>
        </v-card>

        <StudentDataDisplay v-if="extractedData" :student-data="extractedData" />

        <div v-if="extractedData">
             <!-- Secció per guardar a la Base de Dades (només si hi ha dades) -->
            <div v-if="Object.keys(extractedData).length > 0" class="mt-6 pa-4 border rounded">
              <h3 class="text-h6 mb-2">Guardar a la Base de Dades</h3>
              <v-text-field
                v-model="ralc"
                label="Introdueix el RALC de l'alumne"
                placeholder="Ex: 1234567890"
                variant="outlined"
                density="compact"
                hide-details="auto"
                class="mb-2"
              ></v-text-field>
              <v-btn
                color="success"
                block
                :loading="isSaving"
                :disabled="!ralc"
                @click="saveToDatabase"
              >
                Guardar Dades
              </v-btn>
            </div>

       </div>
      </v-col>
    </v-row>


    <!-- Success Dialog -->
    <v-dialog v-model="showSuccessDialog" max-width="500" persistent>
      <v-card class="text-center pa-6">
        <v-icon
          icon="mdi-check-circle"
          color="success"
          size="100"
          class="mb-4"
        ></v-icon>
        <v-card-title class="text-h5 font-weight-bold text-success mb-2">
          ALUMNE INTRODUIT CORRECTAMENT
        </v-card-title>
        <v-card-text class="text-body-1 text-medium-emphasis mb-6">
          Les dades s'han guardat exitosament a la base de dades.
        </v-card-text>
        <v-btn
          color="primary"
          size="large"
          block
          rounded="pill"
          @click="resetState"
        >
          Tornar a l'inici
        </v-btn>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import StudentDataDisplay from '@/components/StudentDataDisplay.vue';

const router = useRouter();
const file = ref(null);
const extractedData = ref(null);
const isLoading = ref(false);
const error = ref(null);
const ralc = ref('');
const isSaving = ref(false);
const showSuccessDialog = ref(false);
const apiUrl = '/upload';

const handleFileUpload = (event) => {
  file.value = event.target.files[0];
  extractedData.value = null;
  error.value = null;
};

const uploadFile = async () => {
  if (!file.value) return;

  isLoading.value = true;
  error.value = null;

      const formData = new FormData();
      formData.append('piFile', file.value); 

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData 
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error del servidor: ${response.status}. Detall: ${errorText.substring(0, 100)}...`);
        }

        const data = await response.json();
        extractedData.value = data.data;

      } catch (err) {
        console.error('Error en la petició o processament:', err);
        error.value = `No es pot extreure les dades. Assegura't que el servidor Node/Ollama està en marxa. Detall: ${err.message}`;
        extractedData.value = null;
      } finally {
        isLoading.value = false;
      }
    }

const saveToDatabase = async () => {
  if (!ralc.value) return;
  isSaving.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ralc: ralc.value,
        extractedData: extractedData.value
      })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccessDialog.value = true; // Mostrar popup en lloc d'alert
    } else {
      throw new Error(data.error || 'Error desconegut al guardar');
    }
  } catch (err) {
    error.value = 'Error guardant a la BD: ' + err.message;
  } finally {
    isSaving.value = false;
  }
};

const resetState = () => {
  file.value = null;
  extractedData.value = null;
  ralc.value = '';
  error.value = null;
  showSuccessDialog.value = false;
  // Opcional: Si vols recarregar la pàgina completament:
  // window.location.reload(); 
  // Però reiniciar l'estat és més ràpid i "SPA-friendly".
};

const logout = () => {
  localStorage.removeItem('user');
  router.push('/login');
};
</script>

<style scoped>
/* Scoped styles have been removed in favor of Vuetify components and utility classes. */
</style>