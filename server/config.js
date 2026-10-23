require('dotenv').config();

const missing = ['DB_NAME', 'DB_USER', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

module.exports = {
    port: Number(process.env.PORT) || 3000,
    db: {
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        logging: process.env.DB_LOGGING === 'true'
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    }
};
