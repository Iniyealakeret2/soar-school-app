const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'School name is required'],
        trim: true,
        unique: true
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
    },
    phoneNumber: {
        type: String,
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    schoolOwner: {
        type: String,
        required: [true, 'School owner name is required'],
        trim: true
    },
    schoolAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('School', schoolSchema);
