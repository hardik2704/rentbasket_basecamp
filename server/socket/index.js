const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Store connected users
const connectedUsers = new Map();

const setupSocketHandlers = (io) => {
    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user || !user.isActive) {
                return next(new Error('User not found or inactive'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();
        console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

        // Store socket connection
        connectedUsers.set(userId, socket.id);

        // Join personal room for direct notifications
        socket.join(`user:${userId}`);

        // Emit online status
        io.emit('user_online', {
            userId,
            name: socket.user.name
        });

        // Handle joining project rooms
        socket.on('join_project', (projectId) => {
            socket.join(`project:${projectId}`);
            console.log(`📁 ${socket.user.name} joined project: ${projectId}`);

            // Notify others in the project
            socket.to(`project:${projectId}`).emit('user_joined_project', {
                userId,
                name: socket.user.name,
                projectId
            });
        });

        // Handle leaving project rooms
        socket.on('leave_project', (projectId) => {
            socket.leave(`project:${projectId}`);
            console.log(`📁 ${socket.user.name} left project: ${projectId}`);

            socket.to(`project:${projectId}`).emit('user_left_project', {
                userId,
                name: socket.user.name,
                projectId
            });
        });

        // Handle typing indicator
        socket.on('typing_start', (projectId) => {
            socket.to(`project:${projectId}`).emit('user_typing', {
                userId,
                name: socket.user.name,
                projectId
            });
        });

        socket.on('typing_stop', (projectId) => {
            socket.to(`project:${projectId}`).emit('user_stopped_typing', {
                userId,
                projectId
            });
        });

        // Handle direct messages (future feature)
        socket.on('send_direct_message', (data) => {
            const { recipientId, message } = data;
            const recipientSocketId = connectedUsers.get(recipientId);

            if (recipientSocketId) {
                io.to(recipientSocketId).emit('direct_message', {
                    from: userId,
                    fromName: socket.user.name,
                    message,
                    timestamp: new Date()
                });
            }
        });

        // Handle real-time task updates
        socket.on('task_update', (data) => {
            const { projectId, task, action } = data;
            socket.to(`project:${projectId}`).emit('task_updated', {
                task,
                action,
                updatedBy: socket.user.name
            });
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.user.name}`);
            connectedUsers.delete(userId);

            io.emit('user_offline', {
                userId,
                name: socket.user.name
            });
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    console.log('✅ Socket.io handlers configured');
};

module.exports = setupSocketHandlers;
