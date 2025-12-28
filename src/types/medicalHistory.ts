export interface MedicalHistoryEntry {
  _id: string;
  patientId: string;
  condition: string;
  diagnosisDate: string;
  status: 'active' | 'resolved' | 'chronic';
  severity: 'mild' | 'moderate' | 'severe';
  description?: string;
  treatment?: string;
  doctor?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface MedicalHistoryFormData {
  patientId: string;
  condition: string;
  diagnosisDate: string;
  status: 'active' | 'resolved' | 'chronic';
  severity: 'mild' | 'moderate' | 'severe';
  description?: string;
  treatment?: string;
  doctor?: string;
  notes?: string;
}

export interface MedicalHistoryStats {
  active: number;
  resolved: number;
  chronic: number;
  mild: number;
  moderate: number;
  severe: number;
  total: number;
  activeConditions: number;
  chronicConditions: number;
  recentConditions: Array<{
    _id: string;
    condition: string;
    diagnosisDate: string;
    status: string;
    severity: string;
  }>;
}

export interface MedicalHistoryResponse {
  success: boolean;
  data: MedicalHistoryEntry | MedicalHistoryEntry[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MedicalHistoryStatusResponse {
  success: boolean;
  data: MedicalHistoryStats;
}
