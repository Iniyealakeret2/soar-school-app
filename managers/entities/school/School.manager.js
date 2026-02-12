const SchoolModel = require('../../../models/School');

module.exports = class School { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.shark               = managers.shark;
        this.httpExposed         = [
            'createSchool', 
            'get=getSchools', 
            'get=getSchool', 
            'patch=updateSchool', 
            'delete=deleteSchool'
        ];
    }

    /**
     * Create a new school (Superadmin only)
     */
    async createSchool({ __token, name, address, schoolOwner, phoneNumber, email }) {
        // Permission check using SharkFin
        const isGranted = await this.shark.isGranted({
            layer: 'school',
            variant: 'superadmin',
            userId: __token.userId,
            action: 'create'
        });

        if (!isGranted) {
            return { error: 'Forbidden: Only superadmins can create schools' };
        }

        const validationResult = await this.validators.school.createSchool({ name, address, schoolOwner, phoneNumber, email });
        if (validationResult) return { error: validationResult };

        const existingSchool = await SchoolModel.findOne({ name });
        if (existingSchool) return { error: 'School with this name already exists' };

        const newSchool = await SchoolModel.create({
            name,
            address,
            schoolOwner,
            phoneNumber,
            email,
            schoolAdmin: __token.userId,
            createdBy: __token.userId
        });

        return { 
            message: 'School created successfully',
            school: newSchool 
        };
    }

    /**
     * List schools (Superadmin: all, SchoolAdmin: only connected school)
     */
    async getSchools({ __token, page = 1, limit = 10 }) {
        page = parseInt(page);
        limit = parseInt(limit);
        const isSuperAdmin = await this.shark.isGranted({
            layer: 'school',
            variant: 'superadmin',
            userId: __token.userId,
            action: 'read'
        });

        const isSchoolAdmin = await this.shark.isGranted({
            layer: 'school',
            variant: 'school_admin',
            userId: __token.userId,
            action: 'read'
        });

        if (!isSuperAdmin && !isSchoolAdmin) {
            return { error: 'Forbidden' };
        }

        let query = {};
        if (!isSuperAdmin && isSchoolAdmin) {
            // A school admin can view only the school they are connected to
            if (!__token.schoolId) return { error: 'Unauthorized: No school associated with this account' };
            query = { _id: __token.schoolId };
        }

        const skip = (page - 1) * limit;
        const total = await SchoolModel.countDocuments(query);
        const schools = await SchoolModel.find(query)
            .populate('schoolAdmin', 'name email role')
            .populate('createdBy', 'name email')
            .skip(skip)
            .limit(parseInt(limit));

        return { 
            schools,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get a specific school
     */
    async getSchool({ __token, id }) {
        const school = await SchoolModel.findById(id)
            .populate('schoolAdmin', 'name email role')
            .populate('createdBy', 'name email');
        if (!school) return { error: 'School not found' };

        const isSuperAdmin = await this.shark.isGranted({
            layer: 'school',
            variant: 'superadmin',
            userId: __token.userId,
            action: 'read'
        });

        // School Admin can only view their own school
        const isAuthorized = isSuperAdmin || (__token.role === 'school_admin' && __token.schoolId === id);

        if (!isAuthorized) {
            return { error: 'Forbidden: You do not have permission to view this school' };
        }

        return { school };
    }

    /**
     * Update school (Superadmin only)
     */
    async updateSchool({ __token, id, ...updateData }) {
        const isGranted = await this.shark.isGranted({
            layer: 'school',
            variant: 'superadmin',
            userId: __token.userId,
            action: 'config' // Using config as audit/update equivalent in static_arch
        });

        if (!isGranted) {
            return { error: 'Forbidden: Only superadmins can update schools' };
        }

        const validationResult = await this.validators.school.updateSchool({ id, ...updateData });
        if (validationResult) return { error: validationResult };

        // Sanitize updateData to remove internal system keys
        const { fnName, moduleName, __token: _t, __device: _d, ...cleanUpdateData } = updateData;

        const updatedSchool = await SchoolModel.findByIdAndUpdate(id, cleanUpdateData, { returnDocument: 'after' });
        if (!updatedSchool) return { error: 'School not found' };

        return { 
            message: 'School updated successfully',
            school: updatedSchool 
        };
    }

    /**
     * Delete school (Superadmin only)
     */
    async deleteSchool({ __token, id }) {
        const isGranted = await this.shark.isGranted({
            layer: 'school',
            variant: 'superadmin',
            userId: __token.userId,
            action: 'config' // config rank (5) is higher than create (3)
        });

        if (!isGranted) {
            return { error: 'Forbidden: Only superadmins can delete schools' };
        }

        const validationResult = await this.validators.school.deleteSchool({ id });
        if (validationResult) return { error: validationResult };

        const deletedSchool = await SchoolModel.findByIdAndDelete(id);
        if (!deletedSchool) return { error: 'School not found' };

        return { message: 'School deleted successfully' };
    }

}
