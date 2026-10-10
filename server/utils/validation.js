const LIMITS = { title: 200, postContent: 10000, comment: 2000, email: 100, url: 255, search: 100 };
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

module.exports = { LIMITS, USERNAME_PATTERN, EMAIL_PATTERN, asText, validatePostInput };
