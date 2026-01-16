
const fs = require('fs');
const readline = require('readline');

async function showFirstCenter() {
    const fileStream = fs.createReadStream('totcat-centres-educatius.csv', 'utf8');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let headers = null;
    let firstLine = null;

    for await (const line of rl) {
        if (!headers) {
            headers = line.split(';');
        } else {
            firstLine = line.split(';');
            break; // Solo leemos 1 centro
        }
    }

    console.log("=== CAMPOS DISPONIBLES EN EL CSV ===");
    headers.forEach((header, index) => {
        const value = firstLine[index] || '(Vacío)';
        console.log(`[${index}] ${header}: ${value}`);
    });
}

showFirstCenter();
