<template>
  <v-container class="fill-height bg-grey-lighten-4">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6" lg="5">
        <div class="text-center mb-6">
          <v-img
            src="https://www.edubcn.cat/img/hdr_logo_ceb_2019.svg"
            height="50"
            contain
          ></v-img>
        </div>

        <v-card class="rounded-lg elevation-3">
          <v-toolbar color="#005982" class="text-white" density="compact">
            <v-toolbar-title class="text-subtitle-1"
              >Alta d'Usuari</v-toolbar-title
            >
          </v-toolbar>

          <v-card-text class="pa-6">
            <v-window v-model="step">
              <v-window-item :value="1">
                <p class="text-body-2 text-grey-darken-2 mb-4">
                  Introdueix les teves dades professionals per sol·licitar
                  l'accés.
                </p>
                <v-form
                  ref="form"
                  v-model="isFormValid"
                  @submit.prevent="handleRegister"
                >
                  <v-autocomplete
                    v-model="formData.center_code"
                    :items="centros"
                    item-title="displayName"
                    item-value="code"
                    label="Centre Educatiu Assignat"
                    prepend-inner-icon="mdi-domain"
                    variant="outlined"
                    density="comfortable"
                    color="#005982"
                    :rules="[(v) => !!v || 'Cal assignar un centre']"
                    :loading="loadingCentros"
                    no-data-text="Sense resultats"
                    placeholder="Busca pel nom o codi..."
                    class="mb-3"
                  ></v-autocomplete>

                  <v-checkbox
                    v-model="formData.isAdmin"
                    label="Sóc responsable de centre"
                    class="mt-2"
                    @change="handleAdminChange"
                  ></v-checkbox>

                  <v-text-field
                    v-model="formData.email"
                    :label="formData.isAdmin ? 'Correu Oficial del Centre' : 'Correu Electrònic Corporatiu'"
                    prepend-inner-icon="mdi-email-outline"
                    variant="outlined"
                    density="comfortable"
                    hint="Ha de ser @edu.gencat.cat o @inspedralbes.cat"
                    persistent-hint
                    color="#005982"
                    :rules="[
                      (v) => !!v || 'Correu obligatori',
                      (v) => /.+@.+\..+/.test(v) || 'Format de correu invàlid',
                    ]"
                    class="mb-3"
                  ></v-text-field>

                  <v-text-field
                    v-model="formData.username"
                    label="Nom d'Usuari Desitjat"
                    prepend-inner-icon="mdi-account-edit-outline"
                    variant="outlined"
                    density="comfortable"
                    color="#005982"
                    :rules="[
                      (v) => !!v || 'Usuari obligatori',
                      (v) => v.length >= 3 || 'Mínim 3 caràcters',
                    ]"
                    class="mb-3"
                  ></v-text-field>

                  <v-text-field
                    v-model="formData.password"
                    label="Contrasenya"
                    prepend-inner-icon="mdi-lock-plus-outline"
                    :type="isPasswordVisible ? 'text' : 'password'"
                    :append-inner-icon="isPasswordVisible ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="isPasswordVisible = !isPasswordVisible"
                    variant="outlined"
                    density="comfortable"
                    color="#005982"
                    :rules="[
                      (v) => !!v || 'Contrasenya obligatòria',
                      (v) => v.length >= 6 || 'Mínim 6 caràcters',
                    ]"
                  ></v-text-field>

                  <v-btn
                    block
                    color="#005982"
                    size="large"
                    class="mt-6 text-white text-capitalize"
                    :loading="loading"
                    :disabled="!isFormValid"
                    type="submit"
                  >
                    Continuar
                  </v-btn>
                </v-form>
              </v-window-item>

              <v-window-item :value="2">
                <div class="text-center py-4">
                  <v-icon color="#005982" size="60" class="mb-3"
                    >mdi-email-check-outline</v-icon
                  >
                  <h3 class="text-h6 mb-2">Verificació de Correu</h3>
                  <p class="text-body-2 text-grey mb-6">
                    Hem enviat un codi de seguretat a
                    <strong>{{ formData.email }}</strong
                    >.<br />
                    Introdueix-lo a continuació per activar el compte.
                  </p>

                  <v-otp-input
                    v-model="verificationCode"
                    length="6"
                    variant="outlined"
                    color="#005982"
                    class="mb-4"
                  ></v-otp-input>

                  <v-btn
                    block
                    color="#005982"
                    size="large"
                    class="mt-4 text-white"
                    :loading="loading"
                    :disabled="verificationCode.length < 6"
                    @click="handleVerify"
                  >
                    Verificar i Finalitzar
                  </v-btn>

                  <div class="mt-4 text-center">
                    <v-btn
                      variant="text"
                      size="small"
                      color="grey-darken-1"
                      :disabled="!canResend"
                      @click="handleResendCode"
                      :loading="resendLoading"
                    >
                      {{ canResend ? "No has rebut el codi? Reenviar" : `Reenviar en ${countdown}s` }}
                    </v-btn>
                  </div>
                </div>
              </v-window-item>
            </v-window>

            <v-alert
              v-if="mensaje"
              :type="tipoMensaje"
              variant="tonal"
              density="compact"
              class="mt-4"
            >
              {{ mensaje }}
            </v-alert>
          </v-card-text>

          <v-divider></v-divider>
          <v-card-actions class="bg-grey-lighten-5 justify-center py-3">
            <v-btn
              variant="text"
              size="small"
              color="grey-darken-2"
              @click="router.push('/login')"
            >
              <v-icon start>mdi-arrow-left</v-icon> Tornar a l'inici
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();
const step = ref(1);
const isFormValid = ref(false);
const loading = ref(false);
const loadingCentros = ref(false);
const mensaje = ref("");
const tipoMensaje = ref("info");
const isPasswordVisible = ref(false);

const formData = ref({
  username: '',
  password: '',
  center_code: null,
  email: '',
  isAdmin: false
});

const verificationCode = ref("");
const centros = ref([]);
const countdown = ref(30);
const canResend = ref(false);
const resendLoading = ref(false);
let timer = null;

const startCountdown = () => {
  canResend.value = false;
  countdown.value = 30;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--;
    } else {
      canResend.value = true;
      clearInterval(timer);
    }
  }, 1000);
};

const handleResendCode = async () => {
  resendLoading.value = true;
  try {
    const res = await fetch("/api/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formData.value.email }),
    });
    const data = await res.json();
    if (res.ok) {
        mensaje.value = "Nou codi enviat correctament.";
        tipoMensaje.value = "success";
        startCountdown();
    } else {
        mensaje.value = data.error || "Error al reenviar";
        tipoMensaje.value = "error";
    }
  } catch (e) {
      mensaje.value = "Error de connexió";
      tipoMensaje.value = "error";
  } finally {
      resendLoading.value = false;
  }
};

const fetchCentros = async () => {
  loadingCentros.value = true;
  try {
    const res = await fetch(`${API}/api/centros?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      centros.value = data.map((c) => ({
        ...c,
        displayName: `${c.name} (${c.code})`,
      }));
    }
  } catch (e) {
    console.error(e);
  } finally {
    loadingCentros.value = false;
  }
};

onMounted(() => {
  fetchCentros();
  
  // Handle redirect from Login (needs verification)
  if (route.query.step && route.query.step == 2) {
      step.value = 2;
  }
  if (route.query.email) {
      formData.value.email = route.query.email;
  }
  if (route.query.reason === 'verification_needed') {
      mensaje.value = "El teu compte necessita verificació. Hem enviat un nou codi.";
      startCountdown();
  }
});
const handleAdminChange = () => {
    if (formData.value.isAdmin && formData.value.center_code) {
        const center = centros.value.find(c => c.code === formData.value.center_code);
        if (center && center["E-mail_centre"]) {
            formData.value.email = center["E-mail_centre"];
        } else {
            formData.value.email = ''; 
            // Si el centro no tiene email en JSON, habrá un problema, pero dejémoslo vacío
        }
    } else if (!formData.value.isAdmin) {
        formData.value.email = ''; // Limpiar si desmarca
    }
};

// Reactividad: Si cambia el centro y es admin, actualizar email
watch(() => formData.value.center_code, (newVal) => {
    if (formData.value.isAdmin) {
        handleAdminChange();
    }
});

const emailHint = computed(() => {
    return formData.value.isAdmin 
        ? 'Autocompletat amb el correu oficial del centre.' 
        : 'Debe ser @edu.gencat.cat o @inspedralbes.cat';
});

const emailRules = computed(() => {
    const rules = [v => !!v || 'El correo es obligatorio'];
    if (!formData.value.isAdmin) {
        rules.push(v => /.+@.+\..+/.test(v) || 'Correo no válido');
        // Validacion dominios opcional para profes, estricta para alumnos si quisieramos
        // rules.push(v => /@edu\.gencat\.cat$|@inspedralbes\.cat$/.test(v) || 'Dominio no permitido'); 
    }
    return rules;
});

onMounted(() => {
  fetchCentros();
});

const handleRegister = async () => {
  if (!isFormValid.value) return;

  loading.value = true;
  mensaje.value = "";

  try {
    const response = await fetch(`${API}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          ...formData.value,
          role: formData.value.isAdmin ? 'admin' : 'teacher'
      })
    });

    const data = await response.json();

    if (response.ok) {
      if (data.needsVerification) {
        step.value = 2; // Passar al pas de verificació
        startCountdown();
        tipoMensaje.value = "success";
        mensaje.value = `Codi enviat correctament a ${formData.value.email}`;
      } else {
        // Fallback si no hi ha verificació configurada
        tipoMensaje.value = "success";
        mensaje.value = "Registre completat. Redirigint...";
        setTimeout(() => router.push("/login"), 2000);
      }
    } else {
      tipoMensaje.value = "error";
      mensaje.value = data.error || "Error en el registre";
    }
  } catch (error) {
    tipoMensaje.value = "error";
    mensaje.value = "Error de connexió amb el servidor";
  } finally {
    loading.value = false;
  }
};

const handleVerify = async () => {
  loading.value = true;
  try {
    const response = await fetch(`${API}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.value.email,
        code: verificationCode.value,
      }),
    });
    const data = await response.json();

    if (response.ok) {
      tipoMensaje.value = "success";
      mensaje.value = "Compte verificat correctament! Redirigint...";
      setTimeout(() => router.push("/login"), 2000);
    } else {
      tipoMensaje.value = "error";
      mensaje.value = data.error || "Codi incorrecte";
    }
  } catch (e) {
    tipoMensaje.value = "error";
    mensaje.value = "Error de verificació";
  } finally {
    loading.value = false;
  }
};
</script>
