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
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
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

// Unique Employee ID per school
personnelSchema.index({ schoolId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('Personnel', personnelSchema);
