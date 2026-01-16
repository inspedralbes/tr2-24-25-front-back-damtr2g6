<template>
  <v-card class="mt-6 pa-4">
    <v-card-title class="text-h6">
      ✅ Dades de l'Alumne
    </v-card-title>

    <v-card-text>
      <div class="mb-4">
        <p class="font-weight-bold">Dades de l'Alumne</p>
        <v-divider class="my-2"></v-divider>
        <p><strong>Nom i Cognoms:</strong> {{ studentData.dadesAlumne?.nomCognoms || 'N/D' }}</p>
        <p><strong>Data de Naixement:</strong> {{ studentData.dadesAlumne?.dataNaixement || 'N/D' }}</p>
        <p><strong>Curs:</strong> {{ studentData.dadesAlumne?.curs || 'N/D' }}</p>
      </div>

      <div class="mb-4">
        <p class="font-weight-bold">Motiu / Diagnòstic</p>
        <v-divider class="my-2"></v-divider>
        <p class="font-italic">{{ studentData.motiu?.diagnostic || 'N/D' }}</p>
      </div>

      <div v-if="studentData.adaptacionsGenerals && studentData.adaptacionsGenerals.length" class="mb-4">
        <p class="font-weight-bold">Adaptacions Generals Proposades (Sí)</p>
        <v-divider class="my-2"></v-divider>
        <ul class="pl-5">
          <li v-for="(adaptacio, index) in studentData.adaptacionsGenerals" :key="'A' + index">{{ adaptacio }}</li>
        </ul>
      </div>

      <div v-if="studentData.orientacions && studentData.orientacions.length">
        <p class="font-weight-bold">Orientacions</p>
        <v-divider class="my-2"></v-divider>
        <div v-for="(orientacio, index) in studentData.orientacions" :key="'O' + index" class="mb-2">
          {{ index + 1 }}. {{ orientacio }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  studentData: {
    type: Object,
    required: true
  }
});
</script>
