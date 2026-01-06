require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const messageRoutes = require('./routes/messages');
const fileRoutes = require('./routes/files');
const notificationRoutes = require('./routes/notifications');

// Import socket handlers
const setupSocketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'RentBasket API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: Object.values(err.errors).map(e => e.message)
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: 'Invalid ID format'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Connect to database and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        // Setup socket handlers
        setupSocketHandlers(io);

        server.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════╗
║   🚀 RentBasket API Server                 ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                              ║
║   Mode: ${process.env.NODE_ENV || 'development'}                     ║
║   API:  http://localhost:${PORT}/api         ║
╚════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = { app, server, io };
