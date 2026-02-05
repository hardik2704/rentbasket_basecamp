const express = require('express');
const { Notification } = require('../models');
const { protect } = require('../middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await Notification.getUserNotifications(
            req.user.id,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            success: true,
            count: result.notifications.length,
            total: result.total,
            unreadCount: result.unreadCount,
            page: result.page,
            pages: result.pages,
            data: result.notifications
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
        const count = await Notification.getUnreadCount(req.user.id);

        res.json({
            success: true,
            data: { count }
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', async (req, res, next) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        const updatedNotification = await Notification.markAsRead(req.params.id);

        res.json({
            success: true,
            data: updatedNotification
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', async (req, res, next) => {
    try {
        const result = await Notification.markAllAsRead(req.user.id);

        res.json({
            success: true,
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
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
            user: req.user.id
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

// @route   DELETE /api/notifications/clear-all
// @desc    Clear all notifications
// @access  Private
router.delete('/clear-all', async (req, res, next) => {
    try {
        const result = await Notification.deleteMany({ user: req.user.id });

        res.json({
            success: true,
            message: 'All notifications cleared',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
