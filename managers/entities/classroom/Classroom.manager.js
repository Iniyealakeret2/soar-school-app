const ClassroomModel = require('../../../models/Classroom');
const SchoolModel = require('../../../models/School');
const UserModel = require('../../../models/User');

module.exports = class Classroom { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.shark               = managers.shark;
        this.httpExposed         = [
            'createClassroom',
            'get=getClassroomsBySchool',
            'get=getClassrooms',
            'get=getClassroom',
            'patch=updateClassroom',
            'delete=deleteClassroom',
            'post=addResources'
        ];
    }

    /**
     * Get classrooms under a specific admin or the current school admin's classrooms.
     */
    async getClassrooms({ __token, id, page = 1, limit = 10 }) {
        page = parseInt(page);
        limit = parseInt(limit);
        const schoolAdminId = id;
        
        const validationResult = await this.validators.classroom.getClassrooms({ id });
        if (validationResult) return { error: validationResult };

        let schoolId = null;

        if (__token.role === 'superadmin') {
            if (!schoolAdminId) return { error: 'schoolAdminId is required for superadmins' };
            const admin = await UserModel.findById(schoolAdminId);
            if (!admin || admin.role !== 'school_admin') return { error: 'Invalid or missing school admin' };
            schoolId = admin.schoolId;
        } else if (__token.role === 'school_admin') {
            schoolId = __token.schoolId;
        }

        if (!schoolId) return { error: 'No school associated with this account or the specified admin' };

        const skip = (page - 1) * limit;
        const query = { schoolId };
        const total = await ClassroomModel.countDocuments(query);
        const classrooms = await ClassroomModel.find(query)
            .populate('schoolId', 'name')
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const formattedClassrooms = classrooms.map(c => {
            const { schoolId, ...rest } = c;
            return { ...rest, school: schoolId };
        });

        return { 
            classrooms: formattedClassrooms,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Create a new classroom.
     * School Admin can only create classrooms for their own school.
     */
    async createClassroom({ __token, id, name, capacity, resources }) {
        if (__token.role !== 'school_admin') {
            return { error: 'Forbidden: Only school admins can create classrooms' };
        }

        const schoolId = id;

        // Restriction: School Admin can only manage their own school
        if (String(__token.schoolId) !== String(schoolId)) {
            return { error: 'Forbidden: You can only manage classrooms for your assigned school' };
        }

        const validationResult = await this.validators.classroom.createClassroom({ id, name, capacity, resources });
        if (validationResult) return { error: validationResult };

        const school = await SchoolModel.findById(schoolId);
        if (!school) return { error: 'School not found' };

        try {
            const newClassroom = await ClassroomModel.create({
                schoolId,
                name,
                capacity,
                resources,
                createdBy: __token.userId
            });

            return { 
                message: 'Classroom created successfully',
                classroom: newClassroom 
            };
        } catch (err) {
            if (err.code === 11000) {
                return { error: 'A classroom with this name already exists in this school' };
            }
            throw err;
        }
    }

    /**
     * Get classrooms for a specific school with pagination.
     */
    async getClassroomsBySchool({ __token, id, page = 1, limit = 10 }) {
        page = parseInt(page);
        limit = parseInt(limit);
        const schoolId = id;

        const validationResult = await this.validators.classroom.getClassroomsBySchool({ id });
        if (validationResult) return { error: validationResult };

        const isSuperAdmin = await this.shark.isGranted({
            layer: 'classroom',
            variant: 'superadmin',
            userId: __token.userId,
            action: 'read'
        });

        const isSchoolAdmin = await this.shark.isGranted({
            layer: 'classroom',
            variant: 'school_admin',
            userId: __token.userId,
            action: 'read'
        });

        if (!isSuperAdmin && !isSchoolAdmin) {
            return { error: 'Forbidden' };
        }

        // Restriction: School Admin can only see their own school's classrooms
        if (!isSuperAdmin && isSchoolAdmin) {
            if (String(__token.schoolId) !== String(schoolId)) {
                return { error: 'Forbidden: You can only view classrooms for your assigned school' };
            }
        }

        const skip = (page - 1) * limit;
        const query = { schoolId };
        const total = await ClassroomModel.countDocuments(query);
        const classrooms = await ClassroomModel.find(query)
            .populate('schoolId', 'name')
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const formattedClassrooms = classrooms.map(c => {
            const { schoolId, ...rest } = c;
            return { ...rest, school: schoolId };
        });

        return { 
            classrooms: formattedClassrooms,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get details of a specific classroom.
     */
    async getClassroom({ __token, id }) {
        const classroom = await ClassroomModel.findById(id).populate('schoolId', 'name').lean();
        if (!classroom) return { error: 'Classroom not found' };

        const isSuperAdmin = await this.shark.isGranted({
            layer: 'classroom',
            variant: 'superadmin',
            userId: __token.userId,
            action: 'read'
        });

        // School Admin check
        const isAuthorized = isSuperAdmin || (__token.role === 'school_admin' && __token.schoolId === classroom.schoolId._id.toString());

        if (!isAuthorized) {
            return { error: 'Forbidden' };
        }

        const { schoolId, ...rest } = classroom;
        return { classroom: { ...rest, school: schoolId } };
    }

    /**
     * Update a classroom.
     */
    async updateClassroom({ __token, id, ...updateData }) {
        const classroom = await ClassroomModel.findById(id);
        if (!classroom) return { error: 'Classroom not found' };

        if (__token.role !== 'school_admin') {
            return { error: 'Forbidden: Only school admins can update classrooms' };
        }

        if (String(__token.schoolId) !== String(classroom.schoolId)) {
            return { error: 'Forbidden: You can only update classrooms for your assigned school' };
        }

        const validationResult = await this.validators.classroom.updateClassroom({ id, ...updateData });
        if (validationResult) return { error: validationResult };

        const { fnName, moduleName, __token: _t, __device: _d, ...cleanUpdateData } = updateData;

        const updatedClassroom = await ClassroomModel.findByIdAndUpdate(id, cleanUpdateData, { returnDocument: 'after' });

        return { 
            message: 'Classroom updated successfully',
            classroom: updatedClassroom 
        };
    }

    /**
     * Delete a classroom.
     */
    async deleteClassroom({ __token, id }) {
        const classroom = await ClassroomModel.findById(id);
        if (!classroom) return { error: 'Classroom not found' };

        if (__token.role !== 'school_admin') {
            return { error: 'Forbidden: Only school admins can delete classrooms' };
        }

        if (String(__token.schoolId) !== String(classroom.schoolId)) {
            return { error: 'Forbidden: You can only delete classrooms for your assigned school' };
        }

        await ClassroomModel.findByIdAndDelete(id);
        return { message: 'Classroom deleted successfully' };
    }

    /**
     * Add resources to an existing classroom.
     */
    async addResources({ __token, id, resources }) {
        const classroom = await ClassroomModel.findById(id);
        if (!classroom) return { error: 'Classroom not found' };

        if (__token.role !== 'school_admin') {
            return { error: 'Forbidden: Only school admins can add resources' };
        }

        if (String(__token.schoolId) !== String(classroom.schoolId)) {
            return { error: 'Forbidden: You can only add resources to classrooms in your assigned school' };
        }

        const validationResult = await this.validators.classroom.addResources({ id, resources });
        if (validationResult) return { error: validationResult };

        const updatedClassroom = await ClassroomModel.findByIdAndUpdate(
            id,
            { $push: { resources: { $each: resources } } },
            { new: true }
        ).lean();

        const { schoolId, ...rest } = updatedClassroom;
        return { 
            message: 'Resources added successfully',
            classroom: { ...rest, school: schoolId } 
        };
    }

}
