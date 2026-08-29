const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: __dirname + '/../.env' }); // or root .env
require('dotenv').config({ path: __dirname + '/../../.env' }); // fallback to root

const User = require('../models/User');

const seedOwner = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('No MONGODB_URI found in environment.');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const ownerEmail = 'khanahub@gmail.com';
    const existingOwner = await User.findOne({ email: ownerEmail });

    if (existingOwner) {
      console.log('Account khanahub@gmail.com already exists.');
      if (existingOwner.role !== 'owner') {
        existingOwner.role = 'owner';
        await existingOwner.save();
        console.log('Updated role to owner.');
      } else {
        console.log('Role is already owner.');
      }
    } else {
      const hashedPassword = await bcrypt.hash('admin', 10);
      const newOwner = new User({
        name: 'KhanaHub Owner',
        email: ownerEmail,
        password: hashedPassword,
        isEmailVerified: true,
        authProvider: 'email',
        role: 'owner'
      });
      await newOwner.save();
      console.log('Owner account created safely.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error seeding owner:', err);
    process.exit(1);
  }
};

seedOwner();
