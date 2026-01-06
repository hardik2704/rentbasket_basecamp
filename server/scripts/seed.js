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

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Project.deleteMany({});
        await Task.deleteMany({});
        await Message.deleteMany({});
        await Notification.deleteMany({});

        // Create users
        console.log('👥 Creating users...');

        const admin = await User.create({
            email: 'admin@rentbasket.com',
            password: 'admin123',
            name: 'Hardik (Admin)',
            role: 'admin',
            loginStreak: 7,
            lastLogin: new Date()
        });

        const editor = await User.create({
            email: 'editor@rentbasket.com',
            password: 'editor123',
            name: 'Intern User',
            role: 'editor',
            loginStreak: 3,
            lastLogin: new Date()
        });

        console.log(`   ✅ Created admin: ${admin.email}`);
        console.log(`   ✅ Created editor: ${editor.email}`);

        // Create projects
        console.log('📁 Creating projects...');

        const websiteProject = await Project.create({
            name: 'Website Redesign',
            description: 'Complete overhaul of the RentBasket website with new UI/UX',
            category: 'tech',
            createdBy: admin._id,
            members: [
                { user: admin._id, role: 'owner' },
                { user: editor._id, role: 'member' }
            ]
        });

        const marketingProject = await Project.create({
            name: 'New Year Campaign',
            description: 'Marketing campaign for Q1 2026 with promotional offers',
            category: 'marketing',
            createdBy: admin._id,
            members: [
                { user: admin._id, role: 'owner' },
                { user: editor._id, role: 'member' }
            ]
        });

        const opsProject = await Project.create({
            name: 'Inventory System',
            description: 'Automate inventory tracking and management',
            category: 'ops',
            createdBy: admin._id,
            members: [
                { user: admin._id, role: 'owner' }
            ]
        });

        console.log(`   ✅ Created ${3} projects`);

        // Create tasks
        console.log('✅ Creating tasks...');

        const tasks = await Task.insertMany([
            // Website Redesign tasks
            {
                project: websiteProject._id,
                title: 'Design new homepage mockup',
                description: 'Create Figma mockups for the new homepage design',
                status: 'done',
                priority: 'high',
                assignedTo: editor._id,
                dueDate: new Date('2026-01-05'),
                completedAt: new Date('2026-01-03'),
                createdBy: admin._id
            },
            {
                project: websiteProject._id,
                title: 'Implement responsive navigation',
                description: 'Build mobile-friendly navigation component',
                status: 'in_progress',
                priority: 'high',
                assignedTo: admin._id,
                dueDate: new Date('2026-01-10'),
                createdBy: admin._id
            },
            {
                project: websiteProject._id,
                title: 'Setup CI/CD pipeline',
                description: 'Configure GitHub Actions for automated deployments',
                status: 'new',
                priority: 'medium',
                assignedTo: admin._id,
                dueDate: new Date('2026-01-15'),
                createdBy: admin._id
            },
            {
                project: websiteProject._id,
                title: 'Add dark mode support',
                description: 'Implement dark mode theme toggle',
                status: 'new',
                priority: 'low',
                dueDate: new Date('2026-01-20'),
                createdBy: admin._id
            },
            // Marketing Campaign tasks
            {
                project: marketingProject._id,
                title: 'Create social media content calendar',
                description: 'Plan posts for January-March 2026',
                status: 'in_progress',
                priority: 'high',
                assignedTo: editor._id,
                dueDate: new Date('2026-01-08'),
                createdBy: admin._id
            },
            {
                project: marketingProject._id,
                title: 'Design promotional banners',
                description: 'Create banners for website and social media',
                status: 'new',
                priority: 'medium',
                assignedTo: editor._id,
                dueDate: new Date('2026-01-12'),
                createdBy: admin._id
            },
            // Ops tasks
            {
                project: opsProject._id,
                title: 'Document current inventory process',
                description: 'Map out existing workflow and pain points',
                status: 'done',
                priority: 'medium',
                assignedTo: admin._id,
                dueDate: new Date('2026-01-02'),
                completedAt: new Date('2026-01-01'),
                createdBy: admin._id
            },
            {
                project: opsProject._id,
                title: 'Research inventory management tools',
                description: 'Compare different solutions and pricing',
                status: 'in_progress',
                priority: 'high',
                assignedTo: admin._id,
                dueDate: new Date('2026-01-07'),
                createdBy: admin._id
            }
        ]);

        console.log(`   ✅ Created ${tasks.length} tasks`);

        // Create messages
        console.log('💬 Creating chat messages...');

        const messages = await Message.insertMany([
            {
                project: websiteProject._id,
                sender: admin._id,
                content: 'Hey team! Let\'s kick off the website redesign project. 🚀',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
            },
            {
                project: websiteProject._id,
                sender: editor._id,
                content: 'Excited to be part of this! I\'ll start with the homepage mockups.',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000)
            },
            {
                project: websiteProject._id,
                sender: admin._id,
                content: '@Intern great! Focus on mobile-first design please.',
                mentions: [editor._id],
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                project: websiteProject._id,
                sender: editor._id,
                content: 'Done with the mockups! Check them out in Figma. ✅',
                createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
            },
            {
                project: marketingProject._id,
                sender: admin._id,
                content: 'We need to finalize the Q1 campaign strategy by next week.',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                project: marketingProject._id,
                sender: editor._id,
                content: 'I\'ve drafted the content calendar, will share it today!',
                createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
            }
        ]);

        console.log(`   ✅ Created ${messages.length} messages`);

        // Create notifications
        console.log('🔔 Creating notifications...');

        const notifications = await Notification.insertMany([
            {
                user: editor._id,
                type: 'task_assigned',
                title: 'New Task Assigned',
                message: 'You\'ve been assigned to "Design new homepage mockup"',
                project: websiteProject._id,
                triggeredBy: admin._id,
                read: true,
                readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                user: editor._id,
                type: 'message_mention',
                title: 'You were mentioned',
                message: 'Hardik (Admin) mentioned you in Website Redesign',
                project: websiteProject._id,
                triggeredBy: admin._id,
                read: false
            },
            {
                user: admin._id,
                type: 'task_completed',
                title: 'Task Completed',
                message: 'Intern User completed "Design new homepage mockup"',
                project: websiteProject._id,
                triggeredBy: editor._id,
                read: false
            }
        ]);

        console.log(`   ✅ Created ${notifications.length} notifications`);

        console.log('\n🎉 Database seeded successfully!\n');
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
