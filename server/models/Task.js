const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Task must belong to a project']
    },
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxlength: [500, 'Task title cannot exceed 500 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [5000, 'Description cannot exceed 5000 characters'],
        default: ''
    },
    status: {
        type: String,
        enum: ['new', 'in_progress', 'done'],
        default: 'new'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    dueDate: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Index for efficient queries
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });

// Update completedAt when status changes to done
taskSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        if (this.status === 'done' && !this.completedAt) {
            this.completedAt = new Date();
        } else if (this.status !== 'done') {
            this.completedAt = null;
        }
    }
    next();
});

// Check if task is overdue
taskSchema.methods.isOverdue = function () {
    if (!this.dueDate || this.status === 'done') return false;
    return new Date() > this.dueDate;
};

// Static method to get tasks by status for a project
taskSchema.statics.getByStatus = async function (projectId) {
    const tasks = await this.find({ project: projectId })
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email')
        .sort({ order: 1, createdAt: -1 });

    return {
        new: tasks.filter(t => t.status === 'new'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        done: tasks.filter(t => t.status === 'done')
    };
};

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
