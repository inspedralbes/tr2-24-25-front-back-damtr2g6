// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { extractPIdata } = require('./extractor'); // Funció d'extracció
const fs = require('fs');

const app = express();
const port = 4000;

// Configura Multer per a la càrrega de fitxers
const upload = multer({ dest: 'uploads/' });

app.use(cors()); // Permet peticions des del frontend de Vue

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

app.listen(port, () => {
    console.log(`Servidor Node.js escoltant a http://localhost:${port}`);
});