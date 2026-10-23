const express = require('express');
const { Op } = require('sequelize');
const { User, Post } = require('../models');
const { LIMITS } = require('../utils/validation');
const { DEFAULT_PAGE_SIZE, AUTHOR_ATTRIBUTES, commentCountAttribute } = require('../utils/queries');

const router = express.Router();

// GET trending posts (last 7 days)
router.get('/trending', async (req, res, next) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const posts = await Post.findAll({
            where: {
                created_at: { [Op.gte]: sevenDaysAgo }
            },
            attributes: { include: [commentCountAttribute] },
            include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES }],
            order: [['likes_count', 'DESC']],
            limit: DEFAULT_PAGE_SIZE
        });

        res.json(posts);
    } catch (error) {
        next(error);
    }
});

// SEARCH posts
router.get('/search', async (req, res, next) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }
        if (q.length > LIMITS.search) {
            return res.status(400).json({ error: 'Search query too long' });
        }

        const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;

        const posts = await Post.findAll({
            where: {
                [Op.or]: [
                    { title: { [Op.like]: pattern } },
                    { content: { [Op.like]: pattern } }
                ]
            },
            include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES }],
            order: [['created_at', 'DESC']],
            limit: DEFAULT_PAGE_SIZE
        });

        res.json(posts);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
