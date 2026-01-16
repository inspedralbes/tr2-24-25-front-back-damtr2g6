
const fs = require('fs');
const path = require('path');

const centrosPath = path.join('server', 'centros_fixed.json');

try {
    if (fs.existsSync(centrosPath)) {
        const content = fs.readFileSync(centrosPath, 'utf-8');
        const centros = JSON.parse(content);

        const dummyCode = "99999999";
        const dummyEmail = "admin@prueba.app";

        const exists = centros.find(c => c.Codi_centre === dummyCode);

        if (!exists) {
            centros.push({
                "Codi_centre": dummyCode,
                "Denominació_completa": "Prueba App",
                "Nom_naturalesa": "Privat",
                "Nom_municipi": "Barcelona",
                "Codi_postal": "08000",
                "E-mail_centre": dummyEmail
            });
            fs.writeFileSync(centrosPath, JSON.stringify(centros, null, 2), 'utf-8');
            console.log("✅ Centro 'Prueba App' añadido correctamente.");
        } else {
            console.log("ℹ️ El centro 'Prueba App' ya existe.");
        }
    } else {
        console.error("❌ No se encuentra centros_fixed.json");
    }
} catch (error) {
    console.error("❌ Error:", error);
}
