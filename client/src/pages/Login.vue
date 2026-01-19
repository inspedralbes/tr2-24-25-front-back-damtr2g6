<template>
  <v-container class="fill-height bg-grey-lighten-4" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <div class="text-center mb-8">
          <v-img
            src="https://www.edubcn.cat/img/hdr_logo_ceb_2019.svg"
            height="60"
            contain
          ></v-img>
        </div>

        <v-card class="elevation-4 rounded-lg border-opacity-100">
          <v-sheet color="#005982" height="6"></v-sheet>

          <div class="pa-8">
            <h1
              class="text-h5 font-weight-bold text-center text-grey-darken-3 mb-2"
            >
              Accés a l'Aplicatiu
            </h1>
            <p class="text-body-2 text-center text-grey-darken-1 mb-8">
              Identificació per a personal docent i administratiu
            </p>

            <v-form
              ref="form"
              v-model="isFormValid"
              @submit.prevent="submitLogin"
            >
              <v-autocomplete
                v-model="credentials.center_code"
                :items="centros"
                item-title="displayName"
                item-value="code"
                label="Centre Educatiu"
                prepend-inner-icon="mdi-domain"
                variant="outlined"
                density="comfortable"
                color="#005982"
                bg-color="grey-lighten-5"
                :rules="[(v) => !!v || 'Cal seleccionar un centre']"
                :loading="loadingCentros"
                no-data-text="No s'han trobat centres"
                placeholder="Codi o nom del centre..."
                class="mb-3"
              ></v-autocomplete>

              <v-text-field
                v-model="credentials.username"
                label="Usuari (Gencat / XTEC)"
                prepend-inner-icon="mdi-account-circle-outline"
                variant="outlined"
                density="comfortable"
                color="#005982"
                bg-color="grey-lighten-5"
                required
                class="mb-3"
              ></v-text-field>

              <v-text-field
                v-model="credentials.password"
                label="Contrasenya"
                prepend-inner-icon="mdi-lock-outline"
                :type="isPasswordVisible ? 'text' : 'password'"
                :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="isPasswordVisible = !isPasswordVisible"
                variant="outlined"
                density="comfortable"
                color="#005982"
                bg-color="grey-lighten-5"
                required
                class="mb-2"
              ></v-text-field>

              <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                density="compact"
                class="mt-4 mb-2 text-caption"
              >
                {{ errorMessage }}
              </v-alert>

              <v-btn
                block
                color="#005982"
                size="large"
                class="mt-6 text-white text-capitalize font-weight-bold"
                :disabled="!isFormValid"
                :loading="isLoading"
                type="submit"
                elevation="2"
              >
                Iniciar Sessió
              </v-btn>
            </v-form>
          </div>

          <v-divider></v-divider>

          <div class="pa-4 text-center bg-grey-lighten-5 rounded-b-lg">
            <span class="text-caption text-grey-darken-2">No tens compte?</span>
            <v-btn
              variant="text"
              color="#005982"
              size="small"
              class="font-weight-bold px-1"
              @click="redirectToRegister"
            >
              Sol·licitar Alta
            </v-btn>
          </div>
        </v-card>

        <div class="text-center mt-8 text-caption text-grey">
          &copy; {{ new Date().getFullYear() }} Consorci d'Educació de
          Barcelona<br />
          <span class="text-grey-lighten-1"
            >Suport Tècnic: suport.ceb@gencat.cat</span
          >
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, nextTick, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const isFormValid = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");
const isPasswordVisible = ref(false);
const credentials = ref({ username: "", password: "", center_code: null });
const centros = ref([]);
const loadingCentros = ref(false);

const fetchCentros = async () => {
  loadingCentros.value = true;
  try {
    const res = await fetch(`/api/centros?t=${Date.now()}`);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    const data = await res.json();
    // Formateamos para que se vea bonito en el desplegable
    centros.value = data.map((c) => ({
      ...c,
      displayName: `${c.name} (${c.code})`,
    }));
  } catch (error) {
    errorMessage.value = `Error carregant centres: ${error.message}`;
  } finally {
    loadingCentros.value = false;
  }
};

onMounted(() => {
  fetchCentros();
});

const redirectToRegister = () => router.push("/register");

const submitLogin = async () => {
  if (!isFormValid.value) return;
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials.value),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("user", JSON.stringify(data.user));
      await nextTick();
      router.push("/home");
    } else {
      errorMessage.value =
        data.error || "Credencials incorrectes o usuari no verificat.";
    }
  } catch (error) {
    errorMessage.value = "Error de comunicació amb el servidor.";
  } finally {
    isLoading.value = false;
  }
};
</script>
