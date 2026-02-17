const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        auto: true
    },
    userId: {
        type: Number, // Assuming userId from MySQL is a Number
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    filePath: {
        type: String, // Path to the temporary file stored by multer
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'processing', 'completed', 'failed'],
        default: 'queued'
    },
    result: {
        type: mongoose.Schema.Types.Mixed // To store the extracted data
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date
    }
}, { timestamps: true }); // Mongoose adds createdAt and updatedAt fields automatically

const Job = mongoose.model('Job', JobSchema);

module.exports = Job;
