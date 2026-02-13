module.exports = {
    markAttendance: [
        {
            model: 'id',
            path: 'studentId',
            required: true,
        },
        {
            model: 'id',
            path: 'classroomId',
            required: true,
        },
        {
            model: 'date',
            path: 'date',
            required: true,
        },
        {
            model: 'text',
            path: 'status',
            required: true,
            oneOf: ['present', 'absent', 'late', 'excused']
        },
        {
            model: 'longText',
            path: 'remarks',
        }
    ],
    getAttendanceReport: [
        {
            model: 'id',
            path: 'classroomId',
        },
        {
            model: 'date',
            path: 'startDate',
        },
        {
            model: 'date',
            path: 'endDate',
        },
        {
            model: 'id',
            path: 'studentId',
        },
        {
            model: 'number',
            path: 'page',
        },
        {
            model: 'number',
            path: 'limit',
        }
    ],
    getStudentAttendance: [
        {
            model: 'id',
            path: 'studentId',
            required: true
        },
        {
            model: 'number',
            path: 'page',
        },
        {
            model: 'number',
            path: 'limit',
        }
    ]
};
