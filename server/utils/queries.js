const { sequelize } = require('../models');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

const PUBLIC_USER_ATTRIBUTES = ['id', 'username', 'profile_picture_url', 'bio', 'created_at'];
const AUTHOR_ATTRIBUTES = ['id', 'username', 'profile_picture_url'];

const toSessionUser = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    profile_picture_url: user.profile_picture_url,
    bio: user.bio
});

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

module.exports = {
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    PUBLIC_USER_ATTRIBUTES,
    AUTHOR_ATTRIBUTES,
    toSessionUser,
    commentCountAttribute,
    likedByMeAttribute
};
