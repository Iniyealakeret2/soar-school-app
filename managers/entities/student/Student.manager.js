const StudentModel = require('../../../models/Student');
const ClassroomModel = require('../../../models/Classroom');

module.exports = class Student { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.shark               = managers.shark;
        this.httpExposed         = [
            'createStudent',
            'getStudent',
            'get=getStudents',
            'patch=updateStudent',
            'delete=deleteStudent',
            'patch=transferStudent'
        ];
    }

    /**
     * Enroll a new student.
     */
    async createStudent({ __token, __isSchoolAdmin, name, email, studentId, dateOfBirth, gender, address, parentContact, classroomId }) {

        const validationResult = await this.validators.student.createStudent({ 
            name, email, studentId, dateOfBirth, gender, address, parentContact, classroomId 
        });
        if (validationResult) return { errors: validationResult };

        // Check if studentId already exists
        const existingStudent = await StudentModel.findOne({ studentId });
        if (existingStudent) return { code: 409, error: 'Student ID already exists' };

        // If classroomId is provided, verify it belongs to the same school
        if (classroomId) {
            const classroom = await ClassroomModel.findById(classroomId);
            if (!classroom || String(classroom.schoolId) !== String(__token.schoolId)) {
                return { code: 400, error: 'Invalid classroom for your school' };
            }
        }

        const newStudent = await StudentModel.create({
            name,
            email,
            studentId,
            schoolId: __token.schoolId,
            classroomId,
            dateOfBirth,
            gender,
            address,
            parentContact,
            createdBy: __token.userId
        });

        return { 
            message: 'Student enrolled successfully',
            student: newStudent 
        };
    }

    /**
     * Get students for the admin's school with pagination.
     */
    async getStudents({ __token, page = 1, limit = 10, classroomId }) {
        if (__token.role !== 'school_admin' && __token.role !== 'superadmin') {
            return { code: 403, error: 'Forbidden' };
        }

        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
        const skip = (pageInt - 1) * limitInt;

        // Restriction: School Admin only sees their school
        let query = {};
        if (__token.role === 'school_admin') {
            query.schoolId = __token.schoolId;
        }

        if (classroomId) query.classroomId = classroomId;

        const total = await StudentModel.countDocuments(query);
        const students = await StudentModel.find(query)
            .populate('classroomId', 'name')
            .skip(skip)
            .limit(limitInt)
            .lean();

        return { 
            students,
            meta: {
                total,
                page: pageInt,
                limit: limitInt,
                pages: Math.ceil(total / limitInt)
            }
        };
    }

    /**
     * Get a single student's profile.
     */
    async getStudent({ __token, id }) {
        const student = await StudentModel.findById(id).populate('classroomId', 'name').lean();
        if (!student) return { code: 404, error: 'Student not found' };

        // Authorization check
        if (__token.role === 'school_admin' && String(student.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        return { student };
    }

    /**
     * Update student profile.
     */
    async updateStudent({ __token, __isSchoolAdmin, id, ...updateData }) {

        const student = await StudentModel.findById(id);
        if (!student) return { code: 404, error: 'Student not found' };

        if (String(student.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        const validationResult = await this.validators.student.updateStudent({ id, ...updateData });
        if (validationResult) return { errors: validationResult };

        const { fnName, moduleName, __token: _t, __device: _d, ...cleanUpdateData } = updateData;

        const updatedStudent = await StudentModel.findByIdAndUpdate(id, cleanUpdateData, { new: true }).lean();

        return { 
            message: 'Student profile updated successfully',
            student: updatedStudent 
        };
    }

    /**
     * Transfer a student to a different classroom.
     */
    async transferStudent({ __token, __isSchoolAdmin, id, classroomId }) {

        const student = await StudentModel.findById(id);
        if (!student) return { code: 404, error: 'Student not found' };

        if (String(student.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        const validationResult = await this.validators.student.transferStudent({ id, classroomId });
        if (validationResult) return { errors: validationResult };

        // Verify the new classroom belongs to the same school
        const classroom = await ClassroomModel.findById(classroomId);
        if (!classroom || String(classroom.schoolId) !== String(__token.schoolId)) {
            return { code: 400, error: 'Invalid classroom for your school' };
        }

        const updatedStudent = await StudentModel.findByIdAndUpdate(id, { classroomId }, { new: true }).lean();

        return { 
            message: 'Student transferred successfully',
            student: updatedStudent 
        };
    }

    /**
     * Delete (Deactivate) a student record.
     */
    async deleteStudent({ __token, __isSchoolAdmin, id }) {

        const student = await StudentModel.findById(id);
        if (!student) return { code: 404, error: 'Student not found' };

        if (String(student.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        await StudentModel.findByIdAndDelete(id);
        return { message: 'Student record deleted successfully' };
    }

}
