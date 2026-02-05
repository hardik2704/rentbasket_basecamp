/**
 * Model Layer - Supabase PostgreSQL
 * 
 * This file exports the Supabase service modules.
 * The old Mongoose models are preserved in models/mongoose/ for reference
 * during migration but are no longer used.
 */

// Use Supabase models
const {
    User,
    Project,
    Task,
    Message,
    File,
    Notification
} = require('./supabase');

module.exports = {
    User,
    Project,
    Task,
    Message,
    File,
    Notification
};
