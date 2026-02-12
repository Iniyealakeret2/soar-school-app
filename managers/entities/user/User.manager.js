const mailer = require('../../../libs/mailer');
const UserModel = require('../../../models/User');

module.exports = class User { 

    constructor({utils, cache, config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.tokenManager        = managers.token;
        this.usersCollection     = "users";
        this.httpExposed         = ['createUser', 'signup', 'login', 'verifyOtp'];
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
     * Registers a new user and generates an OTP for verification.
     */
    async signup({ name, email, password, role, schoolId, adminKey }) {
        // Use the built-in validator
        const validationResult = await this.validators.user.signup({ name, email, password, role, schoolId, adminKey });
        if (validationResult) return { error: validationResult };

        // Security Check: Only allow privileged roles if the correct secret key is provided
        const requiredKey = this.config.dotEnv.ADMIN_SIGNUP_KEY;
        if ((role === 'superadmin' || role === 'school_admin') && adminKey !== requiredKey) {
            return { error: 'Unauthorized: Invalid admin registration key' };
        }

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return { error: 'User already exists' };

        const hashedPassword = await this.tokenManager.hashPassword(password);
        const { code: otpCode, expiresAt: otpExpiresAt } = this.tokenManager.generateOtp();

        const newUser = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            role,
            schoolId: role === 'school_admin' ? schoolId : undefined,
            otp: { code: otpCode, expiresAt: otpExpiresAt }
        });

        // Send OTP via Mock Mailer
        await mailer.sendOtp(email, otpCode);

        return { 
            message: 'User created successfully. An OTP has been sent to your email for verification.',
            userId: newUser._id 
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
        if (!user.isVerified) return { error: 'Please verify your account first' };

        const isMatch = await this.tokenManager.comparePassword(password, user.password);
        if (!isMatch) return { error: 'Invalid credentials' };


        // Generate tokens
        const longToken = this.tokenManager.genLongToken({ userId: user._id, userKey: user.email });
        
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

    /**
     * Verifies the user's account using a numeric OTP code.
     */
    async verifyOtp({ email, code }) {
        const validationResult = await this.validators.user.verifyOtp({ email, code });
        if (validationResult) return { error: validationResult };

        const user = await UserModel.findOne({ email });
        if (!user) return { error: 'User not found' };

        const updatedUser = await UserModel.findOneAndUpdate(
            { 
                email, 
                'otp.code': code, 
                'otp.expiresAt': { $gt: new Date() } 
            },
            { $set: { isVerified: true }, $unset: { otp: 1 } },
            { new: true }
        );

        if (!updatedUser) return { error: 'Invalid or expired OTP' };


        return { message: 'Account verified successfully' };
    }

}
