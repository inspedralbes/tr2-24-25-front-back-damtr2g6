const mongoose = require('mongoose');
const Student = require('./models/Student');

const MONGO_URI = 'mongodb://admin:1234@localhost:27017/school_data?authSource=admin';
async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB for seeding');

        // Create a sample student
        const testStudent = new Student({
            _id: "1000000001", // RALC Example
            name: "Estudiant de Prova",
            birthDate: "01/01/2010",
            extractedData: {
                info: "Dades inicials de prova"
            }
        });

        await testStudent.save();
        console.log('✅ Pilot student created! Check Mongo Express now.');

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding:', err);
        process.exit(1);
    }
}

seed();
