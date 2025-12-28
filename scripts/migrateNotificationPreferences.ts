// scripts/migrateNotificationPreferences.ts
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const defaultPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  inAppNotifications: true,
  appointmentReminders: true,
  messageAlerts: true,
  systemUpdates: true,
  marketingEmails: false,
};

const userSchema = new mongoose.Schema({
  notificationPreferences: {
    type: Object,
    default: defaultPreferences,
  },
});

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  console.log('🔍 Checking for MONGODB_URI...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MONGODB_URI exists: ${!!mongoUri}`);

  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not defined');
    console.log('\n📝 Troubleshooting steps:');
    console.log('1. Check if .env.local exists in project root');
    console.log('2. Verify MONGODB_URI is set in .env.local');
    console.log('3. Format should be: MONGODB_URI=mongodb://...');
    console.log(`4. Current working directory: ${process.cwd()}`);
    process.exit(1);
  }

  if (mongoose.connection.readyState >= 1) {
    console.log('Already connected to MongoDB');
    return;
  }

  console.log(' Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log(' Connected to MongoDB');
}

async function migrateNotificationPreferences() {
  try {
    console.log('Starting Notification Preferences Migration...');
    console.log('━'.repeat(50));

    await connectDB();

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    console.log('Analyzing database...');

    const usersWithoutPrefs = await User.countDocuments({
      $or: [
        { notificationPreferences: { $exists: false } },
        { notificationPreferences: null },
      ],
    });

    const totalUsers = await User.countDocuments();

    console.log(`Total users: ${totalUsers}`);
    console.log(`Users without preferences: ${usersWithoutPrefs}`);
    console.log(`Users with preferences: ${totalUsers - usersWithoutPrefs}`);
    console.log('━'.repeat(50));

    if (usersWithoutPrefs === 0) {
      console.log('✨ All users already have notification preferences!');
      console.log('No migration needed.');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`Updating ${usersWithoutPrefs} users...`);

    const result = await User.updateMany(
      {
        $or: [
          { notificationPreferences: { $exists: false } },
          { notificationPreferences: null },
        ],
      },
      {
        $set: { notificationPreferences: defaultPreferences },
      }
    );

    console.log('━'.repeat(50));
    console.log(`✅ Successfully updated ${result.modifiedCount} users`);
    console.log('🎉 Migration completed successfully!');
    console.log('━'.repeat(50));

    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('━'.repeat(50));
    console.error('❌ Migration failed with error:');
    console.error(error);
    console.error('━'.repeat(50));

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Disconnected from MongoDB');
    }
    process.exit(1);
  }
}

console.log('Starting migration script...');
console.log(`Working directory: ${process.cwd()}`);
migrateNotificationPreferences();
