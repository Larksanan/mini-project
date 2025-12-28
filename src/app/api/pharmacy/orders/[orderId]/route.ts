import { authOptions } from '@/app/api/auth/[...nextauth]/option';
import Order from '@/models/order';
import { connectDB } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await context.params;

    const order = await Order.findById(orderId)
      .populate('customer', 'name email phone')
      .populate('pharmacy', 'name address phone')
      .populate('items.product', 'name price image requiresPrescription')
      .populate('createdBy', 'name email');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await context.params;

    const body = await request.json();
    const { status, paymentStatus, driver, estimatedDelivery, notes } = body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(driver && { driver }),
        ...(estimatedDelivery && { estimatedDelivery }),
        ...(notes && { notes }),
        updatedBy: session.user.id,
      },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone')
      .populate('pharmacy', 'name address phone')
      .populate('items.product', 'name price image requiresPrescription');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await context.params;

    const order = await Order.findByIdAndDelete(orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
