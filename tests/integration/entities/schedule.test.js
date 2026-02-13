const request = require('supertest');
const { setupTestEnv, teardownTestEnv, cleanDatabase } = require('../testSetup');

describe('Schedule Integration Tests', () => {
    let app, superAdminToken, schoolAdminToken, teacherToken;
    let schoolId, classroomId, teacherId;
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
        await request(app).post('/api/user/signup').send({
            name: 'Super Admin', email: 'super@test.com', password: 'password123', role: 'superadmin', adminKey
        });
        const superLogin = await request(app).post('/api/user/login').send({
            email: 'super@test.com', password: 'password123'
        });
        superAdminToken = superLogin.body.data.AccessToken.token;

        // 2. Create School
        const schoolRes = await request(app).post('/api/school/createSchool')
            .set('token', superAdminToken)
            .send({ name: 'Schedule Test School', address: '123 Schedule Ave', schoolOwner: 'Owner S', email: 'schools@test.com' });
        schoolId = schoolRes.body.data.school._id || schoolRes.body.data.school.id;

        // 3. Create School Admin
        await request(app).post('/api/user/signup').send({
            name: 'School Admin', email: 'admin@school.com', password: 'password123', role: 'school_admin', adminKey, schoolId
        });
        const adminLogin = await request(app).post('/api/user/login').send({
            email: 'admin@school.com', password: 'password123'
        });
        schoolAdminToken = adminLogin.body.data.AccessToken.token;

        // 4. Create Classroom
        const classRes = await request(app).post('/api/classroom/createClassroom')
            .set('token', schoolAdminToken)
            .query({ id: schoolId })
            .send({ name: 'Class Room 1', capacity: 30 });
        classroomId = classRes.body.data.classroom._id || classRes.body.data.classroom.id;

        // 5. Create Teacher (via personnel route for realism, or signup)
        const teacherSignup = await request(app).post('/api/user/signup').send({
            name: 'Math Teacher', email: 'teacher@school.com', password: 'password123', role: 'teacher', adminKey, schoolId
        });
        teacherId = teacherSignup.body.data.userId;
        const teacherLogin = await request(app).post('/api/user/login').send({
            email: 'teacher@school.com', password: 'password123'
        });
        teacherToken = teacherLogin.body.data.AccessToken.token;
    });

    /**
     * Create Schedule Tests
     */
    describe('POST /api/schedule/createSchedule', () => {
        test('Should create a schedule successfully', async () => {
            const res = await request(app).post('/api/schedule/createSchedule')
                .set('token', schoolAdminToken)
                .send({
                    classroomId,
                    teacherId,
                    subject: 'Mathematics',
                    dayOfWeek: 1, // Monday
                    startTime: '08:00',
                    endTime: '09:30'
                });

            if (res.status !== 200) console.log('Create Schedule Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            expect(res.body.data.schedule.subject).toBe('Mathematics');
            expect(res.body.data.schedule.classroomId).toBe(classroomId);
        });

        test('Should fail if schedule overlaps in the same classroom', async () => {
            // First schedule
            await request(app).post('/api/schedule/createSchedule')
                .set('token', schoolAdminToken)
                .send({
                    classroomId, teacherId, subject: 'Math', dayOfWeek: 1, startTime: '08:00', endTime: '09:00'
                });

            // Overlapping schedule (overlapping start)
            const res = await request(app).post('/api/schedule/createSchedule')
                .set('token', schoolAdminToken)
                .send({
                    classroomId, teacherId, subject: 'Physics', dayOfWeek: 1, startTime: '08:30', endTime: '10:00'
                });

            expect(res.status).toBe(409);
            expect(res.body.error || res.body.message).toContain('overlap');
        });

        test('Should fail if classroom does not belong to the school', async () => {
            // Create another school and classroom
            const school2Res = await request(app).post('/api/school/createSchool')
                .set('token', superAdminToken)
                .send({ name: 'Other School', address: 'Other St', schoolOwner: 'Other O', email: 'other@test.com' });
            const school2Id = school2Res.body.data.school._id || school2Res.body.data.school.id;
            
            // We need a token for school2 to create a classroom there, or just use superadmin if allowed
            // Let's create an admin for school2
            await request(app).post('/api/user/signup').send({
                name: 'Admin 2', email: 'admin2@school.com', password: 'password123', role: 'school_admin', adminKey, schoolId: school2Id
            });
            const admin2Login = await request(app).post('/api/user/login').send({
                email: 'admin2@school.com', password: 'password123'
            });
            const school2AdminToken = admin2Login.body.data.AccessToken.token;

            const class2Res = await request(app).post('/api/classroom/createClassroom')
                .set('token', school2AdminToken)
                .query({ id: school2Id })
                .send({ name: 'Class Room 2', capacity: 20 });
            const classroom2Id = class2Res.body.data.classroom._id || class2Res.body.data.classroom.id;

            // Try to create schedule in classroom2 using school1's admin token
            const res = await request(app).post('/api/schedule/createSchedule')
                .set('token', schoolAdminToken)
                .send({
                    classroomId: classroom2Id,
                    teacherId,
                    subject: 'Biology',
                    dayOfWeek: 2,
                    startTime: '10:00',
                    endTime: '11:00'
                });

            expect(res.status).toBe(400);
            expect(res.body.error || res.body.message).toContain('Invalid classroom');
        });

        test('Should fail if teacher does not belong to the school', async () => {
            // Create another school and a teacher in it
            const school2Res = await request(app).post('/api/school/createSchool')
                .set('token', superAdminToken)
                .send({ name: 'Other School T', address: 'Other St', schoolOwner: 'Other O', email: 'othert@test.com' });
            const school2Id = school2Res.body.data.school._id || school2Res.body.data.school.id;

            const teacher2Signup = await request(app).post('/api/user/signup').send({
                name: 'Other Teacher', email: 'teacher2@school.com', password: 'password123', role: 'teacher', adminKey, schoolId: school2Id
            });
            const teacher2Id = teacher2Signup.body.data.userId;

            // Try to create schedule using teacher2Id with school1's admin token
            const res = await request(app).post('/api/schedule/createSchedule')
                .set('token', schoolAdminToken)
                .send({
                    classroomId,
                    teacherId: teacher2Id,
                    subject: 'Chemistry',
                    dayOfWeek: 3,
                    startTime: '09:00',
                    endTime: '10:00'
                });

            expect(res.status).toBe(400);
            expect(res.body.error || res.body.message).toContain('Invalid teacher');
        });

        test('Should fail with invalid dayOfWeek (min/max validation)', async () => {
            const res = await request(app).post('/api/schedule/createSchedule')
                .set('token', schoolAdminToken)
                .send({
                    classroomId, teacherId, subject: 'Art', dayOfWeek: 7, // Invalid, usually 0-6
                    startTime: '08:00', endTime: '09:00'
                });

            expect(res.status).toBe(400); // Validation error
        });
    });

    /**
     * Get Schedule Tests
     */
    describe('GET /api/schedule/getSchedules', () => {
        beforeEach(async () => {
            await request(app).post('/api/schedule/createSchedule').set('token', schoolAdminToken).send({
                classroomId, teacherId, subject: 'Math', dayOfWeek: 1, startTime: '08:00', endTime: '09:00'
            });
            await request(app).post('/api/schedule/createSchedule').set('token', schoolAdminToken).send({
                classroomId, teacherId, subject: 'English', dayOfWeek: 2, startTime: '09:00', endTime: '10:00'
            });
        });

        test('Should list all schedules for the school', async () => {
            const res = await request(app).get('/api/schedule/getSchedules')
                .set('token', schoolAdminToken);

            expect(res.status).toBe(200);
            expect(res.body.data.schedules.length).toBeGreaterThanOrEqual(2);
        });

        test('Should filter schedules by classroom', async () => {
            const res = await request(app).get('/api/schedule/getSchedules')
                .set('token', schoolAdminToken)
                .query({ classroomId });

            expect(res.status).toBe(200);
            res.body.data.schedules.forEach(s => expect(s.classroomId._id || s.classroomId).toBe(classroomId));
        });
    });

    describe('GET /api/schedule/getTeacherSchedule', () => {
        beforeEach(async () => {
            await request(app).post('/api/schedule/createSchedule').set('token', schoolAdminToken).send({
                classroomId, teacherId, subject: 'Math', dayOfWeek: 3, startTime: '11:00', endTime: '12:00'
            });
        });

        test('Teacher should be able to view their own schedule', async () => {
            const res = await request(app).get('/api/schedule/getTeacherSchedule')
                .set('token', teacherToken);

            expect(res.status).toBe(200);
            expect(res.body.data.schedules.length).toBeGreaterThan(0);
            res.body.data.schedules.forEach(s => expect(s.teacherId || s.teacherId?._id).toBe(teacherId));
        });

        test('Admin should be able to view a specific teacher\'s schedule', async () => {
            const res = await request(app).get('/api/schedule/getTeacherSchedule')
                .set('token', schoolAdminToken)
                .query({ teacherId });

            expect(res.status).toBe(200);
            expect(res.body.data.schedules.length).toBeGreaterThan(0);
        });
    });

    /**
     * Update & Delete Tests
     */
    describe('Update & Delete Schedule', () => {
        let scheduleId;

        beforeEach(async () => {
            const createRes = await request(app).post('/api/schedule/createSchedule')
                .set('token', schoolAdminToken)
                .send({
                    classroomId, teacherId, subject: 'Temp Sub', dayOfWeek: 4, startTime: '14:00', endTime: '15:00'
                });
            scheduleId = createRes.body.data.schedule._id || createRes.body.data.schedule.id;
        });

        test('Should update schedule subject and time', async () => {
            const res = await request(app).patch('/api/schedule/updateSchedule')
                .set('token', schoolAdminToken)
                .send({
                    id: scheduleId,
                    subject: 'Refactored Sub',
                    startTime: '14:30'
                });

            expect(res.status).toBe(200);
            expect(res.body.data.schedule.subject).toBe('Refactored Sub');
            expect(res.body.data.schedule.startTime).toBe('14:30');
        });

        test('Should fail to update non-existent schedule', async () => {
            const fakeId = '609b2b8c9b1d2c001c8e4e9f';
            const res = await request(app).patch('/api/schedule/updateSchedule')
                .set('token', schoolAdminToken)
                .send({
                    id: fakeId,
                    subject: 'Nowhere'
                });

            expect(res.status).toBe(404);
        });

        test('Should fail if updating schedule to an overlapping slot', async () => {
            // First schedule: 08:00 - 09:00
            await request(app).post('/api/schedule/createSchedule').set('token', schoolAdminToken).send({
                classroomId, teacherId, subject: 'Math', dayOfWeek: 1, startTime: '08:00', endTime: '09:00'
            });

            // Second schedule: 10:00 - 11:00 (No overlap)
            const secondRes = await request(app).post('/api/schedule/createSchedule').set('token', schoolAdminToken).send({
                classroomId, teacherId, subject: 'English', dayOfWeek: 1, startTime: '10:00', endTime: '11:00'
            });
            const secondId = secondRes.body.data.schedule._id || secondRes.body.data.schedule.id;

            // Try to update second schedule to 08:30 - 09:30 (Overlaps with first)
            const res = await request(app).patch('/api/schedule/updateSchedule')
                .set('token', schoolAdminToken)
                .send({
                    id: secondId,
                    startTime: '08:30',
                    endTime: '09:30'
                });

            expect(res.status).toBe(409);
            expect(res.body.error || res.body.message).toContain('overlap');
        });

        test('Should delete a schedule entry', async () => {
            const res = await request(app).delete('/api/schedule/deleteSchedule')
                .set('token', schoolAdminToken)
                .query({ id: scheduleId });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('deleted successfully');

            // Verify deletion
            const listRes = await request(app).get('/api/schedule/getSchedules')
                .set('token', schoolAdminToken);
            const found = listRes.body.data.schedules.find(s => (s._id || s.id) === scheduleId);
            expect(found).toBeUndefined();
        });

        test('Should fail if teacher tries to delete a schedule', async () => {
            const res = await request(app).delete('/api/schedule/deleteSchedule')
                .set('token', teacherToken)
                .query({ id: scheduleId });

            // Depending on how access control is implemented, this might be 403 or handled by __isSchoolAdmin check
            // Based on manager code, it doesn't explicitly check __isSchoolAdmin in deleteSchedule but it's probably in the middleware
            // Let's check status.
            expect(res.status).not.toBe(200);
        });
    });
});
