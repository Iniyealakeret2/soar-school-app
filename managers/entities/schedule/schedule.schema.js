module.exports = {
    createSchedule: [
        {
            model: 'id',
            path: 'classroomId',
            required: true,
        },
        {
            model: 'id',
            path: 'teacherId',
            required: true,
        },
        {
            model: 'text',
            path: 'subject',
            required: true,
        },
        {
            model: 'number',
            path: 'dayOfWeek',
            required: true,
            min: 0,
            max: 6
        },
        {
            model: 'text',
            path: 'startTime',
            required: true,
        },
        {
            model: 'text',
            path: 'endTime',
            required: true,
        }
    ],
    updateSchedule: [
        {
            model: 'id',
            path: 'id',
            required: true,
        },
        {
            model: 'id',
            path: 'teacherId',
        },
        {
            model: 'text',
            path: 'subject',
        },
        {
            model: 'number',
            path: 'dayOfWeek',
        },
        {
            model: 'text',
            path: 'startTime',
        },
        {
            model: 'text',
            path: 'endTime',
        }
    ]
};
