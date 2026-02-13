module.exports = {
    createClassroom: [
        {
            model: 'id',
            path: 'id',
            required: true,
        },
        {
            model: 'longText',
            path: 'name',
            required: true,
        },
        {
            model: 'number',
            path: 'capacity',
            required: true,
        },
        {
            model: 'array',
            path: 'resources',
            required: false,
        }
    ],
    updateClassroom: [
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
            model: 'number',
            path: 'capacity',
            required: false,
        },
        {
            model: 'array',
            path: 'resources',
            required: false,
        }
    ],
    getClassroom: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ],
    deleteClassroom: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ],
    getClassroomsBySchool: [
        {
            model: 'id',
            path: 'id',
            required: true,
        }
    ],
    getClassrooms: [
        {
            model: 'id',
            path: 'id',
            required: false,
        }
    ],
    addResources: [
        {
            model: 'id',
            path: 'id',
            required: true,
        },
        {
            model: 'array',
            path: 'resources',
            required: true,
        }
    ]
}
