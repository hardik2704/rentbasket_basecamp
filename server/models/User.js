const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include password in queries by default
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    role: {
        type: String,
        enum: ['admin', 'editor'],
        default: 'editor'
    },
    avatar: {
        type: String,
        default: null
    },
    loginStreak: {
        type: Number,
        default: 0
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update login streak
userSchema.methods.updateLoginStreak = function () {
    const now = new Date();
    const lastLogin = this.lastLogin;

    if (!lastLogin) {
        this.loginStreak = 1;
    } else {
        const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Consecutive day login
            this.loginStreak += 1;
        } else if (diffDays > 1) {
            // Streak broken
            this.loginStreak = 1;
        }
        // If same day, don't change streak
    }

    this.lastLogin = now;
};

// Get public profile (without sensitive data)
userSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        email: this.email,
        name: this.name,
        role: this.role,
        avatar: this.avatar,
        loginStreak: this.loginStreak,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt
    };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
