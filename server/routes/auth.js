const express = require('express');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const { signToken } = require('../middleware/auth');
const { toSessionUser } = require('../utils/queries');
const { LIMITS, USERNAME_PATTERN, EMAIL_PATTERN, asText } = require('../utils/validation');

const router = express.Router();

// LOGIN
router.post('/auth/login', async (req, res, next) => {
    try {
        const email = asText(req.body.email).toLowerCase();
        const password = typeof req.body.password === 'string' ? req.body.password : '';

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await User.findOne({ where: { email } });
        const isValid = user && await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({ token: signToken(user), user: toSessionUser(user) });
    } catch (error) {
        next(error);
    }
});

// REGISTER
router.post('/users', async (req, res, next) => {
    try {
        const username = asText(req.body.username);
        const email = asText(req.body.email).toLowerCase();
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        const bio = asText(req.body.bio);

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password required' });
        }
        if (!USERNAME_PATTERN.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-50 characters: letters, numbers or underscores' });
        }
        if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
            return res.status(400).json({ error: 'A valid email is required' });
        }
        if (password.length < 8 || Buffer.byteLength(password) > 72) {
            return res.status(400).json({ error: 'Password must be between 8 and 72 characters' });
        }

        const existing = await User.findOne({ where: { [Op.or]: [{ email }, { username }] } });
        if (existing) {
            const field = existing.email === email ? 'Email' : 'Username';
            return res.status(409).json({ error: `${field} already registered` });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password_hash: hashedPassword,
            bio
        });

        res.status(201).json({ token: signToken(user), user: toSessionUser(user) });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
