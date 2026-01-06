const express = require('express');
const { Notification } = require('../models');
const { protect } = require('../middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/notifications
// @desc    Get notifications for current user
// @access  Private
router.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await Notification.getUserNotifications(
            req.user._id,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            success: true,
            data: result.notifications.map(n => ({
                ...n.toObject(),
                id: n._id
            })),
            unreadCount: result.unreadCount,
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

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', async (req, res, next) => {
    try {
        const count = await Notification.getUnreadCount(req.user._id);

        res.json({
            success: true,
            data: { count }
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', async (req, res, next) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        await notification.markAsRead();

        res.json({
            success: true,
            data: {
                ...notification.toObject(),
                id: notification._id
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', async (req, res, next) => {
    try {
        await Notification.markAllAsRead(req.user._id);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/notifications
// @desc    Clear all notifications
// @access  Private
router.delete('/', async (req, res, next) => {
    try {
        await Notification.deleteMany({ user: req.user._id });

        res.json({
            success: true,
            message: 'All notifications cleared'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
