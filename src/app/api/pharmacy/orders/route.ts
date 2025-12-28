/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import Pharmacy from '@/models/Pharmacy';
import User from '@/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/option';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

// GET - Fetch all pharmacies
export async function GET(request: NextRequest): Promise<Response> {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100'); // Increased limit for dropdowns
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';

    const skip = (page - 1) * limit;

    // Build query
    const query: any = { status: 'active' }; // Only active pharmacies by default

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { pharmacistName: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // Execute query
    const pharmacies = await Pharmacy.find(query)
      .populate('createdBy', 'name email role')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Pharmacy.countDocuments(query);

    const response: ApiResponse<{
      pharmacies: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        pharmacies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Pharmacies fetched successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    const errorResponse: ApiResponse<null> = {
      success: false,
      message: 'Failed to fetch pharmacies',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// POST - Create a new pharmacy
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized access',
        error: 'You must be logged in to create a pharmacy',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'User not found',
        error: 'Unable to verify user account',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    if (!['ADMIN', 'PHARMACIST'].includes(user.role)) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Insufficient permissions',
        error: 'Only admins and pharmacists can create pharmacies',
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      address,
      phone,
      email,
      pharmacistName,
      licenseNumber,
      operatingHours,
      services,
      description,
    } = body;

    // Validate required fields
    if (!name || !address || !phone || !pharmacistName || !licenseNumber) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Missing required fields',
        error:
          'Name, address, phone, pharmacist name, and license number are required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Check for existing pharmacy
    const existingPharmacy = await Pharmacy.findOne({
      $or: [
        { name: name.trim() },
        { licenseNumber: licenseNumber.trim().toUpperCase() },
      ],
    });

    if (existingPharmacy) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Pharmacy already exists',
        error:
          existingPharmacy.name === name.trim()
            ? 'A pharmacy with this name already exists'
            : 'A pharmacy with this license number already exists',
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    // Create new pharmacy
    const newPharmacy = new Pharmacy({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      pharmacistName: pharmacistName.trim(),
      licenseNumber: licenseNumber.trim().toUpperCase(),
      operatingHours: operatingHours || {
        open: '08:00',
        close: '20:00',
        timezone: 'Asia/Colombo',
      },
      services: services || ['prescription', 'otc', 'delivery'],
      description: description?.trim(),
      status: 'active',
      createdBy: user._id,
    });

    await newPharmacy.save();
    await newPharmacy.populate('createdBy', 'name email role');

    const response: ApiResponse<typeof newPharmacy> = {
      success: true,
      data: newPharmacy,
      message: 'Pharmacy created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pharmacy:', error);

    if (error.code === 11000) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Pharmacy already exists',
        error: 'A pharmacy with this license number already exists',
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    const errorResponse: ApiResponse<null> = {
      success: false,
      message: 'Failed to create pharmacy',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
