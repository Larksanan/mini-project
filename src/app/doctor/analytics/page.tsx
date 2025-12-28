/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Loading from '@/components/ui/Loading';
import ErrorComponent from '@/components/ui/Error';
import AnalyticsHeader from '@/components/ana/AnalyticsHeader';
import StatsCards from '@/components/ana/StatsCards';
import AnalyticsTabs from '@/components/ana/AnalyticsTabs';
import OverviewTab from '@/components/ana/OverviewTab';
import PatientsTab from '@/components/ana/PatientsTab';
import AppointmentsTab from '@/components/ana/AppointmentsTab';
import RevenueTab from '@/components/ana/RevenueTab';
import DiagnosesTab from '@/components/ana/DiagnosesTab';
import RefreshButton from '@/components/ui/RefreshButton';
import { AnalyticsData } from '@/types/analytics';

export default function DoctorAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<
    '7days' | '30days' | '90days' | '1year'
  >('30days');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }

    if (session?.user?.role !== 'DOCTOR') {
      router.push('/unauthorized');
    }

    if (session?.user) {
      fetchAnalytics();
    }
  }, [session, status, router, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/doctor/analytics?range=${timeRange}`);

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
    exit: { opacity: 0 },
  };

  // Show loading component
  if (status === 'loading' || loading) {
    return <Loading fullScreen />;
  }

  // Show error component
  if (error) {
    return <ErrorComponent message={error} onRetry={fetchAnalytics} />;
  }

  // Show loading while no analytics data
  if (!analytics) {
    return <Loading fullScreen />;
  }

  const tabComponents = {
    overview: <OverviewTab analytics={analytics} />,
    patients: <PatientsTab analytics={analytics} />,
    appointments: <AppointmentsTab analytics={analytics} />,
    revenue: <RevenueTab analytics={analytics} />,
    diagnoses: <DiagnosesTab analytics={analytics} />,
  };

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        variants={pageVariants}
        initial='initial'
        animate='animate'
        exit='exit'
        className='min-h-screen bg-gray-50 py-8'
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <AnalyticsHeader
            timeRange={timeRange}
            onTimeRangeChange={range =>
              setTimeRange(range as '7days' | '30days' | '90days' | '1year')
            }
          />

          <StatsCards analytics={analytics} />

          <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {tabComponents[activeTab as keyof typeof tabComponents]}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className='mt-6 flex justify-end'
          >
            <RefreshButton onClick={fetchAnalytics} loading={loading} />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
