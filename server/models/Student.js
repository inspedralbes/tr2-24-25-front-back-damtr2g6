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
    }
}, {
    timestamps: true,
    _id: false // Disable auto-generation of ObjectId, since we use RALC
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
