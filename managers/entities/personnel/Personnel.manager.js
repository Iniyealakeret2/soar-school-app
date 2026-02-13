const PersonnelModel = require('../../../models/Personnel');
const UserModel = require('../../../models/User');

module.exports = class Personnel { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.shark               = managers.shark;
        this.tokenManager        = managers.token;
        this.httpExposed         = [
            'createPersonnel',
            'getPersonnel',
            'get=getPersonnelList',
            'patch=updatePersonnel',
            'delete=deletePersonnel'
        ];
    }

    /**
     * Create a new personnel member (User account + Profile).
     */
    async createPersonnel({ __token, __isSchoolAdmin, name, email, password, role, employeeId, department, designation }) {

        const validationResult = await this.validators.personnel.createPersonnel({ 
            name, email, password, role, employeeId, department, designation 
        });
        if (validationResult) return { errors: validationResult };

        // Ensure role is valid for personnel (teacher or staff)
        if (!['teacher', 'staff'].includes(role)) {
            return { code: 400, error: 'Invalid role for personnel creation' };
        }

        // Check if user exists
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return { code: 409, error: 'Email already registered' };

        // Check if employeeId exists for this school
        const existingPersonnel = await PersonnelModel.findOne({ schoolId: __token.schoolId, employeeId });
        if (existingPersonnel) return { code: 409, error: 'Employee ID already exists in this school' };

        // 1. Create User
        const hashedPassword = await this.tokenManager.hashPassword(password);
        const user = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            role,
            schoolId: __token.schoolId
        });

        // 2. Create Personnel Profile
        const personnel = await PersonnelModel.create({
            userId: user._id,
            schoolId: __token.schoolId,
            employeeId,
            department,
            designation
        });

        return { 
            message: 'Personnel created successfully',
            personnel: {
                ...personnel.toObject(),
                user: {
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        };
    }

    /**
     * Get list of personnel in the school.
     */
    async getPersonnelList({ __token, page = 1, limit = 10, role }) {
        if (__token.role !== 'school_admin' && __token.role !== 'superadmin') {
            return { code: 403, error: 'Forbidden' };
        }

        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
        const skip = (pageInt - 1) * limitInt;

        let query = {};
        if (__token.role === 'school_admin') {
            query.schoolId = __token.schoolId;
        }

        const total = await PersonnelModel.countDocuments(query);
        const personnelList = await PersonnelModel.find(query)
            .populate('userId', 'name email role')
            .skip(skip)
            .limit(limitInt)
            .lean();

        // Optional filter by role (since role is in User model)
        let filteredList = personnelList;
        if (role) {
            filteredList = personnelList.filter(p => p.userId.role === role);
        }

        return { 
            personnel: filteredList,
            meta: {
                total,
                page: pageInt,
                limit: limitInt,
                pages: Math.ceil(total / limitInt)
            }
        };
    }

    /**
     * Get specific personnel profile.
     */
    async getPersonnel({ __token, id }) {
        const personnel = await PersonnelModel.findById(id).populate('userId', 'name email role').lean();
        if (!personnel) return { code: 404, error: 'Personnel not found' };

        if (__token.role === 'school_admin' && String(personnel.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        return { personnel };
    }

    /**
     * Update personnel profile.
     */
    async updatePersonnel({ __token, __isSchoolAdmin, id, ...updateData }) {

        const personnel = await PersonnelModel.findById(id);
        if (!personnel) return { code: 404, error: 'Personnel not found' };

        if (String(personnel.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        const validationResult = await this.validators.personnel.updatePersonnel({ id, ...updateData });
        if (validationResult) return { errors: validationResult };

        const { fnName, moduleName, __token: _t, __device: _d, name, ...cleanUpdateData } = updateData;

        // If name is provided, update the User model
        if (name) {
            await UserModel.findByIdAndUpdate(personnel.userId, { name });
        }

        const updatedPersonnel = await PersonnelModel.findByIdAndUpdate(id, cleanUpdateData, { new: true })
            .populate('userId', 'name email role')
            .lean();

        return { 
            message: 'Personnel updated successfully',
            personnel: updatedPersonnel 
        };
    }

    /**
     * Delete personnel record and their user account.
     */
    async deletePersonnel({ __token, __isSchoolAdmin, id }) {
        const personnel = await PersonnelModel.findById(id);
        if (!personnel) return { code: 404, error: 'Personnel not found' };

        if (String(personnel.schoolId) !== String(__token.schoolId)) {
            return { code: 403, error: 'Forbidden' };
        }

        // Delete both Profile and User account
        await UserModel.findByIdAndDelete(personnel.userId);
        await PersonnelModel.findByIdAndDelete(id);

        return { message: 'Personnel record and associated account deleted successfully' };
    }

}
