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
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const amqp = require('amqplib'); // Import amqplib
const Job = require('./models/Job'); // Import Job model
const WebSocket = require('ws'); // Import WebSocket module

const app = express();
const port = process.env.PORT || 4000;

// Configuración Multer
const upload = multer({ dest: 'uploads/' });

// Cargar centros.json
const centrosPath = path.join(__dirname, 'centros_fixed.json');
if (!fs.existsSync(centrosPath)) {
    console.warn("⚠️ centros_fixed.json no encontrado al inicio");
} else {
    console.log(`✅ centros_fixed.json detectado.`);
}

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:1234@mongodb:27017/school_data?authSource=admin';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connectat a MongoDB (School Data)'))
    .catch(err => console.error('❌ Error connectant a MongoDB:', err));

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));


// WebSocket Server Setup
const WSS_PORT = process.env.WSS_PORT || 4001;
const wss = new WebSocket.Server({ port: WSS_PORT });
const clients = new Map(); // Map<userId, WebSocket>

wss.on('connection', (ws, req) => {
    console.log(`🔗 Cliente WebSocket conectado al puerto ${WSS_PORT}.`);
    // Extract userId from query parameters (e.g., /?userId=123)
    const userId = new URL(req.url, `http://${req.headers.host}`).searchParams.get('userId');

    if (userId) {
        clients.set(userId, ws);
        console.log(` Cliente ${userId} registrado para notificaciones.`);
    } else {
        console.warn(' Cliente WebSocket conectado sin userId.');
        ws.send(JSON.stringify({ type: 'error', message: 'User ID required for WebSocket connection.' }));
        ws.close(1008, 'User ID required');
        return;
    }

    ws.on('message', message => {
        console.log(`Mensaje recibido de ${userId}: ${message}`);
        // Handle incoming messages if needed
    });

    ws.on('close', () => {
        console.log(` Cliente ${userId} desconectado.`);
        clients.delete(userId);
    });

    ws.on('error', error => {
        console.error(` Error en WebSocket para ${userId}:`, error);
    });
});

console.log(`🚀 Servidor WebSocket escuchando en el puerto ${WSS_PORT}`);

// RabbitMQ Setup
let channel, connection;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://user:1234@rabbitmq:5672'; // Default for Docker

async function connectRabbitMQ() {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue('pi_processing_queue', { durable: true });
        await channel.assertQueue('job_notification_queue', { durable: true });
        console.log('✅ Conectado a RabbitMQ y colas aseguradas.');

        // Start consuming from the notification queue
        channel.consume('job_notification_queue', (msg) => {
            if (msg !== null) {
                try {
                    const notification = JSON.parse(msg.content.toString());
                    console.log('🔔 Notificación de trabajo recibida:', notification);

                    const clientWs = clients.get(String(notification.userId));
                    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify(notification));
                        console.log(` Notificación enviada al cliente ${notification.userId}`);
                    } else {
                        console.warn(` Cliente ${notification.userId} no conectado o WebSocket no listo.`);
                    }
                    channel.ack(msg);
                } catch (e) {
                    console.error('Error al procesar mensaje de notificación:', e);
                    channel.ack(msg); // Acknowledge to prevent requeue loop
                }
            }
        }, { noAck: false });

    } catch (error) {
        console.error('❌ Error conectando a RabbitMQ:', error.message);
        setTimeout(connectRabbitMQ, 5000); // Reintentar conexión
    }
}
connectRabbitMQ();

// CONFIGURACIÓN EMAIL TRANSPORTER

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS
//     },
//     tls: {
//         rejectUnauthorized: false // Necesario para redes corporativas/educativas
//     }
// });

// CONFIGURACIÓN EMAIL TRANSPORTER FUNCIONAL PARA PRODUCCION

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // 587 = false
    requireTLS: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000
});

// ==========================================
// RUTAS
// ==========================================

// Endpoint obtener centros
app.get('/api/centros', (req, res) => {
    const centrosPath = path.join(__dirname, 'centros_fixed.json');
    console.log(`📡 Buscando centros en: ${centrosPath}`);

    try {
        if (fs.existsSync(centrosPath)) {
            const content = fs.readFileSync(centrosPath, 'utf-8');
            try {
                const centrosData = JSON.parse(content);
                const lista = centrosData.map(c => ({
                    code: c.Codi_centre,
                    name: c.Denominació_completa
                }));
                res.json(lista);
            } catch (jsonError) {
                console.error("❌ Error PARSEANDO JSON centros:", jsonError);
                res.status(500).json({ error: 'JSON inválido en servidor' });
            }
        } else {
            console.warn("⚠️ Archivo centros_fixed.json NO encontrado.");
            res.json([]);
        }
    } catch (error) {
        console.error('❌ Error FATAL en GET /api/centros:', error);
        res.status(500).json({ error: 'Internal Server Error: ' + error.message });
    }
});

// Login Manual
app.post('/api/login', async (req, res) => {
    try {
        const { username, password, center_code } = req.body;

        // Buscar usuario por username O email, filtrando por centro
        const user = await User.findOne({
            where: {
                center_code: center_code,
                [Op.or]: [
                    { username: username },
                    { email: username }
                ]
            }
        });

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado o no pertenece al centro' });

        if (!user.isVerified) {
            return res.status(403).json({ error: 'Debes verificar tu correo electrónico antes de entrar.' });
        }

        // Comprobación de password sigue igual abajo...

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        res.json({ message: '¡Login exitoso!', user: { id: user.id, username: user.username, center_code: user.center_code, role: user.role } });
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
// Endpoint para validar sesión frontend
app.get('/api/users/:id/exists', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) return res.status(200).json({ exists: true });
        return res.status(404).json({ exists: false });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, center_code, email } = req.body;

        if (!center_code) return res.status(400).json({ error: 'El código del centro es obligatorio' });
        if (!email) return res.status(400).json({ error: 'El correo electrónico es obligatorio' });

        const validDomains = ['@edu.gencat.cat', '@inspedralbes.cat', '@gmail.com'];
        const isValidDomain = validDomains.some(domain => email.endsWith(domain));
        if (!isValidDomain) return res.status(400).json({ error: 'Dominio de correo no permitido.' });

        const existe = await User.findOne({ where: { username } });
        if (existe) return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });

        const correoExiste = await User.findOne({ where: { email } });
        if (correoExiste) return res.status(400).json({ error: 'El correo electrónico ya está registrado' });

        // VALIDACIÓN DE ROL ADMINISTRADOR
        const role = req.body.role || 'teacher';
        if (role === 'admin') {
            const centrosPath = path.join(__dirname, 'centros_fixed.json');
            if (fs.existsSync(centrosPath)) {
                const content = fs.readFileSync(centrosPath, 'utf-8');
                const centrosData = JSON.parse(content);
                const centro = centrosData.find(c => String(c.Codi_centre) === String(center_code));

                if (!centro) {
                    return res.status(400).json({ error: 'Centro no encontrado para validar administrador.' });
                }

                if (!centro["E-mail_centre"] || centro["E-mail_centre"].trim().toLowerCase() !== email.trim().toLowerCase()) {
                    return res.status(400).json({
                        error: `Como responsable de centro, debes usar el correo oficial: ${centro["E-mail_centre"]}`
                    });
                }
            } else {
                return res.status(500).json({ error: 'Error interno: Base de datos de centros no disponible.' });
            }
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await User.create({
            username,
            password,
            center_code,
            email,
            verificationCode: code,
            isVerified: false,
            role: role
        });

        console.log(`📨 [DEBUG] Enviando código a ${email}...`);

        const mailOptions = {
            from: `"Soport - Generalitat" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '🔐 Codi de verificació - Registre',
            text: `El teu codi de verificació és: ${code}`,
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

        if (String(user.verificationCode) === String(code)) {
            user.isVerified = true;
            user.verificationCode = null;
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

        const existingStudent = await Student.findById(ralc);
        if (existingStudent && existingStudent.ownerId && existingStudent.ownerId !== userId) {
            return res.status(403).json({ error: 'No tens permís per modificar aquest alumne.' });
        }
        const studentData = {
            name: extractedData.dadesAlumne?.nomCognoms || 'Alumne Desconegut',
            birthDate: extractedData.dadesAlumne?.dataNaixement || 'Data Desconeguda',
            extractedData: extractedData,
            extractedData: extractedData,
            ownerId: userId, // Assignar propietari
            centerCode: req.body.centerCode || null // Guardar código de centro
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
        const userId = parseInt(req.query.userId);

        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const student = await Student.findById(ralc);
        if (!student) return res.status(404).json({ error: 'No encontrado' });

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

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Usuari no trobat' });

        let query = {};

        if (user.role === 'admin') {
            // Si es admin, ve TODO lo de su centro
            query = { centerCode: String(user.center_code) };
        } else {
            // Si es profesor normal, ve lo suyo o lo autorizado
            query = {
                $or: [
                    { ownerId: userId },
                    { authorizedUsers: userId }
                ]
            };
        }

        const students = await Student.find(query);
        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error servidor' });
    }
});

app.post('/api/students/:ralc/authorize', async (req, res) => {
    try {
        const { ralc } = req.params;
        const { userId, targetUsername } = req.body;

        if (!userId || !targetUsername) return res.status(400).json({ error: 'Falten dades' });

        const student = await Student.findById(ralc);
        if (!student) return res.status(404).json({ error: 'Alumne no trobat' });

        const requestingUser = await User.findByPk(userId);
        if (!requestingUser) return res.status(404).json({ error: 'Usuari solicitant no trobat' });

        const isAdmin = requestingUser.role === 'admin' && String(requestingUser.center_code) === String(student.centerCode);
        const isOwner = student.ownerId === userId;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Només el propietari o administrador poden autoritzar usuaris.' });
        }

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
    if (!req.file) return res.status(400).send('No file uploaded.');
    if (!channel) return res.status(500).send('RabbitMQ channel not established.');

    const { userId } = req.body; // Suponiendo que el userId viene en el body
    if (!userId) {
        fs.unlinkSync(req.file.path); // Limpiar archivo temporal si no hay userId
        return res.status(400).send('User ID is required.');
    }

    const jobId = new mongoose.Types.ObjectId(); // Generar un ObjectId para el jobId
    const filePath = req.file.path;
    const originalFileName = req.file.originalname;

    try {
        // Guardar el estado inicial del trabajo en MongoDB
        const newJob = new Job({
            _id: jobId,
            userId: userId,
            filename: originalFileName,
            filePath: filePath, // Guardamos la ruta temporal del archivo
            status: 'queued',
            uploadedAt: new Date(),
        });
        await newJob.save();

        // Enviar mensaje a RabbitMQ
        const message = {
            jobId: jobId.toHexString(),
            filePath: filePath,
            originalFileName: originalFileName,
            userId: userId,
        };
        channel.sendToQueue('pi_processing_queue', Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`✅ Trabajo ${jobId} encolado para el archivo ${originalFileName}`);

        res.status(202).json({
            message: 'Archivo subido y encolado para procesamiento.',
            jobId: jobId.toHexString(),
            filename: originalFileName,
            status: 'queued'
        });
    } catch (error) {
        console.error('❌ Error al encolar el trabajo:', error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath); // Limpiar en caso de error
        res.status(500).send('Error al procesar la subida del archivo.');
    }
});

app.get('/api/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(401).json({ error: 'User ID is required for authorization.' });
        }

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job not found.' });
        }

        // Security check: ensure the user requesting the job is the one who created it
        if (String(job.userId) !== String(userId)) {
            return res.status(403).json({ error: 'You are not authorized to view this job.' });
        }

        res.json(job);

    } catch (error) {
        console.error(`Error fetching job ${req.params.jobId}:`, error);
        res.status(500).json({ error: 'Server error while fetching job details.' });
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
    .then(async () => {
        console.log('✅ Tablas sincronizadas en MySQL');

        // Seed Admin
        try {
            const adminEmail = 'admin@prueba.app';
            let admin = await User.findOne({ where: { email: adminEmail } });
            if (!admin) {
                await User.create({
                    username: 'AdminPrueba',
                    email: adminEmail,
                    password: '123',
                    center_code: '99999999',
                    role: 'admin',
                    isVerified: true
                });
                console.log("✅ Usuario Admin creado: admin@prueba.app / 123");
            }
        } catch (e) {
            console.error("❌ Error seeding admin:", e);
        }

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