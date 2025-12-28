import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicalHistory extends Document {
  patientId: mongoose.Types.ObjectId;
  condition: string;
  diagnosisDate: Date;
  status: 'active' | 'resolved' | 'chronic';
  severity: 'mild' | 'moderate' | 'severe';
  description?: string;
  treatment?: string;
  doctor?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalHistorySchema: Schema = new Schema(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    condition: {
      type: String,
      required: true,
      trim: true,
    },
    diagnosisDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    treatment: {
      type: String,
      trim: true,
    },
    doctor: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

MedicalHistorySchema.index({ patientId: 1, diagnosisDate: -1 });
MedicalHistorySchema.index({ patientId: 1, status: 1 });
MedicalHistorySchema.index({ condition: 'text' });

export default mongoose.models.MedicalHistory ||
  mongoose.model<IMedicalHistory>('MedicalHistory', MedicalHistorySchema);
