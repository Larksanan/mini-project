// @/types/patients.ts
export interface InsuranceData {
  provider?: string;
  policyNumber?: string;
  groupNumber?: string;
  validUntil?: string;
  coverageDetails?: string;
  schemeType?: 'private' | 'government' | 'none';
}

export interface AddressData {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  district?: string;
  province?: string;
  addressLine2?: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  email: string;
  relationship: string;
  additionalPhone?: string;
}

export interface IPatientFormData {
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nic: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodType: string;
  height?: number;
  weight?: number;
  maritalStatus: string;
  occupation?: string;
  preferredLanguage?: string;

  address?: AddressData;
  emergencyContact?: EmergencyContact;

  medicalHistory: string;
  allergies: string[];
  medications: string[];
  additionalMedicalInfo?: string;

  insurance?: InsuranceData;
}
