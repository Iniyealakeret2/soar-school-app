module.exports = {
    createPersonnel: [
        {
            model: 'longText',
            path: 'name',
            required: true,
        },
        {
            model: 'email',
            path: 'email',
            required: true,
        },
        {
            model: 'password',
            path: 'password',
            required: true,
        },
        {
            model: 'text',
            path: 'role',
            required: true,
        },
        {
            model: 'text',
            path: 'employeeId',
            required: true,
        },
        {
            model: 'text',
            path: 'department',
            required: false,
        },
        {
            model: 'text',
            path: 'designation',
            required: false,
        }
    ],
    updatePersonnel: [
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
            model: 'text',
            path: 'department',
            required: false,
        },
        {
            model: 'text',
            path: 'designation',
            required: false,
        },
        {
            model: 'text',
            path: 'status',
            required: false,
        }
    ],
    getPersonnel: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ],
    deletePersonnel: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ]
};
