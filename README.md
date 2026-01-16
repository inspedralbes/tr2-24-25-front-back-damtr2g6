# 📄 Projecte d'Extracció de Dades de Documents

> **Aplicació Full‑Stack per a l'extracció automàtica d'informació clau a partir de documents `.docx`**

---

## 🌟 Visió General

Aquest projecte permet **pujar documents `.docx`**, processar-los automàticament i **retornar dades estructurades** mitjançant una API REST.

Tot el sistema està **containeritzat amb Docker**, assegurant un desplegament senzill, reproduïble i consistent tant en desenvolupament com en producció.

---

## 🧩 Arquitectura del Sistema

```
┌────────────┐      ┌────────────┐      ┌────────────┐
│  Frontend  │ ───▶ │  Backend   │ ───▶ │     IA     │
│  Vue 3     │      │ Node.js    │      │  Ollama   │
└────────────┘      └────────────┘      └────────────┘
```

---

## ✨ Tecnologies Utilitzades

### 💻 Frontend (Client)

| Tecnologia     | Descripció                      |
| -------------- | ------------------------------- |
| **Vue.js 3**   | Framework JavaScript progressiu |
| **Vuetify 3**  | Components Material Design      |
| **Vite**       | Build tool ràpid i lleuger      |
| **Vue Router** | Enrutament SPA                  |
| **SASS**       | Estils avançats i mantenibles   |

---

### ⚙️ Backend (Servidor)

| Tecnologia     | Ús                           |
| -------------- | ---------------------------- |
| **Node.js**    | Entorn d'execució            |
| **Express.js** | API REST                     |
| **Multer**     | Pujada de fitxers            |
| **Mammoth**    | Conversió `.docx` a HTML     |
| **CORS**       | Comunicació frontend/backend |

---

### 🤖 IA i DevOps

| Tecnologia         | Funció                        |
| ------------------ | ----------------------------- |
| **Docker**         | Containerització              |
| **Docker Compose** | Orquestració de serveis       |
| **Ollama**         | Execució local de models d'IA |

---

## 📂 Estructura del Projecte

```
📦 projecte
 ┣ 📂 client          # Frontend Vue.js
 ┣ 📂 server          # Backend Node.js / Express
 ┣ 📄 docker-compose.yml
 ┗ 📄 README.md
```

---

## 🚀 Posada en Marxa

> ⚠️ **Requisits previs:** Docker i Docker Compose instal·lats

### 1️⃣ Clonar el repositori

```bash
git clone <URL_DEL_REPOSITORI>
cd <NOM_DEL_DIRECTORI>
```

### 2️⃣ Arrencar els serveis

```bash
docker-compose up --build
```

Aquesta comanda:

* Construeix les imatges del **frontend** i **backend**
* Inicia els contenidors **frontend**, **backend** i **ollama**

---

## 🌐 Accés als Serveis

| Servei         | URL                                              |
| -------------- | ------------------------------------------------ |
| 🖥️ Frontend   | [http://localhost:8080](http://localhost:8080)   |
| ⚙️ Backend API | [http://localhost:4000](http://localhost:4000)   |
| 🤖 Ollama      | [http://localhost:11434](http://localhost:11434) |

---

## 👥 Equip del Projecte

* **Hugo Córdoba**
* **Jordi Rocha**
* **Roberto Lotreanu**
* **Eduard Vilaseca**

---

## 📊 Gestió del Projecte (Taiga)

🔗 [https://tree.taiga.io/project/hugo_06-projecte-traspas-dinformacio-dels-plans-individualitzats/timeline](https://tree.taiga.io/project/hugo_06-projecte-traspas-dinformacio-dels-plans-individualitzats/timeline)

---

## 🌍 URL de Producció

🔗 [http://pi.dam.inspedralbes.cat](http://pi.dam.inspedralbes.cat)

---

## 🚧 Estat del Projecte

🟡 **En desenvolupament**

---

## 📌 Notes Finals

Aquest projecte està pensat per ser **escalable**, **modular** i fàcilment ampliable amb nous models d'IA o nous formats de document.

💡 *Qualsevol millora o suggeriment és benvingut!*
