const express = require('express');
const { User, Post, Comment } = require('../models');
const { PUBLIC_USER_ATTRIBUTES } = require('../utils/queries');

const router = express.Router();

// GET all users
router.get('/users', async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: PUBLIC_USER_ATTRIBUTES,
            order: [['id', 'ASC']],
            limit: 100
        });
        res.json(users);
    } catch (error) {
        next(error);
    }
});

// GET user by ID with stats
router.get('/users/:id', async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: PUBLIC_USER_ATTRIBUTES
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const [postsCount, commentsCount, postsLikes] = await Promise.all([
            Post.count({ where: { user_id: user.id } }),
            Comment.count({ where: { user_id: user.id } }),
            Post.sum('likes_count', { where: { user_id: user.id } })
        ]);

        res.json({
            ...user.toJSON(),
            total_posts: postsCount,
            total_comments: commentsCount,
            total_post_likes: postsLikes || 0
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
