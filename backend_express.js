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


// Test connection
sequelize.authenticate()
    .then(() => console.log('✓ Database connected'))
    .catch(err => console.error('✗ Database connection failed:', err));

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

const signToken = (user) => jwt.sign(
    { sub: String(user.id) },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
);

const toPublicUser = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    profile_picture_url: user.profile_picture_url,
    bio: user.bio
});

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
};

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

// LOGIN
app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await User.findOne({ where: { email } });
        const isValid = user && await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({ token: signToken(user), user: toPublicUser(user) });
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
            attributes: { exclude: ['password_hash'] },
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
            attributes: { exclude: ['password_hash'] }
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
        const { username, email, password, bio } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
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
            bio: bio || ''
        });

        res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// POST ENDPOINTS
// ============================================================================

// GET feed
app.get('/api/posts', async (req, res, next) => {
    try {
        const rows = await Post.findAll({
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'username', 'profile_picture_url']
                },
                {
                    model: Comment,
                    as: 'comments',
                    attributes: ['id']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const posts = rows.map(post => ({
            ...post.toJSON(),
            comment_count: post.comments.length
        }));

        res.json({ posts });
    } catch (error) {
        next(error);
    }
});

// GET post by ID with comments
app.get('/api/posts/:id', async (req, res, next) => {
    try {
        const post = await Post.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'username', 'profile_picture_url']
                },
                {
                    model: Comment,
                    as: 'comments',
                    include: [
                        {
                            model: User,
                            as: 'author',
                            attributes: ['id', 'username', 'profile_picture_url']
                        }
                    ]
                }
            ]
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
        const { title, content, image_url } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content required' });
        }

        const post = await Post.create({
            user_id: req.user.id,
            title,
            content,
            image_url: image_url || null
        });

        res.status(201).json({
            id: post.id,
            title: post.title,
            content: post.content
        });
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

        await post.update({
            title: req.body.title || post.title,
            content: req.body.content || post.content
        });

        res.json({ message: 'Post updated' });
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
        res.json({ message: 'Post deleted' });
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
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content required' });
        }

        const comment = await Comment.create({
            post_id: req.params.postId,
            user_id: req.user.id,
            content
        });

        res.status(201).json({
            id: comment.id,
            content: comment.content
        });
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
        res.json({ message: 'Comment deleted' });
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
        // Check if already liked
        const existingLike = await Like.findOne({
            where: {
                user_id: req.user.id,
                post_id: req.params.postId,
                comment_id: null
            }
        });

        if (existingLike) {
            return res.status(400).json({ error: 'Already liked' });
        }

        // Add like
        await Like.create({
            user_id: req.user.id,
            post_id: req.params.postId
        });

        // Update post likes count
        const post = await Post.findByPk(req.params.postId);
        await post.increment('likes_count');

        res.status(201).json({ message: 'Post liked' });
    } catch (error) {
        next(error);
    }
});

// UNLIKE a post
app.delete('/api/posts/:postId/unlike', authenticateToken, async (req, res, next) => {
    try {
        const like = await Like.findOne({
            where: {
                user_id: req.user.id,
                post_id: req.params.postId,
                comment_id: null
            }
        });

        if (!like) return res.status(404).json({ error: 'Like not found' });

        await like.destroy();

        // Update post likes count
        const post = await Post.findByPk(req.params.postId);
        if (post.likes_count > 0) {
            await post.decrement('likes_count');
        }

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
                created_at: { [require('sequelize').Op.gte]: sevenDaysAgo }
            },
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'username']
                },
                {
                    model: Comment,
                    as: 'comments',
                    attributes: ['id']
                }
            ],
            order: [['likes_count', 'DESC']],
            limit: 20
        });

        const result = posts.map(post => ({
            ...post.toJSON(),
            comment_count: post.comments.length
        }));

        res.json(result);
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
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ error: 'Search query required' });
        }

        const { Op } = require('sequelize');

        const posts = await Post.findAll({
            where: {
                [Op.or]: [
                    { title: { [Op.like]: `%${q}%` } },
                    { content: { [Op.like]: `%${q}%` } }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['username']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: 20
        });

        res.json(posts);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(errorHandler);

// ============================================================================
// SYNC DATABASE AND START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: false })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✓ Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('✗ Failed to sync database:', err);
    });

module.exports = app;
