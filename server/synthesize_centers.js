const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'centros.json');
const outputFile = path.join(__dirname, 'centros_min.json');

try {
  console.log('Reading centros.json...');
  const rawData = fs.readFileSync(inputFile, 'utf8');
  const centers = JSON.parse(rawData);

  console.log(`Original count: ${centers.length} centers`);

  const simplified = centers.map(c => ({
    code: c.Codi_centre,
    name: c.Denominació_completa,
    nature: c.Nom_naturalesa,
    municipality: c.Nom_municipi,
    address: c.Adreça,
    postalCode: c.Codi_postal,
    email: c['E-mail_centre']
  }));

  console.log('Writing simplified JSON...');
  fs.writeFileSync(outputFile, JSON.stringify(simplified, null, 2));

  console.log(`✅ Success! Simplified ${simplified.length} centers to ${outputFile}`);
  
} catch (error) {
  console.error('❌ Error synthesizing JSON:', error);
}
