/**
 * Database Seed Script
 * Creates initial demo data for RentBasket PM Tool
 * 
 * Run with: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Project, Task, Message, Notification } = require('../models');

const seedData = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if users exist, only create if not
        console.log('👥 Checking users...');

        let admin = await User.findOne({ email: 'admin@rentbasket.com' });
        if (!admin) {
            admin = await User.create({
                email: 'admin@rentbasket.com',
                password: 'admin123',
                name: 'Hardik (Admin)',
                role: 'admin',
                loginStreak: 7,
                lastLogin: new Date()
            });
            console.log(`   ✅ Created admin: ${admin.email}`);
        } else {
            console.log(`   ℹ️  Admin already exists: ${admin.email}`);
        }

        let editor = await User.findOne({ email: 'editor@rentbasket.com' });
        if (!editor) {
            editor = await User.create({
                email: 'editor@rentbasket.com',
                password: 'editor123',
                name: 'Intern User',
                role: 'editor',
                loginStreak: 3,
                lastLogin: new Date()
            });
            console.log(`   ✅ Created editor: ${editor.email}`);
        } else {
            console.log(`   ℹ️  Editor already exists: ${editor.email}`);
        }

        // Count existing data
        const projectCount = await Project.countDocuments();
        const taskCount = await Task.countDocuments();
        const messageCount = await Message.countDocuments();
        const notificationCount = await Notification.countDocuments();

        console.log('\n📊 Current Database Status:');
        console.log(`   📁 Projects: ${projectCount}`);
        console.log(`   ✅ Tasks: ${taskCount}`);
        console.log(`   💬 Messages: ${messageCount}`);
        console.log(`   🔔 Notifications: ${notificationCount}`);

        console.log('\n🎉 Database setup complete! Your data is preserved.\n');
        console.log('Demo Accounts:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Admin:  admin@rentbasket.com / admin123');
        console.log('Editor: editor@rentbasket.com / editor123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seedData();

