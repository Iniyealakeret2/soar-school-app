const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Classroom name is required'],
        trim: true
    },
    capacity: {
        type: Number,
        required: [true, 'Capacity is required'],
        min: 1
    },
    resources: [{
        name: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        status: { type: String, enum: ['active', 'broken', 'missing'], default: 'active' }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Compound index to ensure name uniqueness per school
classroomSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Classroom', classroomSchema);
