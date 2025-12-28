/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import LabTechnician from '@/models/LabTechnician';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const specialization = searchParams.get('specialization');
    const availableOnly = searchParams.get('availableOnly') === 'true';

    const query: any = {};

    if (specialization) {
      query.specialization = specialization;
    }

    if (availableOnly) {
      query.isAvailable = true;
      query.currentWorkload = { $lt: '$maxConcurrentTests' };
    }

    const technicians = await LabTechnician.find(query)
      .populate('user', 'name email phone')
      .sort({ currentWorkload: 1, performanceScore: -1 });

    return NextResponse.json({ technicians });
  } catch (error) {
    console.error('Error fetching lab technicians:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const technician = new LabTechnician(body);
    await technician.save();

    await technician.populate('user', 'name email phone');

    return NextResponse.json({ technician }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lab technician:', error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Employee ID or user already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
