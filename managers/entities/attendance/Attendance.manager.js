const AttendanceModel = require('../../../models/Attendance');
const StudentModel = require('../../../models/Student');
const ClassroomModel = require('../../../models/Classroom');

module.exports = class Attendance { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.httpExposed         = [
            'markAttendance',
            'get=getAttendanceReport',
            'get=getStudentAttendance'
        ];
    }

    /**
     * Mark attendance for a student (Typically called by a teacher).
     */
    async markAttendance({ __token, __isTeacher, studentId, classroomId, date, status, remarks }) {
        // Validation
        const validationResult = await this.validators.attendance.markAttendance({ 
            studentId, classroomId, date, status, remarks 
        });
        if (validationResult) return { errors: validationResult };

        // Verify student exists and belongs to the classroom/school
        const student = await StudentModel.findById(studentId);
        if (!student) return { code: 404, error: 'Student not found' };

        if (String(student.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden: Student belongs to another school' };
        }

        // Verify classroom belongs to the school
        const classroom = await ClassroomModel.findById(classroomId);
        if (!classroom || String(classroom.schoolId) !== String(__token.schoolId)) {
            return { code: 400, error: 'Invalid classroom for your school' };
        }

        // Normalize date to start of day (midnight)
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        // Upsert attendance record
        const attendance = await AttendanceModel.findOneAndUpdate(
            { studentId, date: attendanceDate, classroomId },
            { 
                status, 
                remarks, 
                takenBy: __token.userId, 
                schoolId: __token.schoolId 
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return { 
            message: 'Attendance marked successfully',
            attendance 
        };
    }

    /**
     * Get attendance report for a classroom or entire school.
     */
    async getAttendanceReport({ __token, __isSchoolAdmin, classroomId, startDate, endDate, studentId, page = 1, limit = 10 }) {
        if (!startDate || !endDate) {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 30); // Default to last 30 days
        }

        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
        const skip = (pageInt - 1) * limitInt;

        let query = { 
            schoolId: __token.schoolId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) }
        };

        if (classroomId) query.classroomId = classroomId;
        if (studentId) query.studentId = studentId;

        const total = await AttendanceModel.countDocuments(query);
        const report = await AttendanceModel.find(query)
            .populate('studentId', 'name studentId')
            .populate('classroomId', 'name')
            .populate('takenBy', 'name email')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limitInt)
            .lean();

        return { 
            report,
            meta: {
                total,
                page: pageInt,
                limit: limitInt,
                pages: Math.ceil(total / limitInt)
            }
        };
    }

    /**
     * Helper for teachers/admins to see a student's attendance.
     */
    async getStudentAttendance({ __token, __isTeacher, studentId, page = 1, limit = 10 }) {
        const validationResult = await this.validators.attendance.getStudentAttendance({ studentId, page, limit });
        if (validationResult) return { errors: validationResult };

        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
        const skip = (pageInt - 1) * limitInt;

        // Verify student exists in this school
        const student = await StudentModel.findById(studentId);
        if (!student) return { code: 404, error: 'Student not found' };

        if (String(student.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        const query = { studentId, schoolId: __token.schoolId };
        
        const total = await AttendanceModel.countDocuments(query);
        const attendance = await AttendanceModel.find(query)
            .populate('classroomId', 'name')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limitInt)
            .lean();

        return { 
            attendance,
            meta: {
                total,
                page: pageInt,
                limit: limitInt,
                pages: Math.ceil(total / limitInt)
            }
        };
    }

}
