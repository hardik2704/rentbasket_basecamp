/**
 * RentBasket Project Management - Database Seed Script
 * Seeds initial admin and editor users
 * Now uses Supabase instead of MongoDB
 */

require('dotenv').config();
const { User, Project, Task, Message, Notification } = require('../models');
const { checkConnection } = require('../config/supabaseDb');

async function seed() {
    console.log('🌱 Starting database seed...\n');

    // Check Supabase connection
    const isConnected = await checkConnection();
    if (!isConnected) {
        console.error('❌ Cannot connect to Supabase. Please check your credentials.');
        process.exit(1);
    }

    try {
        // Check for existing admin
        const existingAdmin = await User.findOne({ email: 'admin@rentbasket.com' });

        if (!existingAdmin) {
            console.log('Creating admin user...');
            await User.create({
                email: 'admin@rentbasket.com',
                password: 'admin123',
                name: 'Admin User',
                role: 'admin'
            });
            console.log('✅ Admin user created: admin@rentbasket.com');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        // Check for existing editor
        const existingEditor = await User.findOne({ email: 'editor@rentbasket.com' });

        if (!existingEditor) {
            console.log('Creating editor user...');
            await User.create({
                email: 'editor@rentbasket.com',
                password: 'editor123',
                name: 'Editor User',
                role: 'editor'
            });
            console.log('✅ Editor user created: editor@rentbasket.com');
        } else {
            console.log('ℹ️  Editor user already exists');
        }

        // Show current database stats
        console.log('\n📊 Current Database Status:');
        console.log(`   Users: ${await User.countDocuments()}`);

        console.log('\n✅ Seed completed successfully!');
        console.log('\nDefault credentials:');
        console.log('   Admin: admin@rentbasket.com / admin123');
        console.log('   Editor: editor@rentbasket.com / editor123');

    } catch (error) {
        console.error('❌ Seed error:', error.message);
        throw error;
    }
}

// Run seed
seed()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    });
