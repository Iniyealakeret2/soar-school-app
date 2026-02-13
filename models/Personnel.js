const mongoose = require('mongoose');

const personnelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    department: {
        type: String,
        trim: true
    },
    designation: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_leave'],
        default: 'active'
    },
    joiningDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Personnel', personnelSchema);
