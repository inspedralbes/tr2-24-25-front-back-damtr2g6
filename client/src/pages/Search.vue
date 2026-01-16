<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <div class="mb-6">
          <h2 class="text-h4 font-weight-regular text-grey-darken-3 mb-1">
            Consulta d'Expedients
          </h2>
          <v-divider
            class="border-opacity-100"
            color="#005982"
            length="60"
            thickness="3"
          ></v-divider>
        </div>

        <v-card class="elevation-1 border mb-6">
          <v-card-text class="pa-6">
            <label class="text-subtitle-2 text-grey-darken-2 mb-2 d-block"
              >Identificador de l'Alumne</label
            >
            <v-row dense>
              <v-col cols="12" sm="9">
                <v-text-field
                  v-model="ralcSearch"
                  label="Introdueix el RALC"
                  placeholder="Ex: 12345678"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="comfortable"
                  color="#005982"
                  hide-details
                  @keyup.enter="searchStudent"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="3">
                <v-btn
                  block
                  height="48"
                  color="#005982"
                  class="text-white text-capitalize"
                  :loading="isLoading"
                  :disabled="!ralcSearch"
                  @click="searchStudent"
                >
                  Cercar
                </v-btn>
              </v-col>
            </v-row>
            <p class="text-caption text-grey mt-2">
              * La cerca es limita als alumnes del vostre centre o als quals
              teniu permís d'accés.
            </p>
          </v-card-text>
        </v-card>

        <v-expand-transition>
          <div v-if="error">
            <v-alert
              type="warning"
              variant="tonal"
              border="start"
              border-color="warning"
              class="mb-6"
            >
              {{ error }}
            </v-alert>
          </div>
        </v-expand-transition>

        <v-fade-transition>
          <div v-if="studentData">
            <div class="d-flex align-center mb-4">
              <v-icon color="#005982" class="mr-2"
                >mdi-file-document-check-outline</v-icon
              >
              <h3 class="text-h6 text-grey-darken-3">Resultats de la Cerca</h3>
            </div>
            <v-card class="border rounded-lg elevation-1 overflow-hidden">
              <StudentDataDisplay :student-data="studentData.extractedData" />
            </v-card>
          </div>
        </v-fade-transition>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from "vue";
import StudentDataDisplay from "@/components/StudentDataDisplay.vue";

const ralcSearch = ref("");
const studentData = ref(null);
const isLoading = ref(false);
const error = ref(null);

const searchStudent = async () => {
  if (!ralcSearch.value) return;

  isLoading.value = true;
  error.value = null;
  studentData.value = null;

  try {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user || !user.id) {
      throw new Error("Sessió caducada. Torna a iniciar sessió.");
    }

    const response = await fetch(
      `/api/students/${ralcSearch.value}?userId=${user.id}`
    );

    if (!response.ok) {
      if (response.status === 404)
        throw new Error("No s'ha trobat cap expedient amb aquest RALC.");
      if (response.status === 403)
        throw new Error("Accés denegat: No tens permisos per a aquest alumne.");
      throw new Error(`Error del servidor (${response.status})`);
    }

    const data = await response.json();
    studentData.value = data;
  } catch (err) {
    console.error(err);
    error.value = err.message;
  } finally {
    isLoading.value = false;
  }
};
</script>
