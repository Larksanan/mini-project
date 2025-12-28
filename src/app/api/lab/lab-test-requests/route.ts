/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/lab-test-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import LabTestRequest from '@/models/LabTestRequest';

// GET all lab test requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const technicianId = searchParams.get('technicianId');

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (patientId) {
      query.patient = patientId;
    }

    if (technicianId) {
      query.labTechnician = technicianId;
    }

    const requests = await LabTestRequest.find(query)
      .populate('patient', 'name email')
      .populate('doctor', 'name email')
      .populate('labTechnician', 'name email')
      .populate('test')
      .sort({ requestedDate: -1 });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching lab test requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new lab test request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['DOCTOR', 'ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();

    const testRequest = new LabTestRequest({
      ...body,
      doctor: session.user.id,
    });

    await testRequest.save();

    await testRequest.populate([
      { path: 'patient', select: 'name email' },
      { path: 'test' },
    ]);

    return NextResponse.json({ testRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating lab test request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
