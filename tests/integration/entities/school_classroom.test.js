const request = require('supertest');
const { setupTestEnv, teardownTestEnv, cleanDatabase } = require('../testSetup');

describe('School & Classroom Integration Tests', () => {
    let app, superAdminToken, schoolAdminToken;
    let schoolId, classroomId;
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

        // 2. Setup School
        const schoolRes = await request(app).post('/api/school/createSchool').set('token', superAdminToken).send({
            name: 'Test School',
            address: '123 Test Lane',
            schoolOwner: 'Test Owner',
            email: 'school@test.com'
        });
        if(schoolRes.status !== 200) console.log('Create School Setup Failed:', JSON.stringify(schoolRes.body));
        schoolId = schoolRes.body.data.school._id || schoolRes.body.data.school.id;

        // 3. Setup School Admin linked to School
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
     * School Tests
     */
    describe('School Management', () => {
        test('Superadmin should update a school', async () => {
            const res = await request(app).patch(`/api/school/updateSchool`) // Assuming update uses ID in body or query? Manager says { id, ...updateData }
                .set('token', superAdminToken)
                .query({ id: schoolId }) // Assuming query for key/id extraction if not in body?
                .send({
                    id: schoolId,
                    name: 'Updated School Name'
                });
            
            if(res.status !== 200) console.log('Update School Failed:', JSON.stringify(res.body));
            
            expect(res.status).toBe(200);
            expect(res.body.data.school.name).toBe('Updated School Name');
        });

        test('School Admin should view their own school', async () => {
            const res = await request(app).get('/api/school/getSchool')
                .set('token', schoolAdminToken)
                .query({ id: schoolId });

            if(res.status !== 200) console.log('Get School Failed 500:', JSON.stringify(res.body));
            expect(res.status).toBe(200);
            expect(res.body.data.school.name).toBe('Test School');
        });

        test('Superadmin should delete a school', async () => {
            const res = await request(app).delete('/api/school/deleteSchool')
                .set('token', superAdminToken)
                .query({ id: schoolId });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('School deleted successfully');
        });
    });

    /**
     * Classroom Tests
     */
    describe('Classroom Management', () => {
        test('School Admin should create a classroom', async () => {
            const res = await request(app).post('/api/classroom/createClassroom')
                .set('token', schoolAdminToken)
                .query({ id: schoolId }) // Assuming middleware extracts schoolId from query if not in token? Or just token?
                // Wait, createClassroom in Schedule Tests used: .query({ id: schoolId })
                .send({
                    name: 'Class 1A',
                    capacity: 30 // Sending as number
                });

            if(res.status !== 200) console.log('Create Classroom Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            classroomId = res.body.data.classroom._id || res.body.data.classroom.id;
        });

        test('School Admin should list classrooms', async () => {
            // Create one first
            await request(app).post('/api/classroom/createClassroom')
                .set('token', schoolAdminToken)
                .query({ id: schoolId })
                .send({ name: 'Class 1B', capacity: 25 });

            const res = await request(app).get('/api/classroom/getClassrooms')
                .set('token', schoolAdminToken)
                .query({ schoolId }); 

            if(res.status !== 200) console.log('Get Classrooms Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            expect(res.body.data.classrooms.length).toBeGreaterThan(0);
        });

        test('Should update classroom', async () => {
             // Create one first
             const createRes = await request(app).post('/api/classroom/createClassroom')
                .set('token', schoolAdminToken)
                .query({ id: schoolId })
                .send({ name: 'Class To Update', capacity: 20 });
            
            const cId = createRes.body.data.classroom._id || createRes.body.data.classroom.id;

            const res = await request(app).patch('/api/classroom/updateClassroom')
                .set('token', schoolAdminToken)
                .send({
                    id: cId,
                    name: 'Updated Class Name'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.classroom.name).toBe('Updated Class Name');
        });

        test('Should delete classroom', async () => {
            // Create one first
            const createRes = await request(app).post('/api/classroom/createClassroom')
               .set('token', schoolAdminToken)
               .query({ id: schoolId })
               .send({ name: 'Class To Delete', capacity: 20 });
           
           const cId = createRes.body.data.classroom._id || createRes.body.data.classroom.id;

           const res = await request(app).delete('/api/classroom/deleteClassroom')
               .set('token', schoolAdminToken)
               .query({ id: cId });

           expect(res.status).toBe(200);
           expect(res.body.message).toBe('Classroom deleted successfully');
       });
    });
});
