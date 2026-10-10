const errorHandler = (err, req, res, next) => {
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ error: err.errors[0]?.message || 'Invalid input' });
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Resource already exists' });
    }
    if (err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({ error: err.expose ? err.message : 'Bad request' });
    }

    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;
