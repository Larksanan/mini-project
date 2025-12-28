/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import Pharmacy from '@/models/Pharmacy';
import User from '@/models/User';
import { authOptions } from '@/app/api/auth/[...nextauth]/option';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

// Helper function to serialize product data
const serializeProduct = (product: any) => {
  const productObj = product.toObject ? product.toObject() : product;

  return {
    ...productObj,
    id: productObj._id?.toString(),
    _id: undefined,
    __v: undefined,
    pharmacy: productObj.pharmacy
      ? {
          id: productObj.pharmacy._id?.toString(),
          name: productObj.pharmacy.name,
          address: productObj.pharmacy.address,
        }
      : productObj.pharmacy,
    createdBy: productObj.createdBy
      ? {
          id: productObj.createdBy._id?.toString(),
          name: productObj.createdBy.name,
          email: productObj.createdBy.email,
          role: productObj.createdBy.role,
        }
      : productObj.createdBy,
    // Add virtuals
    availableQuantity:
      productObj.availableQuantity ||
      productObj.stockQuantity - productObj.reservedQuantity,
    isLowStock:
      productObj.isLowStock ||
      productObj.stockQuantity - productObj.reservedQuantity <=
        productObj.minStockLevel,
    profitMargin:
      productObj.profitMargin ||
      (productObj.costPrice === 0
        ? 0
        : ((productObj.price - productObj.costPrice) / productObj.costPrice) *
          100),
    createdAt: productObj.createdAt,
    updatedAt: productObj.updatedAt,
  };
};

// POST - Create a new product
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized access',
        error: 'You must be logged in to create a product',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    await connectDB();

    // Get user from database
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'User not found',
        error: 'Unable to verify user account',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Check if user has permission to create product
    if (!['ADMIN', 'PHARMACIST'].includes(user.role)) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Insufficient permissions',
        error: 'Only admins and pharmacists can create products',
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields based on your model
    const requiredFields = [
      'name',
      'description',
      'price',
      'category',
      'image',
      'stockQuantity',
      'pharmacy',
      'sku',
      'manufacturer',
      'barcode',
    ];

    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Missing required fields',
        error: `Missing: ${missingFields.join(', ')}`,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate price
    if (parseFloat(body.price) <= 0) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Invalid price',
        error: 'Price must be greater than 0',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate stock quantity
    if (parseInt(body.stockQuantity) < 0) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Invalid stock quantity',
        error: 'Stock quantity cannot be negative',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Check if pharmacy exists
    const pharmacy = await Pharmacy.findById(body.pharmacy);
    if (!pharmacy) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Pharmacy not found',
        error: 'The selected pharmacy does not exist',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Check user access to pharmacy
    if (user.role === 'PHARMACIST') {
      const hasAccess = await Pharmacy.findOne({
        _id: body.pharmacy,
        $or: [{ createdBy: user._id }, { pharmacists: { $in: [user._id] } }],
      });

      if (!hasAccess) {
        const errorResponse: ApiResponse<null> = {
          success: false,
          message: 'Access denied',
          error: 'You can only add products to your assigned pharmacy',
        };
        return NextResponse.json(errorResponse, { status: 403 });
      }
    }

    // Check for existing products
    const [existingBySKU, existingByName, existingByBarcode] =
      await Promise.all([
        Product.findOne({
          sku: body.sku.trim().toUpperCase(),
          pharmacy: body.pharmacy,
        }),
        Product.findOne({ name: body.name.trim(), pharmacy: body.pharmacy }),
        Product.findOne({
          barcode: body.barcode.trim(),
          pharmacy: body.pharmacy,
        }),
      ]);

    if (existingBySKU) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'SKU already exists',
        error: 'A product with this SKU already exists in this pharmacy',
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    if (existingByName) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Product name already exists',
        error: 'A product with this name already exists in this pharmacy',
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    if (existingByBarcode) {
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Barcode already exists',
        error: 'A product with this barcode already exists in this pharmacy',
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

    // Prepare product data according to your model
    const productData = {
      name: body.name.trim(),
      description: body.description.trim(),
      price: parseFloat(body.price),
      costPrice: body.costPrice ? parseFloat(body.costPrice) : 0,
      category: body.category.trim(),
      image: body.image, // Base64 string
      inStock: body.inStock !== undefined ? body.inStock : true,
      stockQuantity: parseInt(body.stockQuantity) || 0,
      reservedQuantity: 0, // Default to 0 for new products
      minStockLevel: parseInt(body.minStockLevel) || 10,
      pharmacy: body.pharmacy,
      sku: body.sku.trim().toUpperCase(),
      manufacturer: body.manufacturer.trim(),
      requiresPrescription: body.requiresPrescription || false,
      isControlledSubstance: body.isControlledSubstance || false,
      sideEffects: body.sideEffects?.trim() || '',
      dosage: body.dosage?.trim() || '',
      activeIngredients: body.activeIngredients?.trim() || '',
      barcode: body.barcode.trim(),
      tags: body.tags || [],
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      createdBy: user._id,
    };

    // Create new product
    const newProduct = new Product(productData);
    await newProduct.save();

    // Update pharmacy inventory counts
    await Pharmacy.findByIdAndUpdate(body.pharmacy, {
      $inc: {
        'inventory.totalProducts': 1,
        'inventory.lowStockItems': newProduct.isLowStock ? 1 : 0,
        'inventory.outOfStockItems': newProduct.inStock ? 0 : 1,
      },
    });

    // Populate related fields
    await newProduct.populate([
      { path: 'pharmacy', select: 'name address contact' },
      { path: 'createdBy', select: 'name email role' },
    ]);

    // Serialize the product
    const serializedProduct = serializeProduct(newProduct);

    const response: ApiResponse<typeof serializedProduct> = {
      success: true,
      data: serializedProduct,
      message: 'Product created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const errorResponse: ApiResponse<null> = {
        success: false,
        message: 'Duplicate entry',
        error: `A product with this ${field} already exists in this pharmacy`,
      };
      return NextResponse.json(errorResponse, { status: 409 });
    }

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
      message: 'Failed to create product',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// GET - Fetch products
export async function GET(request: NextRequest): Promise<Response> {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const pharmacyId = searchParams.get('pharmacy') || '';
    const inStock = searchParams.get('inStock') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (pharmacyId) {
      query.pharmacy = pharmacyId;
    }

    if (inStock && inStock !== 'all') {
      query.inStock = inStock === 'true';
    }

    // Sort configuration
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const productsRaw = await Product.find(query)
      .populate('pharmacy', 'name address')
      .populate('createdBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Serialize products
    const products = productsRaw.map(product => serializeProduct(product));

    const total = await Product.countDocuments(query);

    const response: ApiResponse<{
      products: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      message: 'Products fetched successfully',
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    const errorResponse: ApiResponse<null> = {
      success: false,
      message: 'Failed to fetch products',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
