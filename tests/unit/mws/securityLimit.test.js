const securityLimitMiddleware = require('../../../mws/__securityLimit.mw');
const rateLimit = require('express-rate-limit');

jest.mock('express-rate-limit');

describe('SecurityLimit Middleware', () => {
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
        rateLimit.mockClear();
    });

    test('should initialize express-rate-limit with strict security limits', () => {
        rateLimit.mockReturnValue(jest.fn());
        
        securityLimitMiddleware({ managers: mockManagers });

        expect(rateLimit).toHaveBeenCalledWith(expect.objectContaining({
            windowMs: 60 * 60 * 1000, // 1 hour
            limit: 10
        }));
    });

    test('should call the limiter and proceed to next', () => {
        const mockLimiter = jest.fn((req, res, next) => next());
        rateLimit.mockReturnValue(mockLimiter);

        const middleware = securityLimitMiddleware({ managers: mockManagers });
        middleware({ req: mockReq, res: mockRes, next: mockNext });

        expect(mockLimiter).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
    });

    test('handler should return 429 with security-specific message', () => {
        let handler;
        rateLimit.mockImplementation((options) => {
            handler = options.handler;
            return jest.fn();
        });

        securityLimitMiddleware({ managers: mockManagers });

        handler(mockReq, mockRes, mockNext, {});

        expect(mockManagers.responseDispatcher.dispatch).toHaveBeenCalledWith(
            mockRes,
            expect.objectContaining({
                code: 429,
                errors: expect.stringContaining('security-sensitive attempts')
            })
        );
    });
});
