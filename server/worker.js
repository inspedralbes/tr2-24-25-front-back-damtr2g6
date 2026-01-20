// server/worker.js
require('dotenv').config();
const amqp = require('amqplib');
const mongoose = require('mongoose');
const Job = require('./models/Job'); // Mongoose Job model
const { extractPIdata } = require('./extractor'); // Your file extraction logic
const fs = require('fs');
const path = require('path');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://user:1234@rabbitmq:5672';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:1234@mongodb:27017/school_data?authSource=admin';

async function startWorker() {
    console.log('Worker Iniciado...');

    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Worker conectado a MongoDB.');

        // Connect to RabbitMQ
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue('pi_processing_queue', { durable: true });
        await channel.prefetch(1); // Process 1 message at a time
        console.log('✅ Worker conectado a RabbitMQ. Esperando mensajes...');

        channel.consume('pi_processing_queue', async (msg) => {
            if (msg !== null) {
                const jobData = JSON.parse(msg.content.toString());
                const { jobId, filePath, originalFileName, userId } = jobData;
                console.log(`⚙️ Procesando trabajo ${jobId} para el archivo: ${originalFileName}`);

                let job;
                try {
                    job = await Job.findById(jobId);
                    if (!job) {
                        console.error(`❌ Job ${jobId} no encontrado en la base de datos.`);
                        channel.ack(msg);
                        return;
                    }

                    job.status = 'processing';
                    await job.save();

                    // Perform file extraction, passing the original filename to determine the extension
                    const extractedData = await extractPIdata(filePath, originalFileName);
                    console.log(`✅ Extracción de datos completada para ${originalFileName}`);

                    // Update job status and result in MongoDB
                    job.status = 'completed';
                    job.result = extractedData;
                    job.processedAt = new Date();
                    await job.save();

                    console.log(`⭐ Trabajo ${jobId} completado para ${originalFileName}.`);

                    // Clean up the temporary file
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️ Archivo temporal ${filePath} eliminado.`);
                    }

                    // Notify frontend via WebSocket that the job is completed
                    const notification = {
                        jobId,
                        userId,
                        filename: originalFileName,
                        status: 'completed',
                        message: 'File processed successfully.'
                    };
                    channel.sendToQueue('job_notification_queue', Buffer.from(JSON.stringify(notification)), { persistent: true });

                    channel.ack(msg); // Acknowledge the message to RabbitMQ

                } catch (error) {
                    console.error(`❌ Error procesando trabajo ${jobId} para ${originalFileName}:`, error);

                    // Notify frontend of the failure
                    const notification = {
                        jobId,
                        userId,
                        filename: originalFileName,
                        status: 'failed',
                        message: error.message || 'An unknown error occurred during processing.'
                    };
                    channel.sendToQueue('job_notification_queue', Buffer.from(JSON.stringify(notification)), { persistent: true });

                    if (job) {
                        job.status = 'failed';
                        job.processedAt = new Date();
                        await job.save();
                    }
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath); // Attempt to clean up
                        console.log(`🗑️ Archivo temporal ${filePath} eliminado tras error.`);
                    }
                    channel.ack(msg); // Acknowledge message even on failure to avoid requeue loop
                }
            }
        }, { noAck: false }); // Ensure messages are acknowledged
    } catch (error) {
        console.error('❌ Error fatal en el Worker:', error.message);
        process.exit(1); // Exit with error code
    }
}

startWorker();
