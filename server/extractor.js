const mammoth = require('mammoth');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const textract = require('textract');

const OLLAMA_URL = 'http://ollama:11434/api/generate';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.2:3b';

/**
 * Extractor Universal v9.0 (Realmente Definitivo)
 * - DOCX: HTML/Cheerio (Infalible para tablas).
 * - ODT: 
 * 1. Búsqueda de secciones "Case-Insensitive" (arregla el fallo de Proposta educativa).
 * 2. Búsqueda iterativa de Nombres (arregla el falso N/D si hay campos vacíos antes).
 */
async function extractPIdata(filePath, originalFileName) {
    const fileExtension = path.extname(originalFileName).toLowerCase();
    
    let processedContent = "";
    let prompt;
    
    // Dades fixes trobades per codi
    let hardcodedData = { nom: null, data: null, curs: null, diagnostic: null };
    let specificContext = ""; 

    const jsonStructure = `{
      "dadesAlumne": {
        "nomCognoms": "",
        "dataNaixement": "",
        "curs": ""
      },
      "motiu": {
        "diagnostic": ""
      },
      "adaptacionsGenerals": [],
      "orientacions": []
    }`;

    // ==========================================================================================
    // 1. DOCX (HTML + CHEERIO) -> ESTO YA FUNCIONABA BIEN
    // ==========================================================================================
    if (fileExtension === '.docx') {
        try {
            const result = await mammoth.convertToHtml({ path: filePath });
            const $ = cheerio.load(result.value);
            let extractedLines = [];

            $('tr').each((i, row) => {
                const cells = $(row).find('td, th');
                let rowText = [];
                let rowHasX = false;
                
                cells.each((j, cell) => {
                    const text = $(cell).text().trim();
                    rowText.push(text);

                    // NOM: Mira la celda siguiente
                    if (text.match(/Nom i cognoms|Alumne/i) && cells[j+1]) {
                        let val = $(cells[j+1]).text().trim();
                        if (val && !val.toLowerCase().includes("nom") && !val.includes("N/D")) {
                            hardcodedData.nom = val;
                        }
                    }
                    // DATA
                    if (text.match(/Data de naixement/i) && cells[j+1]) {
                        hardcodedData.data = $(cells[j+1]).text().trim();
                    }
                    if (text.toLowerCase() === 'x') rowHasX = true;
                });

                // CURS
                if (rowText.length > 1 && rowText[0].toLowerCase() === 'x') {
                    if (rowText[1].match(/ESO|Batxillerat/i)) hardcodedData.curs = rowText[1];
                }

                let lineStr = rowText.join(" | ");
                if (rowHasX) extractedLines.push("✅ SELECTED: " + lineStr);
                else extractedLines.push(lineStr);
            });

            // Text general
            $('p').each((i, el) => {
                if ($(el).parents('table').length === 0) extractedLines.push($(el).text().trim());
            });
            processedContent = extractedLines.join("\n");

        } catch (e) {
            throw new Error("Error processant DOCX: " + e.message);
        }

        prompt = `
            You are a data extraction engine.
            ### SOURCE (HTML TABLES): """${processedContent}"""
            ### TARGET JSON: ${jsonStructure}
            ### INSTRUCTIONS:
            1. **dadesAlumne**: Use hardcoded values: Name="${hardcodedData.nom || ''}", Date="${hardcodedData.data || ''}", Course="${hardcodedData.curs || ''}".
            2. **diagnostic**: Search "Diagnòstic"/"Motiu". Look for "✅ SELECTED".
            3. **adaptacionsGenerals**: Extract description from rows marked "✅ SELECTED".
            4. **orientacions**: Extract text lists.
        `;
    } 

    // ==========================================================================================
    // 2. ODT (CORRECCIONES CLAVE v9.0)
    // ==========================================================================================
    else if (fileExtension === '.odt') {
        try {
            processedContent = await new Promise((resolve, reject) => {
                textract.fromFileWithMimeAndPath("application/vnd.oasis.opendocument.text", String(filePath), { preserveLineBreaks: true }, (error, text) => {
                    if (error) reject(error);
                    else resolve(text);
                });
            });
            processedContent = processedContent.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/\n\s+\n/g, '\n\n').trim();

            // --- A. ESCÁNER DE NOMBRE ITERATIVO (Vital para no coger el primer vacío) ---
            // Buscamos todas las ocurrencias de "Nom..." y nos quedamos con la primera que tenga datos.
            const nameRegex = /(?:Nom i cognoms|Alumne\/a|Nom)[:\s]*([^\n]*)(?:\n\s*([^\n]+))?/gi;
            let match;
            while ((match = nameRegex.exec(processedContent)) !== null) {
                // Grupo 1: Misma línea. Grupo 2: Línea siguiente.
                let candidate = (match[1] || match[2] || "").trim();
                
                // Filtros de calidad: Que no sea vacío, que no sea la propia etiqueta, que no sea una fecha.
                if (candidate.length > 2 && 
                    !candidate.toLowerCase().includes("nom") && 
                    !candidate.includes("Data") && 
                    !candidate.includes("_")) {
                    hardcodedData.nom = candidate;
                    break; // ¡Encontrado! Salimos del bucle.
                }
            }

            // Data y Curs
            const dataMatch = processedContent.match(/Data de naixement:[\s\n]*([0-9\/]+)/i);
            if (dataMatch) hardcodedData.data = dataMatch[1].trim();

            const cursMatch = processedContent.match(/(?:Curs|Nivell):[\s]*([^\n]*)/i);
            if (cursMatch) hardcodedData.curs = cursMatch[1].trim();

            // --- B. DIAGNÓSTICO (Con freno en "Observacions") ---
            const diagRegex = /(?:Descripció NESE|Breu justificació.*?PI\*?|Trastorn d['’]aprenentatge|Diagnòstic)[:\s]*([\s\S]*?)(?:\n\n|2\.|Actualment|•|Observacions)/i;
            const diagMatch = processedContent.match(diagRegex);
            if (diagMatch) hardcodedData.diagnostic = diagMatch[1].trim().replace(/\n/g, " ");

            // --- C. CONTEXTO ADAPTACIONES (CORRECCIÓN "CASE-INSENSITIVE") ---
            // Lista de palabras clave para encontrar el inicio de las adaptaciones
            const startKeywords = ["/metodologia:", "4. Proposta educativa", "Mesures / Metodologia", "Adaptacions"];
            const endKeywords = ["8. ACORDS", "6. Conformitat", "Criteris d’Avaluació", "Orientacions"];
            
            let startIndex = -1;
            let endIndex = -1;
            const lowerContent = processedContent.toLowerCase(); // Para buscar sin importar mayúsculas

            // 1. Encontrar inicio (insensible a mayúsculas)
            for (const key of startKeywords) {
                const idx = lowerContent.indexOf(key.toLowerCase());
                if (idx !== -1) {
                    startIndex = idx;
                    break;
                }
            }
            
            // 2. Encontrar final
            if (startIndex !== -1) {
                for (const key of endKeywords) {
                    // Buscamos el final a partir del inicio encontrado
                    const idx = lowerContent.indexOf(key.toLowerCase(), startIndex);
                    if (idx !== -1) {
                        endIndex = idx;
                        break;
                    }
                }
                // Si no encuentra final explícito, coge un bloque grande (3000 chars)
                if (endIndex === -1) endIndex = Math.min(startIndex + 3000, processedContent.length);
                
                specificContext = processedContent.substring(startIndex, endIndex);
            }

        } catch (e) {
            throw new Error(`Error ODT: ${e.message}`);
        }

        prompt = `
            You are a data extraction engine.
            ### PRIORITY CONTEXT (ADAPTATIONS SECTION): 
            """${specificContext}"""
            
            ### FULL TEXT: 
            """${processedContent}"""
            
            ### TARGET JSON: ${jsonStructure}
            
            ### INSTRUCTIONS:
            1. **dadesAlumne**: 
               - Name: "${hardcodedData.nom || ''}" (Use this extracted value!).
               - Date: "${hardcodedData.data || ''}"
               - Course: "${hardcodedData.curs || ''}"
            
            2. **diagnostic**: "${hardcodedData.diagnostic || ''}" (Use if valid).
            
            3. **adaptacionsGenerals**: 
               - **EXTREMELY IMPORTANT**: Look at the PRIORITY CONTEXT first.
               - Extract lines starting with "-" or bullets under "/metodologia:" or "Proposta educativa".
               - Do NOT extract headers like "Mesures d'atenció". Only the bullet points.

            4. **orientacions**: Extract bullet points from "Acords" or "Orientacions" or "Criteris".
        `;
    }

    // ==========================================================================================
    // CRIDA OLLAMA
    // ==========================================================================================
    try {
        console.log(`🚀 Enviant Prompt a Ollama (${fileExtension})...`);
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
                options: { temperature: 0.1, num_ctx: 4096 }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!response.ok) throw new Error("Ollama Error");
        
        const data = await response.json();
        const jsonText = data.response.trim().replace(/^```json\s*|^\s*```|```$|\s*```$/g, '');
        let finalData = JSON.parse(jsonText);

        // SOBREESCRIPTURA FINAL
        if (hardcodedData.nom) finalData.dadesAlumne.nomCognoms = hardcodedData.nom;
        if (hardcodedData.data) finalData.dadesAlumne.dataNaixement = hardcodedData.data;
        if (hardcodedData.curs) finalData.dadesAlumne.curs = hardcodedData.curs;
        if (hardcodedData.diagnostic && hardcodedData.diagnostic.length > 3) {
            finalData.motiu.diagnostic = hardcodedData.diagnostic;
        }

        console.log("✅ Extracció completada.");
        return finalData;

    } catch (error) {
        console.error('❌ Error extractPIdata:', error);
        throw error;
    }
}

module.exports = { extractPIdata };