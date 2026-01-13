// extractor.js (ADAPTAT PER OLLAMA i FETCH NATIU DE NODE)
const pdf = require('pdf-parse');
const fs = require('fs');

const OLLAMA_URL = 'http://ollama:11434/api/generate';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.2:3b';

/**
 * Extreu la informació del PI utilitzant Ollama i l'API fetch nativa de Node.js.
 * @param {string} filePath - La ruta del fitxer PDF.
 * @returns {Promise<object>} - Un objecte JSON estructurat.
 */
async function extractPIdata(filePath) {
    let rawText;
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        rawText = data.text;
    } catch (e) {
        throw new Error("Error en la conversió del PDF a text pla: " + e.message);
    }

    // 2. PROMPT: La instrucció clau per a l'extracció
    const prompt = `
        You are a highly specialized data extraction bot. Your ONLY function is to extract specific data from a given text and return it in a precise JSON format.

        ### PRIMARY DIRECTIVE
        Carefully analyze the "DOCUMENT TEXT" provided below. Your task is to populate the "REQUIRED JSON STRUCTURE" with the corresponding information found in the text.

        ### RULES
        1.  **STICK TO THE STRUCTURE:** You MUST use the exact JSON structure provided in "REQUIRED JSON STRUCTURE". Do not add, remove, or rename any fields.
        2.  **EXTRACT EXACT VALUES:** Values in the JSON should be the EXACT text found in the document.
        3.  **HANDLE MISSING DATA:** If a specific piece of information cannot be found in the "DOCUMENT TEXT", you MUST use the value \`null\` for that field. Do not guess or invent information. For empty arrays, use \`[]\`.
        4.  **JSON ONLY OUTPUT:** Your entire output must be a single, valid JSON object, and nothing else. Do not add any explanatory text, markdown, or any characters before or after the JSON object.

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

        ### EXAMPLE (For Reference Only - DO NOT COPY)
        Input Text: "L'alumne Pau Vila nascut el 01/01/2010 fa 1r d'ESO..."
        Output JSON: {"dadesAlumne": {"nomCognoms": "Pau Vila", ...}}

        ### DOCUMENT TEXT (Analyze this):
        """
        ${rawText}
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
        console.log("--- DEBUG: RAW TEXT FROM PDF ---");
        console.log(rawText);

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