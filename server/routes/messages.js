const express = require('express');
const { body, validationResult } = require('express-validator');
const { Message, Project, User, Notification } = require('../models');
const { protect } = require('../middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/messages/project/:projectId
// @desc    Get messages for a project
// @access  Private
router.get('/project/:projectId', async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const result = await Message.getProjectMessages(
            req.params.projectId,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            success: true,
            data: result.messages.map(m => ({
                ...m.toObject(),
                id: m._id,
                userId: m.sender._id,
                userName: m.sender.name,
                timestamp: m.createdAt
            })),
            pagination: {
                total: result.total,
                page: result.page,
                pages: result.pages
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', [
    body('projectId').notEmpty().withMessage('Project ID is required'),
    body('content').trim().notEmpty().withMessage('Message content is required')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { projectId, content } = req.body;

        // Verify project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Get all users for mention parsing
        const users = await User.find({ isActive: true });
        const mentions = Message.parseMentions(content, users);

        const message = await Message.create({
            project: projectId,
            sender: req.user._id,
            content,
            mentions
        });

        await message.populate('sender', 'name email avatar');
        await message.populate('mentions', 'name email');

        // Format response
        const formattedMessage = {
            ...message.toObject(),
            id: message._id,
            userId: message.sender._id,
            userName: message.sender.name,
            timestamp: message.createdAt
        };

        // Emit to all users in the project room
        const io = req.app.get('io');
        io.to(`project:${projectId}`).emit('new_message', formattedMessage);

        // Create notifications for mentioned users
        for (const userId of mentions) {
            if (userId.toString() !== req.user._id.toString()) {
                await Notification.createNotification({
                    user: userId,
                    type: 'message_mention',
                    title: 'You were mentioned',
                    message: `${req.user.name} mentioned you in ${project.name}`,
                    project: projectId,
                    triggeredBy: req.user._id
                });

                io.to(`user:${userId}`).emit('notification', {
                    type: 'mention',
                    message: formattedMessage
                });
            }
        }

        res.status(201).json({
            success: true,
            data: formattedMessage
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/messages/:id
// @desc    Edit a message
// @access  Private (only message owner)
router.put('/:id', [
    body('content').trim().notEmpty().withMessage('Message content is required')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }

        // Only message owner can edit
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to edit this message'
            });
        }

        const { content } = req.body;

        // Re-parse mentions
        const users = await User.find({ isActive: true });
        const mentions = Message.parseMentions(content, users);

        message.content = content;
        message.mentions = mentions;
        message.isEdited = true;
        message.editedAt = new Date();

        await message.save();
        await message.populate('sender', 'name email avatar');

        const formattedMessage = {
            ...message.toObject(),
            id: message._id,
            userId: message.sender._id,
            userName: message.sender.name,
            timestamp: message.createdAt
        };

        // Emit update
        const io = req.app.get('io');
        io.to(`project:${message.project}`).emit('message_updated', formattedMessage);

        res.json({
            success: true,
            data: formattedMessage
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message (soft delete)
// @access  Private (owner or admin)
router.delete('/:id', async (req, res, next) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }

        // Only message owner or admin can delete
        if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this message'
            });
        }

        message.isDeleted = true;
        message.content = 'This message has been deleted';
        await message.save();

        // Emit deletion
        const io = req.app.get('io');
        io.to(`project:${message.project}`).emit('message_deleted', {
            id: message._id
        });

        res.json({
            success: true,
            message: 'Message deleted'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
