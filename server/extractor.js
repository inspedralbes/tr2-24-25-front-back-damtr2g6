const mammoth = require('mammoth');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const textract = require('textract');

// Función para eliminar emojis de una cadena de texto
function stripEmojis(text) {
    // Regex para encontrar la mayoría de los caracteres emoji Unicode
    // Adaptado para cubrir un amplio rango sin ser excesivamente agresivo con otros símbolos.
    // Fuente: https://stackoverflow.com/questions/18929311/javascript-regex-to-remove-all-emojis
    return text.replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, '');
}

const OLLAMA_URL = 'http://ollama:11434/api/generate';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.2:3b';

async function extractPIdata(filePath, originalFileName) {
    const fileExtension = path.extname(originalFileName).toLowerCase();
    
    let processedContent = "";
    let prompt;
    
    // Datos fijos / Hardcoded
    let hardcodedData = { nom: "N/D", data: null, curs: null, diagnostic: null };
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
    // 1. DOCX (LÓGICA v10.2 - FILTROS INTELIGENTES Y DETECCIÓN DE CURSO)
    // ==========================================================================================
 // ==========================================================================================
    // 1. DOCX (LÓGICA v10.6 - PROTECCIÓ CONTRA SOBREESCRIPTURA DE NOMS)
    // ==========================================================================================
    if (fileExtension === '.docx') {
        try {
            const result = await mammoth.convertToHtml({ path: filePath });
            const $ = cheerio.load(result.value);
            let extractedLines = [];
            let inOrientations = false;
            let nameFound = false; // NOVA BANDERA: Per deixar de buscar un cop trobat l'alumne

            // --- A. RECORRIDO DE TABLAS ---
            $('tr').each((i, row) => {
                const cells = $(row).find('td, th');
                let xIndex = -1; 

                cells.each((j, cell) => {
                    const text = $(cell).text().trim();
                    const lowerText = text.toLowerCase();

                    // 1. NOM (MILLORAT v10.6: Filtre estricte d'etiqueta)
                    // Només busquem si encara no hem trobat un nom vàlid (o si el que tenim és molt curt/dolent)
                    if (!nameFound && text.match(/Nom i cognoms|Alumne/i) && cells[j+1]) {
                        
                        // FILTRE VITAL: Si l'etiqueta diu "Director", "Tutor", "Coordinador", "Pare", NO ÉS L'ALUMNE.
                        const isStaff = lowerText.includes("director") || 
                                      lowerText.includes("coordinador") || 
                                      lowerText.includes("tutor") || 
                                      lowerText.includes("pare") || 
                                      lowerText.includes("mare") ||
                                      lowerText.includes("legal") ||
                                      lowerText.includes("representant");

                        if (!isStaff) {
                            let candidate = $(cells[j+1]).text().trim();
                            candidate = candidate
                                .replace(/Nom\s*i\s*cognoms/gi, "")
                                .replace(/Nom\s*complet/gi, "")
                                .replace(/Alumne(\/a)?/gi, "")
                                .replace(/^[:\.\-\s]+/, "")
                                .trim();
                            
                            // Si trobem un nom real (més de 1 lletra), el guardem i bloquegem la cerca.
                            if (candidate.length > 1) {
                                hardcodedData.nom = candidate;
                                nameFound = true; // JA EL TENIM! No deixem que el Director ens el trepitgi.
                            }
                        }
                    }
                    
                    // 2. DATA
                    if (text.match(/Data de naixement/i)) {
                        let val = text.replace(/Data de naixement[:\s]*/i, "").trim();
                        if (!val && cells[j+1]) val = $(cells[j+1]).text().trim();
                        if (val) hardcodedData.data = val;
                    }

                    // DETECCIÓN DE X
                    if (text.match(/^[xX]$|^[sS][íi]$/)) xIndex = j;
                });

                // --- LÓGICA DE EXTRACCIÓN (MANTENIDA DE v10.5) ---
                if (xIndex !== -1) {
                    let candidateText = "";
                    if (xIndex === 0 && cells.length > 1) candidateText = $(cells[1]).text().trim();
                    else if (xIndex > 0) candidateText = $(cells[0]).text().trim();

                    if (candidateText.length > 2) {
                        const lower = candidateText.toLowerCase();

                        // 3. CURSO
                        if (lower.match(/\d.*(?:eso|batxillerat|primària)/)) {
                            hardcodedData.curs = candidateText;
                        }
                        
                        // 4. DIAGNÓSTICO
                        else if (lower.match(/trastorn|discapacitat|retard|dictamen|tdah|dislèxia|tea|autisme/)) {
                            if (!lower.includes("absència") && 
                                !lower.includes("no hi ha") && 
                                !lower.includes("manifestació") && 
                                !lower.includes("dificultat significativa")) { 
                                hardcodedData.diagnostic = candidateText;
                            }
                        }

                        // 5. ADAPTACIONES
                        else {
                            const isTrash = 
                                lower.startsWith("adaptacions") || 
                                lower.startsWith("descripció") || 
                                lower.startsWith("habilitats") || 
                                lower.startsWith("cursos") ||
                                lower.startsWith("ha seguit") ||        
                                lower.startsWith("les dificultats") ||  
                                lower.startsWith("les habilitats") ||   
                                lower.startsWith("les demandes") ||     
                                lower.includes("dificultat significativa") || 
                                lower.includes("alteraci"); 

                            if (!isTrash && !lower.match(/^[sS][íi]$|^no$/)) {
                                extractedLines.push("ADAPTACIÓ: " + candidateText);
                            }
                        }
                    }
                }
            });

            // --- B. RECORRIDO DE TEXTO (ORIENTACIONES - MANTENIDA v10.5) ---
            $('p, h1, h2, h3, li').each((i, el) => {
                if ($(el).parents('table').length === 0) {
                    let text = $(el).text().trim().replace(/\s+/g, ' ');

                    if (text.match(/Orientacions|Pautes|Recomanacions/i)) inOrientations = true;
                    if (text.match(/Signatura|Lloc i data|Vistiplau/i)) inOrientations = false;

                    if (inOrientations) {
                        if (text.length > 5 && 
                            !text.match(/^Orientacions|^Signatura|^Lloc i data/i) &&
                            !text.match(/^Pel que fa a/i) &&    
                            !text.endsWith(":")) {
                            let cleanText = text.replace(/^[-•]\s*/, "");
                            extractedLines.push("ORIENTACIÓ: " + cleanText);
                        }
                    }
                }
            });
            processedContent = extractedLines.join("\n");
            processedContent = stripEmojis(processedContent);

        } catch (e) {
            throw new Error("Error processant DOCX: " + e.message);
        }

        prompt = `
            You are a data extraction engine.
            ### SOURCE CONTENT: 
            """${processedContent}"""
            
            ### METADATA:
            - Name: "${hardcodedData.nom}"
            - Date: "${hardcodedData.data || ''}"
            - Course: "${hardcodedData.curs || ''}"
            - Diagnostic: "${hardcodedData.diagnostic || ''}"

            ### TARGET JSON: ${jsonStructure}
            
            ### INSTRUCTIONS:
            1. **dadesAlumne**: Use strictly the METADATA provided.
            2. **motiu**: Use the METADATA Diagnostic.
            3. **adaptacionsGenerals**: 
               - Extract lines marked with "✅ ADAPTACIÓ".
               - Return clean text.
            4. **orientacions**: 
               - Extract lines marked with "💡 ORIENTACIÓ".
        `;
    }

    // ==========================================================================================
    // 2. ODT (LÓGICA MEJORADA v9.3)
    // ==========================================================================================
    // ==========================================================================================
    // 2. ODT (CORRECCIÓN v9.5 - ESTRATEGIA FRANCOTIRADOR DE CABECERA)
    // ==========================================================================================
else if (fileExtension === '.odt') {
        try {
            processedContent = await new Promise((resolve, reject) => {
                textract.fromFileWithMimeAndPath("application/vnd.oasis.opendocument.text", String(filePath), { preserveLineBreaks: true }, (error, text) => {
                    if (error) reject(error);
                    else resolve(text);
                });
            });

            // Limpieza básica
            processedContent = processedContent
                .replace(/\r\n/g, '\n')
                .replace(/\t/g, ' ')
                .replace(/\n\s+\n/g, '\n\n')
                .trim();
            processedContent = stripEmojis(processedContent);

            // --- A. ESCÁNER DE NOMBRE (ESTRATEGIA FRANCOTIRADOR + LIMPIEZA) ---
            const headerContext = processedContent.substring(0, 1000); 
            hardcodedData.nom = "N/D"; 

            // Regex: Busca la etiqueta y captura lo que sigue
            const nameRegex = /(?:Nom i cognoms|Nom complet|Alumne\/a|Nom)\s*[:\.]?\s*([^\n\r]*)(?:\n\s*([^\n\r]+))?/i;
            const match = nameRegex.exec(headerContext);
            
            if (match) {
                // 1. Obtener candidato (prioridad línea misma, si no, línea siguiente)
                let candidate = match[1] ? match[1].trim() : "";
                if ((!candidate || candidate.length === 0) && match[2]) {
                    candidate = match[2].trim();
                }

                // --- PASO NUEVO: LA LIMPIEZA QUÍMICA ---
                // Esto asegura que si se ha colado el título dentro del valor, lo borramos.
                // Ejemplo: Si captura "Nom i cognoms: x", esto borra "Nom i cognoms:" y deja solo "x".
                candidate = candidate
                    .replace(/Nom\s*i\s*cognoms/gi, "") // Borra "Nom i cognoms"
                    .replace(/Nom\s*complet/gi, "")      // Borra "Nom complet"
                    .replace(/Alumne(\/a)?/gi, "")       // Borra "Alumne" o "Alumne/a"
                    .replace(/Nom/gi, "")                // Borra "Nom" suelto
                    .replace(/^[:\.\-\s]+/, "")          // Borra dos puntos o guiones al principio
                    .trim();                             // Quita espacios sobrantes

                // 2. Filtros de Seguridad (Mantenemos los que funcionan)
                if (candidate.length > 0 && 
                    !candidate.toLowerCase().includes("pare") && 
                    !candidate.toLowerCase().includes("mare") && 
                    !candidate.toLowerCase().includes("tutor") &&
                    !candidate.toLowerCase().includes("data") &&
                    !candidate.toLowerCase().includes("curs") &&
                    candidate.length < 60) { // Si es una frase larguísima, fuera.
                    
                    hardcodedData.nom = candidate;
                }
            }

            // --- RESTO IGUAL QUE ANTES (Data, Curs, Diagnòstic, Adaptacions) ---
            
            // Data
            const dataMatch = processedContent.match(/Data de naixement:[\s\n]*([0-9\/]+)/i);
            if (dataMatch) hardcodedData.data = dataMatch[1].trim();

            // Curs
            const cursMatch = processedContent.match(/(?:Curs|Nivell):[\s]*([^\n]*)/i);
            if (cursMatch) hardcodedData.curs = cursMatch[1].trim();

            // Diagnòstic
            const diagRegex = /(?:Descripció NESE|Breu justificació.*?PI\*?|Trastorn d['’]aprenentatge|Diagnòstic)[:\s]*([\s\S]*?)(?:\n\n|2\.|Actualment|•|Observacions)/i;
            const diagMatch = processedContent.match(diagRegex);
            if (diagMatch) hardcodedData.diagnostic = diagMatch[1].trim().replace(/\n/g, " ");

            // Contexto Adaptacions
            const startKeywords = ["4. PROPOSTA EDUCATIVA", "Mesures / Metodologia", "/metodologia:"];
            const endKeywords = ["5. CONFORMITAT", "6. REUNIONS", "7. AVALUACIÓ"];
            
            let startIndex = -1;
            let endIndex = -1;
            const lowerContent = processedContent.toLowerCase();

            for (const key of startKeywords) {
                const idx = lowerContent.indexOf(key.toLowerCase());
                if (idx !== -1) { startIndex = idx; break; }
            }
            
            if (startIndex !== -1) {
                for (const key of endKeywords) {
                    const idx = lowerContent.indexOf(key.toLowerCase(), startIndex);
                    if (idx !== -1) { endIndex = idx; break; }
                }
                if (endIndex === -1) endIndex = Math.min(startIndex + 3500, processedContent.length);
                specificContext = processedContent.substring(startIndex, endIndex);
            } else {
                specificContext = processedContent.substring(0, 3500);
            }

        } catch (e) {
            throw new Error(`Error ODT: ${e.message}`);
        }

        // --- PROMPT (Sin cambios) ---
// --- PROMPT CORREGIDO v9.8 (PRIORIDAD ABSOLUTA A METODOLOGÍA) ---
        prompt = `
            You are a data extraction engine for a Catalan Individualized Plan (PI).
            
            ### SOURCE TEXT: 
            """${specificContext}"""
            
            ### METADATA:
            - Name: "${hardcodedData.nom}"
            - Diagnostic: "${hardcodedData.diagnostic || ''}"

            ### TARGET JSON STRUCTURE: ${jsonStructure}
            
            ### INSTRUCTIONS:
            
            1. **dadesAlumne**: 
               - Name MUST be exactly "${hardcodedData.nom}".
               - Date and Course from text.

            2. **motiu**: 
               - Fill with METADATA Diagnostic.

            3. **adaptacionsGenerals**: 
               - **CRITICAL**: You must extract the list from the section named **"Mesures / Metodologia"** or **"Comuns a totes les matèries"**.
               - **MANDATORY ITEMS TO INCLUDE**:
                 - Look for "Processos cognitius".
                 - Look for "Més temps per realitzar les proves".
                 - Look for "Suport oral".
                 - Look for "Reduir component escrit".
               - **SECONDARY**: Only after extracting the above, you may add the student traits from "Avaluació inicial" (e.g., "Angoixa", "Ritme lent").
               - **FORMAT**: Return a single flat list of strings.

            4. **orientacions**: 
               - Extract "Criteris d’Avaluació" and specific advice like "Ús d'ordinador", "Agenda", "Espai fora aula".
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
        finalData.dadesAlumne.nomCognoms = hardcodedData.nom;
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