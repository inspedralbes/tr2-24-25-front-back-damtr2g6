<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="9">
        <div class="mb-6 border-b pb-2">
          <h2 class="text-h4 font-weight-regular text-grey-darken-3">
            Digitalització de Documents
          </h2>
          <span class="text-subtitle-1 text-grey-darken-1">
            Extracció automatitzada de dades mitjançant IA
          </span>
        </div>

        <!-- EXAMPLE DOWNLOAD CARD -->
        <v-card class="mb-6 bg-blue-grey-lighten-5 border" variant="flat">
          <v-card-text
            class="d-flex flex-column flex-sm-row align-center justify-space-between"
          >
            <div class="mb-4 mb-sm-0">
              <div class="text-h6 text-blue-grey-darken-3 mb-1">
                <v-icon start color="blue-grey-darken-2"
                  >mdi-file-document-check</v-icon
                >
                Model de Document PI Recomanat
              </div>
              <p class="text-body-2 text-grey-darken-2 mb-0">
                Utilitzeu aquest model de document per garantir una extracció
                perfecta de les dades.
              </p>
            </div>
            <v-btn
              color="blue-grey-darken-2"
              variant="elevated"
              prepend-icon="mdi-download"
              href="/examples/Exemple_PI_Correcte.docx"
              target="_blank"
              class="align-self-start align-self-sm-center"
            >
              Descarregar Model
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card class="mb-6 elevation-1 border" variant="outlined">
          <v-card-text class="pa-6">
            <v-row align="center">
              <v-col cols="12" md="8">
                <div class="d-flex align-center mb-2">
                  <v-icon color="#005982" size="large" class="mr-3"
                    >mdi-cloud-upload</v-icon
                  >
                  <span class="text-h6">Càrrega d'Arxius</span>
                </div>
                <p class="text-body-2 text-grey mb-4">
                  Selecciona els fitxers .docx dels Plans Individualitzats. El
                  sistema processarà el contingut automàticament.
                </p>

                <v-file-input
                  v-model="filesToUpload"
                  label="Seleccionar fitxers (.docx, .odt)"
                  accept=".docx,.odt"
                  multiple
                  variant="outlined"
                  density="compact"
                  prepend-icon=""
                  prepend-inner-icon="mdi-file-document-outline"
                  show-size
                  chips
                  color="#005982"
                  @change="clearErrors"
                ></v-file-input>
              </v-col>

              <v-col cols="12" md="4" class="text-center">
                <v-btn
                  block
                  height="56"
                  color="#005982"
                  class="text-white"
                  prepend-icon="mdi-cog-play"
                  :disabled="filesToUpload.length === 0 || isLoading"
                  :loading="isLoading"
                  @click="uploadFiles"
                >
                  Iniciar Procés
                </v-btn>
              </v-col>
            </v-row>

            <v-expand-transition>
              <div v-if="error">
                <v-alert
                  type="error"
                  variant="tonal"
                  density="compact"
                  class="mt-4"
                  icon="mdi-alert-circle-outline"
                >
                  {{ error }}
                </v-alert>
              </div>
            </v-expand-transition>
          </v-card-text>
        </v-card>

        <div v-if="uploads.length > 0">
          <div class="d-flex align-center justify-space-between mb-3">
            <h3 class="text-h6 text-grey-darken-2">Cua de Processament</h3>
            <v-chip size="small" variant="outlined"
              >{{ uploads.length }} tasques</v-chip
            >
          </div>

          <v-card class="elevation-1 table-responsive">
            <v-table>
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th class="text-left">Nom de l'arxiu</th>
                  <th class="text-center">Estat</th>
                  <th class="text-left">Detalls</th>
                  <th class="text-right">Accions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="upload in uploads" :key="upload.id">
                  <td class="font-weight-medium text-body-2">
                    <v-icon
                      icon="mdi-file-word-outline"
                      size="small"
                      class="mr-2"
                      color="primary"
                    ></v-icon>
                    {{ upload.file.name }}
                  </td>
                  <td class="text-center">
                    <v-chip
                      size="x-small"
                      :color="getColorForStatus(upload.status)"
                      label
                      class="text-uppercase font-weight-bold"
                    >
                      {{ translateStatus(upload.status) }}
                    </v-chip>
                  </td>
                  <td class="text-caption text-grey-darken-1">
                    <div
                      v-if="
                        upload.status === 'processing' ||
                        upload.status === 'uploading'
                      "
                    >
                      <v-progress-circular
                        indeterminate
                        size="16"
                        width="2"
                        color="primary"
                        class="mr-2"
                      ></v-progress-circular>
                      {{ upload.message || "Processant..." }}
                    </div>
                    <span v-else>{{ upload.message }}</span>
                  </td>
                  <td class="text-right">
                    <v-btn
                      v-if="upload.status === 'completed' && !upload.result"
                      size="small"
                      variant="flat"
                      color="orange"
                      class="text-white"
                      prepend-icon="mdi-alert-circle"
                      disabled
                    >
                      Processant resultat
                    </v-btn>
                    <v-btn
                      v-if="upload.status === 'completed' && upload.result"
                      size="small"
                      variant="flat"
                      color="#005982"
                      class="text-white"
                      @click="viewDetails(upload)"
                      prepend-icon="mdi-eye"
                    >
                      Veure Dades
                    </v-btn>
                    <v-btn
                      v-if="
                        upload.status === 'completed' ||
                        upload.status === 'failed'
                      "
                      icon
                      size="small"
                      variant="text"
                      @click="removeUpload(upload.id)"
                      title="Eliminar de la llista"
                    >
                      <v-icon>mdi-close</v-icon>
                    </v-btn>
                    <v-icon
                      v-if="upload.status === 'failed'"
                      color="error"
                      title="Error en el procés"
                      >mdi-alert-circle</v-icon
                    >
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </div>
      </v-col>
    </v-row>

    <v-dialog
      v-model="detailsDialog"
      fullscreen
      transition="dialog-bottom-transition"
    >
      <v-card class="bg-grey-lighten-5">
        <v-toolbar color="#005982" density="compact">
          <v-btn icon color="white" @click="closeDetailsDialog"
            ><v-icon>mdi-close</v-icon></v-btn
          >
          <v-toolbar-title class="text-white text-subtitle-1"
            >Revisió de Dades Extretes:
            {{ selectedUpload?.file.name }}</v-toolbar-title
          >
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            color="white"
            @click="confirmSaveDialog = true"
            :loading="isSaving"
            :disabled="!ralc"
          >
            <v-icon start>mdi-content-save</v-icon> Confirmar i Desar
          </v-btn>
        </v-toolbar>

        <v-container>
          <v-row>
            <v-col cols="12" md="8">
              <StudentDataDisplay
                v-if="selectedUpload?.result"
                :student-data="selectedUpload.result"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-card class="position-sticky" style="top: 20px">
                <v-card-title class="text-subtitle-2 bg-grey-lighten-3"
                  >Validació d'Identitat</v-card-title
                >
                <v-card-text class="pt-4">
                  <v-alert
                    v-if="saveError"
                    type="error"
                    variant="tonal"
                    class="mb-4 text-caption"
                  >
                    {{ saveError }}
                  </v-alert>
                  <p class="text-caption mb-2">
                    Per finalitzar la importació, introdueix el RALC oficial de
                    l'alumne per vincular l'expedient.
                  </p>
                  <v-text-field
                    v-model="ralc"
                    label="RALC de l'alumne"
                    placeholder="Ex: 1234567890"
                    variant="outlined"
                    density="compact"
                    bg-color="white"
                    persistent-hint
                    hint="Aquest camp és obligatori per a la base de dades"
                  ></v-text-field>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions>
                  <v-btn
                    color="success"
                    block
                    variant="elevated"
                    :loading="isSaving"
                    :disabled="!ralc"
                    @click="confirmSaveDialog = true"
                  >
                    Desar a l'Expedient
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmSaveDialog" persistent max-width="450px">
      <v-card class="rounded-xl pa-2">
        <div v-if="!showSuccessAnimation">
            <div class="d-flex justify-end pa-1">
                <v-btn icon="mdi-close" variant="text" size="small" @click="confirmSaveDialog = false"></v-btn>
            </div>
          <v-card-text class="text-center pt-0">
              <v-icon color="#005982" size="56" class="mb-3">mdi-database-arrow-right-outline</v-icon>
              <h3 class="text-h6 font-weight-bold mb-2">Desar a l'Expedient</h3>
              <p class="text-medium-emphasis text-body-2 mx-4">
                  Aquesta acció desarà les dades de l'alumne amb el RALC <strong>{{ ralc }}</strong>.
              </p>
          </v-card-text>
          <v-card-actions class="justify-center pb-4 px-4">
              <v-btn
                block
                size="large"
                color="#005982"
                variant="elevated"
                class="text-white"
                @click="confirmAndSave"
                :loading="isSaving"
              >
                Confirmar i Desar
              </v-btn>
          </v-card-actions>
        </div>
        <div v-else class="d-flex flex-column justify-center align-center text-center" style="min-height: 280px;">
            <v-icon color="success" size="96" class="mb-3">mdi-check-circle-outline</v-icon>
            <h3 class="text-h5 font-weight-bold text-grey-darken-2">Guardat amb Èxit</h3>
        </div>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="4000"
      location="top right"
    >
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          icon="mdi-close"
          @click="snackbar = false"
        ></v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useUploadStore } from "@/store/uploadStore";
import StudentDataDisplay from "@/components/StudentDataDisplay.vue";

const uploadStore = useUploadStore();
const { uploads } = storeToRefs(uploadStore);

const currentUser = ref(null);
const filesToUpload = ref([]);
const isLoading = ref(false);
const error = ref(null);
const apiUrl = "/upload";

const detailsDialog = ref(false);
const selectedUpload = ref(null);
const ralc = ref("");
const isSaving = ref(false);
const saveError = ref(null);
const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");
const confirmSaveDialog = ref(false);
const showSuccessAnimation = ref(false);

onMounted(() => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    currentUser.value = JSON.parse(userStr);
  } else {
    error.value = "Sessió caducada.";
  }
});

const clearErrors = () => (error.value = null);

const uploadFiles = async () => {
  if (filesToUpload.value.length === 0) return;
  isLoading.value = true;
  error.value = null;

  for (const file of filesToUpload.value) {
    const uploadId = Date.now() + Math.random();
    const newUpload = {
      id: uploadId,
      file,
      status: "uploading",
      message: "Iniciant càrrega...",
      jobId: null,
      result: null,
    };
    uploadStore.addUpload(newUpload);

    const formData = new FormData();
    formData.append("piFile", file);
    formData.append("userId", currentUser.value.id);

    try {
      const response = await fetch(apiUrl, { method: "POST", body: formData });
      const data = await response.json();
      if (response.status !== 202)
        throw new Error(data.error || `Error ${response.status}`);

      const upload = uploads.value.find((u) => u.id === uploadId);
      if (upload) {
        uploadStore.updateUpload(upload.jobId, {
          status: "queued",
          message: "En cua de processament...",
          jobId: data.jobId,
        });
      }
    } catch (err) {
      const upload = uploads.value.find((u) => u.id === uploadId);
      if (upload) {
        uploadStore.updateUpload(upload.jobId, {
          status: "failed",
          message: err.message,
        });
      }
      if (!error.value) error.value = "Error en la càrrega dels fitxers.";
    }
  }
  filesToUpload.value = [];
  isLoading.value = false;
};

const saveToDatabase = async () => {
  if (!ralc.value || !selectedUpload.value) return false;
  isSaving.value = true;
  saveError.value = null;
  let success = false;

  try {
    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ralc: ralc.value,
        extractedData: selectedUpload.value.result,
        userId: currentUser.value.id,
        centerCode: currentUser.value.center_code,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al desar");

    snackbarText.value = "Expedient actualitzat correctament";
    snackbarColor.value = "success";
    snackbar.value = true;
    uploadStore.removeUpload(selectedUpload.value.id);
    closeDetailsDialog();
    success = true;
  } catch (err) {
    saveError.value = "Error: " + err.message;
  } 
  return success;
};

const confirmAndSave = async () => {
  isSaving.value = true;
  const savedSuccessfully = await saveToDatabase();
  isSaving.value = false; // Stop button loading right away

  if (savedSuccessfully) {
    showSuccessAnimation.value = true;
    setTimeout(() => {
      confirmSaveDialog.value = false;
      // Reset animation state after dialog is closed
      setTimeout(() => {
        showSuccessAnimation.value = false;
      }, 200); // After transition
    }, 1500);
  }
};

const viewDetails = (upload) => {
  selectedUpload.value = upload;
  ralc.value = "";
  saveError.value = null;
  detailsDialog.value = true;
};

const closeDetailsDialog = () => {
  detailsDialog.value = false;
  selectedUpload.value = null;
  ralc.value = "";
  saveError.value = null;
};

const removeUpload = (uploadId) => {
  uploadStore.removeUpload(uploadId);
};

const getColorForStatus = (status) =>
  ({
    uploading: "blue-grey",
    queued: "grey",
    processing: "orange-darken-2",
    completed: "success",
    failed: "error",
  })[status] || "grey";

const translateStatus = (status) => {
  const map = {
    uploading: "Pujant",
    queued: "En Cua",
    processing: "Processant IA",
    completed: "Completat",
    failed: "Error",
  };
  return map[status] || status;
};
</script>
<style scoped>
.table-responsive {
  overflow-x: auto;
}
</style>
