const express = require('express');
const { Op } = require('sequelize');
const { sequelize, User, Post, Comment, Like } = require('../models');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { asText, validatePostInput } = require('../utils/validation');
const {
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    AUTHOR_ATTRIBUTES,
    commentCountAttribute,
    likedByMeAttribute
} = require('../utils/queries');

const router = express.Router();

const encodeCursor = (post) =>
    Buffer.from(`${post.created_at.toISOString()}|${post.id}`).toString('base64url');

const decodeCursor = (cursor) => {
    const [createdAt, id] = Buffer.from(cursor, 'base64url').toString().split('|');
    const date = new Date(createdAt);
    const postId = Number(id);
    if (Number.isNaN(date.getTime()) || !Number.isInteger(postId)) return null;
    return { createdAt: date, id: postId };
};

// GET feed
router.get('/posts', optionalAuth, async (req, res, next) => {
    try {
        const requestedLimit = parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE;
        const limit = Math.min(Math.max(requestedLimit, 1), MAX_PAGE_SIZE);

        let where = {};
        if (req.query.cursor) {
            const cursor = decodeCursor(req.query.cursor);
            if (!cursor) return res.status(400).json({ error: 'Invalid cursor' });
            where = {
                [Op.or]: [
                    { created_at: { [Op.lt]: cursor.createdAt } },
                    { created_at: cursor.createdAt, id: { [Op.lt]: cursor.id } }
                ]
            };
        }

        const rows = await Post.findAll({
            where,
            attributes: {
                include: [commentCountAttribute, ...(req.user ? [likedByMeAttribute(req.user.id)] : [])]
            },
            include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES }],
            order: [['created_at', 'DESC'], ['id', 'DESC']],
            limit: limit + 1
        });

        const hasMore = rows.length > limit;
        const posts = hasMore ? rows.slice(0, limit) : rows;

        res.json({
            posts: posts.map((post) => ({ ...post.toJSON(), liked_by_me: Boolean(post.get('liked_by_me')) })),
            next_cursor: hasMore ? encodeCursor(posts[posts.length - 1]) : null
        });
    } catch (error) {
        next(error);
    }
});

// GET post by ID with comments
router.get('/posts/:id', async (req, res, next) => {
    try {
        const post = await Post.findByPk(req.params.id, {
            include: [
                { model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES },
                {
                    model: Comment,
                    as: 'comments',
                    include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES }]
                }
            ],
            order: [[{ model: Comment, as: 'comments' }, 'created_at', 'DESC']]
        });

        if (!post) return res.status(404).json({ error: 'Post not found' });

        res.json(post);
    } catch (error) {
        next(error);
    }
});

// CREATE post
router.post('/posts', authenticateToken, async (req, res, next) => {
    try {
        const input = {
            title: asText(req.body.title),
            content: asText(req.body.content),
            image_url: asText(req.body.image_url) || null
        };

        const validationError = validatePostInput(input);
        if (validationError) return res.status(400).json({ error: validationError });

        const post = await Post.create({ ...input, user_id: req.user.id });

        res.status(201).json(post);
    } catch (error) {
        next(error);
    }
});

// UPDATE post
router.put('/posts/:id', authenticateToken, async (req, res, next) => {
    try {
        const post = await Post.findByPk(req.params.id);

        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { title, content, image_url: imageUrl } = req.body;
        const input = {
            title: title === undefined ? post.title : asText(title),
            content: content === undefined ? post.content : asText(content),
            image_url: imageUrl === undefined ? post.image_url : asText(imageUrl) || null
        };

        const validationError = validatePostInput(input);
        if (validationError) return res.status(400).json({ error: validationError });

        await post.update(input);

        res.json(post);
    } catch (error) {
        next(error);
    }
});

// DELETE post
router.delete('/posts/:id', authenticateToken, async (req, res, next) => {
    try {
        const post = await Post.findByPk(req.params.id);

        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await post.destroy();
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

// LIKE a post
router.post('/posts/:postId/like', authenticateToken, async (req, res, next) => {
    try {
        const post = await Post.findByPk(req.params.postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const created = await sequelize.transaction(async (transaction) => {
            const [, isNew] = await Like.findOrCreate({
                where: { user_id: req.user.id, post_id: post.id, comment_id: null },
                transaction
            });
            if (isNew) await post.increment('likes_count', { transaction });
            return isNew;
        });

        if (!created) return res.status(409).json({ error: 'Already liked' });

        res.status(201).json({ message: 'Post liked' });
    } catch (error) {
        next(error);
    }
});

// UNLIKE a post
router.delete('/posts/:postId/unlike', authenticateToken, async (req, res, next) => {
    try {
        const post = await Post.findByPk(req.params.postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const removed = await sequelize.transaction(async (transaction) => {
            const deleted = await Like.destroy({
                where: { user_id: req.user.id, post_id: post.id, comment_id: null },
                transaction
            });
            if (deleted) {
                await Post.decrement('likes_count', {
                    where: { id: post.id, likes_count: { [Op.gt]: 0 } },
                    transaction
                });
            }
            return deleted > 0;
        });

        if (!removed) return res.status(404).json({ error: 'Like not found' });

        res.json({ message: 'Post unliked' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
