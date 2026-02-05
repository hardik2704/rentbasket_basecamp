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

        // Check membership for non-admin
        if (req.user.role !== 'admin' && !project.isMember(req.user.id)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view messages in this project'
            });
        }

        const result = await Message.getProjectMessages(
            req.params.projectId,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            success: true,
            count: result.messages.length,
            total: result.total,
            page: result.page,
            pages: result.pages,
            data: result.messages
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

        const { projectId, content, attachments } = req.body;

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Parse mentions
        const users = await User.find({ isActive: true });
        const mentions = Message.parseMentions(content, users);

        const message = await Message.create({
            project: projectId,
            sender: req.user.id,
            content,
            mentions,
            attachments: attachments || []
        });

        // Create notifications for mentioned users
        for (const mentionedUserId of mentions) {
            if (mentionedUserId !== req.user.id) {
                await Notification.createNotification({
                    user: mentionedUserId,
                    type: 'message_mention',
                    title: 'You were mentioned',
                    message: `${req.user.name} mentioned you in ${project.name}`,
                    project: projectId,
                    triggeredBy: req.user.id
                });
            }
        }

        // Emit socket event
        const io = req.app.get('io');
        io.to(`project:${projectId}`).emit('new_message', message);

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/messages/:id
// @desc    Edit a message
// @access  Private
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

        // Only sender can edit
        if (message.sender.id !== req.user.id && message.sender._id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to edit this message'
            });
        }

        if (message.isDeleted) {
            return res.status(400).json({
                success: false,
                error: 'Cannot edit a deleted message'
            });
        }

        const { content } = req.body;

        // Re-parse mentions
        const users = await User.find({ isActive: true });
        const mentions = Message.parseMentions(content, users);

        const updatedMessage = await Message.update(req.params.id, {
            content,
            mentions
        });

        // Emit socket event
        const io = req.app.get('io');
        io.to(`project:${message.project}`).emit('message_updated', updatedMessage);

        res.json({
            success: true,
            data: updatedMessage
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message (soft delete)
// @access  Private
router.delete('/:id', async (req, res, next) => {
    try {
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found'
            });
        }

        // Only sender or admin can delete
        const senderId = message.sender.id || message.sender._id;
        if (senderId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this message'
            });
        }

        const updatedMessage = await Message.update(req.params.id, {
            isDeleted: true
        });

        // Emit socket event
        const io = req.app.get('io');
        io.to(`project:${message.project}`).emit('message_deleted', {
            id: req.params.id
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
