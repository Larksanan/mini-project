import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import NotificationPreferences from '@/models/NotificationPreferences';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    let preferences = await NotificationPreferences.findOne({
      userId: session.user.id,
    }).lean();

    // Create default preferences if not found
    if (!preferences) {
      preferences = await NotificationPreferences.create({
        userId: session.user.id,
      });
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    await connectDB();

    const preferences = await NotificationPreferences.findOneAndUpdate(
      { userId: session.user.id },
      { $set: body },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
