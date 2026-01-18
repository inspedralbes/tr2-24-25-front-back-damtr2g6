const mammoth = require('mammoth');
const cheerio = require('cheerio');

const OLLAMA_URL = 'http://ollama:11434/api/generate';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.2:3b';

/**
 * Extreu la informació del PI utilitzant Ollama y Mammoth (Versión Estable).
 * @param {string} filePath - La ruta del fitxer DOCX.
 * @returns {Promise<object>} - Un objecte JSON estructurat.
 */
async function extractPIdata(filePath) {
    let rawHtml;
    try {
        const result = await mammoth.convertToHtml({ path: filePath });
        rawHtml = result.value;
    } catch (e) {
        throw new Error("Error en la conversió del DOCX a HTML: " + e.message);
    }

    // Limpieza de tablas (Cheerio)
    const $ = cheerio.load(rawHtml);
    $('table').each((i, table) => {
        const headers = $(table).find('tr').first().find('td, th');
        const headerTexts = headers.map((i, header) => $(header).text().trim()).get();
        const siIndex = headerTexts.indexOf('Sí');
        const noIndex = headerTexts.indexOf('No');
        if (siIndex !== -1 && noIndex !== -1) {
            $(table).find('tr').slice(1).each((j, row) => {
                const cells = $(row).find('td');
                if (cells.length > noIndex && $(cells[noIndex]).text().trim().toLowerCase() === 'x') {
                    $(row).remove();
                }
            });
        }
    });
    const cleanedHtml = $.html(); // HTML limpio con tablas filtradas

    // Prompt Estándar (El que funcionaba bien)
    const prompt = `
        You are a highly specialized data extraction bot for educational plans (PI).
        
        ### SOURCE CONTENT (HTML):
        """
        ${cleanedHtml}
        """

        ### TASK:
        Extract the following information from the provided HTML content.
        
        ### REQUIRED JSON STRUCTURE:
        {
          "dadesAlumne": {
            "nomCognoms": "Name Surnames",
            "dataNaixement": "DD/MM/YYYY",
            "curs": "Course Name"
          },
          "motiu": {
            "diagnostic": "Diagnosis or Reason"
          },
          "adaptacionsGenerals": ["Adaptation 1", "Adaptation 2"],
          "orientacions": ["Orientation 1", "Orientation 2"]
        }

        NOTES:
        - If a field is not found, return null.
        - Date format must be DD/MM/YYYY.
    `;

    try {
        console.log("🚀 Enviando Prompt a Ollama (Standard Mode)...");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.1,
                    num_ctx: 4096
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        const jsonText = data.response.trim().replace(/^```json\s*|^\s*```|```$|\s*```$/g, '');

        console.log("✅ Datos extraídos correctamente.");
        return JSON.parse(jsonText);

    } catch (error) {
        console.error('❌ Error en extractPIdata:', error);
        throw error;
    }
}

module.exports = { extractPIdata };