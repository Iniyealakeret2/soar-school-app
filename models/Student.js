const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    studentId: {
        type: String,
        required: [true, 'Unique Student ID is required'],
        unique: true
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        default: null
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    address: {
        type: String,
        trim: true
    },
    parentContact: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String }
    },
    status: {
        type: String,
        enum: ['active', 'transferred', 'graduated', 'inactive'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for performance and uniqueness within school
studentSchema.index({ schoolId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
