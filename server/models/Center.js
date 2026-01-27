const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    type: { type: String },
    address: { type: String }
}, { timestamps: true });

const Center = mongoose.model('Center', centerSchema);

module.exports = Center;
