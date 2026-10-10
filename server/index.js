const config = require('./config');
const { sequelize } = require('./models');
const app = require('./app');

sequelize.authenticate()
    .then(() => {
        console.log('✓ Database connected');
        app.listen(config.port, () => console.log(`✓ Server running on port ${config.port}`));
    })
    .catch((err) => {
        console.error('✗ Database connection failed:', err.message);
        process.exit(1);
    });
