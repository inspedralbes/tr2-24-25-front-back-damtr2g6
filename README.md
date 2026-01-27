# 📄 Projecte d'Extracció i Gestió de PIs (Plans Individualitzats)

> **Plataforma integral per a la gestió d'estudiants, extracció automatitzada de dades de documents `.docx` i anàlisi estadística.**

---

## 🌟 Descripció del Projecte

Aquest sistema permet als centres educatius gestionar de manera eficient els Plans Individualitzats (PI) dels seus alumnes. Mitjançant l'ús de tecnologies web modernes i intel·ligència artificial, l'aplicació automatitza l'extracció de dades clau de documents Word, permet la gestió d'usuaris amb rols (Administradors, Centres/Propietaris) i ofereix visualitzacions estadístiques.

### ✨ Funcionalitats Principals

*   **🔐 Autenticació i Seguretat**:
    *   Registre d'usuaris amb **verificació per correu electrònic**.
    *   Sistema de **Login segur** amb gestió de sessions.
    *   **Control d'accés basat en rols (RBAC)**:
        *   **Admin**: Accés global, gestió d'usuaris, estadístiques avançades.
        *   **Centre/Owner**: Accés limitat a les dades del seu propi centre (RALC).
    *   Protecció de contrasenyes amb `bcrypt`.

*   **📂 Gestió d'Expedients**:
    *   Pujada massiva o individual de documents `.docx`.
    *   Llistat d'estudiants amb filtres i cerca.
    *   Edició i esborrat d'expedients (amb confirmació de seguretat).

*   **🤖 Extracció Intel·ligent de Dades**:
    *   Processament automàtic de fitxers `.docx` (Plans Individualitzats).
    *   Extracció de camps clau: *Nom, Data de Naixement, Curs, Diagnòstic, Adaptacions, Orientacions*.
    *   **Enfocament Híbrid**: Ús combinat de **Regex** (Expressions Regulars) per a dades estructurades i **IA** per a camps complexos.

*   **📊 Estadístiques i Anàlisi**:
    *   Dashboards interactius per a administradors.
    *   Distribució d'estudiants per curs.
    *   Anàlisi de diagnòstics més freqüents.
    *   Ús d'agregacions de MongoDB per a càlculs en temps real.

*   **💻 Interfície Moderna (Frontend)**:
    *   Dissenyat amb **Vue 3** i **Vuetify**.
    *   Totalment "Responsive".
    *   Pàgines dedicades: *MyPis* (Els meus PIs), *Extractor*, *Estadístiques*, *Perfil*.

---

## 🛠️ Stack Tecnològic

### **Frontend (Client)**
*   **Framework**: Vue.js 3 (Composition API)
*   **Build Tool**: Vite
*   **UI Library**: Vuetify 3 (Material Design)
*   **State Management**: Pinia
*   **Routing**: Vue Router
*   **Estils**: SASS, CSS
*   **Desplegament Escriptori**: Electron (en desenvolupament)

### **Backend (Server)**
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Base de Dades**: MongoDB (Mongoose)
*   **Processament de Documents**: `mammoth` (Word a HTML), `textract`, `pdf-parse`.
*   **Correu**: Nodemailer (Gmail SMTP).
*   **Seguretat**: `bcrypt`, `cors`, `dotenv`.

### **DevOps & Eines**
*   **Docker & Docker Compose**: Per a la containerització de tots els serveis (Client, Server, Mongo, Ollama).
*   **Git**: Control de versions.

---

## 📂 Estructura del Projecte

```bash
📦 tr2-24-25-front-back-damtr2g6
 ┣ 📂 client           # Codi font del Frontend (Vue.js)
 ┃ ┣ 📂 src
 ┃ ┃ ┣ 📂 components # Components reutilitzables
 ┃ ┃ ┣ 📂 pages      # Vistes principals (Home, Login, MyPis...)
 ┃ ┃ ┣ 📂 stores     # Gestió d'estat (Pinia)
 ┃ ┃ ┗ 📜 main.js    # Punt d'entrada
 ┣ 📂 server           # Codi font del Backend (Node.js)
 ┃ ┣ 📂 controllers  # Lògica de controladors
 ┃ ┣ 📂 models       # Esquemes de Mongoose (User, Student, Center...)
 ┃ ┣ 📂 routes       # Definició de rutes API
 ┃ ┗ 📜 server.js    # Configuració del servidor
 ┣ 📂 electron         # Configuració per a l'app d'escriptori
 ┣ 📜 docker-compose.yml # Orquestració de contenidors
 ┗ 📜 README.md        # Documentació del projecte
```

---

## 🚀 Instal·lació i Posada en Marxa

Tens dues opcions per executar el projecte: utilitzant **Docker** (recomanat) o manualment.

### Opció A: Docker (Ràpid i Fàcil)

1.  **Clona el repositori:**
    ```bash
    git clone <URL_DEL_REPO>
    cd tr2-24-25-front-back-damtr2g6
    ```

2.  **Crea l'arxiu `.env`** a la carpeta `server/` (pots copiar `.env.example`).

3.  **Executa Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    *   Això aixecarà automàticament el frontend, el backend i la base de dades.

4.  **Accedeix a l'aplicació:**
    *   Frontend: [http://localhost:8080](http://localhost:8080)
    *   Backend: [http://localhost:4000](http://localhost:4000)

### Opció B: Instal·lació Manual (Desenvolupament)

#### 1. Backend
```bash
cd server
npm install
# Configura el teu .env (MONGODB_URI, EMAIL_USER, etc.)
npm start
```

#### 2. Frontend
```bash
cd client
npm install
npm run dev
```

---

## 👥 Equip de Desenvolupament

*   **Hugo Córdoba**
*   **Jordi Rocha**
*   **Roberto Lotreanu**
*   **Eduard Vilaseca**

---

## 📝 Llicència

Aquest projecte està sota la llicència [ISC](LICENSE).
