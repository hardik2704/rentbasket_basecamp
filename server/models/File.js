const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'File must belong to a project']
    },
    name: {
        type: String,
        required: [true, 'File name is required'],
        trim: true
    },
    originalName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
        default: ''
    },
    url: {
        type: String,
        required: true
    },
    storagePath: {
        type: String,
        default: null
    },
    storageType: {
        type: String,
        enum: ['local', 'supabase'],
        default: 'local'
    },
    type: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for efficient queries
fileSchema.index({ project: 1, createdAt: -1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ type: 1 });

// Get file type category
fileSchema.methods.getTypeCategory = function () {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const spreadsheetTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

    if (imageTypes.includes(this.mimeType)) return 'image';
    if (documentTypes.includes(this.mimeType)) return 'document';
    if (spreadsheetTypes.includes(this.mimeType)) return 'spreadsheet';
    return 'other';
};

// Format file size for display
fileSchema.methods.getFormattedSize = function () {
    const bytes = this.size;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get files by project with grouping
fileSchema.statics.getProjectFiles = async function (projectId) {
    const files = await this.find({
        project: projectId,
        isDeleted: false
    })
        .populate('uploadedBy', 'name email avatar')
        .sort({ createdAt: -1 });

    return files;
};

const File = mongoose.model('File', fileSchema);

module.exports = File;
