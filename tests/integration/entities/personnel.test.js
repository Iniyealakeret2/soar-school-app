const request = require('supertest');
const { setupTestEnv, teardownTestEnv, cleanDatabase } = require('../testSetup');

describe('Personnel Integration Tests', () => {
    let app, superAdminToken, schoolAdminToken;
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

        // 1. Setup Superadmin
        const superRes = await request(app).post('/api/user/signup').send({
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

        // 2. Create School
        const schoolRes = await request(app).post('/api/school/createSchool')
            .set('token', superAdminToken)
            .send({ name: 'Personnel Test School', address: '123 Personnel St', schoolOwner: 'Owner P', email: 'schoolp@test.com' });
        
        schoolId = schoolRes.body.data.school._id || schoolRes.body.data.school.id;

        // 3. Create School Admin linked to School
        const adminRes = await request(app).post('/api/user/signup').send({
            name: 'School Admin',
            email: 'admin@school.com',
            password: 'password123',
            role: 'school_admin',
            adminKey,
            schoolId
        });
        const adminLogin = await request(app).post('/api/user/login').send({
            email: 'admin@school.com',
            password: 'password123'
        });
        schoolAdminToken = adminLogin.body.data.AccessToken.token;
    });

    /**
     * Create Personnel Tests
     */
    describe('POST /api/personnel/createPersonnel', () => {
        test('Should create a teacher successfully', async () => {
            const res = await request(app).post('/api/personnel/createPersonnel')
                .set('token', schoolAdminToken)
                .send({
                    name: 'John Teacher',
                    email: 'john@teacher.com',
                    password: 'password123',
                    role: 'teacher',
                    department: 'Science',
                    designation: 'Senior Teacher'
                });

            if (res.status !== 200) console.log('Create Teacher Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            expect(res.body.data.personnel._id || res.body.data.personnel.id).toBeDefined();
            expect(res.body.data.personnel.user.name).toBe('John Teacher');
            expect(res.body.data.personnel.user.role).toBe('teacher');
        });

        test('Should create a staff member successfully', async () => {
            const res = await request(app).post('/api/personnel/createPersonnel')
                .set('token', schoolAdminToken)
                .send({
                    name: 'Jane Staff',
                    email: 'jane@staff.com',
                    password: 'password123',
                    role: 'staff',
                    department: 'Admin',
                    designation: 'Clerk'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.personnel.user.role).toBe('staff');
        });

        test('Should fail if role is invalid (e.g., student)', async () => {
            const res = await request(app).post('/api/personnel/createPersonnel')
                .set('token', schoolAdminToken)
                .send({
                    name: 'Invalid Role',
                    email: 'inv@alid.com',
                    password: 'password123',
                    role: 'student', // Invalid for personnel
                });

            if(res.status !== 400 && res.status !== 422) console.log('Invalid Role Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(400); 
            expect(res.body.error || res.body.message).toBe('Invalid role for personnel creation');
        });

        test('Should fail if email already exists', async () => {
            // Create user first
            await request(app).post('/api/personnel/createPersonnel')
                .set('token', schoolAdminToken)
                .send({
                    name: 'Existing User',
                    email: 'exist@test.com',
                    password: 'password123',
                    role: 'teacher',
                });
            
            // Try creating again
            const res = await request(app).post('/api/personnel/createPersonnel')
                .set('token', schoolAdminToken)
                .send({
                    name: 'Duplicate Email',
                    email: 'exist@test.com',
                    password: 'password123',
                    role: 'staff',
                });

            if(res.status !== 409) console.log('Duplicate Email Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(409);
            expect(res.body.error || res.body.message).toBe('Email already registered');
        });

    });

    /**
     * Get Personnel List Tests
     */
    describe('GET /api/personnel/getPersonnelList', () => {
        beforeEach(async () => {
            // Seed multiple personnel with valid lengths
            const r1 = await request(app).post('/api/personnel/createPersonnel').set('token', schoolAdminToken).send({
                name: 'Teacher One', email: 't1@sc.com', password: 'password123', role: 'teacher'
            });
            if(r1.status !== 200) console.log('Seed T1 Failed:', JSON.stringify(r1.body));

            const r2 = await request(app).post('/api/personnel/createPersonnel').set('token', schoolAdminToken).send({
                name: 'Teacher Two', email: 't2@sc.com', password: 'password123', role: 'teacher'
            });
            if(r2.status !== 200) console.log('Seed T2 Failed:', JSON.stringify(r2.body));

            const r3 = await request(app).post('/api/personnel/createPersonnel').set('token', schoolAdminToken).send({
                name: 'Staff One', email: 's1@sc.com', password: 'password123', role: 'staff'
            });
            if(r3.status !== 200) console.log('Seed S1 Failed:', JSON.stringify(r3.body));
        });

        test('Should list all personnel for the school', async () => {
            const res = await request(app).get('/api/personnel/getPersonnelList')
                .set('token', schoolAdminToken);

            if(res.status !== 200) console.log('Get List Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            expect(res.body.data.personnel.length).toBeGreaterThanOrEqual(3);
        });

        test('Should filter personnel by role', async () => {
            const res = await request(app).get('/api/personnel/getPersonnelList')
                .set('token', schoolAdminToken)
                .query({ role: 'staff' });

            if(res.status !== 200) console.log('Filter Role Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            // Verify all returned items have role staff (accessing populated user)
            const staff = res.body.data.personnel;
            expect(staff.length).toBeGreaterThan(0);
            staff.forEach(p => expect(p.userId.role).toBe('staff'));
        });
    });

    /**
     * Update/Delete Tests
     */
    describe('Update & Delete Personnel', () => {
        let personnelId;

        beforeEach(async () => {
            const createRes = await request(app).post('/api/personnel/createPersonnel')
                .set('token', schoolAdminToken)
                .send({
                    name: 'To Update',
                    email: 'update@test.com',
                    password: 'password123',
                    role: 'teacher',
                    department: 'Old Dept'
                });
            if(createRes.status !== 200) console.log('Setup Update Failed:', JSON.stringify(createRes.body));
            personnelId = createRes.body.data.personnel._id || createRes.body.data.personnel.id;
            console.log('Setup Personnel ID:', personnelId);
        });

        test('Should update personnel details', async () => {
            const res = await request(app).patch('/api/personnel/updatePersonnel')
                .set('token', schoolAdminToken)
                .send({
                    id: personnelId,
                    name: 'Updated Name',
                    department: 'New Dept'
                });

            if(res.status !== 200) console.log('Update Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            expect(res.body.data.personnel.department).toBe('New Dept');
            expect(res.body.data.personnel.userId.name).toBe('Updated Name');
        });

        test('Should delete personnel', async () => {
            const res = await request(app).delete('/api/personnel/deletePersonnel')
                .set('token', schoolAdminToken)
                .query({ id: personnelId });

            if(res.status !== 200) console.log('Delete Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('deleted successfully');

            // Verify deletion
            const fetchRes = await request(app).get('/api/personnel/getPersonnel')
                .set('token', schoolAdminToken)
                .query({ id: personnelId });
            
            if(fetchRes.status !== 404) console.log('Verify Delete Failed (Expected 404):', fetchRes.status, JSON.stringify(fetchRes.body));
            expect(fetchRes.status).toBe(404);
        });
    });

});
