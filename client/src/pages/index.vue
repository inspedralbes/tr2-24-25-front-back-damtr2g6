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

        <v-card v-if="extractedData" class="mt-6 pa-4">
          <v-card-title class="text-h6">
            ✅ Dades Extretes Correctament
          </v-card-title>

          <v-card-text>
            <div class="mb-4">
              <p class="font-weight-bold">Dades de l'Alumne</p>
              <v-divider class="my-2"></v-divider>
              <p><strong>Nom i Cognoms:</strong> {{ extractedData.dadesAlumne?.nomCognoms || 'N/D' }}</p>
              <p><strong>Data de Naixement:</strong> {{ extractedData.dadesAlumne?.dataNaixement || 'N/D' }}</p>
              <p><strong>Curs:</strong> {{ extractedData.dadesAlumne?.curs || 'N/D' }}</p>
            </div>

            <div class="mb-4">
              <p class="font-weight-bold">Motiu / Diagnòstic</p>
              <v-divider class="my-2"></v-divider>
              <p class="font-italic">{{ extractedData.motiu?.diagnostic || 'N/D' }}</p>
            </div>

            <div v-if="extractedData.adaptacionsGenerals && extractedData.adaptacionsGenerals.length" class="mb-4">
              <p class="font-weight-bold">Adaptacions Generals Proposades (Sí)</p>
              <v-divider class="my-2"></v-divider>
              <ul class="pl-5">
                <li v-for="(adaptacio, index) in extractedData.adaptacionsGenerals" :key="'A'+index">{{ adaptacio }}</li>
              </ul>
            </div>

            <div v-if="extractedData.orientacions && extractedData.orientacions.length">
              <p class="font-weight-bold">Orientacions</p>
              <v-divider class="my-2"></v-divider>
              <div v-for="(orientacio, index) in extractedData.orientacions" :key="'O'+index" class="mb-2">
                {{ index + 1 }}. {{ orientacio }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const file = ref(null);
const extractedData = ref(null);
const isLoading = ref(false);
const error = ref(null);
const apiUrl = 'http://localhost:4000/upload';

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

const logout = () => {
  localStorage.removeItem('user');
  router.push('/login');
};
</script>

<style scoped>
/* Scoped styles have been removed in favor of Vuetify components and utility classes. */
</style>