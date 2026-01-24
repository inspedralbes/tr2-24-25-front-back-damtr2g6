<template>
  <v-card class="mt-6 pa-4">
    <v-card-title class="text-h6">
      ✅ Dades de l'Alumne
    </v-card-title>

    <v-card-text>
      <div class="mb-4">
        <p class="font-weight-bold">Dades de l'Alumne</p>
        <v-divider class="my-2"></v-divider>
        <p><strong>Nom i Cognoms:</strong> {{ studentData.dadesAlumne?.nomCognoms || 'N/D' }}</p>
        <p><strong>Data de Naixement:</strong> {{ studentData.dadesAlumne?.dataNaixement || 'N/D' }}</p>
        <p><strong>Curs:</strong> {{ studentData.dadesAlumne?.curs || 'N/D' }}</p>
      </div>

      <div class="mb-4">
        <p class="font-weight-bold">Motiu / Diagnòstic</p>
        <v-divider class="my-2"></v-divider>
        <!-- Categories Sintetitzades -->
        <div v-if="synthesizedCategories && synthesizedCategories.length" class="mb-2">
          <v-chip
            v-for="cat in synthesizedCategories"
            :key="cat"
            size="small"
            color="#005982"
            class="mr-1 mb-1 text-white"
            variant="flat"
          >
            {{ cat }}
          </v-chip>
        </div>
        <p class="font-italic text-grey-darken-1">{{ studentData.motiu?.diagnostic || 'N/D' }}</p>
      </div>

      <div v-if="studentData.adaptacionsGenerals && studentData.adaptacionsGenerals.length" class="mb-4">
        <p class="font-weight-bold">Adaptacions Generals Proposades (Sí)</p>
        <v-divider class="my-2"></v-divider>
        <ul class="pl-5">
          <li v-for="(adaptacio, index) in studentData.adaptacionsGenerals" :key="'A' + index">{{ adaptacio }}</li>
        </ul>
      </div>

      <div v-if="studentData.orientacions && studentData.orientacions.length">
        <p class="font-weight-bold">Orientacions</p>
        <v-divider class="my-2"></v-divider>
        <div v-for="(orientacio, index) in studentData.orientacions" :key="'O' + index" class="mb-2">
          {{ index + 1 }}. {{ orientacio }}
        </div>
      </div>
      
      <!-- REVIEWS SECTION -->
      <v-divider class="my-6"></v-divider>
      <div class="d-flex align-center justify-space-between mb-4">
        <p class="text-h6 mb-0">⭐ Valoracions de l'Equip Docent</p>
        <v-btn size="small" color="primary" variant="text" @click="showAddReview = !showAddReview" :icon="showAddReview ? 'mdi-chevron-up' : 'mdi-plus'"></v-btn>
      </div>

      <v-expand-transition>
        <div v-if="showAddReview" class="mb-6 pa-4 bg-grey-lighten-4 rounded-lg">
           <p class="text-subtitle-2 mb-2">Afegir Nova Valoració</p>
           
           <div class="mb-3">
             <label class="text-caption">Valoració Global (1-5)</label>
             <v-rating v-model="newReview.rating" color="amber" density="compact" hover></v-rating>
           </div>

           <v-row>
             <v-col cols="4">
                <v-text-field v-model.number="newReview.effectiveness.academic" type="number" min="1" max="5" label="Acadèmic" density="compact" variant="outlined"></v-text-field>
             </v-col>
             <v-col cols="4">
                <v-text-field v-model.number="newReview.effectiveness.behavioral" type="number" min="1" max="5" label="Conductual" density="compact" variant="outlined"></v-text-field>
             </v-col>
             <v-col cols="4">
                <v-text-field v-model.number="newReview.effectiveness.emotional" type="number" min="1" max="5" label="Emocional" density="compact" variant="outlined"></v-text-field>
             </v-col>
           </v-row>

           <v-textarea v-model="newReview.comment" label="Comentari (opcional)" rows="2" variant="outlined" density="compact" bg-color="white"></v-textarea>
           
           <v-btn color="primary" block :loading="submittingReview" :disabled="!newReview.rating" @click="submitReview">
             Desar Valoració
           </v-btn>
        </div>
      </v-expand-transition>

      <div v-if="loadingReviews" class="text-center py-4">
        <v-progress-circular indeterminate color="primary" size="24"></v-progress-circular>
      </div>

      <div v-else-if="reviews.length > 0">
         <v-card v-for="review in reviews" :key="review._id" variant="outlined" class="mb-3 border-s-4" style="border-left-color: #005982 !important">
            <v-card-text class="py-2">
                <div class="d-flex justify-space-between align-start">
                    <div>
                        <div class="d-flex align-center">
                            <strong>{{ review.authorName }}</strong>
                            <span class="text-caption text-grey ml-2">{{ formatDate(review.createdAt) }}</span>
                        </div>
                        <v-rating :model-value="review.rating" readonly size="x-small" density="compact" color="amber"></v-rating>
                    </div>
                    <div class="text-caption text-grey-darken-1">
                        <span v-if="review.effectiveness?.academic" class="mr-2">A:{{ review.effectiveness.academic }}</span>
                        <span v-if="review.effectiveness?.behavioral" class="mr-2">C:{{ review.effectiveness.behavioral }}</span>
                        <span v-if="review.effectiveness?.emotional">E:{{ review.effectiveness.emotional }}</span>
                    </div>
                </div>
                <p v-if="review.comment" class="mt-2 text-body-2 mb-0">{{ review.comment }}</p>
            </v-card-text>
         </v-card>
      </div>
      <p v-else class="text-center text-caption text-grey font-italic">Encara no hi ha valoracions.</p>

    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  studentData: {
    type: Object,
    required: true
  },
  studentId: { // New prop for RALC
      type: String,
      default: '' // Can be empty if just previewing extraction
  },
  synthesizedCategories: {
      type: Array,
      default: () => []
  }
});

const reviews = ref([]);
const loadingReviews = ref(false);
const showAddReview = ref(false);
const submittingReview = ref(false);

const newReview = ref({
    rating: 0,
    comment: "",
    effectiveness: {
        academic: null,
        behavioral: null,
        emotional: null
    }
});

const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES');
};

const fetchReviews = async () => {
    if (!props.studentId) return;
    loadingReviews.value = true;
    try {
        const res = await fetch(`/api/students/${props.studentId}/reviews`);
        if (res.ok) {
            reviews.value = await res.json();
        }
    } catch (e) {
        console.error("Error fetching reviews", e);
    } finally {
        loadingReviews.value = false;
    }
};

const submitReview = async () => {
    if (!props.studentId) return;
    const userStr = localStorage.getItem('user');
    if (!userStr) return alert("Inicia sessió per valorar."); // Basic alert for now
    
    const user = JSON.parse(userStr);
    
    submittingReview.value = true;
    try {
        const res = await fetch(`/api/students/${props.studentId}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                ...newReview.value
            })
        });

        if (res.ok) {
            await fetchReviews();
            showAddReview.value = false;
            // Reset form
            newReview.value = { rating: 0, comment: "", effectiveness: { academic: null, behavioral: null, emotional: null } };
        } else {
            alert("Error al guardar la valoració");
        }
    } catch (e) {
        console.error("Error submitting review", e);
    } finally {
        submittingReview.value = false;
    }
};

// Fetch reviews when component mounts or studentId changes
onMounted(() => {
    fetchReviews();
});

watch(() => props.studentId, () => {
    fetchReviews();
});
</script>
