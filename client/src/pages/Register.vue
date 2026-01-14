<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card class="pa-4" rounded="lg">
          <v-card-title class="text-h5 text-center">Crear Nueva Cuenta</v-card-title>

          <v-card-text class="pt-4">
            <v-window v-model="step">
              <v-window-item :value="1">
                <v-form ref="form" v-model="isFormValid">
                  <v-autocomplete
                    v-model="formData.center_code"
                    :items="centros"
                    item-title="displayName"
                    item-value="code"
                    label="Selecciona tu centro"
                    prepend-inner-icon="mdi-domain"
                    variant="outlined"
                    :rules="[v => !!v || 'El centro es obligatorio']"
                    :loading="loadingCentros"
                    no-data-text="No se encontraron centros"
                    placeholder="Escribe para buscar..."
                  ></v-autocomplete>

                  <v-text-field
                    v-model="formData.email"
                    label="Correo Electrónico XTEC/Gencat"
                    prepend-inner-icon="mdi-email"
                    variant="outlined"
                    hint="Debe ser @edu.gencat.cat o @inspedralbes.cat"
                    persistent-hint
                    :rules="[
                      v => !!v || 'El correo es obligatorio',
                      v => /.+@.+\..+/.test(v) || 'Correo no válido',
                      v => /@edu\.gencat\.cat$|@inspedralbes\.cat$/.test(v) || 'Debe ser un correo XTEC/Gencat válido'
                    ]"
                  ></v-text-field>

                  <v-text-field
                    v-model="formData.username"
                    label="Nombre de Usuario"
                    prepend-inner-icon="mdi-account-plus"
                    variant="outlined"
                    :rules="[v => !!v || 'El usuario es obligatorio']"
                  ></v-text-field>

                  <v-text-field
                    v-model="formData.password"
                    label="Contraseña"
                    prepend-inner-icon="mdi-lock"
                    type="password"
                    variant="outlined"
                    :rules="[v => !!v || 'La contraseña es obligatoria']"
                  ></v-text-field>

                  <v-text-field
                    v-model="confirmarPass"
                    label="Repetir Contraseña"
                    prepend-inner-icon="mdi-lock-check"
                    type="password"
                    variant="outlined"
                    :rules="[v => v === formData.password || 'Las contraseñas no coinciden']"
                  ></v-text-field>
                </v-form>
              </v-window-item>

              <v-window-item :value="2">
                <div class="text-center mb-4">
                  <v-icon size="64" color="primary">mdi-email-check</v-icon>
                  <p class="mt-2">Revisa tu correo {{ formData.email }}</p>
                </div>
                <v-otp-input
                  v-model="verificationCode"
                  length="6"
                  variant="outlined"
                ></v-otp-input>
                <v-btn block color="primary" class="mt-4" @click="handleVerify" :disabled="verificationCode.length < 6">
                  Verificar Código
                </v-btn>
              </v-window-item>
            </v-window>

            <v-alert v-if="mensaje" :type="tipoMensaje" class="mt-3" variant="tonal">
              {{ mensaje }}
            </v-alert>
          </v-card-text>

          <v-card-actions class="d-block text-center pb-4 px-4">
            <v-btn
              v-if="step === 1"
              block
              color="primary"
              size="large"
              :disabled="!isFormValid"
              @click="handleRegister"
            >
              Registrarse
            </v-btn>
            <v-btn
              variant="text"
              color="primary"
              class="mt-3"
              @click="router.push('/')"
            >
              ¿Ya tienes cuenta? Inicia sesión aquí.
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router'; // Import useRouter

const router = useRouter(); // Initialize useRouter
const isFormValid = ref(false);
const confirmarPass = ref('');
const mensaje = ref('');
const tipoMensaje = ref('info');
const step = ref(1);
const verificationCode = ref('');

const formData = ref({
  username: '',
  password: '',
  center_code: null
});

const centros = ref([]);
const loadingCentros = ref(false);

const fetchCentros = async () => {
  loadingCentros.value = true;
  try {
    const res = await fetch('/api/centros');
    if (!res.ok) throw new Error('Error al cargar centros');
    const data = await res.json();
    // Formatear para mostrar "Nombre (Código)"
    centros.value = data.map(c => ({
        ...c,
        displayName: `${c.name} (${c.code})`
    }));
  } catch (error) {
    console.error(error);
  } finally {
    loadingCentros.value = false;
  }
};

onMounted(() => {
  fetchCentros();
});

const handleRegister = async () => {
  mensaje.value = '';
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value)
    });

    const data = await response.json();

    if (response.ok) {
      if (data.needsVerification) {
        step.value = 2; // Move to verification step
        tipoMensaje.value = 'success';
        mensaje.value = `¡Registro iniciado! Hemos enviado un código a ${formData.value.email}. Introdúcelo abajo.`;
      } else {
        tipoMensaje.value = 'success';
        mensaje.value = 'Registro exitoso. Redirigiendo...';
        setTimeout(() => router.push('/'), 2000);
      }
    } else {
      tipoMensaje.value = 'error';
      mensaje.value = data.error || 'Error al registrar';
    }
  } catch (error) {
    tipoMensaje.value = 'error';
    mensaje.value = 'Error de conexión';
  }
};

const handleVerify = async () => {
    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.value.email, code: verificationCode.value })
        });
        const data = await response.json();
        if (response.ok) {
            tipoMensaje.value = 'success';
            mensaje.value = '¡Cuenta verificada! Redirigiendo al login...';
            setTimeout(() => router.push('/'), 2000);
        } else {
            tipoMensaje.value = 'error';
            mensaje.value = data.error;
        }
    } catch (error) {
        mensaje.value = 'Error al verificar';
    }
};
</script>
