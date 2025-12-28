// app/api/patients/stats/route.ts
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Patient from '@/models/Patient';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/patients/stats - Get patient statistics
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const allowedRoles = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Use the static method from Patient model
    const stats = await Patient.getPatientStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching patient stats:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
