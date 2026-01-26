
const fs = require('fs');
const path = require('path');

const centrosPath = path.join(__dirname, 'centros_fixed.json');
let centrosDataCache = [];

if (!fs.existsSync(centrosPath)) {
    console.error("File not found!");
} else {
    try {
        const content = fs.readFileSync(centrosPath, 'utf-8');
        const centrosData = JSON.parse(content);
        if(!Array.isArray(centrosData)) {
            console.error("centrosData is not an array");
        } else {
            centrosDataCache = centrosData.map(c => ({
                code: c.Codi_centre,
                name: c.Denominació_completa
            }));
            console.log("Success! centrosDataCache length:", centrosDataCache.length);
        }
    } catch (error) {
        console.error("Error loading or parsing centros_fixed.json:", error);
    }
}
