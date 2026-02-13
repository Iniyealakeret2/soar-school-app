const isSuperadminMiddleware = require('../../../mws/__isSuperadmin.mw');

describe('IsSuperadmin Middleware', () => {
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

    const createMiddleware = () => isSuperadminMiddleware({ managers: mockManagers });

    test('should allow access if user is a superadmin', () => {
        const results = { __token: { role: 'superadmin' } };
        const middleware = createMiddleware();
        
        middleware({ req: mockReq, res: mockRes, results, next: mockNext });

        expect(mockNext).toHaveBeenCalled();
        expect(mockManagers.responseDispatcher.dispatch).not.toHaveBeenCalled();
    });

    test('should block access if user is a school_admin', () => {
        const results = { __token: { role: 'school_admin' } };
        const middleware = createMiddleware();
        
        middleware({ req: mockReq, res: mockRes, results, next: mockNext });

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockManagers.responseDispatcher.dispatch).toHaveBeenCalledWith(
            mockRes,
            expect.objectContaining({
                code: 403,
                errors: 'Forbidden: Superadmin access required'
            })
        );
    });

    test('should block access if token is missing', () => {
        const results = {};
        const middleware = createMiddleware();
        
        middleware({ req: mockReq, res: mockRes, results, next: mockNext });

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockManagers.responseDispatcher.dispatch).toHaveBeenCalledWith(
            mockRes,
            expect.objectContaining({
                code: 401,
                errors: 'Unauthorized: Token required'
            })
        );
    });
});
