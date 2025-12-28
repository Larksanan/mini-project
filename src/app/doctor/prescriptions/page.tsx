'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';
import ErrorComponent from '@/components/Error';
import {
  SearchFilters,
  StatsCards,
  EmptyState,
  PrescriptionCard,
} from '@/components/Prescriptions/index';
import { Prescription, PrescriptionFilters } from '@/types/Prescription';
import { FiPlus } from 'react-icons/fi';

export default function PrescriptionsPage() {
  const router = useRouter();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<
    Prescription[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<PrescriptionFilters>({
    status: '',
    patient: '',
    dateRange: {
      start: '',
      end: '',
    },
  });

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  useEffect(() => {
    filterPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filters, prescriptions]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/doctor/prescriptions');

      if (!response.ok) {
        throw new Error('Failed to fetch prescriptions');
      }

      const result = await response.json();

      if (result.success) {
        setPrescriptions(result.data);
        setFilteredPrescriptions(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch prescriptions');
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setError('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const filterPrescriptions = () => {
    let filtered = prescriptions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        prescription =>
          prescription.patientId.firstName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          prescription.patientId.lastName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          prescription.diagnosis
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          prescription.medications.some(med =>
            med.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(
        prescription => prescription.status === filters.status
      );
    }

    // Patient filter
    if (filters.patient) {
      filtered = filtered.filter(
        prescription => prescription.patientId.userId === filters.patient
      );
    }

    // Date range filter
    if (filters.dateRange.start) {
      filtered = filtered.filter(
        prescription =>
          new Date(prescription.startDate) >= new Date(filters.dateRange.start)
      );
    }

    if (filters.dateRange.end) {
      filtered = filtered.filter(
        prescription =>
          new Date(prescription.startDate) <= new Date(filters.dateRange.end)
      );
    }

    setFilteredPrescriptions(filtered);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      patient: '',
      dateRange: {
        start: '',
        end: '',
      },
    });
    setSearchTerm('');
  };

  const getUniquePatients = () => {
    const patientsMap = new Map();
    prescriptions.forEach(prescription => {
      patientsMap.set(prescription.patientId.userId, prescription.patientId);
    });
    return Array.from(patientsMap.values());
  };

  const handleNewPrescription = () => {
    router.push('/doctor/prescriptions/new');
  };

  if (loading) return <Loading />;
  if (error) return <ErrorComponent message={error} />;

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <Header onNewPrescription={handleNewPrescription} />

        {/* Search and Filters */}
        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          filters={filters}
          setFilters={setFilters}
          clearFilters={clearFilters}
          uniquePatients={getUniquePatients()}
        />

        {/* Stats Cards */}
        <StatsCards prescriptions={prescriptions} />

        {/* Prescriptions List */}
        <PrescriptionsList
          prescriptions={filteredPrescriptions}
          onNewPrescription={handleNewPrescription}
          searchTerm={searchTerm}
          filters={filters}
        />
      </div>
    </div>
  );
}

// Header Component
const Header = ({ onNewPrescription }: { onNewPrescription: () => void }) => (
  <div className='mb-8'>
    <div className='flex justify-between items-start'>
      <div>
        <h1 className='text-3xl font-bold text-gray-900'>Prescriptions</h1>
        <p className='text-gray-600 mt-2'>
          Manage and review patient prescriptions
        </p>
      </div>
      <button
        onClick={onNewPrescription}
        className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md'
      >
        <FiPlus className='w-5 h-5' />
        New Prescription
      </button>
    </div>
  </div>
);

// Prescriptions List Component
const PrescriptionsList = ({
  prescriptions,
  onNewPrescription,
  searchTerm,
  filters,
}: {
  prescriptions: Prescription[];
  onNewPrescription: () => void;
  searchTerm: string;
  filters: PrescriptionFilters;
}) => (
  <div className='bg-white rounded-xl shadow-sm border border-gray-200'>
    {prescriptions.length === 0 ? (
      <EmptyState
        hasFilters={
          !!searchTerm ||
          !!filters.status ||
          !!filters.patient ||
          !!filters.dateRange.start
        }
        onNewPrescription={onNewPrescription}
      />
    ) : (
      <div className='divide-y divide-gray-200'>
        {prescriptions.map(prescription => (
          <PrescriptionCard
            key={prescription._id}
            prescription={prescription}
          />
        ))}
      </div>
    )}
  </div>
);
