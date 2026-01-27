<template>
  <v-container class="py-8 bg-grey-lighten-5">
    <div class="w-100">
      <!-- HEADER HEADER -->
      <div class="mb-8">
        <v-row align="center">
          <v-col cols="12" md="8">
             <div class="d-flex align-center mb-2">
                <v-icon color="indigo-darken-2" size="x-large" class="mr-3">mdi-shield-account</v-icon>
                <h1 class="text-h4 font-weight-bold text-grey-darken-3 mb-0">Gestió d'Equip Docent</h1>
             </div>
             <p class="text-subtitle-1 text-grey-darken-1 ml-11">
                Administració d'usuaris i permisos per al teu centre educatiu
             </p>
          </v-col>
          <v-col cols="12" md="4" class="text-right">
             <v-btn
                prepend-icon="mdi-refresh"
                variant="outlined"
                color="indigo-darken-2"
                rounded="pill"
                @click="fetchUsers"
                :loading="loading"
              >
                Actualitzar Llistat
             </v-btn>
          </v-col>
        </v-row>
      </div>

      <!-- STATS CARDS -->
      <v-row class="mb-6">
          <v-col cols="12" sm="4">
              <v-card class="py-4 px-2 text-center rounded-xl elevation-2" color="white" :loading="loading">
                  <v-icon color="blue" size="large" class="mb-2">mdi-account-group</v-icon>
                  <p class="text-h4 font-weight-bold mb-0 text-blue-darken-2">{{ users.length }}</p>
                  <p class="text-caption text-grey font-weight-bold uppercase">USUARIS TOTALS</p>
              </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card class="py-4 px-2 text-center rounded-xl elevation-2" color="white" :loading="loading">
                <v-icon color="purple" size="large" class="mb-2">mdi-security</v-icon>
                <p class="text-h4 font-weight-bold mb-0 text-purple-darken-2">{{ adminCount }}</p>
                <p class="text-caption text-grey font-weight-bold uppercase">ADMINISTRADORS</p>
            </v-card>
        </v-col>
        <v-col cols="12" sm="4">
            <v-card class="py-4 px-2 text-center rounded-xl elevation-2" color="white" :loading="loading">
                <v-icon color="orange" size="large" class="mb-2">mdi-account-question</v-icon>
                <p class="text-h4 font-weight-bold mb-0 text-orange-darken-2">{{ pendingCount }}</p>
                <p class="text-caption text-grey font-weight-bold uppercase">PENDENTS VERIFICACIÓ</p>
            </v-card>
        </v-col>
      </v-row>

      <!-- DATA TABLE CARD -->
      <v-card class="rounded-xl elevation-3 border border-opacity-50" :loading="loading">
        <template v-slot:loader="{ isActive }">
          <v-progress-linear
            :active="isActive"
            color="indigo-darken-2"
            height="4"
            indeterminate
          ></v-progress-linear>
        </template>

        <v-card-title class="px-6 pt-6 pb-4 d-flex align-center flex-wrap">
           <v-icon color="grey-darken-1" class="mr-2">mdi-table-account</v-icon>
           <span class="text-h6 font-weight-bold text-grey-darken-3">Llistat d'Usuaris Registrats</span>
           <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Cercar per nom, email..."
              variant="outlined"
              density="compact"
              hide-details
              color="indigo-darken-2"
              class="search-field"
              single-line
            ></v-text-field>
        </v-card-title>

        <v-divider></v-divider>

        <v-data-table
          :headers="headers"
          :items="users"
          :search="search"
          class="user-table px-2"
          hover
          no-data-text="No s'han trobat usuaris amb aquest criteri."
        >
          <!-- Custom Role Chip -->
          <template v-slot:item.role="{ item }">
             <v-chip 
                :color="item.role === 'admin' ? 'purple-lighten-5' : 'blue-lighten-5'" 
                :class="item.role === 'admin' ? 'text-purple-darken-2' : 'text-blue-darken-2'"
                size="small" 
                label 
                class="font-weight-bold"
             >
                <v-icon start size="small" :icon="item.role === 'admin' ? 'mdi-shield-crown' : 'mdi-account-school'"></v-icon>
                {{ item.role.toUpperCase() }}
             </v-chip>
          </template>

          <!-- Verified Status -->
          <template v-slot:item.isVerified="{ item }">
              <div v-if="!item.isVerified" class="d-flex align-center justify-center text-warning">
                 <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                 <span class="text-caption font-weight-bold">PENDENT MAIL</span>
              </div>
              <div v-else-if="!item.isApproved" class="d-flex align-center justify-center text-orange-darken-4">
                 <v-icon size="small" class="mr-1">mdi-account-lock</v-icon>
                 <span class="text-caption font-weight-bold">PER APROVAR</span>
              </div>
              <div v-else class="d-flex align-center justify-center text-success">
                 <v-icon size="small" class="mr-1">mdi-check-decagram</v-icon>
                 <span class="text-caption font-weight-bold">ACTIU</span>
              </div>
          </template>

          <!-- Formatted Date -->
          <template v-slot:item.createdAt="{ item }">
              <span class="text-body-2 text-grey-darken-2">
                {{ new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }}
              </span>
          </template>

          <!-- Actions -->
          <template v-slot:item.actions="{ item }">
            <v-tooltip text="Donar de baixa" location="top">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  color="error"
                  variant="tonal"
                  class="ml-2"
                  @click="confirmDelete(item)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <v-tooltip v-if="!item.isApproved" text="Aprovar Accés" location="top">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  color="success"
                  variant="tonal"
                  class="ml-2"
                  @click="confirmApprove(item)"
                >
                  <v-icon>mdi-account-check</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <v-tooltip text="Canviar Rol" location="top">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  color="indigo"
                  variant="tonal"
                  class="ml-2"
                  @click="openRoleDialog(item)"
                >
                  <v-icon>mdi-account-cog-outline</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- Role Edit Dialog -->
    <v-dialog v-model="roleDialog" max-width="400">
      <v-card class="rounded-xl pa-2">
         <div class="text-center pt-6">
            <v-avatar color="indigo-lighten-5" size="80" class="mb-4">
                <v-icon color="indigo" size="40">mdi-shield-account-outline</v-icon>
            </v-avatar>
            <h3 class="text-h5 font-weight-bold text-grey-darken-3 mb-2">Canviar Rol</h3>
            <p class="text-body-2 text-grey mb-0">Usuari: <strong>{{ userToEdit?.username }}</strong></p>
        </div>

        <v-card-text class="pa-6">
           <v-select
              v-model="newRole"
              :items="['teacher', 'admin']"
              label="Selecciona un Rol"
              variant="outlined"
              color="indigo-darken-2"
           >
              <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props" :prepend-icon="item.raw === 'admin' ? 'mdi-shield-crown' : 'mdi-account-school'" :title="item.raw.toUpperCase()"></v-list-item>
              </template>
              <template v-slot:selection="{ item }">
                   <div class="d-flex align-center">
                      <v-icon start size="small" :color="item.raw === 'admin' ? 'purple' : 'blue'">{{ item.raw === 'admin' ? 'mdi-shield-crown' : 'mdi-account-school' }}</v-icon>
                      <span class="font-weight-bold ml-2">{{ item.raw.toUpperCase() }}</span>
                   </div>
              </template>
           </v-select>
        </v-card-text>

         <v-card-actions class="justify-center pb-6 px-6">
          <v-btn
             variant="outlined" 
             color="grey-darken-1" 
             size="large" 
             class="flex-grow-1 mr-2 rounded-lg"
             @click="roleDialog = false"
          >
            Cancel·lar
          </v-btn>
          <v-btn 
            color="indigo-darken-2" 
            variant="flat" 
            size="large"
            class="flex-grow-1 ml-2 rounded-lg"
            @click="updateRole" 
            :loading="roleLoading"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="approveDialog" max-width="450">
      <v-card class="rounded-xl pa-2">
        <div class="text-center pt-6">
            <v-avatar color="green-lighten-5" size="80" class="mb-4">
                <v-icon color="green" size="40">mdi-check-decagram</v-icon>
            </v-avatar>
            <h3 class="text-h5 font-weight-bold text-grey-darken-3 mb-2">Aprovar Accés</h3>
        </div>
        
        <v-card-text class="text-center pb-2">
          <p class="text-body-1 mb-4">
            Vols donar accés al centre a l'usuari <strong class="text-green-darken-2">{{ userToApprove?.username }}</strong>?
          </p>
          <v-alert type="success" variant="tonal" density="compact" class="text-left text-caption mb-0">
             ✅ L'usuari podrà iniciar sessió immediatament.
          </v-alert>
        </v-card-text>

        <v-card-actions class="justify-center pb-6 pt-4 px-6">
          <v-btn
             variant="outlined" 
             color="grey-darken-1" 
             size="large" 
             class="flex-grow-1 mr-2 rounded-lg"
             @click="approveDialog = false"
          >
            Cancel·lar
          </v-btn>
          <v-btn 
            color="green" 
            variant="flat" 
            size="large"
            class="flex-grow-1 ml-2 rounded-lg"
            @click="approveUser" 
            :loading="approveLoading"
          >
            Aprovar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="450">
      <v-card class="rounded-xl pa-2">
        <div class="text-center pt-6">
            <v-avatar color="red-lighten-5" size="80" class="mb-4">
                <v-icon color="red" size="40">mdi-alert-remove-outline</v-icon>
            </v-avatar>
            <h3 class="text-h5 font-weight-bold text-grey-darken-3 mb-2">Eliminar Usuari</h3>
        </div>
        
        <v-card-text class="text-center pb-2">
          <p class="text-body-1 mb-4">
            Estàs segur que vols donar de baixa a <strong class="text-red-darken-2">{{ userToDelete?.username }}</strong>?
          </p>
          <v-alert type="warning" variant="tonal" density="compact" class="text-left text-caption mb-0">
             ⚠️ Aquesta acció esborrarà l'accés de l'usuari de forma permanent. Assegura't abans de confirmar.
          </v-alert>
        </v-card-text>

        <v-card-actions class="justify-center pb-6 pt-4 px-6">
          <v-btn
             variant="outlined" 
             color="grey-darken-1" 
             size="large" 
             class="flex-grow-1 mr-2 rounded-lg"
             @click="deleteDialog = false"
          >
            Cancel·lar
          </v-btn>
          <v-btn 
            color="red" 
            variant="flat" 
            size="large"
            class="flex-grow-1 ml-2 rounded-lg"
            @click="deleteUser" 
            :loading="deleteLoading"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" location="bottom right" timeout="3000">
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" icon="mdi-close" @click="snackbar = false"></v-btn>
      </template>
    </v-snackbar>

  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const users = ref([]);
const loading = ref(false);
const search = ref('');
const currentUser = ref(null);

const deleteDialog = ref(false);
const deleteLoading = ref(false);
const userToDelete = ref(null);

const roleDialog = ref(false);
const roleLoading = ref(false);
const userToEdit = ref(null);
const newRole = ref('teacher');

const approveDialog = ref(false);
const approveLoading = ref(false);
const userToApprove = ref(null);

const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref("success");

// Computed Stats
const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length);
const pendingCount = computed(() => users.value.filter(u => !u.isVerified || !u.isApproved).length);




const headers = [
  { title: 'ID', key: 'id', align: 'start', width: '80px' },
  { title: 'Membre', key: 'username', align: 'start' },
  { title: 'Correu Electrònic', key: 'email', align: 'start' },
  { title: 'Rol', key: 'role', align: 'center' },
  { title: 'Estat', key: 'isVerified', align: 'center' },
  { title: 'Registrat el', key: 'createdAt', align: 'end' },
  { title: 'Accions', key: 'actions', sortable: false, align: 'end' },
];

onMounted(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        currentUser.value = JSON.parse(userStr);
        // Ya no se llama a fetchDashboardSummary aquí
        fetchUsers(); // Fetch user list for all admins
    }
});

const fetchUsers = async () => {
    loading.value = true;
    try {
        const res = await fetch(`/api/center/users?userId=${currentUser.value.id}`);
        if (!res.ok) throw new Error("Error carregant usuaris");
        users.value = await res.json();
    } catch (e) {
        console.error(e);
        showSnackbar("Error carregant el llistat d'usuaris", "error");
    } finally {
        loading.value = false;
    }
};

const confirmDelete = (user) => {
    userToDelete.value = user;
    deleteDialog.value = true;
};

const deleteUser = async () => {
    if (!userToDelete.value) return;
    deleteLoading.value = true;

    try {
        const res = await fetch(`/api/center/users/${userToDelete.value.id}?userId=${currentUser.value.id}`, {
            method: 'DELETE'
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Error eliminant usuari");
        }

        showSnackbar("Usuari donat de baixa correctament", "success");
        deleteDialog.value = false;
        fetchUsers(); // Refresh list

    } catch (e) {
        showSnackbar(e.message, "error");
    } finally {
        deleteLoading.value = false;
    }
};

const openRoleDialog = (user) => {
    userToEdit.value = user;
    newRole.value = user.role;
    roleDialog.value = true;
};

const updateRole = async () => {
    if (!userToEdit.value) return;
    roleLoading.value = true;

    try {
        const res = await fetch(`/api/center/users/${userToEdit.value.id}/role?userId=${currentUser.value.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole.value })
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Error actualitzant rol");
        }

        showSnackbar("Rol actualitzat correctament", "success");
        roleDialog.value = false;
        fetchUsers(); // Refresh

    } catch (e) {
        showSnackbar(e.message, "error");
    } finally {
        roleLoading.value = false;
    }
};

const confirmApprove = (user) => {
    userToApprove.value = user;
    approveDialog.value = true;
};

const approveUser = async () => {
    if (!userToApprove.value) return;
    approveLoading.value = true;

    try {
        const res = await fetch(`/api/center/users/${userToApprove.value.id}/approve?userId=${currentUser.value.id}`, {
            method: 'PUT'
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Error aprovant usuari");
        }

        showSnackbar("Usuari aprovat correctament", "success");
        approveDialog.value = false;
        fetchUsers(); // Refresh

    } catch (e) {
        showSnackbar(e.message, "error");
    } finally {
        approveLoading.value = false;
    }
};

const showSnackbar = (text, color) => {
    snackbarText.value = text;
    snackbarColor.value = color;
    snackbar.value = true;
};
</script>

<style scoped>
.user-table :deep(thead tr th) {
    font-weight: 700 !important;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
    color: #666;
}
.search-field {
    max-width: 300px;
}
</style>
