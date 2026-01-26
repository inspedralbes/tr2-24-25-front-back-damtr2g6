// server.js
require('dotenv').config(); // 1. Cargar variables de entorno al inicio
console.log('🚀 [RESTART] Servidor iniciat amb el motor de síntesi v2.0');
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
const PiReview = require('./models/PiReview'); // Import PiReview model (3rd Collection)
const Center = require('./models/Center'); // Import Center model (4th Collection for Bulk CRUD)
const WebSocket = require('ws'); // Import WebSocket module

const app = express();
const port = process.env.PORT || 4000;

// MAPPING GLOBAL DE DIAGNÒSTICS PER A SÍNTESI I CERCA
const DIAGNOSTIC_MAPPINGS = [
    { k: "TDAH", r: "TDAH|dèficit d'atenció|hiperactivitat" },
    { k: "DISLÈXIA", r: "Dislèxia|Dislexia" },
    { k: "APRENENTATGE", r: "Dificultats d'aprenentatge|Discalcúlia|Disgrafia|TAN" },
    { k: "LLENGUATGE", r: "Llenguatge|TDL|TEL|Logopèdia" },
    { k: "EMOCIONAL", r: "Conducta|Emocional|Ansietat|Depressió" },
    { k: "DISC. VISUAL", r: "Visual|Ceguesa" },
    { k: "DISC. AUDITIVA", r: "Auditiva|Sordera" },
    { k: "DISC. MOTORA", r: "Motora|Paràlisi cerebral" },
    { k: "TEA", r: "TEA|Autisme|Espectre Autista|Asperger" },
    { k: "INTEL·LECTUAL", r: "Intel·lectual|Retard|Cognitiu" },
    { k: "ALTES CAP", r: "Altes Capacitats|Superdotat" }
];

// Configuración Multer
const upload = multer({ dest: 'uploads/' });

// Cargar y cachear centros.json
const centrosPath = path.join(__dirname, 'centros_fixed.json');
let centrosDataCache = []; // Declaración movida al ámbito superior
if (!fs.existsSync(centrosPath)) {
    console.warn("⚠️ centros_fixed.json no encontrado al inicio");
} else {
    console.log(`✅ centros_fixed.json detectado.`);
    try {
        const content = fs.readFileSync(centrosPath, 'utf-8');
        const centrosData = JSON.parse(content);
        centrosDataCache = centrosData.map(c => ({
            code: c.Codi_centre,
            name: c.Denominació_completa
        }));
        console.log(`✅ centros_fixed.json cargado y cacheado.`);
    } catch (error) {
        console.error("❌ Error cargando o parseando centros_fixed.json:", error);
    }
}

// MongoDB Connection Management
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:1234@mongodb:27017/school_data?authSource=admin';

async function connectMongo() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connectat a MongoDB (School Data)');
    } catch (err) {
        console.error('❌ Error connectant a MongoDB:', err);
    }
}
connectMongo();

// Cleanly close connection on app termination
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🔌 Connexió a MongoDB tancada (SIGINT)');
    process.exit(0);
});

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

// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
    const userId = parseInt(req.query.userId); // Asumiendo que el userId viene en los query params
    if (!userId) {
        return res.status(401).json({ message: 'Acceso denegado. User ID requerido.' });
    }

    User.findByPk(userId)
        .then(user => {
            if (user && user.role === 'admin') {
                req.user = user; // Adjuntar usuario a la solicitud para uso posterior
                return next();
            }
            res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
        })
        .catch(error => {
            console.error("Error en middleware isAdmin:", error);
            res.status(500).json({ message: 'Error interno del servidor.' });
        });
};

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
    if (centrosDataCache.length > 0) {
        res.json(centrosDataCache);
    } else {
        // This could happen if the file was missing at startup
        res.status(500).json({ error: 'La llista de centres no està disponible.' });
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

        // Comprobación de password PRIMERO (Seguridad)
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        // Si credenciales OK, comprobamos verificación
        if (!user.isVerified) {
            // Generar nuevo código y reenviar
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            user.verificationCode = code;
            await user.save();

            console.log(`📨 [LOGIN-RESEND] Enviando código a ${user.email}...`);

            const mailOptions = {
                from: `"Soport - Generalitat" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: '🔐 Codi de verificació - Login',
                text: `El teu codi de verificació és: ${code}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
                    <h2 style="color: #d35400;">Verificació Pendent</h2>
                    <p>Has intentat iniciar sessió però el teu compte no estava verificat.</p>
                    <p>Aquí tens un nou codi:</p>
                    <div style="background-color: #f0f4f8; padding: 15px; text-align: center; border-radius: 8px;">
                        <span style="font-size: 28px; font-weight: bold; color: #d35400;">${code}</span>
                    </div>
                </div>
                `
            };

            try {
                await transporter.sendMail(mailOptions);
            } catch (e) {
                console.error("Error enviando mail login:", e);
            }

            return res.status(403).json({
                error: 'Compte no verificat. Hem enviat un nou codi al teu correu.',
                needsVerification: true,
                email: user.email
            });
        }

        if (!user.isApproved) {
            return res.status(403).json({ error: 'El teu compte està verificat però pendent d\'aprovació per l\'administrador del centre.' });
        }

        res.json({ message: '¡Login exitoso!', user: { id: user.id, username: user.username, center_code: user.center_code, role: user.role } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

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

// Register (CON EMAIL HTML)
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
                const centrosData = JSON.parse(content); // This line was already correct
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

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            password: hashedPassword,
            center_code,
            email,
            verificationCode: code,
            isVerified: false,
            isApproved: role === 'admin', // Admins auto-approve (if email valid), teachers need approval
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

// RESEND CODE ENDPOINT
app.post('/api/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email obligatorio' });

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        if (user.isVerified) return res.status(400).json({ error: 'El usuario ya está verificado' });

        // Generate new code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = code;
        await user.save();

        console.log(`📨 [RESEND] Enviando nuevo código a ${email}...`);

        const mailOptions = {
            from: `"Soport - Generalitat" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '🔐 Nou codi de verificació',
            text: `El teu nou codi de verificació és: ${code}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin: 0;">Nou Codi Sol·licitat</h2>
                </div>
                <p style="font-size: 16px; color: #555;">Hola,</p>
                <p style="font-size: 16px; color: #555;">Aquí tens el nou codi de verificació que has demanat:</p>
                
                <div style="background-color: #f0f4f8; padding: 15px; text-align: center; border-radius: 8px; margin: 25px 0;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #007bff;">
                        ${code}
                    </span>
                </div>
        
                <p style="font-size: 14px; color: #777; text-align: center;">Si no has estat tu, canvia la teva contrasenya immediatament.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #aaa; text-align: center;">Institut Pedralbes</p>
            </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.json({ message: 'Nou codi enviat correctament.' });
        } catch (mailError) {
            console.error('⚠️ ERROR AL REENVIAR CORREO:', mailError);
            res.status(500).json({ error: 'Error al enviar el correu electrònic' });
        }

    } catch (error) {
        console.error("Error resending code:", error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Students Routes
app.post('/api/students', async (req, res) => {
    try {
        const { ralc, extractedData, userId, centerCode } = req.body;
        if (!ralc || !extractedData || !userId) {
            return res.status(400).json({ error: 'Falten dades (ralc, extractedData, userId)' });
        }

        // Check if user exists and get role
        const requestingUser = await User.findByPk(userId);
        if (!requestingUser) {
            return res.status(401).json({ error: 'Usuari no vàlid.' });
        }

        const existingStudent = await Student.findById(ralc);

        if (existingStudent && existingStudent.ownerId) {
            // Permission check: Owner OR Admin
            const isOwner = String(existingStudent.ownerId) === String(userId);
            const isAdmin = requestingUser.role === 'admin';

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: 'No tens permís per modificar aquest alumne (només el propietari o admin).' });
            }
        }

        const studentData = {
            name: extractedData.dadesAlumne?.nomCognoms || 'Alumne Desconegut',
            birthDate: extractedData.dadesAlumne?.dataNaixement || 'Data Desconeguda',
            extractedData: extractedData,
            ownerId: userId, // Update owner to last modifier? Or keep original? Usually keep original or update. Let's update for now so they see it in 'My PIs'
            centerCode: centerCode || requestingUser.center_code || null
        };

        // If existing and we are admin, maybe we don't want to change ownerId if we are just editing? 
        // For simplicity, if it's a new upload/save, we take ownership or update data.
        // Let's preserve ownerId if we are Admin editing someone else's? 
        // The user prompt implies "Importing"/Saving. If I import, it becomes mine?
        // Let's stick to: Update everything.

        const student = await Student.findByIdAndUpdate(ralc, studentData, { new: true, upsert: true });

        // NOTIFICACIÓN EMAIL AL CENTRO
        try {
            const targetCenterCode = student.centerCode;
            if (targetCenterCode) {
                const centrosPath = path.join(__dirname, 'centros_fixed.json');
                if (fs.existsSync(centrosPath)) {
                    const content = fs.readFileSync(centrosPath, 'utf-8');
                    const centrosData = JSON.parse(content);
                    const center = centrosData.find(c => String(c.Codi_centre) === String(targetCenterCode));

                    if (center && center["E-mail_centre"]) {
                        const adminEmail = center["E-mail_centre"];
                        console.log(`📧 Notificant a centre ${targetCenterCode} (${adminEmail}) sobre nou PI.`);

                        const mailOptions = {
                            from: `"Consorci Educació" <${process.env.SMTP_USER}>`,
                            to: adminEmail,
                            subject: '📄 Nou Expedient PI Disponible',
                            text: `L'usuari ${requestingUser.username} ha pujat/actualitzat el PI de l'alumne ${studentData.name} (${ralc}).`,
                            html: `
                           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #ffffff;">
                               <div style="text-align: center; margin-bottom: 20px;">
                                   <h2 style="color: #2c3e50; margin: 0;">Nou Expedient PI</h2>
                               </div>
                               <p style="font-size: 16px; color: #555;">Hola,</p>
                               <p style="font-size: 16px; color: #555;">S'ha pujat o actualitzat un expedient al vostre centre:</p>
                               
                               <div style="background-color: #f0f4f8; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: left;">
                                   <p style="margin: 5px 0; color: #555;"><strong>Alumne:</strong> ${studentData.name}</p>
                                   <p style="margin: 5px 0; color: #555;"><strong>RALC:</strong> ${ralc}</p>
                                   <p style="margin: 5px 0; color: #555;"><strong>Usuari:</strong> ${requestingUser.username}</p>
                                   <p style="margin: 5px 0; color: #555;"><strong>Data:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
                               </div>

                               <p style="font-size: 14px; color: #777; text-align: center;">Podeu accedir a la plataforma per veure'n els detalls.</p>
                               <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                               <p style="font-size: 12px; color: #aaa; text-align: center;">Institut Pedralbes</p>
                           </div>
                        `
                        };

                        // Fire and forget - don't await blocking
                        transporter.sendMail(mailOptions).catch(e => console.error("❌ Fallo envío mail centro:", e));
                    }
                }
            }
        } catch (emailErr) {
            console.error("❌ Error enviant notificació al centre:", emailErr);
        }

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
    }
});

app.delete('/api/students/:ralc', async (req, res) => {
    try {
        const { ralc } = req.params;
        const userId = parseInt(req.query.userId);

        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const student = await Student.findById(ralc);
        if (!student) return res.status(404).json({ error: 'Expedient no trobat' });

        const requestUser = await User.findByPk(userId);
        if (!requestUser) return res.status(404).json({ error: 'Usuari sol·licitant no existeix' });

        const isOwner = String(student.ownerId) === String(userId);
        // Admin del mismo centro puede borrar
        const isAdmin = requestUser.role === 'admin' && String(requestUser.center_code) === String(student.centerCode);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'No tens permisos per eliminar aquest expedient (Només propietari o admin del centre).' });
        }

        await Student.findByIdAndDelete(ralc);
        // Also delete associated reviews
        await PiReview.deleteMany({ studentRalc: ralc });

        console.log(`🗑️ Expedient ${ralc} eliminat per usuari ${userId}`);
        res.json({ message: 'Expedient eliminat correctament.' });

    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ error: 'Error del servidor al eliminar expedient.' });
    }
});

// ==========================================
// RUTA DE SUBIDA DE ARCHIVOS (WORKER)
// ==========================================
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { userId } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
        }
        if (!userId) {
            return res.status(400).json({ error: 'Falta el ID del usuario.' });
        }

        console.log(`📥 Archivo recibido: ${req.file.originalname} (Usuario: ${userId})`);

        // 1. Crear un 'Job' en MongoDB para seguir el estado
        const job = await Job.create({
            userId: userId,
            fileName: req.file.originalname,
            status: 'queued',
            result: null
        });

        // 2. Enviar el trabajo a la cola de RabbitMQ
        const jobData = {
            jobId: job._id,
            filePath: req.file.path,
            originalFileName: req.file.originalname,
            userId: userId
        };

        channel.sendToQueue('pi_processing_queue', Buffer.from(JSON.stringify(jobData)), { persistent: true });

        console.log(`✅ Trabajo ${job._id} encolado para ${req.file.originalname}`);

        // 3. Responder inmediatamente al cliente con el ID del trabajo
        res.status(202).json({ message: 'Archivo recibido y en cola para procesar.', jobId: job._id });
    } catch (error) {
        console.error('❌ Error en /api/upload:', error);
        res.status(500).json({ error: 'Error interno al procesar la subida.' });
    }
});

// ==========================================
// RUTAS DE REVIEWS (COLECCIÓN 3)
// ==========================================

app.post('/api/students/:ralc/reviews', async (req, res) => {
    try {
        const { ralc } = req.params;
        const { userId, rating, comment, effectiveness } = req.body;

        // Basic Validation
        if (!userId || !rating) return res.status(400).json({ error: 'Falten dades obligatòries (userId, rating)' });

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Usuari no trobat' });

        // Create the review
        const newReview = await PiReview.create({
            studentRalc: ralc,
            authorId: userId,
            authorName: user.username,
            rating,
            comment,
            effectiveness
        });

        res.status(201).json(newReview);
    } catch (error) {
        console.error("Error creating review:", error);
        res.status(500).json({ error: 'Error al crear la valoració.' });
    }
});

app.get('/api/students/:ralc/reviews', async (req, res) => {
    try {
        const reviews = await PiReview.find({ studentRalc: req.params.ralc }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Error recuperant valoracions.' });
    }
});


// ==========================================
// CONSULTES COMPLEXES (MOTOR DE CERCA)
// ==========================================

/**
 * REQUISI MONGODB: Consulta complexa combina múltiples condicions
 * - Utilitza Dot Notation (extractedData.motiu.diagnostic)
 * - Utilitza Operadors d'Array ($all)
 * - Utilitza Operadors Lògics ($and, $or)
 * - Accedeix a 3+ nivells de profunditat
 */
app.get('/api/students/search/advanced', async (req, res) => {
    try {
        const { query, curs, diagnostic, adaptacions, userId: userIdRaw } = req.query;
        const userId = parseInt(userIdRaw);
        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Usuari no trobat' });

        // SEGURETAT: Iniciem el filtre amb les restriccions d'accés (com a /api/my-students)
        let filter = {};
        if (user.role === 'admin') {
            filter.centerCode = String(user.center_code);
        } else {
            filter.$or = [
                { ownerId: userId },
                { authorizedUsers: userId }
            ];
        }

        // Filtres addicionals (si existeixen, els afegim amb $and per no sobreescriure el $or de seguretat)
        const searchConditions = [];

        // 1. Filtre textual simple (Regex)
        if (query) {
            searchConditions.push({ name: { $regex: query, $options: 'i' } });
        }

        // 2. Filtre per Curs (Flexible - Regex)
        if (curs) {
            const numMatch = curs.match(/\d+/);
            const num = numMatch ? numMatch[0] : "";
            const isBatx = curs.toLowerCase().includes('batx');

            let regexStr = curs.replace(/[^a-zA-Z0-9]/g, '.*');
            if (num) {
                const mappedStrings = { "1": "1|Primer", "2": "2|Segon", "3": "3|Tercer", "4": "4|Quart" };
                const base = mappedStrings[num] || num;
                regexStr = `(${base}).*${isBatx ? 'BATX' : 'ESO'}`;
            }
            searchConditions.push({ 'extractedData.dadesAlumne.curs': { $regex: regexStr, $options: 'i' } });
        }

        // 3. Filtre per Diagnòstic (Sintetitzat - v2.1)
        if (diagnostic) {
            const mapping = DIAGNOSTIC_MAPPINGS.find(m =>
                m.k === diagnostic.toUpperCase() ||
                new RegExp(m.r, 'i').test(diagnostic)
            );
            const regexToUse = mapping ? mapping.r : diagnostic;
            searchConditions.push({ 'extractedData.motiu.diagnostic': { $regex: regexToUse, $options: 'i' } });
        }

        // 4. Filtre per Adaptacions (Cerca flexible amb regex)
        if (adaptacions) {
            const adaptList = adaptacions.split(',').filter(a => a.trim() !== "");
            if (adaptList.length > 0) {
                searchConditions.push({
                    'extractedData.adaptacionsGenerals': {
                        $all: adaptList.map(term => new RegExp(term.trim(), 'i'))
                    }
                });
            }
        }

        // COMBINEM SEGURETAT + FILTRES (v2.3)
        if (searchConditions.length > 0) {
            filter.$and = searchConditions;
        }

        console.log("🔍 Advanced Search Filter:", JSON.stringify(filter));

        const rawResults = await Student.find(filter).limit(20).lean();

        // SINTETITZAR RESULTATS (v2.2)
        const results = rawResults.map(student => {
            const diagText = student.extractedData?.motiu?.diagnostic || "";
            const matchedCategories = DIAGNOSTIC_MAPPINGS
                .filter(m => new RegExp(m.r, 'i').test(diagText))
                .map(m => m.k);

            return {
                ...student,
                synthesizedCategories: matchedCategories.length > 0 ? matchedCategories : ["ALTRES"]
            };
        });

        res.json(results);
    } catch (error) {
        console.error("Error in advanced search:", error);
        res.status(500).json({ error: 'Error en la cerca avançada.' });
    }
});

// ==========================================
// OPERACIONS CRUD AVANÇADES (ADMIN)
// ==========================================

/**
 * REQUISI MONGODB: insertMany i operacions combinades
 * - Permet carregar centres massivament des del servidor
 */
app.post('/api/admin/bulk-import-centers', isAdmin, async (req, res) => {
    try {
        const centrosPath = path.join(__dirname, 'centros_fixed.json');
        if (!fs.existsSync(centrosPath)) throw new Error("Fitxer de centres no trobat.");

        const content = fs.readFileSync(centrosPath, 'utf-8');
        const centrosData = JSON.parse(content);

        // Mapegem al format del model Center
        const centersToInsert = centrosData.slice(0, 100).map(c => ({
            code: String(c.Codi_centre),
            name: c.Denominació_completa,
            email: c["E-mail_centre"],
            type: c.Nom_naturalesa,
            address: c.Adreça
        }));

        // REQUISI: insertMany
        const result = await Center.insertMany(centersToInsert, { ordered: false });

        res.json({
            message: `S'han importat ${result.length} centres correctament.`,
            count: result.length
        });
    } catch (error) {
        console.error("Error in bulk import:", error);
        // Gestió d'errors específica per duplicats (E11000)
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Alguns centres ja existien i han estat ignorats.' });
        }
        res.status(500).json({ error: 'Error en la importació massiva.' });
    }
});

// ESTADÍSTICAS AVANZADAS (AGREGACIONES)
app.get('/api/stats', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const user = await User.findByPk(userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Accés denegat: Només administradors.' });
        }

        const centerCode = String(user.center_code);

        const stats = await Student.aggregate([
            { $match: { centerCode: centerCode } },
            {
                $facet: {
                    // 1. Alumnos por Curso (SINTETITZAT)
                    byCourse: [
                        {
                            $addFields: {
                                normalizedCourse: {
                                    $switch: {
                                        branches: [
                                            { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "1.*ESO", options: "i" } }, then: "1r ESO" },
                                            { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "2.*ESO", options: "i" } }, then: "2n ESO" },
                                            { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "3.*ESO", options: "i" } }, then: "3r ESO" },
                                            { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "4.*ESO", options: "i" } }, then: "4t ESO" },
                                            { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "1.*BATX", options: "i" } }, then: "1r BATX" },
                                            { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "2.*BATX", options: "i" } }, then: "2n BATX" }
                                        ],
                                        default: "ALTRES"
                                    }
                                }
                            }
                        },
                        { $group: { _id: "$normalizedCourse", count: { $sum: 1 } } },
                        { $sort: { _id: 1 } }
                    ],
                    // 2. Diagnòstics més comuns (Sintetitzat i Diversificat)
                    byDiagnosis: [
                        {
                            $addFields: {
                                diagKeywords: {
                                    $filter: {
                                        input: DIAGNOSTIC_MAPPINGS,
                                        as: "d",
                                        cond: { $regexMatch: { input: { $ifNull: ["$extractedData.motiu.diagnostic", ""] }, regex: "$$d.r", options: "i" } }
                                    }
                                }
                            }
                        },
                        { $unwind: { path: "$diagKeywords", preserveNullAndEmptyArrays: true } },
                        {
                            $group: {
                                _id: { $ifNull: ["$diagKeywords.k", "ALTRES"] },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 15 }
                    ],
                    // 3. Adaptaciones Recurrentes - AGREGACIÓN COMPLEJA CON ARRAY
                    byAdaptations: [
                        { $project: { adaptations: "$extractedData.adaptacionsGenerals" } },
                        { $unwind: "$adaptations" },
                        // Limpieza básica (trim y quitar comillas si las hubiera)
                        { $group: { _id: "$adaptations", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],
                    // 4. Totales
                    totalInfo: [
                        { $count: "total" }
                    ]
                }
            }
        ]);

        res.json(stats[0]);
    } catch (e) {
        console.error("Error stats:", e);
        res.status(500).json({ error: 'Error generant estadístiques' });
    }
});

// NUEVA AGREGACIÓN: Análisis de Efectividad (Reviews + Student Data)
app.get('/api/stats/effectiveness', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const user = await User.findByPk(userId);
        if (!user || user.role !== 'admin') return res.status(403).json({ error: "No admin" });

        // Join Reviews with Students to look at effectiveness by diagnosis
        const effectivenessStats = await PiReview.aggregate([
            // 1. Lookup student data to get the diagnosis
            {
                $lookup: {
                    from: "students",       // Collection name in MongoDB (lowercase plural usually)
                    localField: "studentRalc",
                    foreignField: "_id",
                    as: "studentInfo"
                }
            },
            // 2. Unwind the array (lookup returns an array)
            { $unwind: "$studentInfo" },
            // 3. Filter by Center (Security)
            { $match: { "studentInfo.centerCode": String(user.center_code) } },
            // 4. Sintetitzar diagnòstics abans d'agrupar
            {
                $addFields: {
                    diagKeywords: {
                        $filter: {
                            input: DIAGNOSTIC_MAPPINGS,
                            as: "d",
                            cond: { $regexMatch: { input: { $ifNull: ["$studentInfo.extractedData.motiu.diagnostic", ""] }, regex: "$$d.r", options: "i" } }
                        }
                    }
                }
            },
            { $unwind: { path: "$diagKeywords", preserveNullAndEmptyArrays: true } },
            // 5. Group by Synthesized Diagnosis
            {
                $group: {
                    _id: { $ifNull: ["$diagKeywords.k", "ALTRES"] },
                    avgRating: { $avg: "$rating" },
                    avgAcademic: { $avg: "$effectiveness.academic" },
                    avgBehavioral: { $avg: "$effectiveness.behavioral" },
                    reviewCount: { $sum: 1 }
                }
            },
            // 5. Project to format output
            {
                $project: {
                    diagnosis: "$_id",
                    avgRating: { $round: ["$avgRating", 1] },
                    avgAcademic: { $round: ["$avgAcademic", 1] },
                    avgBehavioral: { $round: ["$avgBehavioral", 1] },
                    reviewCount: 1,
                    _id: 0
                }
            },
            { $sort: { avgRating: -1 } }
        ]);

        res.json(effectivenessStats);

    } catch (e) {
        console.error("Error effectiveness stats:", e);
        res.status(500).json({ error: "Error calculating effectiveness" });
    }
});

// Endpoint para obtenir la llista dinàmica de diagnòstics per al filtre (SINTETITZAT)
app.get('/api/diagnoses', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'Usuari no trobat' });

        const centerCode = String(user.center_code);

        // Agregació per obtenir NOMÉS les categories sintetitzades que existeixen al centre
        const diagnosesResult = await Student.aggregate([
            { $match: { centerCode: centerCode } },
            {
                $addFields: {
                    diagKeywords: {
                        $filter: {
                            input: DIAGNOSTIC_MAPPINGS,
                            as: "d",
                            cond: { $regexMatch: { input: { $ifNull: ["$extractedData.motiu.diagnostic", ""] }, regex: "$$d.r", options: "i" } }
                        }
                    }
                }
            },
            { $unwind: "$diagKeywords" },
            { $group: { _id: "$diagKeywords.k" } },
            { $sort: { _id: 1 } }
        ]);

        const combined = diagnosesResult.map(d => d._id);
        res.json(combined);

    } catch (e) {
        console.error("Error fetching diagnoses list:", e);
        res.status(500).json({ error: "Error al recuperar la llista de diagnòstics" });
    }
});

// Admin Dashboard Summary Endpoint
app.get('/api/dashboard/summary', async (req, res) => {
    console.log(`📊 [${new Date().toISOString()}] Dashboard summary request for user ${req.query.userId}`);
    try {
        const userId = parseInt(req.query.userId);
        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const user = await User.findByPk(userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Accés denegat: Només administradors.' });
        }

        const centerCode = String(user.center_code);

        // Ejecutar todas las consultas en paralelo para mayor eficiencia
        const [
            piSummaryByType,
            studentsByCourse,
            totalUsersCount
        ] = await Promise.all([
            Student.aggregate([
                { $match: { centerCode: centerCode } },
                {
                    $addFields: {
                        diagKeywords: {
                            $filter: {
                                input: DIAGNOSTIC_MAPPINGS,
                                as: "d",
                                cond: { $regexMatch: { input: { $ifNull: ["$extractedData.motiu.diagnostic", ""] }, regex: "$$d.r", options: "i" } }
                            }
                        }
                    }
                },
                { $unwind: { path: "$diagKeywords", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: { $ifNull: ["$diagKeywords.k", "ALTRES"] },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]),
            Student.aggregate([
                { $match: { centerCode: centerCode } },
                {
                    $addFields: {
                        normalizedCourse: {
                            $switch: {
                                branches: [
                                    { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "1.*ESO", options: "i" } }, then: "1r ESO" },
                                    { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "2.*ESO", options: "i" } }, then: "2n ESO" },
                                    { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "3.*ESO", options: "i" } }, then: "3r ESO" },
                                    { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "4.*ESO", options: "i" } }, then: "4t ESO" },
                                    { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "1.*BATX", options: "i" } }, then: "1r BATX" },
                                    { case: { $regexMatch: { input: { $ifNull: ["$extractedData.dadesAlumne.curs", ""] }, regex: "2.*BATX", options: "i" } }, then: "2n BATX" }
                                ],
                                default: "ALTRES"
                            }
                        }
                    }
                },
                { $group: { _id: "$normalizedCourse", count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Student.countDocuments({ centerCode: centerCode })
        ]);

        console.log(`✅ [${new Date().toISOString()}] Dashboard summary calculated: ${totalUsersCount} students`);

        res.json({
            piSummaryByType,
            studentsByCourse,
            totalUsers: totalUsersCount
        });

    } catch (error) {
        console.error("❌ Error fetching dashboard summary:", error);
        res.status(500).json({ error: 'Error al recuperar el resum del dashboard.' });
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

        const rawStudents = await Student.find(query).lean();
        const students = rawStudents.map(student => {
            const diagText = student.extractedData?.motiu?.diagnostic || "";
            const matchedCategories = DIAGNOSTIC_MAPPINGS
                .filter(m => new RegExp(m.r, 'i').test(diagText))
                .map(m => m.k);

            return {
                ...student,
                synthesizedCategories: matchedCategories.length > 0 ? matchedCategories : ["ALTRES"]
            };
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

app.post('/api/students/:ralc/transfer', async (req, res) => {
    try {
        const { ralc } = req.params;
        const { userId, targetCenterCode } = req.body;

        if (!userId || !targetCenterCode) return res.status(400).json({ error: 'Falten dades' });

        const student = await Student.findById(ralc);
        if (!student) return res.status(404).json({ error: 'Alumne no trobat' });

        const isOwner = String(student.ownerId) === String(userId);
        const isAuthorized = student.authorizedUsers && student.authorizedUsers.includes(parseInt(userId));

        // Allow transfer if owner OR authorized
        if (!isOwner && !isAuthorized) {
            return res.status(403).json({ error: 'No tens permís per traspassar aquest alumne.' });
        }

        student.centerCode = targetCenterCode;
        await student.save();

        res.json({ message: 'Expedient traspassat correctament al nou centre.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error servidor' });
    }
});

// Admin Center Management Routes
app.get('/api/center/users', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const adminUser = await User.findByPk(userId);
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ error: 'Accés denegat. Només administradors.' });
        }

        const users = await User.findAll({
            where: {
                center_code: adminUser.center_code,
                id: { [Op.ne]: userId } // Don't list yourself
            },
            attributes: ['id', 'username', 'email', 'role', 'isVerified', 'isApproved', 'createdAt'] // Exclude password/verificationCode
        });

        res.json(users);

    } catch (error) {
        console.error("Error fetching center users:", error);
        res.status(500).json({ error: 'Error al recuperar usuaris' });
    }
});

// Endpoint para descargar un PI de prueba (solo para administradores)
app.get('/api/download-test-pi', isAdmin, (req, res) => {
    const filename = 'EXEMPLE PI 2021-2022.docx'; // Nombre del archivo solicitado por el usuario
    const filePath = path.join(__dirname, '../tests', filename); // Ruta al archivo en el directorio 'tests'

    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Error al descargar el archivo:', err);
                res.status(500).json({ error: 'Error al descargar el archivo.' });
            }
        });
    } else {
        console.warn(`⚠️ Archivo de prueba no encontrado: ${filePath}`);
        res.status(404).json({ error: 'Archivo de prueba no encontrado en el servidor.' });
    }
});


app.delete('/api/center/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId); // Admin ID
        const targetId = parseInt(req.params.id); // User to delete

        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const adminUser = await User.findByPk(userId);
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ error: 'Accés denegat.' });
        }

        const targetUser = await User.findByPk(targetId);
        if (!targetUser) return res.status(404).json({ error: 'Usuari no trobat.' });

        // Security check: Must belong to same center
        if (String(targetUser.center_code) !== String(adminUser.center_code)) {
            return res.status(403).json({ error: 'No pots eliminar usuaris d\'altres centres.' });
        }

        await targetUser.destroy();
        res.json({ message: 'Usuari eliminat correctament.' });

    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: 'Error al eliminar usuari' });
    }
});

app.put('/api/center/users/:id/role', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId); // Admin ID
        const targetId = parseInt(req.params.id); // User to update
        const { role } = req.body;

        if (!userId || !role) return res.status(400).json({ error: 'Falten dades (userId, role)' });
        if (!['admin', 'teacher'].includes(role)) return res.status(400).json({ error: 'Rol invàlid (ha de ser admin o teacher)' });

        const adminUser = await User.findByPk(userId);
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ error: 'Accés denegat.' });
        }

        const targetUser = await User.findByPk(targetId);
        if (!targetUser) return res.status(404).json({ error: 'Usuari no trobat.' });

        // Security check: Must belong to same center
        if (String(targetUser.center_code) !== String(adminUser.center_code)) {
            return res.status(403).json({ error: 'No pots modificar usuaris d\'altres centres.' });
        }

        targetUser.role = role;
        await targetUser.save();

        res.json({ message: 'Rol actualitzat correctament.' });

    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ error: 'Error al actualitzar rol' });
    }
});

app.put('/api/center/users/:id/approve', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId); // Admin ID
        const targetId = parseInt(req.params.id); // User to approve

        if (!userId) return res.status(401).json({ error: 'Usuari no identificat' });

        const adminUser = await User.findByPk(userId);
        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ error: 'Accés denegat.' });
        }

        const targetUser = await User.findByPk(targetId);
        if (!targetUser) return res.status(404).json({ error: 'Usuari no trobat.' });

        if (String(targetUser.center_code) !== String(adminUser.center_code)) {
            return res.status(403).json({ error: 'No pots aprovar usuaris d\'altres centres.' });
        }

        targetUser.isApproved = true;
        await targetUser.save();

        res.json({ message: 'Usuari aprovat correctament.' });

    } catch (error) {
        console.error("Error approving user:", error);
        res.status(500).json({ error: 'Error al aprovar usuari' });
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
        console.error(`Error fetching job ${req.params.jobId}: `, error);
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
            const adminEmail = 'hugocor0609@gmail.com';
            let admin = await User.findOne({ where: { email: adminEmail } });
            if (!admin) {
                const hashedPassword = await bcrypt.hash('123', 10);
                await User.create({
                    username: 'AdminPrueba',
                    email: adminEmail,
                    password: hashedPassword,
                    center_code: '99999999',
                    role: 'admin',
                    isVerified: true,
                    isApproved: true
                });
                console.log(`✅ Usuario Admin creado: ${adminEmail} / 123`);
            } else {
                // Ensure existing admin is approved (fix for migration)
                if (!admin.isApproved || !await bcrypt.compare('123', admin.password)) {
                    admin.isApproved = true;
                    admin.password = await bcrypt.hash('123', 10);
                    await admin.save();
                    console.log("✅ Usuario Admin actualizado a APROBADO y contraseña reseteada a '123'.");
                }
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
                            cond: { $regexMatch: { input: { $ifNull: ["$extract
