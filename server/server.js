// server.js
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { extractPIdata } = require('./extractor'); // Funció d'extracció
const fs = require('fs');
const { MongoClient } = require('mongodb');

const { sequelize, User } = require('./models/user');

const app = express();
const port = 4000;

// --- Configuració MongoDB ---
const mongoUrl = 'mongodb://admin:1234@mongodb_db:27017/';
const dbName = 'alumnesPI';
const mongoClient = new MongoClient(mongoUrl);
let db;

async function connectToMongo() {
  try {
    await mongoClient.connect();
    console.log('Connectat correctament a MongoDB');
    db = mongoClient.db(dbName);
  } catch (err) {
    console.error('Error connectant a MongoDB:', err);
    process.exit(1); // Atura l'aplicació si no es pot connectar a la BBDD
  }
}

connectToMongo();

// Configura Multer per a la càrrega de fitxers
const upload = multer({ dest: 'uploads/' });

app.use(cors()); // Permet peticions des del frontend de Vue
app.use(express.json());

sequelize.sync() // Esto crea la tabla si no existe
  .then(() => console.log('Tablas sincronizadas en MySQL'))
  .catch(err => console.error('Error al sincronizar:', err));

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Buscar el usuario
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 2. Comparar contraseñas
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.json({ message: '¡Login exitoso!', user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    const existe = await User.findOne({ where: { username } });
    if (existe) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }

    await User.create({ username, password });

    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

// Ruta principal de càrrega i processament
app.post('/upload', upload.single('piFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No s\'ha pujat cap fitxer.');
    }
    const filePath = req.file.path;

    try {
        // Crida a la funció d'extracció
        const data = await extractPIdata(filePath);
        // Elimina el fitxer temporal després de l'extracció
        fs.unlinkSync(filePath); 
        
        res.json({
            message: 'Dades extretes amb èxit',
            data: data
        });

    } catch (error) {
        console.error('Error processant el fitxer:', error);
        // Assegura't que el fitxer existeix abans d'intentar eliminar-lo
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path); 
        }
        // Envia el missatge d'error específic al client
        res.status(500).send(error.message || 'Error processant el fitxer DOCX.');
    }
});

// --- Nova ruta per guardar dades a MongoDB ---
app.post('/save-data', async (req, res) => {
  const { ralc, orientacions, adaptacions } = req.body;

  if (!ralc || (!orientacions && !adaptacions)) {
    return res.status(400).json({ error: 'Falten dades necessàries (RALC, orientacions o adaptacions).' });
  }

  try {
    if (!db) {
      return res.status(500).json({ error: 'La connexió a la base de dades no està disponible.' });
    }

    const filter = { ralc: ralc };
    const options = { upsert: true };

    // Guardar Orientacions
    if (orientacions && orientacions.length > 0) {
      const orientacionsCollection = db.collection('orientacions');
      const updateDoc = {
        $set: {
          ralc: ralc,
          orientacions: orientacions,
          updatedAt: new Date(),
        },
      };
      await orientacionsCollection.updateOne(filter, updateDoc, options);
    }

    // Guardar Adaptacions
    if (adaptacions && adaptacions.length > 0) {
      const adaptacionsCollection = db.collection('adaptacions');
      const updateDoc = {
        $set: {
          ralc: ralc,
          adaptacions: adaptacions,
          updatedAt: new Date(),
        },
      };
      await adaptacionsCollection.updateOne(filter, updateDoc, options);
    }

    res.status(200).json({ message: 'Dades guardades correctament a MongoDB.' });

  } catch (error) {
    console.error('Error guardant a MongoDB:', error);
    res.status(500).json({ error: 'Error intern del servidor al guardar les dades.' });
  }
});

app.listen(port, () => {
    console.log(`Servidor Node.js escoltant a http://localhost:${port}`);
});