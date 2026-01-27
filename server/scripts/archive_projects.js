const mongoose = require('mongoose');
const { Project } = require('../models');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbasket');
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
};

const updateProjects = async () => {
    await connectDB();

    try {
        const projects = await Project.find({}).sort({ createdAt: 1 });
        console.log(`Total projects in DB: ${projects.length}`);

        projects.forEach(p => console.log(`- ${p.name} [${p.status}]`));

        const activeProjects = projects.filter(p => !p.status || p.status === 'active');
        console.log(`Active count: ${activeProjects.length}`);

        if (activeProjects.length <= 2) {
            // Force create dummy projects if needed? 
            // Or maybe they are just marked wrong.
        }

        if (activeProjects.length > 2) {
            const toArchive = activeProjects.slice(0, activeProjects.length - 2);
            console.log(`Archiving ${toArchive.length} projects...`);
            for (const p of toArchive) {
                p.status = 'completed';
                await p.save();
            }
            console.log('Update complete.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error updating projects:', error);
        process.exit(1);
    }
};

updateProjects();
