const ScheduleModel = require('../../../models/Schedule');
const ClassroomModel = require('../../../models/Classroom');
const UserModel = require('../../../models/User');

module.exports = class Schedule { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.httpExposed         = [
            'createSchedule',
            'get=getSchedules',
            'get=getTeacherSchedule',
            'patch=updateSchedule',
            'delete=deleteSchedule'
        ];
    }

    /**
     * Create a new schedule entry (Superadmin/SchoolAdmin only).
     */
    async createSchedule({ __token, __isSchoolAdmin, classroomId, teacherId, subject, dayOfWeek, startTime, endTime }) {
        const validationResult = await this.validators.schedule.createSchedule({ 
            classroomId, teacherId, subject, dayOfWeek, startTime, endTime 
        });
        if (validationResult) return { errors: validationResult };

        // Verify classroom
        const classroom = await ClassroomModel.findById(classroomId);
        if (!classroom || String(classroom.schoolId) !== String(__token.schoolId)) {
            return { code: 400, error: 'Invalid classroom for your school' };
        }

        // Verify teacher
        const teacher = await UserModel.findById(teacherId);
        if (!teacher || String(teacher.schoolId) !== String(__token.schoolId)) {
            return { code: 400, error: 'Invalid teacher for your school' };
        }

        // Potential Overlap Check (Simplified)
        const overlap = await ScheduleModel.findOne({
            classroomId,
            dayOfWeek,
            $or: [
                { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
                { startTime: { $lt: endTime }, endTime: { $gte: endTime } }
            ]
        });
        if (overlap) return { code: 409, error: 'Schedule overlaps with an existing entry in this classroom' };

        const schedule = await ScheduleModel.create({
            schoolId: __token.schoolId,
            classroomId,
            teacherId,
            subject,
            dayOfWeek,
            startTime,
            endTime
        });

        return { 
            message: 'Schedule created successfully',
            schedule 
        };
    }

    /**
     * Get all schedules for the school or a specific classroom.
     */
    async getSchedules({ __token, classroomId }) {
        let query = { schoolId: __token.schoolId };
        if (classroomId) query.classroomId = classroomId;

        const schedules = await ScheduleModel.find(query)
            .populate('teacherId', 'name email')
            .populate('classroomId', 'name')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .lean();

        return { schedules };
    }

    /**
     * Get the personal schedule for a teacher.
     */
    async getTeacherSchedule({ __token, teacherId }) {
        const targetId = teacherId || __token.userId;
        
        const schedules = await ScheduleModel.find({ 
            teacherId: targetId, 
            schoolId: __token.schoolId 
        })
            .populate('classroomId', 'name')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .lean();

        return { schedules };
    }

    /**
     * Update an existing schedule entry.
     */
    async updateSchedule({ __token, __isSchoolAdmin, id, ...updateData }) {
        const schedule = await ScheduleModel.findById(id);
        if (!schedule) return { code: 404, error: 'Schedule not found' };

        if (String(schedule.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        const validationResult = await this.validators.schedule.updateSchedule({ id, ...updateData });
        if (validationResult) return { errors: validationResult };

        const { fnName, moduleName, __token: _t, __device: _d, ...cleanUpdateData } = updateData;

        const updatedSchedule = await ScheduleModel.findByIdAndUpdate(id, cleanUpdateData, { new: true })
            .populate('teacherId', 'name email')
            .populate('classroomId', 'name')
            .lean();

        return { 
            message: 'Schedule updated successfully',
            schedule: updatedSchedule 
        };
    }

    /**
     * Delete a schedule entry.
     */
    async deleteSchedule({ __token, __isSchoolAdmin, id }) {
        const schedule = await ScheduleModel.findById(id);
        if (!schedule) return { code: 404, error: 'Schedule not found' };

        if (String(schedule.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        await ScheduleModel.findByIdAndDelete(id);
        return { message: 'Schedule deleted successfully' };
    }

}
