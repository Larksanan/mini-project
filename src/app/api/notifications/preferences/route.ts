/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const defaultPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  inAppNotifications: true,
  appointmentReminders: true,
  messageAlerts: true,
  systemUpdates: true,
  marketingEmails: false,
};

export async function GET() {
  try {
    console.log('Step 1: Getting session...');
    const session = await getServerSession(authOptions);
    console.log(
      'Session:',
      JSON.stringify(
        {
          exists: !!session,
          hasUser: !!session?.user,
          hasId: !!session?.user?.id,
          userId: session?.user?.id || 'N/A',
          email: session?.user?.email || 'N/A',
        },
        null,
        2
      )
    );

    if (!session?.user?.id) {
      console.log(' FAILED: No session or user ID');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No session or user ID' },
        { status: 401 }
      );
    }

    await connectDB();
    console.log(' Database connected');

    console.log('\n Finding user with ID:', session.user.id);
    const user = await User.findById(session.user.id).select(
      'notificationPreferences'
    );

    console.log('User query result:', {
      found: !!user,
      userId: user?._id?.toString() || 'N/A',
      hasPreferences: !!user?.notificationPreferences,
      preferences: user?.notificationPreferences || 'none',
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Step 4: Prepare preferences
    console.log('\nStep 4: Preparing preferences...');
    const preferences = user.notificationPreferences
      ? { ...defaultPreferences, ...user.notificationPreferences }
      : defaultPreferences;

    console.log('Final preferences:', preferences);
    console.log('✅ SUCCESS\n');

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    console.error('\n========================================');
    console.error('❌ ERROR in GET /api/notifications/preferences');
    console.error('========================================');
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error(
      'Full error object:',
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    );
    console.error('========================================\n');

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        details:
          process.env.NODE_ENV === 'development'
            ? {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('FAILED: No session or user ID');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.log('Session found, user ID:', session.user.id);
    let preferences;
    try {
      preferences = await request.json();
      console.log('Preferences received:', preferences);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (parseError) {
      console.log('FAILED: Invalid JSON');
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.log('\nStep 3: Validating preferences...');
    const validKeys = [
      'emailNotifications',
      'pushNotifications',
      'inAppNotifications',
      'appointmentReminders',
      'messageAlerts',
      'systemUpdates',
      'marketingEmails',
    ];

    const receivedKeys = Object.keys(preferences);
    const invalidKeys = receivedKeys.filter(key => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      console.log(' Invalid keys:', invalidKeys);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid preference keys: ${invalidKeys.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate all values are booleans
    for (const [key, value] of Object.entries(preferences)) {
      if (typeof value !== 'boolean') {
        console.log(`Invalid value type for ${key}:`, typeof value);
        return NextResponse.json(
          {
            success: false,
            error: `Invalid value for ${key}: expected boolean, got ${typeof value}`,
          },
          { status: 400 }
        );
      }
    }
    console.log('✅ Validation passed');

    // Step 4: Connect to database
    console.log('\nStep 4: Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    // Step 5: Update user
    console.log('\nStep 5: Updating user preferences...');
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: { notificationPreferences: preferences } },
      { new: true, runValidators: true }
    ).select('notificationPreferences');

    if (!user) {
      console.log('FAILED: User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(' User updated successfully');
    console.log('Updated preferences:', user.notificationPreferences);
    console.log('SUCCESS\n');

    return NextResponse.json({
      success: true,
      data: user.notificationPreferences || preferences,
      message: 'Preferences updated successfully',
    });
  } catch (error: any) {
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error(
      'Full error object:',
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        details:
          process.env.NODE_ENV === 'development'
            ? {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}
