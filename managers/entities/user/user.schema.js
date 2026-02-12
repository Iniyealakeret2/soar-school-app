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
    verifyOtp: [
        {
            model: 'email',
            required: true,
        },
        {
            model: 'text',
            path: 'code',
            required: true,
        }
    ]
}
