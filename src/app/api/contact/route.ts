import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';

// Define ContactMessage schema if it doesn't exist
const ContactMessageSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

const ContactMessage =
  mongoose.models.ContactMessage ||
  mongoose.model('ContactMessage', ContactMessageSchema);

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { phone, message, timestamp } = await request.json();

    // Validate required fields
    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone and message are required' },
        { status: 400 }
      );
    }

    // Save to MongoDB
    await ContactMessage.create({
      phone,
      message,
      timestamp: timestamp || new Date(),
    });

    // Send SMS via Twilio
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: process.env.TWILIO_PHONE_NUMBER || '',
          Body: `New message: ${message}`,
        }),
      }
    );

    if (!twilioResponse.ok) {
      console.error('Twilio error:', await twilioResponse.text());
      return NextResponse.json(
        { success: false, error: 'Failed to send SMS' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Message sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
