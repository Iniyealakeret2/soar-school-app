const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    classroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'excused'],
        required: true
    },
    remarks: {
        type: String,
        trim: true
    },
    takenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Ensure a student can have only one attendance record per day per classroom
// This might need adjustment if supporting multiple sessions/subjects per day
attendanceSchema.index({ studentId: 1, date: 1, classroomId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
