const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const discoveryRoutes = require('./routes/discovery');

const app = express();

app.use(express.json());

app.use('/api', authRoutes, userRoutes, postRoutes, commentRoutes, discoveryRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

app.use(errorHandler);

module.exports = app;
