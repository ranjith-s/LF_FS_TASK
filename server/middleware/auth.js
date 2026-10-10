const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticateToken = (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
        req.user = { id: Number(payload.sub) };
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const optionalAuth = (req, res, next) => {
    if (!req.headers.authorization) return next();
    authenticateToken(req, res, next);
};

const signToken = (user) => jwt.sign(
    { sub: String(user.id) },
    config.jwt.secret,
    { algorithm: 'HS256', expiresIn: config.jwt.expiresIn }
);

module.exports = { authenticateToken, optionalAuth, signToken };
