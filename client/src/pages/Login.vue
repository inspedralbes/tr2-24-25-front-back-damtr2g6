<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card class="pa-4" rounded="lg">
          <v-card-title class="text-h5 text-center">Acceso al Sistema</v-card-title>
          
          <v-card-text class="pt-4">
            <v-form ref="form" v-model="isFormValid">
              <v-text-field
                v-model="credentials.username"
                label="Nombre de usuario"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                required
              ></v-text-field>

              <v-text-field
                v-model="credentials.password"
                label="Contraseña"
                prepend-inner-icon="mdi-lock"
                type="password"
                variant="outlined"
                required
              ></v-text-field>
            </v-form>

            <v-alert v-if="errorMessage" type="error" class="mt-3" variant="tonal">
              {{ errorMessage }}
            </v-alert>
          </v-card-text>

          <v-card-actions class="d-block text-center pb-4 px-4">
            <v-btn
              block
              color="primary"
              size="large"
              :disabled="!isFormValid"
              @click="submitLogin"
            >
              Iniciar Sesión
            </v-btn>
            <v-btn
              variant="text"
              color="primary"
              class="mt-3"
              @click="router.push('/register')"
            >
              ¿No tienes cuenta? Regístrate aquí.
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isFormValid = ref(false);
const errorMessage = ref('');
const credentials = ref({
  username: '',
  password: ''
});

const redirectToRegister = () => {
  router.push('/register');
};

const submitLogin = async () => {
  errorMessage.value = '';
  console.log('Attempting to log in with:', credentials.value);
  console.log('Available routes:', router.getRoutes());
  
  try {
    const response = await fetch('http://localhost:4000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials.value)
    });

    console.log('Received response from server:', response);
    const data = await response.json();
    console.log('Response data:', data);

    if (response.ok) {
      console.log('Login successful. Storing user data in localStorage.');
      localStorage.setItem('user', JSON.stringify(data.user));
      await nextTick();
      console.log('Redirecting to /home');
      router.push('/home');
      console.log('Redirection command issued.');
    } else {
      console.error('Login failed:', data.error);
      errorMessage.value = data.error || 'Error desconocido';
    }
  } catch (error) {
    console.error('An error occurred during login:', error);
    errorMessage.value = 'No se pudo conectar con el servidor';
  }
};
</script>