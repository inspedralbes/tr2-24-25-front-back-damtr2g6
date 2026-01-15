// server.js
require('dotenv').config(); // 1. Cargar variables de entorno al inicio
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { extractPIdata } = require('./extractor');
const fs = require('fs');
const path = require('path');
const { sequelize, User } = require('./models/user');
const mongoose = require('mongoose');
const Student = require('./models/Student');
const nodemailer = require('nodemailer'); // Mover imports arriba

const app = express();
const port = process.env.PORT || 4000; // Usar puerto del entorno o 4000 por defecto

// Configuración Multer
const upload = multer({ dest: 'uploads/' });

// Cargar centros.json
const centrosPath = path.join(__dirname, 'centros_fixed.json');
if (!fs.existsSync(centrosPath)) {
    console.warn("⚠️ centros_fixed.json no encontrado al inicio");
} else {
    console.log(`✅ centros_fixed.json detectado.`);
}

// MongoDB Connection (Usando variable de entorno)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:1234@mongodb:27017/school_data?authSource=admin';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connectat a MongoDB (School Data)'))
    .catch(err => console.error('❌ Error connectant a MongoDB:', err));

app.use(cors());
app.use(express.json());


// CONFIGURACIÓN EMAIL TRANSPORTER

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false // Necesario para redes corporativas/educativas
    }
});

// ==========================================
// RUTAS
// ==========================================

// Endpoint obtener centros
app.get('/api/centros', (req, res) => {
    try {
        if (fs.existsSync(centrosPath)) {
            const content = fs.readFileSync(centrosPath, 'utf-8');
            const centrosData = JSON.parse(content);
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

// Login Manual
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, center_code } = req.body;

        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (!user.isVerified) {
            return res.status(403).json({ error: 'Debes verificar tu correo electrónico antes de entrar.' });
        }

        if (String(user.center_code) !== String(center_code)) {
            return res.status(401).json({ error: 'El usuario no pertenece al centro seleccionado' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        res.json({ message: '¡Login exitoso!', user: { id: user.id, username: user.username, center_code: user.center_code } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

app.get('/api/users/:id/exists', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            res.json({ exists: true });
        } else {
            res.status(404).json({ exists: false });
        }
    } catch (error) {
        console.error('Error checking user existence:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Register (CON EMAIL HTML)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, center_code, email } = req.body;

        if (!center_code) return res.status(400).json({ error: 'El código del centro es obligatorio' });
        if (!email) return res.status(400).json({ error: 'El correo electrónico es obligatorio' });

        const validDomains = ['@edu.gencat.cat', '@inspedralbes.cat', '@gmail.com']; // Añadido gmail para pruebas si quieres
        const isValidDomain = validDomains.some(domain => email.endsWith(domain));
        if (!isValidDomain) return res.status(400).json({ error: 'Dominio de correo no permitido.' });

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

        console.log(`📨 [DEBUG] Enviando código a ${email}...`);

        // Plantilla HTML Profesional
        const mailOptions = {
            from: `"Soport - Generalitat" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '🔐 Codi de verificació - Registre',
            text: `El teu codi de verificació és: ${code}`, // Fallback texto plano
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">Benvingut/da</h2>
                </div>
                <p style="font-size: 16px; color: #555;">Hola,</p>
                <p style="font-size: 16px; color: #555;">Gràcies per registrar-te. Utilitza el següent codi per verificar el teu compte:</p>
                
                <div style="background-color: #f0f4f8; padding: 15px; text-align: center; border-radius: 8px; margin: 25px 0;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #007bff;">
                        ${code}
                    </span>
                </div>
        
                <p style="font-size: 14px; color: #777; text-align: center;">Si no has sol·licitat aquest codi, ignora aquest missatge.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">Institut Pedralbes</p>
            </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('✅ Correo enviado correctamente a:', email);
        } catch (mailError) {
            console.error('⚠️ ERROR AL ENVIAR CORREO:', mailError);
            // No bloqueamos el registro, pero avisamos en consola
        }

        res.status(201).json({ message: 'Usuario registrado. Revisa tu correo.', needsVerification: true, email });

    } catch (error) {
        console.error('Error en registro:', error);
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

        // Comparar Strings para evitar errores de tipo
        if (String(user.verificationCode) === String(code)) {
            user.isVerified = true;
            user.verificationCode = null; // Limpiar código por seguridad
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

// Students Routes
app.post('/api/students', async (req, res) => {
    try {
        const { ralc, extractedData, userId } = req.body;
        if (!ralc || !extractedData || !userId) {
            return res.status(400).json({ error: 'Falten dades (ralc, extractedData, userId)' });
        }

        // Comprovar si ja existeix i si l'usuari és el propietari
        const existingStudent = await Student.findById(ralc);
        if (existingStudent && existingStudent.ownerId && existingStudent.ownerId !== userId) {
            return res.status(403).json({ error: 'No tens permís per modificar aquest alumne.' });
        }
        const studentData = {
            name: extractedData.dadesAlumne?.nomCognoms || 'Alumne Desconegut',
            birthDate: extractedData.dadesAlumne?.dataNaixement || 'Data Desconeguda',
            extractedData: extractedData,
            ownerId: userId // Assignar propietari
        };

        // Si existeix, mantenim ownerId original (o el sobreescrivim si som nosaltres, que ja ho som)
        // Amb upsert, si és nou, farà servir el que passem.
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
        const userId = parseInt(req.query.userId); // Passar userId com a query param

        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const student = await Student.findById(ralc);
        if (!student) return res.status(404).json({ error: 'No encontrado' });

        // Verificar permisos
        // L'usuari ha de ser el propietari O estar autoritzat
        const isOwner = student.ownerId === userId;
        const isAuthorized = student.authorizedUsers && student.authorizedUsers.includes(userId);

        if (!isOwner && !isAuthorized) {
            return res.status(403).json({ error: 'No tens permís per veure aquest alumne.' });
        }

        res.json(student);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error servidor' });
    }
});

app.get('/api/my-students', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const students = await Student.find({
            $or: [
                { ownerId: userId },
                { authorizedUsers: userId }
            ]
        });
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error servidor' });
    }
});

app.post('/api/students/:ralc/authorize', async (req, res) => {
    try {
        const { ralc } = req.params;
        const { userId, targetUsername } = req.body; // userId es el que solicita (propietario), targetUsername a quien autorizar

        if (!userId || !targetUsername) return res.status(400).json({ error: 'Falten dades' });

        const student = await Student.findById(ralc);
        if (!student) return res.status(404).json({ error: 'Alumne no trobat' });

        if (student.ownerId !== userId) {
            return res.status(403).json({ error: 'Només el propietari pot autoritzar usuaris.' });
        }

        // Buscar el usuario destino por username en MySQL
        const targetUser = await User.findOne({ where: { username: targetUsername } });
        if (!targetUser) return res.status(404).json({ error: 'Usuari destinatari no trobat.' });

        if (targetUser.id === userId) return res.status(400).json({ error: 'Ja ets el propietari.' });

        if (!student.authorizedUsers.includes(targetUser.id)) {
            student.authorizedUsers.push(targetUser.id);
            await student.save();
        }

        res.json({ message: `Usuari ${targetUsername} autoritzat correctament.`, authorizedUsers: student.authorizedUsers });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error servidor' });
    }
});

app.post('/upload', upload.single('piFile'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file');
    const filePath = req.file.path;
    try {
        const data = await extractPIdata(filePath);
        fs.unlinkSync(filePath); // Limpieza
        res.json({ message: 'Extracción exitosa', data });
    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).send(error.message);
    }
});

app.get('/', (req, res) => {
    res.send('Backend is running!');
});

// Start Server & Sync DB
console.log('🔄 Iniciando sincronización con MySQL...');

sequelize.authenticate()
    .then(() => {
        console.log('✅ Conexión a MySQL establecida correctamente.');
        return sequelize.sync({ alter: true });
    })
    .then(() => {
        console.log('✅ Tablas sincronizadas en MySQL');
        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Servidor Node.js activo en puerto ${port}`);
        });
    })
    .catch(err => {
        console.error('❌ Error fatal al iniciar el servidor (DB):', err);
        // Fallback server start
        app.listen(port, '0.0.0.0', () => {
            console.log(`⚠️ Servidor (MODO SIN DB) activo en puerto ${port}`);
        });
    });