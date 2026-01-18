const AdmZip = require('adm-zip');
const path = require('path');

const filePath = path.join(__dirname, '../tests/EXEMPLE PI CURRICULAR 2020-2021 .docx');

function extractRawXMLText(filePath) {
    try {
        const zip = new AdmZip(filePath);
        const zipEntries = zip.getEntries();
        // Buscamos el XML principal del documento
        const docEntry = zipEntries.find(entry => entry.entryName === 'word/document.xml');

        if (!docEntry) {
            console.log("No document.xml found");
            return "";
        }

        const xmlContent = docEntry.getData().toString('utf8');

        // Comprobar si las palabras clave existen en el XML crudo (incluso con etiquetas de por medio)
        const keywords = ["Nom", "Cognoms", "Naixement"];
        console.log("\n--- KEYWORD CHECK IN RAW XML ---");
        keywords.forEach(kw => {
            // Buscamos la palabra tal cual en el XML gigante
            const idx = xmlContent.indexOf(kw);
            if (idx !== -1) {
                console.log(`✅ FOUND '${kw}' at index ${idx}`);
                console.log("Context:", xmlContent.substring(idx - 100, idx + 200));
            } else {
                console.log(`❌ MISSING '${kw}' in XML`);
            }
        });

        // Limpieza básica de XML para sacar solo texto
        let text = xmlContent.replace(/<\/w:p>/g, '\n').replace(/<\/w:tc>/g, ' ');
        text = text.replace(/<[^>]+>/g, '');
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    } catch (e) {
        console.warn("⚠️ Advertencia: No se pudo extraer XML crudo:", e.message);
        return "";
    }
}

console.log("--- EXTRACTION TEST ---");
const extracted = extractRawXMLText(filePath);
console.log("\n--- EXTRACTED TEXT DUMP (First 1000 chars) ---");
console.log(extracted.substring(0, 1000));
