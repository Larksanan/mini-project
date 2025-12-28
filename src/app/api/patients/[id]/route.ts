import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    await connectDB();

    // Try to find by _id first (if it's a valid ObjectId)
    let patient;
    if (Types.ObjectId.isValid(id)) {
      patient = await Patient.findById(id)
        .populate('createdBy', 'name email role')
        .lean();
    }

    // If not found by _id, try to find by userId (createdBy field)
    if (!patient) {
      patient = await Patient.findOne({ createdBy: id })
        .populate('createdBy', 'name email role')
        .lean();
    }

    if (!patient) {
      return NextResponse.json(
        { success: false, message: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    await connectDB();

    const body = await request.json();

    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email role');

    if (!updatedPatient) {
      return NextResponse.json(
        { success: false, message: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedPatient,
      message: 'Patient updated successfully',
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid patient ID' },
        { status: 400 }
      );
    }

    await connectDB();

    const patient = await Patient.findById(id);

    if (!patient) {
      return NextResponse.json(
        { success: false, message: 'Patient not found' },
        { status: 404 }
      );
    }

    await Patient.findByIdAndUpdate(id, {
      isActive: false,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
