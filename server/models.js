const { Sequelize, DataTypes } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    logging: config.db.logging ? console.log : false
});

const timestamps = { timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' };

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    profile_picture_url: { type: DataTypes.STRING(255) },
    bio: { type: DataTypes.TEXT }
}, { tableName: 'users', ...timestamps });

const Post = sequelize.define('Post', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    image_url: { type: DataTypes.STRING(255) },
    likes_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'posts', ...timestamps });

const Comment = sequelize.define('Comment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    post_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    likes_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'comments', ...timestamps });

const Like = sequelize.define('Like', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    post_id: { type: DataTypes.INTEGER },
    comment_id: { type: DataTypes.INTEGER }
}, { tableName: 'likes', ...timestamps, updatedAt: false });

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

module.exports = { sequelize, User, Post, Comment, Like };
