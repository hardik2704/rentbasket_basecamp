const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Notification must belong to a user']
    },
    type: {
        type: String,
        enum: [
            'task_assigned',
            'task_completed',
            'task_due_soon',
            'task_overdue',
            'message_mention',
            'project_created',
            'project_member_added',
            'file_uploaded',
            'comment_added'
        ],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    // Reference to related entities
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    },
    triggeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    read: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// Mark as read
notificationSchema.methods.markAsRead = function () {
    this.read = true;
    this.readAt = new Date();
    return this.save();
};

// Static: Get unread count for user
notificationSchema.statics.getUnreadCount = async function (userId) {
    return await this.countDocuments({ user: userId, read: false });
};

// Static: Get user notifications with pagination
notificationSchema.statics.getUserNotifications = async function (userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const notifications = await this.find({ user: userId })
        .populate('project', 'name')
        .populate('task', 'title')
        .populate('triggeredBy', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await this.countDocuments({ user: userId });
    const unreadCount = await this.countDocuments({ user: userId, read: false });

    return {
        notifications,
        total,
        unreadCount,
        page,
        pages: Math.ceil(total / limit)
    };
};

// Static: Create notification helper
notificationSchema.statics.createNotification = async function (data) {
    const notification = new this(data);
    await notification.save();
    return notification;
};

// Static: Mark all as read for user
notificationSchema.statics.markAllAsRead = async function (userId) {
    return await this.updateMany(
        { user: userId, read: false },
        { read: true, readAt: new Date() }
    );
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
