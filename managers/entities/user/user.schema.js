module.exports = {
    createUser: [
        {
            model: 'username',
            required: true,
        },
    ],
    signup: [
        {
            model: 'longText',
            path: 'name',
            required: true,
        },
        {
            model: 'email',
            required: true,
        },
        {
            model: 'password',
            required: true,
        },
        {
            model: 'text',
            path: 'role',
            required: true,
        },
        {
            model: 'longText',
            path: 'schoolId',
            required: false,
        },
        {
            model: 'longText',
            path: 'adminKey',
            required: true,
        }
    ],
    createAdmin: [
        {
            model: 'longText',
            path: 'name',
            required: true,
        },
        {
            model: 'email',
            required: true,
        },
        {
            model: 'password',
            required: true,
        },
        {
            model: 'text',
            path: 'role',
            required: true,
        },
        {
            model: 'longText',
            path: 'schoolId',
            required: false,
        }
    ],
    login: [
        {
            model: 'email',
            required: true,
        },
        {
            model: 'password',
            required: true,
        }
    ],
    deleteAdmin: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ]
}
