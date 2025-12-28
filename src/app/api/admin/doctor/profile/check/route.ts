import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Doctor from '@/models/Doctor';

export async function GET() {
  try {
    console.log('🔄 Starting doctor profile check...');

    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // Get session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('❌ No session found');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role || 'DOCTOR';

    console.log('👤 User info:', {
      userId,
      userRole,
      email: session.user.email,
      name: session.user.name,
    });

    // Check if user is actually a doctor
    if (userRole !== 'DOCTOR') {
      console.log(`❌ User role is ${userRole}, not DOCTOR`);
      return NextResponse.json(
        {
          success: false,
          message: 'User is not a doctor',
          role: userRole,
        },
        { status: 400 }
      );
    }

    // Check if doctor profile exists
    console.log(`🔍 Checking for doctor profile with user ID: ${userId}`);
    const existingDoctor = await Doctor.findOne({ user: userId });

    if (existingDoctor) {
      console.log('✅ Doctor profile found:', existingDoctor._id);
      return NextResponse.json({
        success: true,
        hasProfile: true,
        doctor: {
          _id: existingDoctor._id,
          specialization: existingDoctor.profile?.specialization || '',
          department: existingDoctor.profile?.department || '',
        },
        message: 'Doctor profile exists',
      });
    }

    console.log('⚠️ No doctor profile found, creating one...');

    // Get user info from session
    const userName =
      session.user.name || session.user.email?.split('@')[0] || 'Doctor';
    const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

    // Create a default doctor profile
    const doctorData = {
      user: userId,
      profile: {
        specialization: 'General Physician',
        department: 'General Medicine',
        qualifications: ['MBBS'],
        experience: 0,
        bio: `Dr. ${formattedName} - Profile auto-created`,
        consultationFee: 0,
      },
      isActive: true,
      consultationHours: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: { start: '09:00', end: '13:00' },
        sunday: { start: '00:00', end: '00:00', isOff: true },
      },
    };

    console.log('📝 Creating doctor profile with data:', doctorData);

    const newDoctor = await Doctor.create(doctorData);

    console.log('✅ Doctor profile created:', newDoctor._id);

    return NextResponse.json({
      success: true,
      hasProfile: true,
      created: true,
      doctor: {
        _id: newDoctor._id,
        specialization: newDoctor.profile?.specialization || '',
        department: newDoctor.profile?.department || '',
      },
      message: 'Doctor profile created successfully',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ Error in doctor profile check:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check/create doctor profile',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
        }),
      },
      { status: 500 }
    );
  }
}
