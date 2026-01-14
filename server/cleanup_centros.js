const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'centros.json');

try {
    let rawData = fs.readFileSync(filePath, 'utf8');

    // Replace NaN with null to make it parsable standard JSON
    // NaN is not valid in standard JSON, but common in JS/Python dumps
    // We replace it with null temporarily so we can parse it
    const fixedData = rawData.replace(/:\s*NaN\b/g, ': null');
    
    const data = JSON.parse(fixedData);

    let removedCount = 0;

    const cleanedData = data.map(item => {
        const newItem = {};
        for (const [key, value] of Object.entries(item)) {
            // Remove keys where value is null (which was originally NaN or actual null)
            // The user specifically asked to remove attributes that appear as NaN
            if (value !== null) {
                newItem[key] = value;
            } else {
                removedCount++;
            }
        }
        return newItem;
    });

    fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2));
    console.log(`Successfully cleaned centros.json. Removed ${removedCount} fields.`);

} catch (error) {
    console.error('Error processing file:', error);
    process.exit(1);
}
