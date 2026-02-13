const isTeacherMiddleware = require('../../../mws/__isTeacher.mw');

describe('IsTeacher Middleware (User Implementation)', () => {
    let mockReq, mockRes, mockNext, mockManagers;

    beforeEach(() => {
        mockReq = {};
        mockRes = {};
        mockNext = jest.fn();
        mockManagers = {
            responseDispatcher: {
                dispatch: jest.fn()
            }
        };
    });

    const createMiddleware = () => isTeacherMiddleware({ managers: mockManagers });

    test('should allow access if user is a teacher', () => {
        const results = { __token: { role: 'teacher' } };
        const middleware = createMiddleware();
        
        middleware({ req: mockReq, res: mockRes, results, next: mockNext });

        expect(mockNext).toHaveBeenCalled();
        expect(mockManagers.responseDispatcher.dispatch).not.toHaveBeenCalled();
    });

    test('should allow access if user is a school_admin (elevated)', () => {
        const results = { __token: { role: 'school_admin' } };
        const middleware = createMiddleware();
        
        middleware({ req: mockReq, res: mockRes, results, next: mockNext });

        expect(mockNext).toHaveBeenCalled();
    });

    test('should allow access if user is a superadmin (elevated)', () => {
        const results = { __token: { role: 'superadmin' } };
        const middleware = createMiddleware();
        
        middleware({ req: mockReq, res: mockRes, results, next: mockNext });

        expect(mockNext).toHaveBeenCalled();
    });

    test('should block access if user is a student or guest', () => {
        const results = { __token: { role: 'student' } };
        const middleware = createMiddleware();
        
        middleware({ req: mockReq, res: mockRes, results, next: mockNext });

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockManagers.responseDispatcher.dispatch).toHaveBeenCalledWith(
            mockRes,
            expect.objectContaining({
                code: 403,
                errors: expect.stringContaining('Teacher access required')
            })
        );
    });
});
