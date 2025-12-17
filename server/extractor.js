// extractor.js (ADAPTAT PER OLLAMA i FETCH NATIU DE NODE)
const mammoth = require('mammoth');
const fs = require('fs');

const OLLAMA_URL = 'http://ollama:11434/api/generate';
const MODEL_NAME = 'mistral'; 

/**
 * Extreu la informació del PI utilitzant Ollama i l'API fetch nativa de Node.js.
 * @param {string} filePath - La ruta del fitxer DOCX.
 * @returns {Promise<object>} - Un objecte JSON estructurat.
 */
async function extractPIdata(filePath) {
    let rawText;
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        rawText = result.value; 
    } catch (e) {
        throw new Error("Error en la conversió del DOCX a text pla: " + e.message);
    }
    
    // 2. PROMPT: La instrucció clau per a l'extracció
    const prompt = `
        Ets un expert en documents educatius (Pla Individualitzat).
        Analitza el següent text, extreu totes les dades clau i retorna NOMÉS i EXCLUSIVAMENT
        un objecte JSON amb l'estructura requerida. No incloguis cap text, capítol, ni explicació addicional.

        // ESTRUCTURA JSON REQUERIDA (OBLIGATÒRIA):
        {
          "dadesAlumne": {
            "nomCognoms": "string",
            "dataNaixement": "string (DD/MM/AAAA)",
            "curs": "string (p. ex., 4t d’ESO)"
          },
          "motiu": {
            "diagnostic": "string"
          },
          "adaptacionsGenerals": ["string"],
          "orientacions": ["string"]
        }

        // CONTINGUT DEL PI:
        ---
        ${rawText}
        ---
    `;

    // 3. CRIDA A L'API LOCAL D'OLLAMA utilitzant fetch natiu
    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL_NAME,
                prompt: prompt,
                stream: false, // Esperar la resposta completa
                options: {
                    temperature: 0.01 // Baixa temperatura per resultats deterministes
                }
            })
        });

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
        return JSON.parse(cleanJsonText);

    } catch (error) {
        // Captura errors de xarxa, errors de parsing JSON, o errors de l'API d'Ollama
        console.error('Error en la crida a Ollama o parsing del JSON:', error);
        throw new Error('No s\'ha pogut processar el document amb IA local. Assegura\'t que Ollama està en marxa i el model correcte carregat.');
    }
}

module.exports = { extractPIdata };