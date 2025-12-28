import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import { authOptions } from '@/lib/auth';
import LabTestRequest from '@/models/LabTestRequest';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await context.params;

    const testRequest = await LabTestRequest.findById(id)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email')
      .populate('labTechnician', 'name email employeeId')
      .populate('test');

    if (!testRequest) {
      return NextResponse.json(
        { error: 'Test request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ testRequest });
  } catch (error) {
    console.error('Error fetching lab test request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await context.params;

    const body = await request.json();
    const testRequest = await LabTestRequest.findById(id);

    if (!testRequest) {
      return NextResponse.json(
        { error: 'Test request not found' },
        { status: 404 }
      );
    }

    if (body.status) {
      await testRequest.updateStatus(body.status);
    }

    if (body.results) testRequest.results = body.results;
    if (body.findings) testRequest.findings = body.findings;
    if (body.notes) testRequest.notes = body.notes;
    if (body.labTechnician) testRequest.labTechnician = body.labTechnician;
    if (body.priority) testRequest.priority = body.priority;

    await testRequest.save();

    await testRequest.populate([
      { path: 'patient', select: 'name email' },
      { path: 'doctor', select: 'name email' },
      { path: 'labTechnician', select: 'name email employeeId' },
      { path: 'test' },
    ]);

    return NextResponse.json({ testRequest });
  } catch (error) {
    console.error('Error updating lab test request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
