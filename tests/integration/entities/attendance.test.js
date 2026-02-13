const request = require('supertest');
const { setupTestEnv, teardownTestEnv, cleanDatabase } = require('../testSetup');

describe('Attendance Comprehensive Integration Tests', () => {
    let app;
    let tokens = {};
    let schoolId, classroomId, studentId, otherSchoolStudentId;

    // Helper functions
    const signup = async (data) => {
        const res = await request(app).post('/api/user/signup').send({ ...data, adminKey: 'soar_secure_key' });
        return res;
    };
    const login = async (email, password) => {
        const res = await request(app).post('/api/user/login').send({ email, password });
        return res;
    };

    beforeAll(async () => {
        const env = await setupTestEnv();
        app = env.app;
    });

    afterAll(async () => {
        await teardownTestEnv();
    });

    beforeEach(async () => {
        await cleanDatabase();
        const p = 'password123';

        // 1. Setup Superadmin & School
        await signup({ name: 'Super', email: 'super@test.com', password: p, role: 'superadmin' });
        const sLogin = await login('super@test.com', p);
        const superToken = sLogin.body.data.AccessToken.token;

        const schoolRes = await request(app).post('/api/school/createSchool').set('token', superToken).send({
            name: 'Attendance School', address: '123 Att St', schoolOwner: 'Owner A'
        });
        schoolId = schoolRes.body.data.school._id || schoolRes.body.data.school.id;

        // 2. Setup School Admin
        const adminSignup = await signup({ name: 'Admin', email: 'admin@att.com', password: p, role: 'school_admin', schoolId });
        if(adminSignup.status !== 200) console.log('Admin Signup Failed:', JSON.stringify(adminSignup.body));
        
        const aLogin = await login('admin@att.com', p);
        if(aLogin.status !== 200) console.log('Admin Login Failed:', JSON.stringify(aLogin.body));
        tokens.admin = aLogin.body.data.AccessToken.token;

        // 3. Setup Teacher
        await signup({ name: 'Teacher', email: 'teacher@att.com', password: p, role: 'teacher', schoolId });
        const tLogin = await login('teacher@att.com', p);
        tokens.teacher = tLogin.body.data.AccessToken.token;

        // 4. Create Classroom
        const classRes = await request(app).post('/api/classroom/createClassroom')
            .set('token', tokens.admin)
            .query({ id: schoolId })
            .send({ name: 'Class 5A', capacity: 30 });
        
        if(classRes.status !== 200) console.log('Create Classroom Failed:', JSON.stringify(classRes.body));
        classroomId = classRes.body.data.classroom._id || classRes.body.data.classroom.id;

        // 5. Enroll Student in THIS school
        const studentRes = await request(app).post('/api/student/createStudent').set('token', tokens.admin).send({
            name: 'Student One', dateOfBirth: '2015-01-01', gender: 'male', schoolId, classroomId,
            parentContact: { name: 'Parent', phone: '1234567890' }
        });
        if(studentRes.status !== 200) console.log('Create Student Failed:', JSON.stringify(studentRes.body));
        studentId = studentRes.body.data.student._id || studentRes.body.data.student.id;

        // 6. Setup Student in ANOTHER school (for negative tests)
        const school2Res = await request(app).post('/api/school/createSchool').set('token', superToken).send({
            name: 'Other School', address: '456 Other St', schoolOwner: 'Owner B'
        });
        const otherSchoolId = school2Res.body.data.school._id || school2Res.body.data.school.id;
        
        // We need an admin for the other school to create a student there
        await signup({ name: 'Other Admin', email: 'other@admin.com', password: p, role: 'school_admin', schoolId: otherSchoolId });
        const otherALogin = await login('other@admin.com', p);
        const otherAdminToken = otherALogin.body.data.AccessToken.token;

        // Need a classroom in the other school
        const otherClassRes = await request(app).post('/api/classroom/createClassroom')
            .set('token', otherAdminToken)
            .query({ id: otherSchoolId })
            .send({ name: 'Class Other', capacity: 30 });
        const otherClassroomId = otherClassRes.body.data.classroom._id || otherClassRes.body.data.classroom.id;

        const otherStudentRes = await request(app).post('/api/student/createStudent').set('token', otherAdminToken).send({
            name: 'Outsider', dateOfBirth: '2015-01-01', gender: 'female', schoolId: otherSchoolId, classroomId: otherClassroomId,
            parentContact: { name: 'P2', phone: '0000000000' }
        });
        if(otherStudentRes.status !== 200) console.log('Create Other Student Failed:', JSON.stringify(otherStudentRes.body));
        otherSchoolStudentId = otherStudentRes.body.data.student._id || otherStudentRes.body.data.student.id;
    });

    /**
     * Mark Attendance Tests
     */
    describe('POST /api/attendance/markAttendance', () => {
        test('Teacher should mark attendance successfully (Create)', async () => {
            const res = await request(app).post('/api/attendance/markAttendance')
                .set('token', tokens.teacher)
                .send({
                    studentId,
                    classroomId,
                    date: new Date().toISOString(),
                    status: 'present',
                    remarks: 'On time'
                });

            if(res.status !== 200) console.log('Mark Attendance (Create) Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.data.attendance.status).toBe('present');
        });

        test('Teacher should be able to update attendance (Upsert)', async () => {
            const date = new Date().toISOString();
            
            // First: Mark Present
            await request(app).post('/api/attendance/markAttendance').set('token', tokens.teacher).send({
                studentId, classroomId, date, status: 'present'
            });

            // Second: Change to Absent
            const res = await request(app).post('/api/attendance/markAttendance')
                .set('token', tokens.teacher)
                .send({
                    studentId,
                    classroomId,
                    date,
                    status: 'absent',
                    remarks: 'Sick leave'
                });

            if(res.status !== 200) console.log('Mark Attendance (Upsert) Failed:', JSON.stringify(res.body));

            expect(res.status).toBe(200);
            expect(res.body.data.attendance.status).toBe('absent');
            expect(res.body.data.attendance.remarks).toBe('Sick leave');
        });

        test('Should fail if student belongs to another school', async () => {
            const res = await request(app).post('/api/attendance/markAttendance')
                .set('token', tokens.teacher)
                .send({
                    studentId: otherSchoolStudentId,
                    classroomId,
                    date: new Date().toISOString(),
                    status: 'present'
                });

            if(res.status !== 403) console.log('Cross-School Mark Failed (Expected 403):', res.status, JSON.stringify(res.body));

            expect(res.status).toBe(403);
            expect(res.body.error || res.body.message).toBe('Forbidden: Student belongs to another school');
        });

        test('Should fail if student ID does not exist', async () => {
            const res = await request(app).post('/api/attendance/markAttendance')
                .set('token', tokens.teacher)
                .send({
                    studentId: '000000000000000000000000', // Valid ObjectID format, but non-existent
                    classroomId,
                    date: new Date().toISOString(),
                    status: 'present'
                });

            if(res.status !== 404) console.log('Missing Student Mark Failed (Expected 404):', res.status, JSON.stringify(res.body));

            expect(res.status).toBe(404);
            expect(res.body.error || res.body.message).toBe('Student not found');
        });
    });

    /**
     * Get Student Attendance Tests
     */
    describe('GET /api/attendance/getStudentAttendance', () => {
        test('Teacher should fetch individual student attendance', async () => {
            // Seed data
            await request(app).post('/api/attendance/markAttendance').set('token', tokens.teacher).send({
                studentId, classroomId, date: new Date().toISOString(), status: 'present'
            });

            const res = await request(app).get('/api/attendance/getStudentAttendance')
                .set('token', tokens.teacher)
                .query({ studentId });

            expect(res.status).toBe(200);
            expect(res.body.data.attendance.length).toBe(1);
            expect(res.body.data.attendance[0].status).toBe('present');
        });

        test('Should fail to fetch if student is from another school', async () => {
            const res = await request(app).get('/api/attendance/getStudentAttendance')
                .set('token', tokens.teacher)
                .query({ studentId: otherSchoolStudentId });

            expect(res.status).toBe(403); // Or 404 depending on implementation, but manager says 403
        });
    });

    /**
     * Get Attendance Report Tests
     */
    describe('GET /api/attendance/getAttendanceReport', () => {
        beforeEach(async () => {
            // Seed data: One record 5 days ago, one today
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            
            await request(app).post('/api/attendance/markAttendance').set('token', tokens.teacher).send({
                studentId, classroomId, date: fiveDaysAgo.toISOString(), status: 'absent'
            });

            await request(app).post('/api/attendance/markAttendance').set('token', tokens.teacher).send({
                studentId, classroomId, date: new Date().toISOString(), status: 'present'
            });
        });

        test('School Admin should fetch full report', async () => {
            const res = await request(app).get('/api/attendance/getAttendanceReport')
                .set('token', tokens.admin)
                .query({ classroomId });

            expect(res.status).toBe(200);
            expect(res.body.data.report.length).toBeGreaterThanOrEqual(2);
        });

        test('Should filter report by date range', async () => {
            // Filter only for today
            const startDate = new Date();
            startDate.setHours(0,0,0,0);
            const endDate = new Date();
            endDate.setHours(23,59,59,999);

            const res = await request(app).get('/api/attendance/getAttendanceReport')
                .set('token', tokens.admin)
                .query({ 
                    classroomId, 
                    startDate: startDate.toISOString(), 
                    endDate: endDate.toISOString() 
                });

            expect(res.status).toBe(200);
            const report = res.body.data.report;
            // Should find TODAY's record, but NOT 5 days ago
            expect(report.length).toBe(1);
            expect(report[0].status).toBe('present');
        });
    });

});
