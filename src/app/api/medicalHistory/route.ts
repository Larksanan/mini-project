// app/api/medicalHistory/route.ts
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
    const status = searchParams.get('status');
    const condition = searchParams.get('condition');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    if (patientId) {
      query.patientId = patientId;
    }

    if (status) {
      query.status = status;
    }

    if (condition) {
      query.condition = { $regex: condition, $options: 'i' };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch medical history with pagination
    const medicalHistory = await MedicalHistory.find(query)
      .sort({ diagnosisDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await MedicalHistory.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: medicalHistory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching medical history:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    // Validation
    const requiredFields = [
      'patientId',
      'condition',
      'diagnosisDate',
      'status',
      'severity',
    ];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['active', 'resolved', 'chronic'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }

    // Validate severity
    const validSeverities = ['mild', 'moderate', 'severe'];
    if (!validSeverities.includes(body.severity)) {
      return NextResponse.json(
        { success: false, message: 'Invalid severity' },
        { status: 400 }
      );
    }

    // Validate diagnosis date is not in the future
    const diagnosisDate = new Date(body.diagnosisDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (diagnosisDate > today) {
      return NextResponse.json(
        { success: false, message: 'Diagnosis date cannot be in the future' },
        { status: 400 }
      );
    }

    // Create new medical history entry
    const medicalHistoryEntry = new MedicalHistory({
      ...body,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await medicalHistoryEntry.save();

    return NextResponse.json(
      {
        success: true,
        data: medicalHistoryEntry,
        message: 'Medical history entry created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating medical history:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
