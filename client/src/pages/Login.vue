<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card class="pa-4" rounded="lg">
          <v-card-title class="text-h5 text-center">Accés al Sistema</v-card-title>

          <v-card-text class="pt-4">
            <v-form ref="form" v-model="isFormValid">
              <v-autocomplete
                v-model="credentials.center_code"
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
                v-model="credentials.username"
                label="Nombre de usuario o Correo electrónico"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                required
              ></v-text-field>

              <v-text-field v-model="credentials.password" label="Contraseña" prepend-inner-icon="mdi-lock"
                type="password" variant="outlined" required></v-text-field>
            </v-form>

            <v-alert v-if="errorMessage" type="error" class="mt-3" variant="tonal">
              {{ errorMessage }}
            </v-alert>
          </v-card-text>

          <v-card-actions class="d-block text-center pb-4 px-4">
            <v-btn block color="primary" size="large" :disabled="!isFormValid" @click="submitLogin">
              Iniciar Sessió
            </v-btn>
            <v-btn
              variant="text"
              color="primary"
              class="mt-3"
              @click="redirectToRegister"
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
import { ref, nextTick, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isFormValid = ref(false);
const errorMessage = ref('');
const credentials = ref({
  username: '',
  password: '',
  center_code: null
});

const centros = ref([]);
const loadingCentros = ref(false);

const fetchCentros = async () => {
  loadingCentros.value = true;
  errorMessage.value = ''; // Reset error
  try {
    // Usamos ruta relativa para que funcione el Proxy de Vite (ver vite.config.mjs)
    const url = `/api/centros?t=${Date.now()}`;
    const res = await fetch(url);
    
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    const data = await res.json();
    centros.value = data.map(c => ({
        ...c,
        displayName: `${c.name} (${c.code})`
    }));
    
    if (centros.value.length === 0) {
      console.warn("Recibido array vacío de centros");
    }
  } catch (error) {
    console.error("Error fetching centros:", error);
    errorMessage.value = `Error conectando con el servidor: ${error.message}. Asegúrate de que el backend (localhost:4000) esté funcionando.`;
  } finally {
    loadingCentros.value = false;
  }
};

onMounted(() => {
  fetchCentros();
});

const redirectToRegister = () => {
  router.push('/register');
};

const submitLogin = async () => {
  errorMessage.value = '';
  console.log('Attempting to log in with:', credentials.value);
  console.log('Available routes:', router.getRoutes());

  try {
    const response = await fetch('/api/login', {
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
