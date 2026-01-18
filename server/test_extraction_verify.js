const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

// Ajusta esta ruta si el archivo está en otro sitio, asumo que está en 'tests' o en la raíz
const filePath = path.join(__dirname, '../tests/EXEMPLE PI CURRICULAR 2020-2021 .docx');

function extractRawXMLText(filePath) {
    try {
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();
        const docEntry = zipEntries.find(entry => entry.entryName === 'word/document.xml');

        if (!docEntry) return "ERROR: No document.xml found";

        const xmlContent = docEntry.getData().toString('utf8');

        console.log("--- RAW XML SAMPLE (First 200 chars) ---");
        console.log(xmlContent.substring(0, 200));
        console.log("----------------------------------------");

        // AQUI ESTA LA LOGICA QUE USAMOS EN EL SERVER
        // 1. Reemplazar cierres de párrafo/celda por saltos de línea para mantener estructura visual básica
        let text = xmlContent.replace(/<\/w:p>/g, '\n').replace(/<\/w:tc>/g, ' ');
        // 2. Eliminar todas las etiquetas XML
        text = text.replace(/<[^>]+>/g, '');
        // 3. Limpiar espacios múltiples
        text = text.replace(/\s+/g, ' ').trim();

        return text.substring(0, 10000); // Mismo limite
    } catch (e) {
        return "ERROR: " + e.message;
    }
}

if (!fs.existsSync(filePath)) {
    console.error(`❌ El archivo no existe en: ${filePath}`);
    // Intenta buscar en uploads si no está en tests
    console.log("Buscando en carpeta uploads...");
    const uploadsDir = path.join(__dirname, '../server/uploads');
    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        console.log("Archivos en uploads:", files);
    }
} else {
    console.log(`✅ Procesando archivo: ${filePath}`);
    const cleanedText = extractRawXMLText(filePath);
    console.log("\n--- TEXTO QUE VE LA IA (Primeros 1000 caracteres) ---");
    console.log(cleanedText.substring(0, 1000));
    console.log("\n-----------------------------------------------------");

    // Busqueda manual de palabras clave
    console.log("\n--- BUSQUEDA DE PALABRAS CLAVE ---");
    const keywords = ["Data", "Naixement", "naixement", "Nom", "Cognoms"];
    keywords.forEach(kw => {
        const found = cleanedText.includes(kw);
        console.log(`'${kw}': ${found ? '✅ ENCONTRADO' : '❌ NO ESTA'}`);
        if (found) {
            const index = cleanedText.indexOf(kw);
            console.log(`   Contexto: "...${cleanedText.substring(index - 20, index + 30)}..."`);
        }
    });

    // Check for "glued" words
    if (cleanedText.includes("Datadenaixement")) console.log("⚠️ ALERTA: 'Datadenaixement' aparece pegado!");
    if (cleanedText.includes("Datade")) console.log("⚠️ ALERTA: 'Datade' aparece pegado!");
}
