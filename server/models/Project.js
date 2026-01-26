const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: [200, 'Project name cannot exceed 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
        default: ''
    },
    category: {
        type: String,
        enum: ['tech', 'marketing', 'ops', 'personal'],
        default: 'tech'
    },
    status: {
        type: String,
        enum: ['active', 'archived', 'completed'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['owner', 'member'],
            default: 'member'
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for task count (will be populated when needed)
projectSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'project'
});

// Add creator as owner when project is created
projectSchema.pre('save', function (next) {
    if (this.isNew && this.createdBy) {
        const hasOwner = this.members.some(m =>
            m.user.toString() === this.createdBy.toString()
        );
        if (!hasOwner) {
            this.members.push({
                user: this.createdBy,
                role: 'owner'
            });
        }
    }
    next();
});

// Get member count
projectSchema.methods.getMemberCount = function () {
    return this.members.length;
};

// Check if user is member
projectSchema.methods.isMember = function (userId) {
    return this.members.some(m => m.user.toString() === userId.toString());
};

// Check if user is owner
projectSchema.methods.isOwner = function (userId) {
    return this.members.some(m =>
        m.user.toString() === userId.toString() && m.role === 'owner'
    );
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
