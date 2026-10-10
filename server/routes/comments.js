const express = require('express');
const { User, Post, Comment } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { LIMITS, asText } = require('../utils/validation');
const { AUTHOR_ATTRIBUTES } = require('../utils/queries');

const router = express.Router();

// GET comments for post
router.get('/posts/:postId/comments', async (req, res, next) => {
    try {
        const comments = await Comment.findAll({
            where: { post_id: req.params.postId },
            include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRIBUTES }],
            order: [['created_at', 'DESC']]
        });

        res.json(comments);
    } catch (error) {
        next(error);
    }
});

// CREATE comment
router.post('/posts/:postId/comments', authenticateToken, async (req, res, next) => {
    try {
        const content = asText(req.body.content);

        if (!content) {
            return res.status(400).json({ error: 'Content required' });
        }
        if (content.length > LIMITS.comment) {
            return res.status(400).json({ error: `Comment must be at most ${LIMITS.comment} characters` });
        }

        const post = await Post.findByPk(req.params.postId, { attributes: ['id'] });
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const comment = await Comment.create({ post_id: post.id, user_id: req.user.id, content });

        res.status(201).json(comment);
    } catch (error) {
        next(error);
    }
});

// DELETE comment
router.delete('/comments/:id', authenticateToken, async (req, res, next) => {
    try {
        const comment = await Comment.findByPk(req.params.id);

        if (!comment) return res.status(404).json({ error: 'Comment not found' });
        if (comment.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await comment.destroy();
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

module.exports = router;
