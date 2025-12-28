import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MedicalHistory from '@/models/MedicalHistory';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;

    const medicalHistoryEntry = await MedicalHistory.findById(id).lean();

    if (!medicalHistoryEntry) {
      return NextResponse.json(
        { success: false, message: 'Medical history entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: medicalHistoryEntry,
    });
  } catch (error) {
    console.error('Error fetching medical history entry:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;
    const body = await _request.json();

    const existingEntry = await MedicalHistory.findById(id);

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, message: 'Medical history entry not found' },
        { status: 404 }
      );
    }

    if (body.status) {
      const validStatuses = ['active', 'resolved', 'chronic'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, message: 'Invalid status' },
          { status: 400 }
        );
      }
    }

    if (body.severity) {
      const validSeverities = ['mild', 'moderate', 'severe'];
      if (!validSeverities.includes(body.severity)) {
        return NextResponse.json(
          { success: false, message: 'Invalid severity' },
          { status: 400 }
        );
      }
    }

    if (body.diagnosisDate) {
      const diagnosisDate = new Date(body.diagnosisDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (diagnosisDate > today) {
        return NextResponse.json(
          { success: false, message: 'Diagnosis date cannot be in the future' },
          { status: 400 }
        );
      }
    }

    const updatedEntry = await MedicalHistory.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedEntry,
      message: 'Medical history entry updated successfully',
    });
  } catch (error) {
    console.error('Error updating medical history:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;

    const medicalHistoryEntry = await MedicalHistory.findById(id);

    if (!medicalHistoryEntry) {
      return NextResponse.json(
        { success: false, message: 'Medical history entry not found' },
        { status: 404 }
      );
    }

    await MedicalHistory.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Medical history entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting medical history:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
