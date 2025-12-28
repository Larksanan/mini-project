/* eslint-disable react/no-unknown-property */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiPrinter,
  FiUser,
  FiCalendar,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiMail,
  FiPhone,
  FiMapPin,
} from 'react-icons/fi';
import Loading from '@/components/Loading';
import ErrorComponent from '@/components/Error';
import { Prescription } from '@/types/Prescription';

export default function PrescriptionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const prescriptionId = params.id as string;

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (prescriptionId) {
      fetchPrescription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescriptionId]);

  const fetchPrescription = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/doctor/prescriptions/${prescriptionId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch prescription');
      }

      const result = await response.json();

      if (result.success) {
        setPrescription(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch prescription');
      }
    } catch (error) {
      console.error('Error fetching prescription:', error);
      setError('Failed to load prescription');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleteLoading(true);
      const response = await fetch(
        `/api/doctor/prescriptions/${prescriptionId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete prescription');
      }

      const result = await response.json();

      if (result.success) {
        router.push('/doctor/prescriptions');
      } else {
        throw new Error(result.message || 'Failed to delete prescription');
      }
    } catch (error) {
      console.error('Error deleting prescription:', error);
      setError('Failed to delete prescription. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <FiClock className='w-5 h-5 text-blue-500' />;
      case 'COMPLETED':
        return <FiCheckCircle className='w-5 h-5 text-green-500' />;
      case 'CANCELLED':
        return <FiXCircle className='w-5 h-5 text-red-500' />;
      default:
        return <FiFileText className='w-5 h-5 text-gray-500' />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) return <Loading />;
  if (error) return <ErrorComponent message={error} />;
  if (!prescription) return <ErrorComponent message='Prescription not found' />;

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <button
                onClick={() => router.push('/doctor/prescriptions')}
                className='flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors'
              >
                <FiArrowLeft className='w-5 h-5' />
                Back to Prescriptions
              </button>
              <div className='w-px h-6 bg-gray-300'></div>
              <div>
                <h1 className='text-3xl font-bold text-gray-900'>
                  Prescription Details
                </h1>
                <p className='text-gray-600 mt-1'>
                  Created on {formatDate(prescription.createdAt)}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3'>
              <button
                onClick={handlePrint}
                className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
              >
                <FiPrinter className='w-4 h-4' />
                Print
              </button>
              <button
                onClick={() =>
                  router.push(`/doctor/prescriptions/${prescriptionId}/edit`)
                }
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                <FiEdit className='w-4 h-4' />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className='flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
              >
                <FiTrash2 className='w-4 h-4' />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className='bg-white rounded-xl p-6 max-w-md w-full'
            >
              <div className='flex items-center gap-3 mb-4'>
                <FiAlertCircle className='w-6 h-6 text-red-500' />
                <h3 className='text-lg font-semibold text-gray-900'>
                  Delete Prescription
                </h3>
              </div>

              <p className='text-gray-600 mb-6'>
                Are you sure you want to delete this prescription? This action
                cannot be undone and will permanently remove the prescription
                record.
              </p>

              <div className='flex gap-3 justify-end'>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className='px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors'
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className='flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors'
                >
                  <FiTrash2 className='w-4 h-4' />
                  {deleteLoading ? 'Deleting...' : 'Delete Prescription'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  {getStatusIcon(prescription.status)}
                  <div>
                    <h2 className='text-lg font-semibold text-gray-900'>
                      Prescription Status
                    </h2>
                    <p className='text-gray-600'>
                      Current status of this prescription
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(prescription.status)}`}
                >
                  {prescription.status.charAt(0) +
                    prescription.status.slice(1).toLowerCase()}
                </span>
              </div>
            </motion.div>

            {/* Patient Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
            >
              <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                <FiUser className='w-5 h-5 text-blue-600' />
                Patient Information
              </h2>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Full Name
                    </label>
                    <p className='text-gray-900 font-medium'>
                      {prescription.patientId.firstName}{' '}
                      {prescription.patientId.lastName}
                    </p>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Date of Birth & Age
                    </label>
                    <p className='text-gray-900'>
                      {formatDate(prescription.patientId.dateOfBirth)} (
                      {calculateAge(prescription.patientId.dateOfBirth)} years)
                    </p>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Gender
                    </label>
                    <p className='text-gray-900 capitalize'>
                      {prescription.patientId.gender.toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className='space-y-4'>
                  <div>
                    <label className='text-sm font-medium text-gray-700 mb-1 flex items-center gap-2'>
                      <FiMail className='w-4 h-4' />
                      Email
                    </label>
                    <p className='text-gray-900'>
                      {prescription.patientId.email}
                    </p>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1 items-center gap-2'>
                      <FiPhone className='w-4 h-4' />
                      Phone
                    </label>
                    <p className='text-gray-900'>
                      {prescription.patientId.phone}
                    </p>
                  </div>

                  {prescription.patientId.address && (
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1 items-center gap-2'>
                        <FiMapPin className='w-4 h-4' />
                        Address
                      </label>
                      <p className='text-gray-900'>
                        {prescription.patientId.address.street}
                        <br />
                        {prescription.patientId.address.city},{' '}
                        {prescription.patientId.address.state}{' '}
                        {prescription.patientId.address.zipCode}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Information */}
              <div className='mt-6 pt-6 border-t border-gray-200'>
                <h3 className='text-lg font-medium text-gray-900 mb-4'>
                  Medical Information
                </h3>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Allergies
                    </label>
                    <div className='flex flex-wrap gap-2'>
                      {prescription.patientId.allergies &&
                      prescription.patientId.allergies.length > 0 ? (
                        prescription.patientId.allergies.map(
                          (allergy, index) => (
                            <span
                              key={index}
                              className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'
                            >
                              {allergy}
                            </span>
                          )
                        )
                      ) : (
                        <p className='text-gray-500 text-sm'>
                          No allergies recorded
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Current Medications
                    </label>
                    <div className='space-y-1'>
                      {prescription.patientId.medications &&
                      prescription.patientId.medications.length > 0 ? (
                        prescription.patientId.medications.map((med, index) => (
                          <p key={index} className='text-sm text-gray-600'>
                            {med}
                          </p>
                        ))
                      ) : (
                        <p className='text-gray-500 text-sm'>
                          No current medications
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Diagnosis & Treatment */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
            >
              <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                <FiFileText className='w-5 h-5 text-green-600' />
                Diagnosis & Treatment
              </h2>

              <div className='space-y-6'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Primary Diagnosis
                  </label>
                  <p className='text-gray-900 text-lg font-medium'>
                    {prescription.diagnosis}
                  </p>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2 items-center gap-2'>
                      <FiCalendar className='w-4 h-4' />
                      Start Date
                    </label>
                    <p className='text-gray-900'>
                      {formatDate(prescription.startDate)}
                    </p>
                  </div>

                  {prescription.endDate && (
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2 items-center gap-2'>
                        <FiCalendar className='w-4 h-4' />
                        End Date
                      </label>
                      <p className='text-gray-900'>
                        {formatDate(prescription.endDate)}
                        <span className='text-sm text-gray-500 ml-2'>
                          (
                          {calculateDuration(
                            prescription.startDate,
                            prescription.endDate
                          )}{' '}
                          days)
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Medications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
            >
              <h2 className='text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2'>
                Medications
                <span className='inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-sm font-medium'>
                  {prescription.medications.length}
                </span>
              </h2>

              <div className='space-y-6'>
                {prescription.medications.map((medication, index) => (
                  <div
                    key={index}
                    className='border border-gray-200 rounded-lg p-4'
                  >
                    <div className='flex justify-between items-start mb-4'>
                      <h3 className='text-lg font-semibold text-gray-900'>
                        {medication.name}
                      </h3>
                      <div className='flex items-center gap-2 text-sm text-gray-500'>
                        <span>Qty: {medication.quantity}</span>
                        {medication.refills > 0 && (
                          <span>• Refills: {medication.refills}</span>
                        )}
                      </div>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm'>
                      <div>
                        <label className='block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1'>
                          Dosage
                        </label>
                        <p className='text-gray-900 font-medium'>
                          {medication.dosage}
                        </p>
                      </div>

                      <div>
                        <label className='block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1'>
                          Frequency
                        </label>
                        <p className='text-gray-900 font-medium'>
                          {medication.frequency}
                        </p>
                      </div>

                      <div>
                        <label className='block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1'>
                          Duration
                        </label>
                        <p className='text-gray-900 font-medium'>
                          {medication.duration}
                        </p>
                      </div>

                      <div>
                        <label className='block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1'>
                          Refills
                        </label>
                        <p className='text-gray-900 font-medium'>
                          {medication.refills}
                        </p>
                      </div>
                    </div>

                    {medication.instructions && (
                      <div className='mt-4 pt-4 border-t border-gray-200'>
                        <label className='block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1'>
                          Special Instructions
                        </label>
                        <p className='text-gray-900 text-sm'>
                          {medication.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Additional Notes */}
            {prescription.notes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
              >
                <h2 className='text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                  Additional Notes
                </h2>
                <p className='text-gray-700 leading-relaxed'>
                  {prescription.notes}
                </p>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Prescription Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
            >
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                Prescription Summary
              </h2>

              <div className='space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>Prescription ID:</span>
                  <span className='font-mono text-gray-900 text-xs'>
                    {prescription._id.slice(-8)}
                  </span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-500'>Status:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(prescription.status)}`}
                  >
                    {getStatusIcon(prescription.status)}
                    {prescription.status.charAt(0) +
                      prescription.status.slice(1).toLowerCase()}
                  </span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-500'>Medications:</span>
                  <span className='font-medium'>
                    {prescription.medications.length}
                  </span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-500'>Created:</span>
                  <span className='font-medium'>
                    {formatShortDate(prescription.createdAt)}
                  </span>
                </div>

                <div className='flex justify-between'>
                  <span className='text-gray-500'>Last Updated:</span>
                  <span className='font-medium'>
                    {formatShortDate(prescription.updatedAt)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className='bg-white rounded-xl shadow-sm border border-gray-200 p-6'
            >
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                Quick Actions
              </h2>

              <div className='space-y-3'>
                <button
                  onClick={() =>
                    router.push(`/doctor/prescriptions/${prescriptionId}/edit`)
                  }
                  className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  <FiEdit className='w-4 h-4' />
                  Edit Prescription
                </button>

                <button
                  onClick={handlePrint}
                  className='w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
                >
                  <FiPrinter className='w-4 h-4' />
                  Print Prescription
                </button>

                <button
                  onClick={() => router.push('/doctor/prescriptions')}
                  className='w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
                >
                  <FiArrowLeft className='w-4 h-4' />
                  Back to List
                </button>
              </div>
            </motion.div>

            {/* Patient Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className='bg-blue-50 border border-blue-200 rounded-xl p-6'
            >
              <h3 className='font-semibold text-blue-900 mb-3'>
                Patient Quick Info
              </h3>
              <div className='space-y-2 text-sm text-blue-800'>
                <div className='flex justify-between'>
                  <span>Age:</span>
                  <span className='font-medium'>
                    {calculateAge(prescription.patientId.dateOfBirth)} years
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Gender:</span>
                  <span className='font-medium capitalize'>
                    {prescription.patientId.gender.toLowerCase()}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Allergies:</span>
                  <span className='font-medium'>
                    {prescription.patientId.allergies?.length || 0}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
