// app/api/doctor/profile/stats/oute.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/option';

export async function GET() {
  try {
    // Pass authOptions to getServerSession
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'DOCTOR') {
      return NextResponse.json(
        { error: 'Forbidden - Doctor access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const doctor = (await User.findById(session.user.id)
      .select('-password -__v')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .lean()) as any;

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // Ensure all required fields have default values
    const profileWithDefaults = {
      ...doctor,
      availableHours: doctor.availableHours || {
        start: '09:00',
        end: '17:00',
      },
      workingDays: doctor.workingDays || [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
      ],
      consultationFee: doctor.consultationFee || 0,
      bio: doctor.bio || '',
      specialization: doctor.specialization || 'General Practitioner',
      hospital: doctor.hospital || 'Medical Center',
      licenseNumber: doctor.licenseNumber || 'Not provided',
      experience: doctor.experience || 0,
      education: doctor.education || [],
      awards: doctor.awards || [],
      profilePicture: doctor.profilePicture || null,
    };

    return NextResponse.json({
      success: true,
      data: profileWithDefaults,
    });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
