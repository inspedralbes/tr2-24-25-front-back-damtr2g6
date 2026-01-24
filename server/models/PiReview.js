const mongoose = require('mongoose');

const PiReviewSchema = new mongoose.Schema({
    studentRalc: {
        type: String,
        ref: 'Student', // Reference to the Student model (by RALC)
        required: true
    },
    authorId: {
        type: Number, // Reference to the User (MySQL ID)
        required: true
    },
    authorName: {
        type: String, // Store snapshot of name to avoid extra lookups
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: false,
        maxLength: 500
    },
    effectiveness: { // Flexible schema: Specific areas of effectiveness
        academic: { type: Number, min: 1, max: 5 },
        behavioral: { type: Number, min: 1, max: 5 },
        emotional: { type: Number, min: 1, max: 5 }
    }
}, {
    timestamps: true
});

/**
 * REQUISI MONGODB: Objectes imbricats i relacions
 * - Relació: studentRalc referencia a la col·lecció de Students.
 * - Objecte Imbricat: 'effectiveness' conté sub-camps per anàlisi detallat (3+ nivells en agregacions).
 */
// Index for fast lookup of reviews by student
PiReviewSchema.index({ studentRalc: 1 });

const PiReview = mongoose.model('PiReview', PiReviewSchema);

module.exports = PiReview;
