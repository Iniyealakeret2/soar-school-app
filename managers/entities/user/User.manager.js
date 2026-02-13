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
        this.httpExposed         = ['createUser', 'signup', 'login', 'createAdmin', 'get=getSchoolAdmins', 'delete=deleteAdmin', 'post=changePassword'];
    }

    /**
     * Lists all school admins (Superadmin only).
     */
    async getSchoolAdmins({ __token, __isSuperadmin, page = 1, limit = 10 }) {
        page = parseInt(page);
        limit = parseInt(limit);

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
    async deleteAdmin({ __token, __isSuperadmin, id }) {

        const userToDelete = await UserModel.findById(id);
        if (!userToDelete) return { code: 404, error: 'Admin not found' };

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
        if(result) return { errors: result };
        
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
    async signup({ __securityLimit, name, email, password, role, schoolId, adminKey }) {
        // Use the built-in validator
        const validationResult = await this.validators.user.signup({ name, email, password, role, schoolId, adminKey });
        if (validationResult) return { errors: validationResult };

        // Security Check: MANDATORY API KEY for all signups
        const requiredKey = this.config.dotEnv.ADMIN_SIGNUP_KEY;
        if (adminKey !== requiredKey) {
            return { code: 401, error: 'Unauthorized: Invalid admin registration key' };
        }

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return { code: 409, error: 'User already exists' };

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
    async createAdmin({ __token, __isSuperadmin, name, email, password, role, schoolId }) {

        const validationResult = await this.validators.user.createAdmin({ name, email, password, role, schoolId });
        if (validationResult) return { errors: validationResult };

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return { code: 409, error: 'User with this email already exists' };

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
    async login({ __securityLimit, email, password, __device }) {
        const validationResult = await this.validators.user.login({ email, password });
        if (validationResult) return { errors: validationResult };

        const user = await UserModel.findOne({ email });
        if (!user) return { code: 401, error: 'Invalid credentials' };
        
        const isMatch = await this.tokenManager.comparePassword(password, user.password);
        if (!isMatch) return { code: 401, error: 'Invalid credentials' };

        // Generate long token
        const longToken = this.tokenManager.genLongToken({ 
            userId: user._id, 
            userKey: user.email,
            role: user.role,
            schoolId: user.schoolId
        });

        // Immediately generate access token
        const { accessToken } = this.tokenManager.v1_createShortToken({ 
            __longToken: {
                userId: user._id,
                userKey: user.email,
                role: user.role,
                schoolId: user.schoolId
            },
            __device: __device || 'unknown_device'
        });
        
        return {
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                schoolId: user.schoolId
            },
            RefreshToken: longToken,
            AccessToken: accessToken
        };
    }

    /**
     * Change user's own password.
     */
    async changePassword({ __token, oldPassword, newPassword }) {
        const validationResult = await this.validators.user.changePassword({ oldPassword, newPassword });
        if (validationResult) return { errors: validationResult };

        const user = await UserModel.findById(__token.userId);
        if (!user) return { code: 404, error: 'User not found' };

        const isMatch = await this.tokenManager.comparePassword(oldPassword, user.password);
        if (!isMatch) return { code: 401, error: 'Incorrect current password' };

        const hashedNewPassword = await this.tokenManager.hashPassword(newPassword);
        user.password = hashedNewPassword;
        await user.save();

        return { message: 'Password updated successfully' };
    }

}
