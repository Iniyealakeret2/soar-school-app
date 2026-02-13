const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
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
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    dayOfWeek: {
        type: Number,
        required: true,
        min: 0,
        max: 6 // 0: Sunday, 1: Monday, ...
    },
    startTime: {
        type: String,
        required: true,
        match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/ // HH:mm format
    },
    endTime: {
        type: String,
        required: true,
        match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/ // HH:mm format
    }
}, {
    timestamps: true
});

// Avoid overlapping schedules in the same classroom at the same time and day
// Note: True overlap check usually requires logic in the manager, 
// but we can index for basic uniqueness if needed.
scheduleSchema.index({ classroomId: 1, dayOfWeek: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
