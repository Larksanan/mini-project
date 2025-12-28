import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import LabTechnician from '@/models/LabTechnician';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET specific lab technician
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;

    const technician = await LabTechnician.findById(id)
      .populate('user', 'name email phone profileImage')
      .select('-__v');

    if (!technician) {
      return NextResponse.json(
        { error: 'Lab technician not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ technician });
  } catch (error) {
    console.error('Error fetching lab technician:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['ADMIN', 'LABTECH'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await context.params;

    await connectDB();

    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user, employeeId, _id, createdAt, updatedAt, ...updateData } = body;

    const technician = await LabTechnician.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email phone profileImage');

    if (!technician) {
      return NextResponse.json(
        { error: 'Lab technician not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ technician });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error updating lab technician:', error);

    if (error.name === 'ValidationError') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation error', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE lab technician
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;

    const technician = await LabTechnician.findByIdAndDelete(id);

    if (!technician) {
      return NextResponse.json(
        { error: 'Lab technician not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Lab technician deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting lab technician:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
