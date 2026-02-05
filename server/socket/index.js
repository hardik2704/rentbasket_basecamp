const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Socket.IO event handler setup
 * @param {Object} io - Socket.IO server instance
 */
function setupSocketHandlers(io) {
    // Middleware for authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user || !user.isActive) {
                return next(new Error('Authentication error: Invalid user'));
            }

            socket.userId = user.id;
            socket.userName = user.name;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userName} (${socket.userId})`);

        // Join user's personal room for direct notifications
        socket.join(`user:${socket.userId}`);

        // Emit online status
        io.emit('user_online', {
            userId: socket.userId,
            userName: socket.userName
        });

        // Join project room
        socket.on('join_project', (projectId) => {
            socket.join(`project:${projectId}`);
            console.log(`${socket.userName} joined project: ${projectId}`);

            socket.to(`project:${projectId}`).emit('user_joined', {
                userId: socket.userId,
                userName: socket.userName,
                projectId
            });
        });

        // Leave project room
        socket.on('leave_project', (projectId) => {
            socket.leave(`project:${projectId}`);
            console.log(`${socket.userName} left project: ${projectId}`);

            socket.to(`project:${projectId}`).emit('user_left', {
                userId: socket.userId,
                userName: socket.userName,
                projectId
            });
        });

        // Typing indicator
        socket.on('typing_start', (data) => {
            socket.to(`project:${data.projectId}`).emit('user_typing', {
                userId: socket.userId,
                userName: socket.userName,
                projectId: data.projectId
            });
        });

        socket.on('typing_end', (data) => {
            socket.to(`project:${data.projectId}`).emit('user_stopped_typing', {
                userId: socket.userId,
                userName: socket.userName,
                projectId: data.projectId
            });
        });

        // Direct message (for private notifications, not stored)
        socket.on('direct_message', (data) => {
            io.to(`user:${data.toUserId}`).emit('direct_message', {
                from: socket.userId,
                fromName: socket.userName,
                message: data.message,
                timestamp: new Date()
            });
        });

        // Task updates broadcast
        socket.on('task_update', (data) => {
            socket.to(`project:${data.projectId}`).emit('task_updated', {
                taskId: data.taskId,
                updates: data.updates,
                updatedBy: socket.userName
            });
        });

        // Disconnect handler
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.userName}`);

            io.emit('user_offline', {
                userId: socket.userId,
                userName: socket.userName
            });
        });
    });
}

module.exports = setupSocketHandlers;
