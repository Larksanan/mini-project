'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiSave,
  FiPlus,
  FiTrash2,
  FiUser,
  FiAlertCircle,
  FiFileText,
} from 'react-icons/fi';
import Loading from '@/components/Loading';
import ErrorComponent from '@/components/Error';
import { IPatientFormData } from '@/types/patients';
import { PrescriptionFormData } from '@/types/Prescription';
import { Medication } from '@/types/Medication';

export default function NewPrescriptionPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<PrescriptionFormData>({
    patientId: '',
    diagnosis: '',
    medications: [
      {
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: 30,
        refills: 0,
      },
    ],
    notes: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'ACTIVE',
  });

  const [patients, setPatients] = useState<IPatientFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [nicSearch, setNicSearch] = useState('');
  const [searchingNic, setSearchingNic] = useState(false);
  const [selectedPatientDetails, setSelectedPatientDetails] =
    useState<IPatientFormData | null>(null);

  // Common medication options
  const commonMedications = [
    'Amoxicillin',
    'Lisinopril',
    'Atorvastatin',
    'Metformin',
    'Levothyroxine',
    'Albuterol',
    'Omeprazole',
    'Losartan',
    'Sertraline',
    'Simvastatin',
    'Metoprolol',
    'Amlodipine',
    'Hydrochlorothiazide',
    'Azithromycin',
    'Prednisone',
  ];

  const dosageOptions = [
    '250mg',
    '500mg',
    '10mg',
    '20mg',
    '25mg',
    '50mg',
    '100mg',
    '200mg',
    '40mg',
    '80mg',
    '5mg',
    '2.5mg',
  ];

  const frequencyOptions = [
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Four times daily',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'Once weekly',
    'As needed',
    'Before meals',
    'After meals',
    'At bedtime',
  ];

  const durationOptions = [
    '7 days',
    '10 days',
    '14 days',
    '30 days',
    '60 days',
    '90 days',
    'Until finished',
    'As directed',
  ];

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patients');

      if (!response.ok) throw new Error('Failed to fetch patients');

      const result = await response.json();
      if (result.success) {
        setPatients(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch patients');
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.patientId) errors.patientId = 'Patient is required';
    if (!formData.diagnosis) errors.diagnosis = 'Diagnosis is required';
    if (!formData.startDate) errors.startDate = 'Start date is required';

    // Validate medications
    formData.medications.forEach((med, index) => {
      if (!med.name.trim()) {
        errors[`medication_${index}_name`] = 'Medication name is required';
      }
      if (!med.dosage.trim()) {
        errors[`medication_${index}_dosage`] = 'Dosage is required';
      }
      if (!med.frequency.trim()) {
        errors[`medication_${index}_frequency`] = 'Frequency is required';
      }
      if (!med.duration.trim()) {
        errors[`medication_${index}_duration`] = 'Duration is required';
      }
      if (med.quantity <= 0) {
        errors[`medication_${index}_quantity`] =
          'Quantity must be greater than 0';
      }
      if (med.refills < 0) {
        errors[`medication_${index}_refills`] = 'Refills cannot be negative';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/doctor/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create prescription');
      }

      const result = await response.json();

      if (result.success) {
        router.push('/doctor/prescriptions');
      } else {
        throw new Error(result.message || 'Failed to create prescription');
      }
    } catch (error) {
      console.error('Error creating prescription:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create prescription'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleNicSearch = async () => {
    if (!nicSearch.trim()) {
      setError('Please enter a NIC number');
      return;
    }

    try {
      setSearchingNic(true);
      setError(null);

      const response = await fetch(`/api/patients/search?nic=${nicSearch}`);

      if (!response.ok) {
        throw new Error('Patient not found');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setFormData(prev => ({ ...prev, patientId: result.data._id }));
        setSelectedPatientDetails(result.data);
        setNicSearch('');
      } else {
        throw new Error('Patient not found with this NIC');
      }
    } catch (error) {
      console.error('Error searching patient:', error);
      setError(error instanceof Error ? error.message : 'Patient not found');
      setSelectedPatientDetails(null);
    } finally {
      setSearchingNic(false);
    }
  };

  const handleMedicationChange = (
    index: number,
    field: keyof Medication,
    value: string | number
  ) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      ),
    }));

    // Clear error when user starts typing
    const errorKey = `medication_${index}_${field}`;
    if (formErrors[errorKey]) {
      setFormErrors(prev => ({
        ...prev,
        [errorKey]: '',
      }));
    }
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: '',
          quantity: 30,
          refills: 0,
        },
      ],
    }));
  };

  const removeMedication = (index: number) => {
    if (formData.medications.length > 1) {
      setFormData(prev => ({
        ...prev,
        medications: prev.medications.filter((_, i) => i !== index),
      }));
    }
  };

  const getSelectedPatient = () => {
    return patients.find(
      (patient: IPatientFormData) => patient.userId === formData.patientId
    );
  };

  const calculateAge = (dateOfBirth: string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const calculateEndDate = (startDate: string, duration: string) => {
    if (!startDate || !duration) return '';

    const start = new Date(startDate);
    const days = parseInt(duration) || 0;
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + days);

    return endDate.toISOString().split('T')[0];
  };

  // Auto-calculate end date when start date or duration changes
  useEffect(() => {
    if (formData.startDate && formData.medications[0]?.duration) {
      const days = parseInt(formData.medications[0].duration) || 0;
      if (days > 0) {
        const endDate = calculateEndDate(
          formData.startDate,
          formData.medications[0].duration
        );
        setFormData(prev => ({ ...prev, endDate }));
      }
    }
  }, [formData.medications, formData.startDate]);

  // Fetch patients on component mount
  useEffect(() => {
    fetchPatients();
  }, []);

  if (loading) return <Loading />;
  if (error && !selectedPatientDetails)
    return <ErrorComponent message={error} />;

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <button
            onClick={() => router.push('/doctor/prescriptions')}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors'
          >
            <FiArrowLeft className='w-5 h-5' />
            Back to Prescriptions
          </button>

          <div className='flex justify-between items-start'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>
                New Prescription
              </h1>
              <p className='text-gray-600 mt-2'>
                Create a new prescription for a patient
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4'>
            <div className='flex items-center gap-2 text-red-800'>
              <FiAlertCircle className='w-5 h-5' />
              <span className='font-medium'>Error: {error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* Main Form */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Patient Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
              >
                <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                  <FiUser className='w-5 h-5 text-blue-600' />
                  Patient Information
                </h2>

                {/* NIC Search */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Search by NIC Number *
                  </label>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={nicSearch}
                      onChange={e => setNicSearch(e.target.value)}
                      placeholder='Enter NIC number...'
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.patientId
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleNicSearch();
                        }
                      }}
                    />
                    <button
                      type='button'
                      onClick={handleNicSearch}
                      disabled={searchingNic}
                      className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
                    >
                      {searchingNic ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {formErrors.patientId && !selectedPatientDetails && (
                    <p className='mt-1 text-sm text-red-600'>
                      {formErrors.patientId}
                    </p>
                  )}
                </div>

                {/* Selected Patient Details */}
                {selectedPatientDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className='mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'
                  >
                    <div className='flex items-center justify-between mb-3'>
                      <h3 className='font-semibold text-blue-900'>
                        Patient Details
                      </h3>
                      <button
                        type='button'
                        onClick={() => {
                          setSelectedPatientDetails(null);
                          setFormData(prev => ({ ...prev, patientId: '' }));
                          setNicSearch('');
                        }}
                        className='text-blue-600 hover:text-blue-800 text-sm'
                      >
                        Change Patient
                      </button>
                    </div>
                    <div className='grid grid-cols-2 gap-3 text-sm'>
                      <div>
                        <p className='text-blue-600 font-medium'>Name</p>
                        <p className='text-blue-900'>
                          {selectedPatientDetails.firstName}{' '}
                          {selectedPatientDetails.lastName}
                        </p>
                      </div>
                      <div>
                        <p className='text-blue-600 font-medium'>Email</p>
                        <p className='text-blue-900'>
                          {selectedPatientDetails.email}
                        </p>
                      </div>
                      <div>
                        <p className='text-blue-600 font-medium'>Age</p>
                        <p className='text-blue-900'>
                          {calculateAge(selectedPatientDetails.dateOfBirth)}{' '}
                          years
                        </p>
                      </div>
                      <div>
                        <p className='text-blue-600 font-medium'>Gender</p>
                        <p className='text-blue-900 capitalize'>
                          {selectedPatientDetails.gender.toLowerCase()}
                        </p>
                      </div>
                      <div className='col-span-2'>
                        <p className='text-blue-600 font-medium'>
                          Date of Birth
                        </p>
                        <p className='text-blue-900'>
                          {new Date(
                            selectedPatientDetails.dateOfBirth
                          ).toLocaleDateString('en-LK', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Diagnosis Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
              >
                <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                  <FiFileText className='w-5 h-5 text-green-600' />
                  Diagnosis & Treatment
                </h2>

                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Diagnosis *
                    </label>
                    <input
                      type='text'
                      name='diagnosis'
                      value={formData.diagnosis}
                      onChange={handleChange}
                      placeholder='Enter primary diagnosis...'
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.diagnosis
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                    {formErrors.diagnosis && (
                      <p className='mt-1 text-sm text-red-600'>
                        {formErrors.diagnosis}
                      </p>
                    )}
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Start Date *
                      </label>
                      <input
                        type='date'
                        name='startDate'
                        value={formData.startDate}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formErrors.startDate
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                      />
                      {formErrors.startDate && (
                        <p className='mt-1 text-sm text-red-600'>
                          {formErrors.startDate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        End Date
                      </label>
                      <input
                        type='date'
                        name='endDate'
                        value={formData.endDate}
                        onChange={handleChange}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Medications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
              >
                <div className='flex justify-between items-center mb-4'>
                  <h2 className='text-xl font-semibold text-gray-900 flex items-center gap-2'>
                    Medications
                  </h2>
                  <button
                    type='button'
                    onClick={addMedication}
                    className='flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                  >
                    <FiPlus className='w-4 h-4' />
                    Add Medication
                  </button>
                </div>

                <div className='space-y-6'>
                  {formData.medications.map((medication, index) => (
                    <div
                      key={index}
                      className='border border-gray-200 rounded-lg p-4'
                    >
                      <div className='flex justify-between items-center mb-4'>
                        <h3 className='font-medium text-gray-900'>
                          Medication #{index + 1}
                        </h3>
                        {formData.medications.length > 1 && (
                          <button
                            type='button'
                            onClick={() => removeMedication(index)}
                            className='text-red-600 hover:text-red-700 p-1'
                          >
                            <FiTrash2 className='w-4 h-4' />
                          </button>
                        )}
                      </div>

                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div>
                          <label className='block text-sm font-medium text-gray-700 mb-2'>
                            Medication Name *
                          </label>
                          <input
                            type='text'
                            value={medication.name}
                            onChange={e =>
                              handleMedicationChange(
                                index,
                                'name',
                                e.target.value
                              )
                            }
                            list='common-medications'
                            placeholder='Enter medication name...'
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors[`medication_${index}_name`]
                                ? 'border-red-300'
                                : 'border-gray-300'
                            }`}
                          />
                          <datalist id='common-medications'>
                            {commonMedications.map(med => (
                              <option key={med} value={med} />
                            ))}
                          </datalist>
                          {formErrors[`medication_${index}_name`] && (
                            <p className='mt-1 text-sm text-red-600'>
                              {formErrors[`medication_${index}_name`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className='block text-sm font-medium text-gray-700 mb-2'>
                            Dosage *
                          </label>
                          <input
                            type='text'
                            value={medication.dosage}
                            onChange={e =>
                              handleMedicationChange(
                                index,
                                'dosage',
                                e.target.value
                              )
                            }
                            list='dosage-options'
                            placeholder='Enter dosage...'
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors[`medication_${index}_dosage`]
                                ? 'border-red-300'
                                : 'border-gray-300'
                            }`}
                          />
                          <datalist id='dosage-options'>
                            {dosageOptions.map(dosage => (
                              <option key={dosage} value={dosage} />
                            ))}
                          </datalist>
                          {formErrors[`medication_${index}_dosage`] && (
                            <p className='mt-1 text-sm text-red-600'>
                              {formErrors[`medication_${index}_dosage`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className='block text-sm font-medium text-gray-700 mb-2'>
                            Frequency *
                          </label>
                          <select
                            value={medication.frequency}
                            onChange={e =>
                              handleMedicationChange(
                                index,
                                'frequency',
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors[`medication_${index}_frequency`]
                                ? 'border-red-300'
                                : 'border-gray-300'
                            }`}
                          >
                            <option value=''>Select frequency...</option>
                            {frequencyOptions.map(freq => (
                              <option key={freq} value={freq}>
                                {freq}
                              </option>
                            ))}
                          </select>
                          {formErrors[`medication_${index}_frequency`] && (
                            <p className='mt-1 text-sm text-red-600'>
                              {formErrors[`medication_${index}_frequency`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className='block text-sm font-medium text-gray-700 mb-2'>
                            Duration *
                          </label>
                          <select
                            value={medication.duration}
                            onChange={e =>
                              handleMedicationChange(
                                index,
                                'duration',
                                e.target.value
                              )
                            }
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors[`medication_${index}_duration`]
                                ? 'border-red-300'
                                : 'border-gray-300'
                            }`}
                          >
                            <option value=''>Select duration...</option>
                            {durationOptions.map(duration => (
                              <option key={duration} value={duration}>
                                {duration}
                              </option>
                            ))}
                          </select>
                          {formErrors[`medication_${index}_duration`] && (
                            <p className='mt-1 text-sm text-red-600'>
                              {formErrors[`medication_${index}_duration`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className='block text-sm font-medium text-gray-700 mb-2'>
                            Quantity *
                          </label>
                          <input
                            type='number'
                            value={medication.quantity}
                            onChange={e =>
                              handleMedicationChange(
                                index,
                                'quantity',
                                parseInt(e.target.value) || 0
                              )
                            }
                            min='1'
                            max='1000'
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors[`medication_${index}_quantity`]
                                ? 'border-red-300'
                                : 'border-gray-300'
                            }`}
                          />
                          {formErrors[`medication_${index}_quantity`] && (
                            <p className='mt-1 text-sm text-red-600'>
                              {formErrors[`medication_${index}_quantity`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className='block text-sm font-medium text-gray-700 mb-2'>
                            Refills
                          </label>
                          <input
                            type='number'
                            value={medication.refills}
                            onChange={e =>
                              handleMedicationChange(
                                index,
                                'refills',
                                parseInt(e.target.value) || 0
                              )
                            }
                            min='0'
                            max='12'
                            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                          />
                        </div>

                        <div className='md:col-span-2'>
                          <label className='block text-sm font-medium text-gray-700 mb-2'>
                            Special Instructions
                          </label>
                          <textarea
                            value={medication.instructions}
                            onChange={e =>
                              handleMedicationChange(
                                index,
                                'instructions',
                                e.target.value
                              )
                            }
                            rows={2}
                            placeholder='Enter special instructions for this medication...'
                            className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Additional Notes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
              >
                <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                  <FiFileText className='w-5 h-5 text-orange-600' />
                  Additional Notes
                </h2>

                <textarea
                  name='notes'
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder='Enter any additional notes or instructions for the patient...'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                />
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className='space-y-6'>
              {/* Prescription Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
              >
                <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                  Prescription Summary
                </h2>

                <div className='space-y-3 text-sm'>
                  {formData.patientId && (
                    <div className='flex justify-between'>
                      <span className='text-gray-500'>Patient:</span>
                      <span className='font-medium text-right'>
                        {getSelectedPatient()?.firstName}{' '}
                        {getSelectedPatient()?.lastName}
                      </span>
                    </div>
                  )}

                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Medications:</span>
                    <span className='font-medium'>
                      {formData.medications.length}
                    </span>
                  </div>

                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Status:</span>
                    <span className='font-medium text-green-600'>Active</span>
                  </div>

                  {formData.startDate && (
                    <div className='flex justify-between'>
                      <span className='text-gray-500'>Start Date:</span>
                      <span className='font-medium'>
                        {new Date(formData.startDate).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </span>
                    </div>
                  )}

                  {formData.endDate && (
                    <div className='flex justify-between'>
                      <span className='text-gray-500'>End Date:</span>
                      <span className='font-medium'>
                        {new Date(formData.endDate).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </span>
                    </div>
                  )}

                  {formData.diagnosis && (
                    <div className='pt-3 border-t border-gray-200'>
                      <div className='flex justify-between'>
                        <span className='text-gray-500'>Diagnosis:</span>
                        <span className='font-medium text-right text-blue-600'>
                          {formData.diagnosis}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
              >
                <div className='space-y-3'>
                  <button
                    type='submit'
                    disabled={saving}
                    className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
                  >
                    <FiSave className='w-4 h-4' />
                    {saving
                      ? 'Creating Prescription...'
                      : 'Create Prescription'}
                  </button>

                  <button
                    type='button'
                    onClick={() => router.push('/doctor/prescriptions')}
                    className='w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
                  >
                    Cancel
                  </button>
                </div>

                <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
                  <p className='text-xs text-yellow-800'>
                    <strong>Note:</strong> This prescription will be immediately
                    available to the patient and pharmacy.
                  </p>
                </div>
              </motion.div>

              {/* Quick Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className='bg-blue-50 border border-blue-200 rounded-xl p-6'
              >
                <h3 className='font-semibold text-blue-900 mb-3'>
                  Prescription Tips
                </h3>
                <ul className='space-y-2 text-sm text-blue-800'>
                  <li className='flex items-start gap-2'>
                    <span className='mt-0.5'>•</span>
                    <span>Check patient allergies before prescribing</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='mt-0.5'>•</span>
                    <span>Include clear dosage instructions</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='mt-0.5'>•</span>
                    <span>Specify duration and refills clearly</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <span className='mt-0.5'>•</span>
                    <span>
                      Review drug interactions if multiple medications
                    </span>
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
