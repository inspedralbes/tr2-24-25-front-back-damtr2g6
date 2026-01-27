<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <!-- Header Section -->
        <div class="mb-6 border-b pb-2">
          <h2 class="text-h4 font-weight-regular text-grey-darken-3">
            El Meu Perfil
          </h2>
          <span class="text-subtitle-1 text-grey-darken-1">
            Informació del compte i credencials
          </span>
        </div>

        <!-- Main Card -->
        <v-card class="mb-6 elevation-1 border" variant="outlined">
          <div class="bg-grey-lighten-4 pa-4 d-flex align-center">
            <v-avatar color="#005982" size="64" class="mr-4">
              <span class="text-h4 text-white font-weight-bold">
                {{ user.username.charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold text-grey-darken-3">
                {{ user.username }}
              </div>
              <v-chip
                size="small"
                color="primary"
                variant="flat"
                class="text-caption font-weight-bold text-uppercase mt-1"
              >
                {{ user.role }}
              </v-chip>
            </div>
          </div>

          <v-divider></v-divider>

          <v-card-text class="pa-6">
            <h3 class="text-subtitle-1 font-weight-bold mb-4 text-grey-darken-2">
              Detalls de l'Usuari
            </h3>
            
            <v-row>
              <v-col cols="12">
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0 mb-2">
                    <template v-slot:prepend>
                      <v-avatar color="blue-lighten-5" size="40" class="mr-3">
                        <v-icon color="#005982" size="20">mdi-account</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-caption text-grey">Nom d'usuari</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 text-high-emphasis">
                      {{ user.username }}
                    </v-list-item-subtitle>
                  </v-list-item>

                  <v-divider class="my-3"></v-divider>

                  <v-list-item class="px-0 mb-2">
                    <template v-slot:prepend>
                      <v-avatar color="blue-lighten-5" size="40" class="mr-3">
                         <v-icon color="#005982" size="20">mdi-security</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-caption text-grey">Rol del compte</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 text-high-emphasis text-capitalize">
                      {{ user.role }}
                    </v-list-item-subtitle>
                  </v-list-item>

                  <v-divider class="my-3" v-if="user.center_code"></v-divider>

                  <v-list-item class="px-0" v-if="user.center_code">
                    <template v-slot:prepend>
                       <v-avatar color="blue-lighten-5" size="40" class="mr-3">
                        <v-icon color="#005982" size="20">mdi-domain</v-icon>
                       </v-avatar>
                    </template>
                    <v-list-item-title class="text-caption text-grey">Codi de Centre Assignat</v-list-item-title>
                    <v-list-item-subtitle class="text-body-1 text-high-emphasis">
                      {{ user.center_code }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-col>
            </v-row>
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions class="pa-4 bg-grey-lighten-5">
            <v-spacer></v-spacer>
            <v-btn
              variant="outlined"
              color="#005982"
              to="/home"
              prepend-icon="mdi-arrow-left"
            >
              Tornar a l'inici
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";

const user = ref({
  username: "",
  role: "",
  center_code: "",
});

onMounted(() => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    const parsedUser = JSON.parse(userStr);
    user.value = {
      username: parsedUser.username || "Desconegut",
      role: parsedUser.role || "teacher",
      center_code: parsedUser.center_code || "",
    };
  }
});
</script>
