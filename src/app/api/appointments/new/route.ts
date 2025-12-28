/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import Appointment from '@/models/Appointment';
import Doctor from '@/models/Doctor';
import Patient from '@/models/Patient';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('📦 Creating appointment with data:', body);

    const requiredFields = [
      'patientId',
      'doctorId',
      'appointmentDate',
      'appointmentTime',
      'type',
      'reason',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Verify patient exists
    const patient = await Patient.findById(body.patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, message: 'Patient not found' },
        { status: 404 }
      );
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(body.doctorId);
    if (!doctor) {
      return NextResponse.json(
        { success: false, message: 'Doctor not found' },
        { status: 404 }
      );
    }

    // Validate appointment date is not in the past
    const appointmentDate = new Date(body.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return NextResponse.json(
        { success: false, message: 'Appointment date cannot be in the past' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(body.appointmentTime)) {
      return NextResponse.json(
        { success: false, message: 'Invalid time format. Use HH:MM format' },
        { status: 400 }
      );
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      doctor: body.doctorId,
      appointmentDate: appointmentDate,
      appointmentTime: body.appointmentTime,
      status: { $nin: ['CANCELLED', 'COMPLETED'] },
      isActive: true,
    });

    if (conflictingAppointment) {
      return NextResponse.json(
        {
          success: false,
          message: 'This time slot is already booked for the selected doctor',
        },
        { status: 409 }
      );
    }

    // Create appointment data
    const appointmentData = {
      patient: body.patientId,
      doctor: body.doctorId, // Use doctorId from request, not session.user.id
      appointmentDate: appointmentDate,
      appointmentTime: body.appointmentTime,
      duration: body.duration || 30,
      type: body.type.toUpperCase(),
      status: body.status ? body.status.toUpperCase() : 'SCHEDULED',
      reason: body.reason,
      symptoms: body.symptoms || '',
      diagnosis: body.diagnosis || '',
      prescription: body.prescription || '',
      notes: body.notes || '',
      isActive: true,
    };

    console.log('💾 Saving appointment:', appointmentData);

    // Create and save appointment
    const appointment = new Appointment(appointmentData);
    await appointment.save();

    // Populate both patient and doctor details
    await appointment.populate([
      {
        path: 'patient',
        select: 'firstName lastName email phone nic dateOfBirth gender address',
      },
      {
        path: 'doctor',
        select: 'user profile',
        populate: {
          path: 'user',
          select: 'name email phone',
        },
      },
    ]);

    console.log('✅ Appointment created successfully:', appointment._id);

    // Format response
    const formattedAppointment = {
      _id: appointment._id.toString(),
      id: appointment._id.toString(),
      patient: appointment.patient,
      doctor: appointment.doctor
        ? {
            _id: appointment.doctor._id?.toString(),
            id: appointment.doctor._id?.toString(),
            name: (appointment.doctor as any).user?.name || '',
            email: (appointment.doctor as any).user?.email || '',
            phone: (appointment.doctor as any).user?.phone || '',
            specialization:
              (appointment.doctor as any).profile?.specialization || '',
            department: (appointment.doctor as any).profile?.department || '',
          }
        : null,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      duration: appointment.duration,
      type: appointment.type,
      status: appointment.status,
      reason: appointment.reason,
      symptoms: appointment.symptoms,
      diagnosis: appointment.diagnosis,
      prescription: appointment.prescription,
      notes: appointment.notes,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Appointment created successfully',
        data: formattedAppointment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error creating appointment:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
    });

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors)
        .map((err: any) => err.message)
        .join(', ');
      return NextResponse.json(
        {
          success: false,
          message: `Validation error: ${validationErrors}`,
        },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: 'An appointment already exists at this time',
        },
        { status: 409 }
      );
    }

    // Handle CastError (invalid ObjectId)
    if (error.name === 'CastError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid ID format provided',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to create appointment',
      },
      { status: 500 }
    );
  }
}
