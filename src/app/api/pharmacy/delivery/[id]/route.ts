import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/order';
import { authOptions } from '@/app/api/auth/[...nextauth]/option';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const deliveries = await Order.find({
      orderType: 'delivery',
      status: {
        $in: ['pending', 'confirmed', 'processing', 'ready', 'dispatched'],
      },
    })
      .populate('customer', 'name phone')
      .populate('items.product', 'name requiresPrescription')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: { deliveries },
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}
