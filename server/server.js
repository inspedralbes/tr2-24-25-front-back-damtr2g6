// server.js
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { extractPIdata } = require('./extractor'); // Funció d'extracció
const fs = require('fs');

const { sequelize, User } = require('./models/user');

const mongoose = require('mongoose'); // Import Mongoose
const Student = require('./models/Student'); // Import Student Model

const app = express();
const port = 4000;

// Configura Multer per a la càrrega de fitxers
const upload = multer({ dest: 'uploads/' });

// MongoDB Connection
const MONGO_URI = 'mongodb://admin:1234@mongodb:27017/school_data?authSource=admin'; // Connection String from Docker
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connectat a MongoDB (School Data)'))
  .catch(err => console.error('❌ Error connectant a MongoDB:', err));

app.use(cors()); // Permet peticions des del frontend de Vue
app.use(express.json());

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

// Endpoint per guardar dades de l'estudiant a MongoDB
app.post('/api/students', async (req, res) => {
  try {
    const { ralc, extractedData } = req.body;

    if (!ralc || !extractedData) {
      return res.status(400).json({ error: 'Falten dades: RALC o dades extretes' });
    }

    // Preparem l'objecte per guardar/actualitzar
    // Mapping: Extraiem els camps principals per a les columnes d'alt nivell
    const studentData = {
      name: extractedData.dadesAlumne?.nomCognoms || 'Alumne Desconegut',
      birthDate: extractedData.dadesAlumne?.dataNaixement || 'Data Desconeguda',
      extractedData: extractedData // Guardem tota l'estructura JSON "per apartats"
    };

    // Upsert: Si existeix actualitza, si no crea
    const student = await Student.findByIdAndUpdate(
      ralc, // _id és el RALC
      studentData,
      { new: true, upsert: true } // Return new doc, create if not exists
    );

    console.log(`✅ Estudiant guardat/actualitzat amb RALC: ${ralc}`);
    res.json({ message: 'Dades guardades correctament a MongoDB', student });

  } catch (error) {
    console.error('❌ Error guardant estudiant:', error);
    res.status(500).json({ error: 'Error al guardar a la base de dades', details: error.message });
  }
});

// Endpoint per buscar estudiant per RALC
app.get('/api/students/:ralc', async (req, res) => {
  try {
    const { ralc } = req.params;
    const student = await Student.findById(ralc);

    if (!student) {
      return res.status(404).json({ error: 'Estudiant no trobat' });
    }

    res.json(student);
  } catch (error) {
    console.error('❌ Error cercant estudiant:', error);
    res.status(500).json({ error: 'Error del servidor al buscar l\'estudiant' });
  }
});

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

sequelize.sync()
  .then(() => {
    console.log('Tablas sincronizadas en MySQL');
    app.listen(port, () => {
      console.log(`Servidor Node.js escoltant a http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Error al sincronizar con la base de datos:', err);
  });