const request = require('supertest');
const { setupTestEnv, teardownTestEnv, cleanDatabase } = require('../testSetup');

describe('Student and Attendance Integration', () => {
    let app, superToken, schoolAdminToken, teacherToken, schoolId, classroomId, studentId;

    beforeAll(async () => {
        const env = await setupTestEnv();
        app = env.app;
    });

    afterAll(async () => {
        await teardownTestEnv();
    });

    beforeEach(async () => {
        await cleanDatabase();
        const adminKey = 'soar_secure_key';
        const password = 'password123';

        // 1. Setup Superadmin
        await request(app).post('/api/user/signup').send({ name: 'Super Admin', email: 'super@test.com', password, role: 'superadmin', adminKey });
        const sLogin = await request(app).post('/api/user/login').send({ email: 'super@test.com', password });
        superToken = sLogin.body.data.AccessToken.token;

        // 2. Setup School & Admin
        const schoolRes = await request(app).post('/api/school/createSchool').set('token', superToken).send({ name: 'Generic School', address: '123 Fake Street', schoolOwner: 'School Owner' });
        schoolId = schoolRes.body.data.school._id || schoolRes.body.data.school.id;

        await request(app).post('/api/user/signup').send({ name: 'School Admin', email: 'admin@school.com', password, role: 'school_admin', schoolId, adminKey });
        const aLogin = await request(app).post('/api/user/login').send({ email: 'admin@school.com', password });
        schoolAdminToken = aLogin.body.data.AccessToken.token;

        // 3. Setup Classroom
        const classRes = await request(app).post('/api/classroom/createClassroom').set('token', schoolAdminToken).query({ id: schoolId }).send({ name: 'Classroom One', capacity: 30 });
        classroomId = classRes.body.data.classroom._id || classRes.body.data.classroom.id;

        // 4. Setup Teacher
        await request(app).post('/api/user/signup').send({ name: 'Main Teacher', email: 'teacher@school.com', password, role: 'teacher', schoolId, adminKey });
        const tLogin = await request(app).post('/api/user/login').send({ email: 'teacher@school.com', password });
        teacherToken = tLogin.body.data.AccessToken.token;
    });

    test('Should enroll a student', async () => {
        const response = await request(app)
            .post('/api/student/createStudent')
            .set('token', schoolAdminToken)
            .send({
                name: 'Jane Doe',
                dateOfBirth: '2010-01-01',
                gender: 'female',
                schoolId: schoolId,
                classroomId: classroomId,
                parentContact: { name: 'Parent', phone: '+1234567890' }
            });

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        studentId = response.body.data.student._id || response.body.data.student.id;
    });

    test('Teacher should mark attendance', async () => {
        // Enroll student first
        const stuRes = await request(app).post('/api/student/createStudent').set('token', schoolAdminToken).send({
            name: 'Jane Doe', dateOfBirth: '2010-01-01', gender: 'female', schoolId, classroomId, parentContact: { name: 'P', phone: '1234567890123' }
        });
        const sId = stuRes.body.data.student._id || stuRes.body.data.student.id;

        const response = await request(app)
            .post('/api/attendance/markAttendance')
            .set('token', teacherToken)
            .send({
                studentId: sId,
                classroomId: classroomId,
                date: new Date().toISOString(),
                status: 'present',
                remarks: 'On time'
            });

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
    });

    test('Should get attendance report with pagination', async () => {
        const response = await request(app)
            .get('/api/attendance/getAttendanceReport')
            .set('token', schoolAdminToken)
            .query({ classroomId, page: 1, limit: 5 });

        expect(response.status).toBe(200);
        expect(response.body.data.meta).toBeDefined();
    });
});
