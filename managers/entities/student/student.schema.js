module.exports = {
    createStudent: [
        {
            model: 'longText',
            path: 'name',
            required: true,
        },
        {
            model: 'email',
            path: 'email',
            required: false,
        },
        {
            model: 'text',
            path: 'studentId',
            required: true,
        },
        {
            model: 'date',
            path: 'dateOfBirth',
            required: true,
        },
        {
            model: 'text',
            path: 'gender',
            required: true,
        },
        {
            model: 'paragraph',
            path: 'address',
            required: false,
        },
        {
            model: 'obj',
            path: 'parentContact',
            required: true,
        },
        {
            model: 'id',
            path: 'classroomId',
            required: false,
        }
    ],
    updateStudent: [
        {
            model: 'id',
            path: 'id',
            required: true,
        },
        {
            model: 'longText',
            path: 'name',
            required: false,
        },
        {
            model: 'email',
            path: 'email',
            required: false,
        },
        {
            model: 'date',
            path: 'dateOfBirth',
            required: false,
        },
        {
            model: 'text',
            path: 'gender',
            required: false,
        },
        {
            model: 'paragraph',
            path: 'address',
            required: false,
        },
        {
            model: 'obj',
            path: 'parentContact',
            required: false,
        },
        {
            model: 'id',
            path: 'classroomId',
            required: false,
        }
    ],
    getStudent: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ],
    deleteStudent: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ],
    transferStudent: [
        {
            model: 'id',
            path: 'id',
            required: true,
        },
        {
            model: 'id',
            path: 'classroomId',
            required: true,
        }
    ]
};
