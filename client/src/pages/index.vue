<template>
  <div class="pi-extractor">
    <h2>Extracteur de Dades del PI (Amb IA Local)</h2>
    <input type="file" @change="handleFileUpload" accept=".docx" />
    
    <button @click="uploadFile" :disabled="!file || isLoading" class="upload-button">
      {{ isLoading ? 'Processant amb IA...' : 'Pujar i Extreure Dades' }}
    </button>
    
    <p v-if="error" class="error-message">Error: {{ error }}</p>
    
    <div v-if="extractedData" class="results-container">
      <h3>✅ Dades Extretes Correctament</h3>
      
      <h4>Dades de l'Alumne</h4>
      <div class="data-group">
        <p><strong>Nom i Cognoms:</strong> {{ extractedData.dadesAlumne.nomCognoms || 'N/D' }}</p>
        <p><strong>Data de Naixement:</strong> {{ extractedData.dadesAlumne.dataNaixement || 'N/D' }}</p>
        <p><strong>Curs:</strong> {{ extractedData.dadesAlumne.curs || 'N/D' }}</p>
      </div>

      <h4>Motiu / Diagnòstic</h4>
      <p class="data-group diagnostic-text">{{ extractedData.motiu.diagnostic || 'N/D' }}</p>

      <h4 v-if="extractedData.adaptacionsGenerals && extractedData.adaptacionsGenerals.length">
        Adaptacions Generals Proposades (Sí)
      </h4>
      <ul class="data-list" v-if="extractedData.adaptacionsGenerals && extractedData.adaptacionsGenerals.length">
        <li v-for="(adaptacio, index) in extractedData.adaptacionsGenerals" :key="'A'+index">{{ adaptacio }}</li>
      </ul>

      <h4 v-if="extractedData.orientacions && extractedData.orientacions.length">
        Orientacions
      </h4>
      <div class="orientations-list data-list" v-if="extractedData.orientacions && extractedData.orientacions.length">
        <div v-for="(orientacio, index) in extractedData.orientacions" :key="'O'+index">
          {{ index + 1 }}. {{ orientacio }}
        </div>
      </div>
    </div>

  </div>
</template>

<script>
export default {
  data() {
    return {
      file: null,
      extractedData: null,
      isLoading: false,
      error: null,
      apiUrl: 'http://localhost:4000/upload' // URL del teu servidor Node.js
    };
  },
  methods: {
    handleFileUpload(event) {
      this.file = event.target.files[0];
      this.extractedData = null;
      this.error = null;
    },
    async uploadFile() {
      if (!this.file) return;

      this.isLoading = true;
      this.error = null;

      const formData = new FormData();
      // 'piFile' ha de coincidir amb el nom del camp a Multer (upload.single('piFile'))
      formData.append('piFile', this.file); 

      try {
        // Crida al backend utilitzant fetch natiu
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          body: formData 
        });

        // 1. Maneig de la resposta (error HTTP)
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error del servidor: ${response.status}. Detall: ${errorText.substring(0, 100)}...`);
        }

        // 2. Conversió a JSON
        const data = await response.json();
        this.extractedData = data.data;

      } catch (err) {
        console.error('Error en la petició o processament:', err);
        // El missatge d'error ha de ser clar sobre la causa
        this.error = `No es pot extreure les dades. Assegura't que el servidor Node/Ollama està en marxa. Detall: ${err.message}`;
        this.extractedData = null;
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.pi-extractor {
  /* Estils del contenidor principal */
  font-family: 'Montserrat', sans-serif; /* Font més moderna */
  max-width: 850px;
  margin: 40px auto;
  padding: 30px;
  border: 1px solid #dcdcdc; /* Línia suau */
  border-radius: 10px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1); /* Ombra subtil */
  background-color: #fcfcfc;
}

h2 {
    /* Títol principal */
    color: #1a5c88; /* Blau fosc institucional */
    border-bottom: 3px solid #1a5c88; 
    padding-bottom: 15px;
    margin-bottom: 25px;
    font-weight: 600;
}

h4 {
    /* Títols de les seccions (Dades, Motiu, Adaptacions) */
    color: #4a4a4a; 
    margin-top: 30px;
    margin-bottom: 10px;
    font-size: 1.2em;
    font-weight: 600;
    border-left: 5px solid #6c757d; /* Detall gris fosc */
    padding-left: 10px;
}

/* --- Elements d'interacció --- */

.upload-button {
    background-color: #28a745; /* Verd d'èxit */
    color: white;
    border: none;
    padding: 10px 18px;
    border-radius: 5px;
    cursor: pointer;
    margin-left: 10px;
    font-weight: 500;
    transition: background-color 0.3s;
}

.upload-button:hover:not(:disabled) {
    background-color: #1e7e34;
}
.upload-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

/* --- Contenidors de Resultats --- */

.results-container {
  color: black;
  margin-top: 30px;
  padding: 25px;
  background-color: #e9f7ef; /* Fons verd clar per resultats positius */
  border: 1px solid #c3e6cb;
  border-radius: 8px;
}

.data-group {
    /* Fons clar per a la informació agrupada (Nom, Data, Curs) */
    padding: 15px;
    background-color: #ffffff;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 20px;
}
.data-group p {
    margin: 5px 0;
}
strong {
    color: #1a5c88; /* Blaus per ressaltar etiquetes */
}
.diagnostic-text {
    font-style: italic;
    color: #555;
    background-color: #f8f9fa;
    border-left: 4px solid #adb5bd;
    padding: 10px;
    border-radius: 4px;
}

/* --- Llistes d'Orientacions i Adaptacions --- */

.data-list {
  list-style-type: none;
  padding-left: 0;
  margin-left: 15px; /* Sagnat per les llistes */
}

.data-list li, .orientations-list div {
  margin-bottom: 10px;
  padding: 8px 10px;
  background-color: #ffffff;
  border-left: 4px solid #1a5c88; /* Destacar cada ítem amb blau */
  border-radius: 4px;
  line-height: 1.4;
}

/* Netejar el darrer element de la llista (només si fos un <ul>/<li>) */
.data-list li:last-child {
    border-bottom: none;
}
/* Numeració clara per les orientacions */
.orientations-list div {
    border-left: 4px solid #6c757d; /* Utilitzar un color diferent per diferenciar-les */
}

/* --- Missatge d'Error --- */
.error-message {
  color: white;
  background-color: #dc3545; /* Vermell fort */
  font-weight: bold;
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #bd2130;
}
</style>