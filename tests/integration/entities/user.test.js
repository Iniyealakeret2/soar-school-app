const request = require('supertest');
const { setupTestEnv, teardownTestEnv, cleanDatabase } = require('../testSetup');

describe('User Integration Tests', () => {
    let app;
    let superAdminToken, schoolAdminToken;
    let schoolId;

    const adminKey = 'soar_secure_key';

    beforeAll(async () => {
        const env = await setupTestEnv();
        app = env.app;
    });

    afterAll(async () => {
        await teardownTestEnv();
    });

    beforeEach(async () => {
        await cleanDatabase();

        // Setup generic test data
        // Create Superadmin
        await request(app).post('/api/user/signup').send({
            name: 'Super Admin',
            email: 'super@test.com',
            password: 'password123',
            role: 'superadmin',
            adminKey
        });

        const superLogin = await request(app).post('/api/user/login').send({
            email: 'super@test.com',
            password: 'password123'
        });
        superAdminToken = superLogin.body.data.AccessToken.token;

        // Create generic School for School Admin tests
        const schoolRes = await request(app).post('/api/school/createSchool')
            .set('token', superAdminToken)
            .send({ name: 'Generic School', address: '123 Fake St', schoolOwner: 'Super Owner' });
        
        if (schoolRes.status !== 200) console.log('Setup School Failed:', JSON.stringify(schoolRes.body, null, 2));
        console.log('School Created:', JSON.stringify(schoolRes.body, null, 2));
        schoolId = schoolRes.body.data.school._id || schoolRes.body.data.school.id;
    });

    /**
     * Signup Tests
     */
    describe('POST /api/user/signup', () => {
        test('Should sign up a new user successfully with valid adminKey', async () => {
            const res = await request(app).post('/api/user/signup').send({
                name: 'New School Admin',
                email: 'admin@school.com',
                password: 'password123',
                role: 'school_admin',
                adminKey,
                schoolId
            });
            if (res.status !== 200) console.log('Signup Valid Key Failed:', JSON.stringify(res.body, null, 2));

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.userId).toBeDefined();
        });

        test('Should fail signup with invalid adminKey', async () => {
            const res = await request(app).post('/api/user/signup').send({
                name: 'Hacker',
                email: 'hacker@school.com',
                password: 'password123',
                role: 'school_admin',
                adminKey: 'wrong_key'
            });
            if (res.status !== 401) console.log('Signup Invalid Key Wrong Status:', res.status, JSON.stringify(res.body, null, 2));
            if (!res.body.error && !res.body.message) console.log('Signup Invalid Key Body:', JSON.stringify(res.body, null, 2));

            expect(res.status).toBe(401);
            expect(res.body.error || res.body.message).toBe('Unauthorized: Invalid admin registration key');
        });

        test('Should fail signup if email already exists', async () => {
            await request(app).post('/api/user/signup').send({
                name: 'User 1',
                email: 'user1@test.com',
                password: 'password123',
                role: 'teacher',
                adminKey
            });

            const res = await request(app).post('/api/user/signup').send({
                name: 'User 2',
                email: 'user1@test.com', // Duplicate email
                password: 'password123',
                role: 'teacher',
                adminKey
            });
            if (res.status !== 409) console.log('Signup Duplicate Status:', res.status, JSON.stringify(res.body, null, 2));
            if (!res.body.error && !res.body.message) console.log('Signup Duplicate Body:', JSON.stringify(res.body, null, 2));

            expect(res.status).toBe(409);
            expect(res.body.error || res.body.message).toBe('User already exists');
        });
    });

    /**
     * Login Tests
     */
    describe('POST /api/user/login', () => {
        beforeEach(async () => {
            await request(app).post('/api/user/signup').send({
                name: 'Login User',
                email: 'login@test.com',
                password: 'password123',
                role: 'teacher',
                adminKey
            });
        });

        test('Should login successfully with correct credentials', async () => {
            const res = await request(app).post('/api/user/login').send({
                email: 'login@test.com',
                password: 'password123'
            });
            if (res.status !== 200) console.log('Login Valid Failed:', JSON.stringify(res.body, null, 2));

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.AccessToken).toBeDefined();
        });

        test('Should fail login with incorrect password', async () => {
            const res = await request(app).post('/api/user/login').send({
                email: 'login@test.com',
                password: 'wrongpassword'
            });
            if (res.status !== 401) console.log('Login Invalid Password Status:', res.status, JSON.stringify(res.body, null, 2));

            expect(res.status).toBe(401);
            expect(res.body.error || res.body.message).toBe('Invalid credentials');
        });
    });

    /**
     * Superadmin Only Tests
     */
    describe('Superadmin Features', () => {
        test('Superadmin should be able to create another admin directly', async () => {
            const res = await request(app).post('/api/user/createAdmin').set('token', superAdminToken).send({
                name: 'Direct Admin',
                email: 'direct@admin.com',
                password: 'password123',
                role: 'school_admin',
                schoolId
            });
            if (res.status !== 200) console.log('Create Admin Failed:', JSON.stringify(res.body, null, 2));

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.user.email).toBe('direct@admin.com');
        });

        test('Superadmin should fetch school admins list', async () => {
            // Create a few admins
            const r1 = await request(app).post('/api/user/signup').send({ name: 'Admin 1', email: 'a1@t.com', password: 'password123', role: 'school_admin', adminKey, schoolId });
            if(r1.status !== 200) console.log('Create Admin 1 Failed:', JSON.stringify(r1.body));
            
            const r2 = await request(app).post('/api/user/signup').send({ name: 'Admin 2', email: 'a2@t.com', password: 'password123', role: 'school_admin', adminKey, schoolId });
            if(r2.status !== 200) console.log('Create Admin 2 Failed:', JSON.stringify(r2.body));

            const res = await request(app).get('/api/user/getSchoolAdmins').set('token', superAdminToken);
            if (res.status !== 200) console.log('Get Admins Failed:', JSON.stringify(res.body, null, 2));
            console.log('Get Admins Data:', JSON.stringify(res.body.data, null, 2));

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.admins.length).toBeGreaterThanOrEqual(2);
        });
    });

    /**
     * Change Password Tests
     */
    describe('POST /api/user/changePassword', () => {
        test('Should change password successfully', async () => {
            const res = await request(app).post('/api/user/changePassword').set('token', superAdminToken).send({
                oldPassword: 'password123',
                newPassword: 'newpassword456'
            });
            if (res.status !== 200) console.log('Change Password Failed:', JSON.stringify(res.body, null, 2));

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Password updated successfully');

            // Verify login with new password
            const loginRes = await request(app).post('/api/user/login').send({
                email: 'super@test.com',
                password: 'newpassword456'
            });
            if (loginRes.status !== 200) console.log('Login New Password Failed:', JSON.stringify(loginRes.body, null, 2));
            expect(loginRes.status).toBe(200);
        });

        test('Should fail if current password is incorrect', async () => {
            const res = await request(app).post('/api/user/changePassword').set('token', superAdminToken).send({
                oldPassword: 'wrongpassword',
                newPassword: 'newpassword456'
            });
            expect(res.status).toBe(401);
            expect(res.body.error || res.body.message).toBe('Incorrect current password');
        });
    });

    /**
     * Admin Management Tests
     */
    describe('Admin Management (Delete/Update)', () => {
        let adminId;

        beforeEach(async () => {
            const res = await request(app).post('/api/user/createAdmin').set('token', superAdminToken).send({
                name: 'Delete Me',
                email: 'delete@admin.com',
                password: 'password123',
                role: 'school_admin',
                schoolId
            });
            adminId = res.body.data.user.id;
        });

        test('Superadmin should be able to delete an admin and reassign school', async () => {
            const res = await request(app).delete('/api/user/deleteAdmin')
                .set('token', superAdminToken)
                .query({ id: adminId });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('deleted successfully');
            expect(res.body.message).toContain('reassigned');

            // Verify school admin changed back to superadmin
            const schoolRes = await request(app).get('/api/school/getSchool').set('token', superAdminToken).query({ id: schoolId });
            
            expect(schoolRes.status).toBe(200);
            
            // Get superadmin ID
            const superLogin = await request(app).post('/api/user/login').send({
                email: 'super@test.com',
                password: 'password123'
            });
            const superId = superLogin.body.data.user.id;
            
            expect(String(schoolRes.body.data.school.schoolAdmin._id || schoolRes.body.data.school.schoolAdmin)).toBe(String(superId));
        });

        test('Non-superadmin should not be able to delete an admin', async () => {
            // Create a regular admin token
            await request(app).post('/api/user/signup').send({
                name: 'Regular Admin', email: 'reg@admin.com', password: 'password123', role: 'school_admin', adminKey, schoolId
            });
            const adminLogin = await request(app).post('/api/user/login').send({
                email: 'reg@admin.com', password: 'password123'
            });
            const regToken = adminLogin.body.data.AccessToken.token;

            const res = await request(app).delete('/api/user/deleteAdmin')
                .set('token', regToken)
                .query({ id: adminId });

            // Since deleteAdmin requires __isSuperadmin, it should fail for school admin
            expect(res.status).not.toBe(200);
        });
    });

    /**
     * Validation & Edge Cases
     */
    describe('Validation & Edge Cases', () => {
        test('Should fail login with non-existent email', async () => {
            const res = await request(app).post('/api/user/login').send({
                email: 'nobody@test.com',
                password: 'password123'
            });
            expect(res.status).toBe(401);
            expect(res.body.error || res.body.message).toContain('credentials');
        });

        test('Should fail signup with missing required fields', async () => {
            const res = await request(app).post('/api/user/signup').send({
                name: 'Missing Fields',
                // email missing
                password: 'password123',
                role: 'teacher',
                adminKey
            });
            // If validation errors are returned, status is usually 400
            expect(res.status).toBe(400); 
            expect(res.body.errors || res.body.error || res.body.message).toBeDefined();
        });
    });
});
