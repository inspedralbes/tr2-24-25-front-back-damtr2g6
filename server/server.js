// server.js
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { extractPIdata } = require('./extractor'); // Funció d'extracció
const fs = require('fs');
const path = require('path');
const { sequelize, User } = require('./models/user');
const mongoose = require('mongoose');
const Student = require('./models/Student');

const app = express();
const port = 4000;

// Configuración Multer
const upload = multer({ dest: 'uploads/' });

// Cargar centros.json (Solo para valida existencia al inicio)
const centrosPath = path.join(__dirname, 'centros_fixed.json');
if (!fs.existsSync(centrosPath)) {
    console.warn("⚠️ centros_fixed.json no encontrado al inicio");
} else {
    console.log(`✅ centros_fixed.json detectado.`);
}

// MongoDB Connection
const MONGO_URI = 'mongodb://admin:1234@mongodb:27017/school_data?authSource=admin';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connectat a MongoDB (School Data)'))
    .catch(err => console.error('❌ Error connectant a MongoDB:', err));

app.use(cors());
app.use(express.json());

// Endpoint obtener centros
// Endpoint obtener centros
app.get('/api/centros', (req, res) => {
    // console.log('📡 REQ: GET /api/centros');
    const centrosPath = path.join(__dirname, 'centros_fixed.json');

    try {
        if (fs.existsSync(centrosPath)) {
            // Leemos el archivo y lo enviamos directamente.
            // Si necesitamos mapear, lo hacemos en memoria pero con cuidado.
            const content = fs.readFileSync(centrosPath, 'utf-8');
            const centrosData = JSON.parse(content);

            // Mapeo ligero
            const lista = centrosData.map(c => ({
                code: c.Codi_centre,
                name: c.Denominació_completa
            }));

            res.json(lista);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('❌ Error en GET /api/centros:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const nodemailer = require('nodemailer');

// Configuración Email (Nodemailer)
// PARA PRODUCCIÓN: Usar variables de entorno (process.env.EMAIL_USER, etc.)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hugocor0609@gmail.com', // Correo remitente
        pass: 'jszoxtdpjozmjbzo' // Contraseña de aplicación
    }
});

// Login Manual
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, center_code } = req.body;

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ error: 'Debes verificar tu correo electrónico antes de entrar.' });
        }

        if (String(user.center_code) !== String(center_code)) {
            return res.status(401).json({ error: 'El usuario no pertenece al centro seleccionado' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        res.json({ message: '¡Login exitoso!', user: { id: user.id, username: user.username, center_code: user.center_code } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, center_code, email } = req.body;

        if (!center_code) return res.status(400).json({ error: 'El código del centro es obligatorio' });
        if (!email) return res.status(400).json({ error: 'El correo electrónico es obligatorio' });

        const validDomains = ['@edu.gencat.cat', '@inspedralbes.cat'];
        const isValidDomain = validDomains.some(domain => email.endsWith(domain));
        if (!isValidDomain) return res.status(400).json({ error: 'El correo debe ser @edu.gencat.cat o @inspedralbes.cat' });

        const existe = await User.findOne({ where: { username } });
        if (existe) return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });

        const correoExiste = await User.findOne({ where: { email } });
        if (correoExiste) return res.status(400).json({ error: 'El correo electrónico ya está registrado' });

        // Generar código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await User.create({
            username,
            password,
            center_code,
            email,
            verificationCode: code,
            isVerified: false
        });

        // Enviar correo (Simulado en consola por ahora si falla auth)
        console.log(`📨 [DEBUG] Código de verificación para ${email}: ${code}`);

        try {
            await transporter.sendMail({
                from: '"Aplicació Generalitat" <no-reply@gencat.cat>',
                to: email,
                subject: 'Codi de verificació - Registre',
                text: `El teu codi de verificació és: ${code}`,
                html: `<b>El teu codi de verificació és: ${code}</b>`
            });
            console.log('✅ Correo enviado correctamente');
        } catch (mailError) {
            console.warn('⚠️ No se pudo enviar el correo real (falta config SMTP). Revisa la consola para ver el código.', mailError.message);
        }

        res.status(201).json({ message: 'Usuario registrado. Revisa tu correo.', needsVerification: true, email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar el usuario' });
    }
});

// Verify Code Endpoint
app.post('/api/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (user.isVerified) return res.status(400).json({ error: 'El usuario ya está verificado' });

        if (user.verificationCode === code) {
            user.isVerified = true;
            user.verificationCode = null; // Limpiar código
            await user.save();
            res.json({ message: 'Cuenta verificada correctamente. Ya puedes iniciar sesión.' });
        } else {
            res.status(400).json({ error: 'Código incorrecto' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al verificar código' });
    }
});

// Students
app.post('/api/students', async (req, res) => {
    try {
        const { ralc, extractedData } = req.body;
        if (!ralc || !extractedData) {
            return res.status(400).json({ error: 'Falten dades' });
        }
        const studentData = {
            name: extractedData.dadesAlumne?.nomCognoms || 'Alumne Desconegut',
            birthDate: extractedData.dadesAlumne?.dataNaixement || 'Data Desconeguda',
            extractedData: extractedData
        };
        const student = await Student.findByIdAndUpdate(ralc, studentData, { new: true, upsert: true });
        res.json({ message: 'Guardado en MongoDB', student });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error guardando estudiante' });
    }
});

app.get('/api/students/:ralc', async (req, res) => {
    try {
        const { ralc } = req.params;
        const student = await Student.findById(ralc);
        if (!student) return res.status(404).json({ error: 'No encontrado' });
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: 'Error servidor' });
    }
});

app.post('/upload', upload.single('piFile'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file');
    const filePath = req.file.path;
    try {
        const data = await extractPIdata(filePath);
        fs.unlinkSync(filePath);
        res.json({ message: 'Extracción exitosa', data });
    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).send(error.message);
    }
});

// Start Server
console.log('Iniciando sincronización con MySQL...');

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

sequelize.authenticate()
    .then(() => {
        console.log('✅ Conexión a MySQL establecida correctamente.');
        return sequelize.sync({ alter: true }); // ACTUALIZAR ESQUEMA (columna email)
    })
    .then(() => {
        console.log('✅ Tablas sincronizadas en MySQL');
        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Servidor Node.js escoltant a http://0.0.0.0:${port}`);
        });
    })
    .catch(err => {
        console.error('❌ Error fatal al iniciar el servidor (DB):', err);
        // Start server anyway to serve JSON
        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Servidor Node.js (FALLBACK) escoltant a http://0.0.0.0:${port}`);
        });
    });
