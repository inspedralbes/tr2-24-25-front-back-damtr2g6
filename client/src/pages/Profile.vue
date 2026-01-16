<template>
  <v-container class="fill-height">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="pa-4" rounded="lg" elevation="2">
          <v-card-title class="text-h4 text-center text-primary mb-4">
            <v-icon size="large" color="primary" class="mr-2">mdi-account-circle</v-icon>
            El Meu Perfil
          </v-card-title>

          <v-card-text>
            <v-list>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="secondary">mdi-account</v-icon>
                </template>
                <v-list-item-title class="text-subtitle-1">Nom d'usuari</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ user.username }}</v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-3"></v-divider>

              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="secondary">mdi-security</v-icon>
                </template>
                <v-list-item-title class="text-subtitle-1">Rol</v-list-item-title>
                <v-list-item-subtitle class="text-h6 text-capitalize">{{ user.role }}</v-list-item-subtitle>
              </v-list-item>
              
               <v-divider class="my-3"></v-divider>

              <v-list-item v-if="user.center_code">
                <template v-slot:prepend>
                  <v-icon color="secondary">mdi-domain</v-icon>
                </template>
                <v-list-item-title class="text-subtitle-1">Codi de Centre</v-list-item-title>
                <v-list-item-subtitle class="text-h6">{{ user.center_code }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>

          <v-card-actions class="justify-center mt-4">
            <v-btn color="primary" variant="elevated" to="/home">
              Tornar a l'Inici
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const user = ref({
  username: '',
  role: '',
  center_code: ''
});

onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const parsedUser = JSON.parse(userStr);
    user.value = {
        username: parsedUser.username || 'Desconegut',
        role: parsedUser.role || 'teacher', // Default en frontend si falta
        center_code: parsedUser.center_code || ''
    };
  }
});
</script>
