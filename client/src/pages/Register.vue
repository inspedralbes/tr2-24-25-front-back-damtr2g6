<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card class="pa-4" rounded="lg">
          <v-card-title class="text-h5 text-center">Crear Nueva Cuenta</v-card-title>

          <v-card-text class="pt-4">
            <v-form ref="form" v-model="isFormValid">
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

            <v-alert v-if="mensaje" :type="tipoMensaje" class="mt-3" variant="tonal">
              {{ mensaje }}
            </v-alert>
          </v-card-text>

          <v-card-actions class="d-block text-center pb-4 px-4">
            <v-btn
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
import { ref } from 'vue';
import { useRouter } from 'vue-router'; // Import useRouter

const router = useRouter(); // Initialize useRouter
const isFormValid = ref(false);
const confirmarPass = ref('');
const mensaje = ref('');
const tipoMensaje = ref('info');

const formData = ref({
  username: '',
  password: ''
});

const handleRegister = async () => {
  mensaje.value = '';
  
  try {
    const response = await fetch('http://localhost:4000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value)
    });

    const data = await response.json();

    if (response.ok) {
      tipoMensaje.value = 'success';
      mensaje.value = '¡Cuenta creada! Redirigiendo a la página de login...';
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } else {
      tipoMensaje.value = 'error';
      mensaje.value = data.error || 'Error en el registro';
    }
  } catch (error) {
    tipoMensaje.value = 'error';
    mensaje.value = 'Error de conexión con el servidor';
  }
};
</script>