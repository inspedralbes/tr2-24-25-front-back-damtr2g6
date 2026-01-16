
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputFile = 'totcat-centres-educatius.csv';
const outputFile = path.join('server', 'centros_fixed.json');

async function processCSV() {
    console.log('🔄 Iniciando transformación CSV -> JSON...');

    if (!fs.existsSync(inputFile)) {
        console.error('❌ Error: No se encuentra el archivo ' + inputFile);
        return;
    }

    // El CSV de la Generalitat suele venir en codificación ANSI/Windows-1252/Latin1
    const fileStream = fs.createReadStream(inputFile, { encoding: 'latin1' });

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const centers = [];
    let isHeader = true;

    // Mapeo manual de índices basado en el análisis anterior
    // [0] Codi_centre
    // [1] Denominació_completa
    // [3] Nom_naturalesa
    // [13] Codi_postal
    // [14] Nom_municipi
    // [23] E-mail_centre

    for await (const line of rl) {
        // Ignoramos líneas vacías
        if (!line.trim()) continue;

        const columns = line.split(';');

        if (isHeader) {
            isHeader = false;
            // Podríamos validar nombres de cabecera aquí, pero confiaremos en los índices fijos
            // verificados en el paso anterior.
            continue;
        }

        if (columns.length < 5) continue; // Línea malformada

        const codi = columns[0].trim();
        const nom = columns[1].trim();
        const naturalesa = columns[3] ? columns[3].trim() : '';
        const cp = columns[13] ? columns[13].trim() : '';
        const municipi = columns[14] ? columns[14].trim() : '';
        const email = columns[23] ? columns[23].trim() : '';

        // Objeto simplificado para nuestra APP
        // Mantenemos propiedad "Codi_centre" y "Denominació_completa" para compatibilidad con el código actual del server,
        // pero añadimos campos extra útiles.

        // REVISANDO server.js: 
        // const lista = centrosData.map(c => ({ code: c.Codi_centre, name: c.Denominació_completa }));
        // ASÍ QUE DEBEMOS MANTENER LAS CLAVES ORIGINALES O ADAPTAR EL SERVER.
        // Vamos a mantener las claves originales para minimizar cambios en el backend ahora mismo,
        // pero añadimos las nuevas por si acaso.

        const centerObj = {
            "Codi_centre": codi,
            "Denominació_completa": nom,
            "Nom_naturalesa": naturalesa,
            "Nom_municipi": municipi,
            "Codi_postal": cp,
            "E-mail_centre": email
        };

        centers.push(centerObj);
    }

    // Escribir JSON
    fs.writeFileSync(outputFile, JSON.stringify(centers, null, 2), 'utf8');

    console.log(`✅ Transformación completada.`);
    console.log(`📊 Centros procesados: ${centers.length}`);
    console.log(`📁 Archivo guardado en: ${outputFile}`);
}

processCSV();
