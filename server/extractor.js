// extractor.js (ADAPTAT PER OLLAMA i FETCH NATIU DE NODE)
const mammoth = require('mammoth');
const fs = require('fs');
const cheerio = require('cheerio');

const OLLAMA_URL = 'http://ollama:11434/api/generate';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.2:3b';

/**
 * Extreu la informació del PI utilitzant Ollama i l'API fetch nativa de Node.js.
 * @param {string} filePath - La ruta del fitxer DOCX.
 * @returns {Promise<object>} - Un objecte JSON estructurat.
 */
async function extractPIdata(filePath) {
    let rawHtml;
    try {
        const result = await mammoth.convertToHtml({ path: filePath });
        rawHtml = result.value; // The generated HTML
        const messages = result.messages; // Messages produced during conversion, if any
        if (messages && messages.length > 0) {
            messages.forEach(message => {
                console.warn(`Mammoth message: ${message.type}: ${message.message}`);
            });
        }
    } catch (e) {
        throw new Error("Error en la conversió del DOCX a HTML: " + e.message);
    }

    // 1. PRE-PROCESSING WITH CHEERIO
    const $ = cheerio.load(rawHtml);
    $('table').each((i, table) => {
        const headers = $(table).find('tr').first().find('td, th');
        const headerTexts = headers.map((i, header) => $(header).text().trim()).get();
        
        const siIndex = headerTexts.indexOf('Sí');
        const noIndex = headerTexts.indexOf('No');

        // Check if it's a Si/No table
        if (siIndex !== -1 && noIndex !== -1) {
            $(table).find('tr').slice(1).each((j, row) => { // Iterate over rows, skipping header
                const cells = $(row).find('td');
                // Check if the 'No' column is marked
                if (cells.length > noIndex && $(cells[noIndex]).text().trim().toLowerCase() === 'x') {
                    $(row).remove(); // Remove the row if 'No' is checked
                }
            });
        }
    });

    const cleanedHtml = $.html();

    // 2. PROMPT: La instrucció clau per a l'extracció
    const prompt = `
        You are a highly specialized data extraction bot. Your ONLY function is to extract specific data from a given HTML text and return it in a precise JSON format.

        ### PRIMARY DIRECTIVE
        Carefully analyze the "DOCUMENT TEXT" (which is a cleaned HTML document) provided below. Your task is to populate the "REQUIRED JSON STRUCTURE" with the corresponding information found in the text.

        ### RULES
        1.  **STICK TO THE STRUCTURE:** You MUST use the exact JSON structure provided.
        2.  **EXTRACT EXACT VALUES:** Values in the JSON should be the EXACT text found in the document.
        3.  **HANDLE MISSING DATA:** If a specific piece of information cannot be found, use the value \`null\` for that field. For empty arrays, use \`[]\`.
        4.  **JSON ONLY OUTPUT:** Your entire output must be a single, valid JSON object.

        ### NOTE
        The provided HTML has been pre-processed. Any row in a table where a "No" option was selected has already been removed. You just need to extract the visible data.

        ### REQUIRED JSON STRUCTURE
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

        ### DOCUMENT TEXT (Analyze this):
        """
        ${cleanedHtml}
        """

        ### YOUR JSON OUTPUT:
    `;

    // 3. CRIDA A L'API LOCAL D'OLLAMA utilitzant fetch natiu
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minuts timeout

        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                stream: false, // Esperar la resposta completa
                format: 'json', // Forçar sortida JSON
                options: {
                    temperature: 0.01 // Baixa temperatura per resultats deterministes
                }
            })
        });
        clearTimeout(timeoutId);

        // Maneig d'errors HTTP
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();

        // Ollama retorna un objecte on el resultat de l'IA és dins de la propietat 'response'
        const jsonText = data.response.trim();

        // Neteja l'embolcall de codi si l'IA l'ha afegit (p. ex., ```json ... ```)
        const cleanJsonText = jsonText.replace(/^```json\s*|^\s*```|```$|\s*```$/g, '');

        // Parseja i retorna el JSON
        console.log("--- DEBUG: CLEANED HTML SENT TO AI ---");
        console.log(cleanedHtml);

        console.log("--- DEBUG: AI RAW RESPONSE ---");
        console.log(jsonText);

        return JSON.parse(cleanJsonText);

    } catch (error) {
        // Captura errors de xarxa, errors de parsing JSON, o errors de l'API d'Ollama
        console.error('Error en la crida a Ollama o parsing del JSON:', error);
        throw new Error('No s\'ha pogut processar el document amb IA local. Assegura\'t que Ollama està en marxa i el model correcte carregat.');
    }
}

module.exports = { extractPIdata };