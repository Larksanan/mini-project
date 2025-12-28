/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FiSearch,
  FiFilter,
  FiUser,
  FiCalendar,
  FiFileText,
  FiPlus,
  FiEye,
  FiEdit,
  FiDownload,
  FiClock,
  FiCheckCircle,
  FiArrowRight,
  FiBarChart,
  FiImage,
  FiX,
} from 'react-icons/fi';
import Loading from '@/components/Loading';
import ErrorComponent from '@/components/Error';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  nic?: string;
}

interface MedicalRecord {
  _id: string;
  patientId: Patient;
  recordType:
    | 'CONSULTATION'
    | 'LAB_RESULT'
    | 'IMAGING'
    | 'ECG'
    | 'PRESCRIPTION'
    | 'PROGRESS_NOTE'
    | 'SURGICAL_REPORT'
    | 'DISCHARGE_SUMMARY'
    | 'OTHER';
  title: string;
  description: string;
  date: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  doctorNotes?: string;
}

interface RecordFilters {
  recordType: string;
  status: string;
  patient: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface RecordStats {
  total: number;
  consultations: number;
  labResults: number;
  imaging: number;
  prescriptions: number;
  active: number;
  completed: number;
}

export default function MedicalRecordsPage() {
  const router = useRouter();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RecordFilters>({
    recordType: '',
    status: '',
    patient: '',
    dateRange: {
      start: '',
      end: '',
    },
  });

  // NIC Search States
  const [nicSearch, setNicSearch] = useState('');
  const [searchingNic, setSearchingNic] = useState(false);
  const [searchedPatient, setSearchedPatient] = useState<Patient | null>(null);

  const [stats, setStats] = useState<RecordStats>({
    total: 0,
    consultations: 0,
    labResults: 0,
    imaging: 0,
    prescriptions: 0,
    active: 0,
    completed: 0,
  });

  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchMedicalRecords();
  }, []);

  useEffect(() => {
    filterRecords();
    calculateStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters, records]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/records');

      if (!response.ok) {
        throw new Error('Failed to fetch medical records');
      }

      const result = await response.json();

      if (result.success) {
        setRecords(result.data);
        setFilteredRecords(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch medical records');
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      setError('Failed to load medical records');
    } finally {
      setLoading(false);
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
        setSearchedPatient(result.data);
        // Filter records by this patient
        setFilters(prev => ({ ...prev, patient: result.data._id }));
      } else {
        throw new Error('Patient not found with this NIC');
      }
    } catch (error) {
      console.error('Error searching patient:', error);
      setError(error instanceof Error ? error.message : 'Patient not found');
      setSearchedPatient(null);
    } finally {
      setSearchingNic(false);
    }
  };

  const clearNicSearch = () => {
    setNicSearch('');
    setSearchedPatient(null);
    setFilters(prev => ({ ...prev, patient: '' }));
  };

  const filterRecords = () => {
    let filtered = records;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        record =>
          record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.patientId.firstName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          record.patientId.lastName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          record.doctorNotes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Record type filter
    if (filters.recordType) {
      filtered = filtered.filter(
        record => record.recordType === filters.recordType
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(record => record.status === filters.status);
    }

    // Patient filter
    if (filters.patient) {
      filtered = filtered.filter(
        record => record.patientId._id === filters.patient
      );
    }

    // Date range filter
    if (filters.dateRange.start) {
      filtered = filtered.filter(
        record => new Date(record.date) >= new Date(filters.dateRange.start)
      );
    }

    if (filters.dateRange.end) {
      filtered = filtered.filter(
        record => new Date(record.date) <= new Date(filters.dateRange.end)
      );
    }

    setFilteredRecords(filtered);
  };

  const calculateStats = () => {
    const total = records.length;
    const consultations = records.filter(
      r => r.recordType === 'CONSULTATION'
    ).length;
    const labResults = records.filter(
      r => r.recordType === 'LAB_RESULT'
    ).length;
    const imaging = records.filter(r => r.recordType === 'IMAGING').length;
    const prescriptions = records.filter(
      r => r.recordType === 'PRESCRIPTION'
    ).length;
    const active = records.filter(r => r.status === 'ACTIVE').length;
    const completed = records.filter(r => r.status === 'COMPLETED').length;

    setStats({
      total,
      consultations,
      labResults,
      imaging,
      prescriptions,
      active,
      completed,
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

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'CONSULTATION':
        return <FiUser className='w-4 h-4 text-blue-500' />;
      case 'LAB_RESULT':
        return <FiBarChart className='w-4 h-4 text-green-500' />;
      case 'IMAGING':
        return <FiImage className='w-4 h-4 text-purple-500' />;
      case 'PRESCRIPTION':
        return <FiFileText className='w-4 h-4 text-orange-500' />;
      default:
        return <FiFileText className='w-4 h-4 text-gray-500' />;
    }
  };

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case 'CONSULTATION':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LAB_RESULT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IMAGING':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PRESCRIPTION':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecordTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      CONSULTATION: 'Consultation',
      LAB_RESULT: 'Lab Result',
      IMAGING: 'Imaging',
      ECG: 'ECG Report',
      PRESCRIPTION: 'Prescription',
      PROGRESS_NOTE: 'Progress Note',
      SURGICAL_REPORT: 'Surgical Report',
      DISCHARGE_SUMMARY: 'Discharge Summary',
      OTHER: 'Other',
    };
    return labels[type] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <FiClock className='w-3 h-3 text-blue-500' />;
      case 'COMPLETED':
        return <FiCheckCircle className='w-3 h-3 text-green-500' />;
      default:
        return <FiFileText className='w-3 h-3 text-gray-500' />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COMPLETED':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-LK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const clearFilters = () => {
    setFilters({
      recordType: '',
      status: '',
      patient: '',
      dateRange: {
        start: '',
        end: '',
      },
    });
    setSearchTerm('');
    clearNicSearch();
  };

  const getUniquePatients = () => {
    const patientsMap = new Map();
    records.forEach(record => {
      patientsMap.set(record.patientId._id, record.patientId);
    });
    return Array.from(patientsMap.values());
  };

  const handleViewRecord = (recordId: string) => {
    router.push(`/records/${recordId}`);
  };

  const handleCreateRecord = () => {
    router.push('/records/new');
  };

  const handleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev =>
      prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(record => record._id));
    }
  };

  if (loading) return <Loading />;
  if (error && !searchedPatient) return <ErrorComponent message={error} />;

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex justify-between items-start'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>
                Medical Records
              </h1>
              <p className='text-gray-600 mt-2'>
                Manage and review patient medical records, lab reports, imaging
                studies, and more
              </p>
            </div>
            <button
              onClick={handleCreateRecord}
              className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              <FiPlus className='w-5 h-5' />
              New Record
            </button>
          </div>
        </div>

        {/* NIC Search Section */}
        <div className='mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>
            Search by NIC Number
          </h2>
          <div className='flex gap-3'>
            <div className='flex-1'>
              <input
                type='text'
                value={nicSearch}
                onChange={e => setNicSearch(e.target.value)}
                placeholder='Enter patient NIC number...'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleNicSearch();
                  }
                }}
              />
            </div>
            <button
              onClick={handleNicSearch}
              disabled={searchingNic}
              className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
            >
              {searchingNic ? 'Searching...' : 'Search'}
            </button>
            {searchedPatient && (
              <button
                onClick={clearNicSearch}
                className='px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
              >
                Clear
              </button>
            )}
          </div>

          {/* Patient Details Display */}
          {searchedPatient && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className='mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'
            >
              <div className='flex items-center justify-between mb-3'>
                <h3 className='font-semibold text-blue-900'>Patient Details</h3>
                <span className='text-sm text-blue-700'>
                  Showing records for this patient
                </span>
              </div>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                <div>
                  <p className='text-blue-600 font-medium'>Name</p>
                  <p className='text-blue-900'>
                    {searchedPatient.firstName} {searchedPatient.lastName}
                  </p>
                </div>
                <div>
                  <p className='text-blue-600 font-medium'>Email</p>
                  <p className='text-blue-900'>{searchedPatient.email}</p>
                </div>
                <div>
                  <p className='text-blue-600 font-medium'>Age</p>
                  <p className='text-blue-900'>
                    {calculateAge(searchedPatient.dateOfBirth)} years
                  </p>
                </div>
                <div>
                  <p className='text-blue-600 font-medium'>Gender</p>
                  <p className='text-blue-900 capitalize'>
                    {searchedPatient.gender.toLowerCase()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className='grid grid-cols-2 lg:grid-cols-7 gap-4 mb-6'>
          <div className='bg-white rounded-lg border border-gray-200 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Total Records
                </p>
                <p className='text-2xl font-bold text-gray-900'>
                  {stats.total}
                </p>
              </div>
              <FiFileText className='w-8 h-8 text-gray-400' />
            </div>
          </div>

          <div className='bg-white rounded-lg border border-gray-200 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Consultations
                </p>
                <p className='text-2xl font-bold text-blue-600'>
                  {stats.consultations}
                </p>
              </div>
              <FiUser className='w-8 h-8 text-blue-400' />
            </div>
          </div>

          <div className='bg-white rounded-lg border border-gray-200 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Lab Results</p>
                <p className='text-2xl font-bold text-green-600'>
                  {stats.labResults}
                </p>
              </div>
              <FiBarChart className='w-8 h-8 text-green-400' />
            </div>
          </div>

          <div className='bg-white rounded-lg border border-gray-200 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Imaging</p>
                <p className='text-2xl font-bold text-purple-600'>
                  {stats.imaging}
                </p>
              </div>
              <FiImage className='w-8 h-8 text-purple-400' />
            </div>
          </div>

          <div className='bg-white rounded-lg border border-gray-200 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Prescriptions
                </p>
                <p className='text-2xl font-bold text-orange-600'>
                  {stats.prescriptions}
                </p>
              </div>
              <FiFileText className='w-8 h-8 text-orange-400' />
            </div>
          </div>

          <div className='bg-white rounded-lg border border-gray-200 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Active</p>
                <p className='text-2xl font-bold text-blue-600'>
                  {stats.active}
                </p>
              </div>
              <FiClock className='w-8 h-8 text-blue-400' />
            </div>
          </div>

          <div className='bg-white rounded-lg border border-gray-200 p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Completed</p>
                <p className='text-2xl font-bold text-green-600'>
                  {stats.completed}
                </p>
              </div>
              <FiCheckCircle className='w-8 h-8 text-green-400' />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className='mb-6'>
          <div className='flex flex-col sm:flex-row gap-4'>
            {/* Search */}
            <div className='flex-1 relative'>
              <FiSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
              <input
                type='text'
                placeholder='Search records by title, description, patient name...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              <FiFilter className='w-4 h-4' />
              Filters
              {(filters.recordType ||
                filters.status ||
                filters.dateRange.start) && (
                <span className='w-2 h-2 bg-blue-500 rounded-full'></span>
              )}
            </button>

            {/* Clear Filters */}
            {(searchTerm ||
              filters.recordType ||
              filters.status ||
              filters.patient ||
              filters.dateRange.start) && (
              <button
                onClick={clearFilters}
                className='px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors'
              >
                Clear All
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='mt-4 p-4 bg-white border border-gray-200 rounded-lg'
            >
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {/* Record Type Filter */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Record Type
                  </label>
                  <select
                    value={filters.recordType}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        recordType: e.target.value,
                      }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  >
                    <option value=''>All Types</option>
                    <option value='CONSULTATION'>Consultation</option>
                    <option value='LAB_RESULT'>Lab Result</option>
                    <option value='IMAGING'>Imaging</option>
                    <option value='PRESCRIPTION'>Prescription</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={e =>
                      setFilters(prev => ({ ...prev, status: e.target.value }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  >
                    <option value=''>All Status</option>
                    <option value='ACTIVE'>Active</option>
                    <option value='COMPLETED'>Completed</option>
                    <option value='ARCHIVED'>Archived</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Date From
                  </label>
                  <input
                    type='date'
                    value={filters.dateRange.start}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value },
                      }))
                    }
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Records List */}
        <div className='bg-white rounded-xl shadow-sm border border-gray-200'>
          {filteredRecords.length === 0 ? (
            <div className='text-center py-12'>
              <FiFileText className='w-16 h-16 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                No medical records found
              </h3>
              <p className='text-gray-500 mb-6'>
                {searchedPatient
                  ? 'No records found for this patient'
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <div className='divide-y divide-gray-200'>
              {filteredRecords.map(record => (
                <motion.div
                  key={record._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='p-6 hover:bg-gray-50 transition-colors'
                >
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <h3 className='font-semibold text-gray-900 mb-1'>
                        {record.title}
                      </h3>
                      <p className='text-gray-600 text-sm mb-2'>
                        {record.description}
                      </p>
                      <div className='flex items-center gap-4 text-sm text-gray-500'>
                        <div className='flex items-center gap-1'>
                          <FiUser className='w-4 h-4' />
                          <span>
                            {record.patientId.firstName}{' '}
                            {record.patientId.lastName}
                          </span>
                        </div>
                        <div className='flex items-center gap-1'>
                          <FiCalendar className='w-4 h-4' />
                          <span>{formatDate(record.date)}</span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRecordTypeColor(record.recordType)}`}
                        >
                          {getRecordTypeIcon(record.recordType)}
                          {getRecordTypeLabel(record.recordType)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}
                        >
                          {getStatusIcon(record.status)}
                          {record.status.charAt(0) +
                            record.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => handleViewRecord(record._id)}
                        className='flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors'
                      >
                        <FiEye className='w-4 h-4' />
                        View
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/records/${record._id}/edit`)
                        }
                        className='flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded transition-colors'
                      >
                        <FiEdit className='w-4 h-4' />
                        Edit
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Results Summary */}
        {filteredRecords.length > 0 && (
          <div className='mt-6 text-center text-sm text-gray-600'>
            Showing {filteredRecords.length} of {records.length} records
          </div>
        )}
      </div>
    </div>
  );
}
