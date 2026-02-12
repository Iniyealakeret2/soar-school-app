const UserModel = require('../../../models/User');
const SchoolModel = require('../../../models/School');

module.exports = class User { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.tokenManager        = managers.token;
        this.shark               = managers.shark;
        this.usersCollection     = "users";
        this.httpExposed         = ['createUser', 'signup', 'login', 'createAdmin', 'get=getSchoolAdmins', 'delete=deleteAdmin'];
    }

    /**
     * Lists all school admins (Superadmin only).
     */
    async getSchoolAdmins({ __token, page = 1, limit = 10 }) {
        page = parseInt(page);
        limit = parseInt(limit);
        if (__token.role !== 'superadmin') {
            return { error: 'Forbidden: Only superadmins can list school admins' };
        }

        const query = { role: 'school_admin' };
        const skip = (page - 1) * limit;
        const total = await UserModel.countDocuments(query);
        const admins = await UserModel.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit));

        return { 
            admins,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Deletes an admin and reassigns the school to the superadmin.
     */
    async deleteAdmin({ __token, id }) {
        if (__token.role !== 'superadmin') {
            return { error: 'Forbidden: Only superadmins can delete admins' };
        }

        const userToDelete = await UserModel.findById(id);
        if (!userToDelete) return { error: 'Admin not found' };

        // If it's a school admin, reassign the school back to the superadmin
        if (userToDelete.role === 'school_admin' && userToDelete.schoolId) {
            await SchoolModel.findByIdAndUpdate(userToDelete.schoolId, { 
                schoolAdmin: __token.userId 
            });
        }

        await UserModel.findByIdAndDelete(id);

        return { message: 'Admin deleted successfully and school reassigned to superadmin' };
    }

    async createUser({username, email, password}){
        const user = {username, email, password};

        // Data validation
        let result = await this.validators.user.createUser(user);
        if(result) return result;
        
        // Creation Logic
        let createdUser     = {username, email, password}
        let longToken       = this.tokenManager.genLongToken({userId: createdUser._id, userKey: createdUser.key });
        
        // Response
        return {
            user: createdUser, 
            longToken 
        };
    }

    /**
     * Registers a new user.
     * Restricted via ADMIN_SIGNUP_KEY for security.
     * Note: Verification is handled via the admin key.
     */
    async signup({ name, email, password, role, schoolId, adminKey }) {
        // Use the built-in validator
        const validationResult = await this.validators.user.signup({ name, email, password, role, schoolId, adminKey });
        if (validationResult) return { error: validationResult };

        // Security Check: MANDATORY API KEY for all signups
        const requiredKey = this.config.dotEnv.ADMIN_SIGNUP_KEY;
        if (adminKey !== requiredKey) {
            return { error: 'Unauthorized: Invalid admin registration key' };
        }

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return { error: 'User already exists' };

        const hashedPassword = await this.tokenManager.hashPassword(password);

        const newUser = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            role,
            schoolId: role === 'school_admin' ? schoolId : undefined,
            isVerified: true // Auto-verified via adminKey
        });

        return { 
            message: 'User created successfully.',
            userId: newUser._id 
        };
    }

    /**
     * Allows a Superadmin to create other admins directly.
     * This skips the public signup process and adminKey check.
     */
    async createAdmin({ __token, name, email, password, role, schoolId }) {
        // Permission check: Only Superadmins can use this method
        if (__token.role !== 'superadmin') {
            return { error: 'Forbidden: Only superadmins can create admins' };
        }

        const validationResult = await this.validators.user.createAdmin({ name, email, password, role, schoolId });
        if (validationResult) return { error: validationResult };

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return { error: 'User with this email already exists' };

        const hashedPassword = await this.tokenManager.hashPassword(password);
        
        const newUser = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            role,
            schoolId: role === 'school_admin' ? schoolId : undefined,
            isVerified: true 
        });

        // If it's a school admin, link it to the school
        if (role === 'school_admin' && schoolId) {
            await SchoolModel.findByIdAndUpdate(schoolId, { schoolAdmin: newUser._id });
        }

        return { 
            message: `${role} created successfully`,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                schoolId: newUser.schoolId
            }
        };
    }

    /**
     * Authenticates a user and issues a long-lived JWT token.
     */
    async login({ email, password }) {
        const validationResult = await this.validators.user.login({ email, password });
        if (validationResult) return { error: validationResult };

        const user = await UserModel.findOne({ email });
        if (!user) return { error: 'Invalid credentials' };
        
        const isMatch = await this.tokenManager.comparePassword(password, user.password);
        if (!isMatch) return { error: 'Invalid credentials' };


        // Generate tokens
        const longToken = this.tokenManager.genLongToken({ 
            userId: user._id, 
            userKey: user.email,
            role: user.role,
            schoolId: user.schoolId
        });
        
        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                schoolId: user.schoolId
            },
            longToken
        };
    }

}
