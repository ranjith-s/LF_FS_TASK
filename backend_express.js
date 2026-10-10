// ============================================================================
// BACKEND: Node.js + Express + Sequelize ORM
// ============================================================================

const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const missingEnv = ['DB_NAME', 'DB_USER', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missingEnv.length) {
    console.error(`✗ Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false
});


// ============================================================================
// MODEL DEFINITIONS
// Define Sequelize models based on schema.sql
// ============================================================================

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    profile_picture_url: { type: DataTypes.STRING(255) },
    bio: { type: DataTypes.TEXT }
}, { tableName: 'users', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Post = sequelize.define('Post', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    image_url: { type: DataTypes.STRING(255) },
    likes_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'posts', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Comment = sequelize.define('Comment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    post_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    likes_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'comments', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Like = sequelize.define('Like', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    post_id: { type: DataTypes.INTEGER },
    comment_id: { type: DataTypes.INTEGER }
}, { tableName: 'likes', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: false });

// ============================================================================
// ASSOCIATIONS
// ============================================================================

User.hasMany(Post, { foreignKey: 'user_id', as: 'posts', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

Post.hasMany(Comment, { foreignKey: 'post_id', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

User.hasMany(Like, { foreignKey: 'user_id', as: 'likes', onDelete: 'CASCADE' });
Like.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Post.hasMany(Like, { foreignKey: 'post_id', as: 'likes', onDelete: 'CASCADE' });
Like.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

Comment.hasMany(Like, { foreignKey: 'comment_id', as: 'likes', onDelete: 'CASCADE' });
Like.belongsTo(Comment, { foreignKey: 'comment_id', as: 'comment' });

// ============================================================================
// MIDDLEWARE
// ============================================================================

const authenticateToken = (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
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
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
);

const toSessionUser = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    profile_picture_url: user.profile_picture_url,
    bio: user.bio
});

const PUBLIC_USER_ATTRIBUTES = ['id', 'username', 'profile_picture_url', 'bio', 'created_at'];

const LIMITS = { title: 200, postContent: 10000, comment: 2000, email: 100, url: 255 };
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

const isHttpUrl = (value) => {
    try {
        return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
        return false;
    }
};

const validatePostInput = ({ title, content, image_url: imageUrl }) => {
    if (!title || !content) return 'Title and content required';
    if (title.length > LIMITS.title) return `Title must be at most ${LIMITS.title} characters`;
    if (content.length > LIMITS.postContent) return `Content must be at most ${LIMITS.postContent} characters`;
    if (imageUrl && (imageUrl.length > LIMITS.url || !isHttpUrl(imageUrl))) {
        return 'Image URL must be a valid http(s) URL';
    }
    return null;
};

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

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

// LOGIN
app.post('/api/auth/login', async (req, res, next) => {
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

// ============================================================================
// USER ENDPOINTS
// ============================================================================

// GET all users
app.get('/api/users', async (req, res, next) => {
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
app.get('/api/users/:id', async (req, res, next) => {
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

// CREATE user
app.post('/api/users', async (req, res, next) => {
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

// ============================================================================
// POST ENDPOINTS
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const AUTHOR_ATTRIBUTES = ['id', 'username', 'profile_picture_url'];

const commentCountAttribute = [
    sequelize.literal('(SELECT COUNT(*) FROM comments AS c WHERE c.post_id = `Post`.`id`)'),
    'comment_count'
];

const likedByMeAttribute = (userId) => [
    sequelize.literal(
        `EXISTS(SELECT 1 FROM likes AS l WHERE l.post_id = \`Post\`.\`id\` AND l.comment_id IS NULL AND l.user_id = ${sequelize.escape(userId)})`
    ),
    'liked_by_me'
];

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
app.get('/api/posts', optionalAuth, async (req, res, next) => {
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
app.get('/api/posts/:id', async (req, res, next) => {
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
app.post('/api/posts', authenticateToken, async (req, res, next) => {
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
app.put('/api/posts/:id', authenticateToken, async (req, res, next) => {
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
app.delete('/api/posts/:id', authenticateToken, async (req, res, next) => {
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

// ============================================================================
// COMMENT ENDPOINTS
// ============================================================================

// CREATE comment
app.post('/api/posts/:postId/comments', authenticateToken, async (req, res, next) => {
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

// GET comments for post
app.get('/api/posts/:postId/comments', async (req, res, next) => {
    try {
        const comments = await Comment.findAll({
            where: { post_id: req.params.postId },
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'username', 'profile_picture_url']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json(comments);
    } catch (error) {
        next(error);
    }
});

// DELETE comment
app.delete('/api/comments/:id', authenticateToken, async (req, res, next) => {
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

// ============================================================================
// LIKE ENDPOINTS
// ============================================================================

// LIKE a post
app.post('/api/posts/:postId/like', authenticateToken, async (req, res, next) => {
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
app.delete('/api/posts/:postId/unlike', authenticateToken, async (req, res, next) => {
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

// ============================================================================
// TRENDING ENDPOINTS
// ============================================================================

// GET trending posts (last 7 days)
app.get('/api/trending', async (req, res, next) => {
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

// ============================================================================
// SEARCH ENDPOINT
// ============================================================================

// SEARCH posts
app.get('/api/search', async (req, res, next) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

        if (!q) {
            return res.status(400).json({ error: 'Search query required' });
        }
        if (q.length > 100) {
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

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

app.use(errorHandler);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = Number(process.env.PORT) || 3000;

sequelize.authenticate()
    .then(() => {
        console.log('✓ Database connected');
        app.listen(PORT, () => console.log(`✓ Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error('✗ Database connection failed:', err.message);
        process.exit(1);
    });

module.exports = app;
