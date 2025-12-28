import { Schema, model, models, Document, Types } from 'mongoose';

export interface IInventoryItem {
  name: string;
  description?: string;
  category: string;
  sku: string;
  barcode?: string;
  quantity: number;
  lowStockThreshold: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  expiryDate?: Date;
  batchNumber?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  pharmacy: Types.ObjectId;
  createdBy: Types.ObjectId;
  reorderLevel?: number;
  reorderQuantity?: number;
  location?: string;
  notes?: string;
}

export interface IInventoryItemDocument extends IInventoryItem, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isLowStock: boolean;
  isExpired: boolean;
  profitMargin: number;
  stockValue: number;

  // Methods
  updateStock(quantity: number): Promise<void>;
  checkStockLevel(): void;
}

const InventorySchema = new Schema<IInventoryItemDocument>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: [
        'Prescription Drugs',
        'Over-the-Counter',
        'Medical Supplies',
        'Personal Care',
        'Vitamins & Supplements',
        'First Aid',
        'Baby Care',
        'Senior Care',
        'Diabetes Care',
        'Allergy & Sinus',
        'Pain Relief',
        'Cold & Flu',
        'Digestive Health',
        'Skin Care',
        'Other',
      ],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [
        /^[A-Z0-9\-_]+$/,
        'SKU can only contain letters, numbers, hyphens, and underscores',
      ],
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      required: [true, 'Low stock threshold is required'],
      min: [0, 'Low stock threshold cannot be negative'],
      default: 10,
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
      validate: {
        validator: function (this: IInventoryItemDocument, price: number) {
          return price >= this.costPrice;
        },
        message: 'Selling price must be greater than or equal to cost price',
      },
    },
    supplier: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function (this: IInventoryItemDocument, date: Date) {
          if (!date) return true; // Optional field
          return date > new Date();
        },
        message: 'Expiry date must be in the future',
      },
    },
    batchNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED'],
      default: 'IN_STOCK',
    },
    pharmacy: {
      type: Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: [true, 'Pharmacy reference is required'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    reorderLevel: {
      type: Number,
      min: [0, 'Reorder level cannot be negative'],
      default: 5,
    },
    reorderQuantity: {
      type: Number,
      min: [1, 'Reorder quantity must be at least 1'],
      default: 25,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        const { _id, __v, ...rest } = ret;
        return {
          id: _id.toString(),
          ...rest,
        };
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for checking if item is low stock
InventorySchema.virtual('isLowStock').get(function (
  this: IInventoryItemDocument
) {
  return this.quantity <= this.lowStockThreshold && this.quantity > 0;
});

// Virtual for checking if item is expired
InventorySchema.virtual('isExpired').get(function (
  this: IInventoryItemDocument
) {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Virtual for calculating profit margin
InventorySchema.virtual('profitMargin').get(function (
  this: IInventoryItemDocument
) {
  if (this.costPrice === 0) return 0;
  return ((this.sellingPrice - this.costPrice) / this.costPrice) * 100;
});

// Virtual for calculating stock value
InventorySchema.virtual('stockValue').get(function (
  this: IInventoryItemDocument
) {
  return this.quantity * this.costPrice;
});

// Method to update stock quantity and automatically update status
InventorySchema.methods.updateStock = async function (
  this: IInventoryItemDocument,
  newQuantity: number
): Promise<void> {
  this.quantity = Math.max(0, newQuantity);
  await this.checkStockLevel();
  await this.save();
};

// Method to check and update stock level status
InventorySchema.methods.checkStockLevel = function (
  this: IInventoryItemDocument
) {
  if (this.quantity === 0) {
    this.status = 'OUT_OF_STOCK';
  } else if (this.quantity <= this.lowStockThreshold) {
    this.status = 'LOW_STOCK';
  } else {
    this.status = 'IN_STOCK';
  }
};

// Middleware to automatically update status before saving
InventorySchema.pre('save', function (next) {
  this.checkStockLevel();
  next();
});

// Static method to find low stock items for a pharmacy
InventorySchema.statics.findLowStock = function (pharmacyId: Types.ObjectId) {
  return this.find({
    pharmacy: pharmacyId,
    status: 'LOW_STOCK',
    quantity: { $gt: 0 }, // Ensure we don't include out of stock items
  });
};

// Static method to find expired items
InventorySchema.statics.findExpired = function (pharmacyId: Types.ObjectId) {
  return this.find({
    pharmacy: pharmacyId,
    expiryDate: { $lt: new Date() },
  });
};

// Static method to find items needing reorder
InventorySchema.statics.findNeedReorder = function (
  pharmacyId: Types.ObjectId
) {
  return this.find({
    pharmacy: pharmacyId,
    $or: [{ status: 'LOW_STOCK' }, { quantity: { $lte: '$reorderLevel' } }],
  });
};

// Static method to get inventory summary for a pharmacy
InventorySchema.statics.getInventorySummary = function (
  pharmacyId: Types.ObjectId
) {
  return this.aggregate([
    {
      $match: {
        pharmacy: pharmacyId,
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
        totalItems: { $sum: '$quantity' },
      },
    },
  ]);
};

// Indexes for better query performance
InventorySchema.index({ pharmacy: 1, status: 1 });
InventorySchema.index({ pharmacy: 1, category: 1 });
InventorySchema.index({ pharmacy: 1, expiryDate: 1 });
InventorySchema.index({ pharmacy: 1, quantity: 1 });
InventorySchema.index({ pharmacy: 1, createdAt: -1 });
InventorySchema.index({ pharmacy: 1, name: 'text', description: 'text' });

// Compound index for common queries
InventorySchema.index({ pharmacy: 1, status: 1, category: 1 });
InventorySchema.index({ pharmacy: 1, quantity: 1, lowStockThreshold: 1 });

const Inventory =
  models.Inventory ||
  model<IInventoryItemDocument>('Inventory', InventorySchema);

export default Inventory;
