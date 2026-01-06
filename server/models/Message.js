const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Message must belong to a project']
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Message must have a sender']
    },
    content: {
        type: String,
        required: [true, 'Message content is required'],
        trim: true,
        maxlength: [10000, 'Message cannot exceed 10000 characters']
    },
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    attachments: [{
        name: String,
        url: String,
        type: String,
        size: Number
    }],
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient queries
messageSchema.index({ project: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ mentions: 1 });

// Parse mentions from content (finds @username patterns)
messageSchema.statics.parseMentions = function (content, users) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
        const username = match[1].toLowerCase();
        const user = users.find(u =>
            u.name.toLowerCase().includes(username) ||
            u.email.toLowerCase().split('@')[0].includes(username)
        );
        if (user && !mentions.includes(user._id)) {
            mentions.push(user._id);
        }
    }

    return mentions;
};

// Get messages for a project with pagination
messageSchema.statics.getProjectMessages = async function (projectId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const messages = await this.find({
        project: projectId,
        isDeleted: false
    })
        .populate('sender', 'name email avatar')
        .populate('mentions', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await this.countDocuments({
        project: projectId,
        isDeleted: false
    });

    return {
        messages: messages.reverse(), // Return in chronological order
        total,
        page,
        pages: Math.ceil(total / limit)
    };
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
