// app/api/medicalHistory/status/route.ts
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MedicalHistory from '@/models/MedicalHistory';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { success: false, message: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Get status counts
    const statusCounts = await MedicalHistory.aggregate([
      {
        $match: { patientId },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get severity counts
    const severityCounts = await MedicalHistory.aggregate([
      {
        $match: { patientId },
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent conditions
    const recentConditions = await MedicalHistory.find({ patientId })
      .sort({ diagnosisDate: -1 })
      .limit(5)
      .select('condition diagnosisDate status severity')
      .lean();

    // Get active conditions
    const activeConditions = await MedicalHistory.countDocuments({
      patientId,
      status: 'active',
    });

    // Get chronic conditions
    const chronicConditions = await MedicalHistory.countDocuments({
      patientId,
      status: 'chronic',
    });

    // Format the response
    const statusSummary = {
      active: statusCounts.find(item => item._id === 'active')?.count || 0,
      resolved: statusCounts.find(item => item._id === 'resolved')?.count || 0,
      chronic: statusCounts.find(item => item._id === 'chronic')?.count || 0,
      mild: severityCounts.find(item => item._id === 'mild')?.count || 0,
      moderate:
        severityCounts.find(item => item._id === 'moderate')?.count || 0,
      severe: severityCounts.find(item => item._id === 'severe')?.count || 0,
      total: await MedicalHistory.countDocuments({ patientId }),
      activeConditions,
      chronicConditions,
      recentConditions,
    };

    return NextResponse.json({
      success: true,
      data: statusSummary,
    });
  } catch (error) {
    console.error('Error fetching medical history status:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
