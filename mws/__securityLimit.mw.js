const rateLimit = require('express-rate-limit');

module.exports = ({ meta, config, managers }) => {
    const limiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        limit: 20, // Limit each IP to 10 attempts per hour
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler: (req, res, next, options) => {
            return managers.responseDispatcher.dispatch(res, {
                ok: false,
                code: 429,
                errors: 'Too many security-sensitive attempts. Please try again in an hour.'
            });
        }
    });

    return ({ req, res, next }) => {
        limiter(req, res, () => {
            next();
        });
    }
}
