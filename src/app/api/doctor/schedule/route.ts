/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Import models
let Schedule: any;
let Doctor: any;

try {
  Schedule = mongoose.models.Schedule || require('@/models/Schedule').default;
  Doctor = mongoose.models.Doctor || require('@/models/Doctor').default;
} catch (error) {
  console.error('Error loading models:', error);
}

// GET - Fetch doctor's schedule
export async function GET(request: NextRequest) {
  try {
    console.log('=== GET /api/doctor/schedule - Starting ===');

    // Ensure models are loaded
    if (!Schedule) {
      Schedule = require('@/models/Schedule').default;
    }
    if (!Doctor) {
      Doctor = require('@/models/Doctor').default;
    }

    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('No session found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'DOCTOR') {
      console.log('User is not a doctor:', session.user.role);
      return NextResponse.json(
        { success: false, error: 'Forbidden - Doctor access required' },
        { status: 403 }
      );
    }

    // Convert session user ID to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);
    console.log('User ObjectId:', userObjectId);

    // Find the Doctor document for this user
    const doctorDoc = await Doctor.findOne({ user: userObjectId }).lean();
    console.log('Doctor document found:', !!doctorDoc);

    if (!doctorDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor profile not found for this user',
          debug: {
            userId: session.user.id,
            userObjectId: userObjectId.toString(),
          },
        },
        { status: 404 }
      );
    }

    const doctorId = doctorDoc._id;
    console.log('Doctor ID:', doctorId);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const dayOfWeek = searchParams.get('dayOfWeek');
    const status = searchParams.get('status');

    // Build query
    const query: any = { doctor: doctorId };

    if (date) {
      // Get schedules for specific date
      const selectedDate = new Date(date);
      query.date = selectedDate;
    }

    if (dayOfWeek) {
      // Get schedules for specific day of week (e.g., "Monday")
      query.dayOfWeek = dayOfWeek;
    }

    if (status) {
      query.isActive = status === 'active';
    }

    console.log('Schedule query:', JSON.stringify(query, null, 2));

    // Fetch schedules
    const schedules = await Schedule.find(query)
      .populate({
        path: 'doctor',
        model: 'Doctor',
        select: 'user profile',
        populate: {
          path: 'user',
          model: 'User',
          select: 'name email phone',
        },
      })
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean()
      .exec();

    console.log(`Found ${schedules.length} schedules`);

    // Format the schedules
    const formattedSchedules = schedules.map((schedule: any) => ({
      _id: schedule._id?.toString() || '',
      id: schedule._id?.toString() || '',
      doctor: schedule.doctor
        ? {
            _id: schedule.doctor._id?.toString() || '',
            id: schedule.doctor._id?.toString() || '',
            name: schedule.doctor.user?.name || '',
            email: schedule.doctor.user?.email || '',
            phone: schedule.doctor.user?.phone || '',
            specialization: schedule.doctor.profile?.specialization || '',
            department: schedule.doctor.profile?.department || '',
          }
        : null,
      dayOfWeek: schedule.dayOfWeek || '',
      date: schedule.date
        ? new Date(schedule.date).toISOString().split('T')[0]
        : null,
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      slotDuration: schedule.slotDuration || 30,
      maxPatientsPerSlot: schedule.maxPatientsPerSlot || 1,
      breakTime: schedule.breakTime || null,
      isRecurring: schedule.isRecurring || false,
      isActive: schedule.isActive !== undefined ? schedule.isActive : true,
      notes: schedule.notes || '',
      createdAt: schedule.createdAt || null,
      updatedAt: schedule.updatedAt || null,
    }));

    console.log('=== GET /api/doctor/schedule - Success ===');

    return NextResponse.json(
      {
        success: true,
        data: formattedSchedules,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('=== GET /api/doctor/schedule - Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch schedules',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Create new schedule
export async function POST(request: NextRequest) {
  try {
    console.log('=== POST /api/doctor/schedule - Starting ===');

    // Ensure models are loaded
    if (!Schedule) {
      Schedule = require('@/models/Schedule').default;
    }
    if (!Doctor) {
      Doctor = require('@/models/Doctor').default;
    }

    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('No session found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'DOCTOR') {
      console.log('User is not a doctor:', session.user.role);
      return NextResponse.json(
        { success: false, error: 'Forbidden - Doctor access required' },
        { status: 403 }
      );
    }

    // Convert session user ID to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);
    console.log('User ObjectId:', userObjectId);

    // Find the Doctor document for this user
    const doctorDoc = await Doctor.findOne({ user: userObjectId }).lean();
    console.log('Doctor document found:', !!doctorDoc);

    if (!doctorDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor profile not found for this user',
        },
        { status: 404 }
      );
    }

    const doctorId = doctorDoc._id;
    console.log('Doctor ID:', doctorId);

    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);

    // Validate required fields
    const {
      dayOfWeek,
      date,
      startTime,
      endTime,
      slotDuration,
      maxPatientsPerSlot,
      breakTime,
      isRecurring,
      isActive,
      notes,
    } = body;

    if (!startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start time and end time are required',
        },
        { status: 400 }
      );
    }

    if (!dayOfWeek && !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either dayOfWeek or date must be provided',
        },
        { status: 400 }
      );
    }

    // Check for overlapping schedules
    const overlappingQuery: any = {
      doctor: doctorId,
      isActive: true,
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        },
      ],
    };

    if (date) {
      overlappingQuery.date = new Date(date);
    } else if (dayOfWeek) {
      overlappingQuery.dayOfWeek = dayOfWeek;
      overlappingQuery.isRecurring = true;
    }

    const overlapping = await Schedule.findOne(overlappingQuery);

    if (overlapping) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule overlaps with an existing schedule',
          details: {
            existingSchedule: {
              id: overlapping._id.toString(),
              dayOfWeek: overlapping.dayOfWeek,
              date: overlapping.date,
              startTime: overlapping.startTime,
              endTime: overlapping.endTime,
            },
          },
        },
        { status: 409 }
      );
    }

    // Create new schedule
    const scheduleData = {
      doctor: doctorId,
      dayOfWeek: dayOfWeek || null,
      date: date ? new Date(date) : null,
      startTime,
      endTime,
      slotDuration: slotDuration || 30,
      maxPatientsPerSlot: maxPatientsPerSlot || 1,
      breakTime: breakTime || null,
      isRecurring: isRecurring !== undefined ? isRecurring : false,
      isActive: isActive !== undefined ? isActive : true,
      notes: notes || '',
    };

    console.log('Creating schedule with data:', scheduleData);

    const newSchedule = new Schedule(scheduleData);
    await newSchedule.save();

    console.log('Schedule created with ID:', newSchedule._id);

    // Populate and return the created schedule
    const populatedSchedule = await Schedule.findById(newSchedule._id)
      .populate({
        path: 'doctor',
        model: 'Doctor',
        select: 'user profile',
        populate: {
          path: 'user',
          model: 'User',
          select: 'name email phone',
        },
      })
      .lean();

    const formattedSchedule = {
      _id: populatedSchedule._id?.toString() || '',
      id: populatedSchedule._id?.toString() || '',
      doctor: populatedSchedule.doctor
        ? {
            _id: populatedSchedule.doctor._id?.toString() || '',
            id: populatedSchedule.doctor._id?.toString() || '',
            name: populatedSchedule.doctor.user?.name || '',
            email: populatedSchedule.doctor.user?.email || '',
            phone: populatedSchedule.doctor.user?.phone || '',
            specialization:
              populatedSchedule.doctor.profile?.specialization || '',
            department: populatedSchedule.doctor.profile?.department || '',
          }
        : null,
      dayOfWeek: populatedSchedule.dayOfWeek || '',
      date: populatedSchedule.date
        ? new Date(populatedSchedule.date).toISOString().split('T')[0]
        : null,
      startTime: populatedSchedule.startTime || '',
      endTime: populatedSchedule.endTime || '',
      slotDuration: populatedSchedule.slotDuration || 30,
      maxPatientsPerSlot: populatedSchedule.maxPatientsPerSlot || 1,
      breakTime: populatedSchedule.breakTime || null,
      isRecurring: populatedSchedule.isRecurring || false,
      isActive:
        populatedSchedule.isActive !== undefined
          ? populatedSchedule.isActive
          : true,
      notes: populatedSchedule.notes || '',
      createdAt: populatedSchedule.createdAt || null,
      updatedAt: populatedSchedule.updatedAt || null,
    };

    console.log('=== POST /api/doctor/schedule - Success ===');

    return NextResponse.json(
      {
        success: true,
        message: 'Schedule created successfully',
        data: formattedSchedule,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('=== POST /api/doctor/schedule - Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create schedule',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH - Update existing schedule
export async function PATCH(request: NextRequest) {
  try {
    console.log('=== PATCH /api/doctor/schedule - Starting ===');

    // Ensure models are loaded
    if (!Schedule) {
      Schedule = require('@/models/Schedule').default;
    }
    if (!Doctor) {
      Doctor = require('@/models/Doctor').default;
    }

    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log('No session found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'DOCTOR') {
      console.log('User is not a doctor:', session.user.role);
      return NextResponse.json(
        { success: false, error: 'Forbidden - Doctor access required' },
        { status: 403 }
      );
    }

    // Convert session user ID to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);
    const doctorDoc = await Doctor.findOne({ user: userObjectId }).lean();

    if (!doctorDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor profile not found for this user',
        },
        { status: 404 }
      );
    }

    const doctorId = doctorDoc._id;

    // Parse request body
    const body = await request.json();
    const { scheduleId, ...updateData } = body;

    if (!scheduleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule ID is required',
        },
        { status: 400 }
      );
    }

    console.log('Updating schedule:', scheduleId);
    console.log('Update data:', updateData);

    // Find the schedule and verify ownership
    const schedule = await Schedule.findById(scheduleId);

    if (!schedule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule not found',
        },
        { status: 404 }
      );
    }

    if (schedule.doctor.toString() !== doctorId.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to update this schedule',
        },
        { status: 403 }
      );
    }

    // Update the schedule
    Object.keys(updateData).forEach(key => {
      if (key === 'date' && updateData[key]) {
        schedule[key] = new Date(updateData[key]);
      } else {
        schedule[key] = updateData[key];
      }
    });

    await schedule.save();

    console.log('Schedule updated successfully');

    // Populate and return the updated schedule
    const populatedSchedule = await Schedule.findById(scheduleId)
      .populate({
        path: 'doctor',
        model: 'Doctor',
        select: 'user profile',
        populate: {
          path: 'user',
          model: 'User',
          select: 'name email phone',
        },
      })
      .lean();

    const formattedSchedule = {
      _id: populatedSchedule._id?.toString() || '',
      id: populatedSchedule._id?.toString() || '',
      doctor: populatedSchedule.doctor
        ? {
            _id: populatedSchedule.doctor._id?.toString() || '',
            id: populatedSchedule.doctor._id?.toString() || '',
            name: populatedSchedule.doctor.user?.name || '',
            email: populatedSchedule.doctor.user?.email || '',
          }
        : null,
      dayOfWeek: populatedSchedule.dayOfWeek || '',
      date: populatedSchedule.date
        ? new Date(populatedSchedule.date).toISOString().split('T')[0]
        : null,
      startTime: populatedSchedule.startTime || '',
      endTime: populatedSchedule.endTime || '',
      slotDuration: populatedSchedule.slotDuration || 30,
      maxPatientsPerSlot: populatedSchedule.maxPatientsPerSlot || 1,
      breakTime: populatedSchedule.breakTime || null,
      isRecurring: populatedSchedule.isRecurring || false,
      isActive:
        populatedSchedule.isActive !== undefined
          ? populatedSchedule.isActive
          : true,
      notes: populatedSchedule.notes || '',
      updatedAt: populatedSchedule.updatedAt || null,
    };

    console.log('=== PATCH /api/doctor/schedule - Success ===');

    return NextResponse.json(
      {
        success: true,
        message: 'Schedule updated successfully',
        data: formattedSchedule,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('=== PATCH /api/doctor/schedule - Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update schedule',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a schedule
export async function DELETE(request: NextRequest) {
  try {
    console.log('=== DELETE /api/doctor/schedule - Starting ===');

    // Ensure models are loaded
    if (!Schedule) {
      Schedule = require('@/models/Schedule').default;
    }
    if (!Doctor) {
      Doctor = require('@/models/Doctor').default;
    }

    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'DOCTOR') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Doctor access required' },
        { status: 403 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(session.user.id);
    const doctorDoc = await Doctor.findOne({ user: userObjectId }).lean();

    if (!doctorDoc) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor profile not found for this user',
        },
        { status: 404 }
      );
    }

    const doctorId = doctorDoc._id;

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule ID is required',
        },
        { status: 400 }
      );
    }

    console.log('Deleting schedule:', scheduleId);

    // Find and verify ownership
    const schedule = await Schedule.findById(scheduleId);

    if (!schedule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Schedule not found',
        },
        { status: 404 }
      );
    }

    if (schedule.doctor.toString() !== doctorId.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to delete this schedule',
        },
        { status: 403 }
      );
    }

    // Delete the schedule
    await Schedule.findByIdAndDelete(scheduleId);

    console.log('=== DELETE /api/doctor/schedule - Success ===');

    return NextResponse.json(
      {
        success: true,
        message: 'Schedule deleted successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('=== DELETE /api/doctor/schedule - Error ===');
    console.error('Error message:', error.message);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete schedule',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
