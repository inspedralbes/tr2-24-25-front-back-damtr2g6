const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    _id: {
        type: String, // RALC is the ID (e.g., "1234567890")
        required: true,
        alias: 'ralc'
    },
    name: {
        type: String,
        required: true
    },
    birthDate: {
        type: String, // Format: DD/MM/YYYY
        required: true
    },
    extractedData: {
        type: Object, // Stores the full JSON from the PI extraction
        default: null
    },
    ownerId: {
        type: Number, // ID of the User (from MySQL users table)
        required: true
    },
    authorizedUsers: {
        type: [Number], // Array of User IDs authorized to view this PI
        default: []
    },
    centerCode: {
        type: String, // Links PI to a center for Admin access
        required: false
    }
}, {
    timestamps: true,
    _id: false, // Disable auto-generation of ObjectId, since we use RALC
    minimize: false // Ensure empty objects are stored to show schema flexibility
});

/**
 * REQUISI MONGODB: Estructura documentada
 * - Camps variables: extractedData és un Objecte flexible que canvia segons el contingut del PI (Esquema flexible).
 * - Profunditat: Accés a 3+ nivells (Ex: student.extractedData.dadesAlumne.nomCognoms).
 * - Arrays: 'authorizedUsers' emmagatzema dades relacionades (IDs d'usuaris).
 */
const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
