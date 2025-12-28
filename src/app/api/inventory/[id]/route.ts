/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import User from '@/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/option';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

// GET - Get single inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized access',
        error: 'You must be logged in to view inventory items',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    if (!id) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Item ID is required',
        error: 'Please provide an item ID',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const inventoryItem = await Inventory.findById(id)
      .populate('pharmacy', 'name address contact')
      .populate('createdBy', 'name email')
      .lean();

    if (!inventoryItem) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Inventory item not found',
        error: 'No inventory item found with the provided ID',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const response: ApiResponse<typeof inventoryItem> = {
      success: true,
      data: inventoryItem,
      message: 'Inventory item fetched successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    const errorResponse: ApiResponse<null> = {
      success: false,
      message: 'Failed to fetch inventory item',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// PUT - Update inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized access',
        error: 'You must be logged in to update inventory items',
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

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Item ID is required',
        error: 'Please provide an item ID',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Find existing item
    const existingItem = await Inventory.findById(id);
    if (!existingItem) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Inventory item not found',
        error: 'No inventory item found with the provided ID',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Check if SKU is being changed and if new SKU already exists
    if (body.sku && body.sku !== existingItem.sku) {
      const skuExists = await Inventory.findOne({
        sku: body.sku.toUpperCase(),
        pharmacy: existingItem.pharmacy,
        _id: { $ne: id },
      });

      if (skuExists) {
        const errorResponse: ApiResponse<null> = {
          success: false,
          message: 'SKU already exists',
          error: 'An item with this SKU already exists in this pharmacy',
        };
        return NextResponse.json(errorResponse, { status: 409 });
      }
      body.sku = body.sku.toUpperCase();
    }

    // Check if barcode is being changed and if new barcode already exists
    if (body.barcode && body.barcode !== existingItem.barcode) {
      const barcodeExists = await Inventory.findOne({
        barcode: body.barcode.toUpperCase(),
        pharmacy: existingItem.pharmacy,
        _id: { $ne: id },
      });

      if (barcodeExists) {
        const errorResponse: ApiResponse<null> = {
          success: false,
          message: 'Barcode already exists',
          error: 'An item with this barcode already exists in this pharmacy',
        };
        return NextResponse.json(errorResponse, { status: 409 });
      }
      body.barcode = body.barcode.toUpperCase();
    }

    // Update item
    const updatedItem = await Inventory.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    )
      .populate('pharmacy', 'name address contact')
      .populate('createdBy', 'name email');

    const response: ApiResponse<typeof updatedItem> = {
      success: true,
      data: updatedItem,
      message: 'Inventory item updated successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error updating inventory item:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Validation failed',
        error: errors.join(', '),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse: ApiResponse<null> = {
      success: false,
      message: 'Failed to update inventory item',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// DELETE - Delete inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized access',
        error: 'You must be logged in to delete inventory items',
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

    const { id } = await params;

    if (!id) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Item ID is required',
        error: 'Please provide an item ID',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const deletedItem = await Inventory.findByIdAndDelete(id);

    if (!deletedItem) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Inventory item not found',
        error: 'No inventory item found with the provided ID',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Inventory item deleted successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    const errorResponse: ApiResponse<null> = {
      success: false,
      message: 'Failed to delete inventory item',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
