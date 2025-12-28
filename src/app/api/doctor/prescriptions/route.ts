/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import Patient from '@/models/Patient';
import { authOptions } from '@/lib/auth';

// GET - Get all prescriptions with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const query: any = {
      isActive: true,
      doctorId: session.user.id,
    };

    // Status filter
    if (status && status !== 'ALL') {
      query.status = status;
    }

    // Patient filter
    if (patientId) {
      query.patientId = patientId;
    }

    // Search filter
    if (search) {
      const patientSearch = await Patient.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      })
        .select('_id')
        .lean();

      const patientIds = patientSearch.map(p => p._id);

      query.$or = [
        { prescriptionNumber: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } },
        { 'medications.name': { $regex: search, $options: 'i' } },
        { patientId: { $in: patientIds } },
      ];
    }

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    // Get prescriptions with pagination
    const prescriptions = await Prescription.find(query)
      .populate(
        'patientId',
        'firstName lastName email phone dateOfBirth gender'
      )
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Prescription.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: prescriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prescriptions' },
      { status: 500 }
    );
  }
}

// POST - Create new prescription
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      patientId,
      diagnosis,
      medications,
      notes,
      startDate,
      endDate,
      status = 'ACTIVE',
    } = body;

    // Validate required fields
    if (!patientId || !diagnosis || !medications || !startDate) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: patientId, diagnosis, medications, and startDate are required',
        },
        { status: 400 }
      );
    }

    // Validate medications array
    if (!Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json(
        { error: 'At least one medication is required' },
        { status: 400 }
      );
    }

    // Validate each medication
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      if (!med.name || !med.dosage || !med.frequency || !med.duration) {
        return NextResponse.json(
          {
            error: `Medication ${i + 1} is missing required fields: name, dosage, frequency, and duration are required`,
          },
          { status: 400 }
        );
      }
      if (!med.quantity || med.quantity <= 0) {
        return NextResponse.json(
          { error: `Medication ${i + 1}: quantity must be greater than 0` },
          { status: 400 }
        );
      }
    }

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Create new prescription
    const prescription = new Prescription({
      patientId,
      doctorId: session.user.id,
      diagnosis: diagnosis.trim(),
      medications: medications.map(med => ({
        name: med.name.trim(),
        dosage: med.dosage.trim(),
        frequency: med.frequency.trim(),
        duration: med.duration.trim(),
        instructions: med.instructions?.trim() || '',
        quantity: med.quantity,
        refills: med.refills || 0,
      })),
      notes: notes?.trim() || '',
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    });

    await prescription.save();

    // Populate the response
    const populatedPrescription = await Prescription.findById(prescription._id)
      .populate(
        'patientId',
        'firstName lastName email phone dateOfBirth gender'
      )
      .populate('doctorId', 'firstName lastName email specialty')
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: populatedPrescription,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating prescription:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Prescription number already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create prescription' },
      { status: 500 }
    );
  }
}
