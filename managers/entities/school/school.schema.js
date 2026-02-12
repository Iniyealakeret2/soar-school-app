module.exports = {
    createSchool: [
        {
            model: 'longText',
            path: 'name',
            required: true,
        },
        {
            model: 'longText',
            path: 'address',
            required: true,
        },
        {
            model: 'longText',
            path: 'schoolOwner',
            required: true,
        },
        {
            model: 'text',
            path: 'phoneNumber',
            required: false,
        },
        {
            model: 'email',
            required: false,
        }
    ],
    updateSchool: [
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
            model: 'longText',
            path: 'address',
            required: false,
        },
        {
            model: 'longText',
            path: 'schoolOwner',
            required: false,
        },
        {
            model: 'text',
            path: 'phoneNumber',
            required: false,
        },
        {
            model: 'email',
            required: false,
        }
    ],
    deleteSchool: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ],
    getSchool: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ]
}
