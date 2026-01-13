<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card class="pa-4 mb-6">
          <v-card-title class="text-h5 text-center">
            Cercador d'Alumnes
          </v-card-title>
          <v-card-text>
            <v-text-field v-model="ralcSearch" label="Introdueix el RALC" placeholder="Ex: 1234567890"
              append-inner-icon="mdi-magnify" variant="outlined" @keyup.enter="searchStudent"></v-text-field>
            <v-btn block color="primary" size="large" class="mt-4" :loading="isLoading" :disabled="!ralcSearch"
              @click="searchStudent">
              Buscar Alumne
            </v-btn>
          </v-card-text>
        </v-card>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-6">
          {{ error }}
        </v-alert>

        <StudentDataDisplay v-if="studentData" :student-data="studentData.extractedData" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import StudentDataDisplay from '@/components/StudentDataDisplay.vue';

const ralcSearch = ref('');
const studentData = ref(null);
const isLoading = ref(false);
const error = ref(null);

const searchStudent = async () => {
  if (!ralcSearch.value) return;

  isLoading.value = true;
  error.value = null;
  studentData.value = null;

  try {
    const response = await fetch(`http://localhost:4000/api/students/${ralcSearch.value}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No s\'ha trobat cap alumne amb aquest RALC.');
      }
      throw new Error('Error al connectar amb el servidor.');
    }

    const data = await response.json();
    studentData.value = data;

  } catch (err) {
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};
</script>
