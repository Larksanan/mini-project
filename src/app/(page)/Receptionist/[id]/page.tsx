/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { IReceptionist } from '@/types/Receptionist';
import ReceptionistDetailCard from '@/components/Receptionist/ReceptionistDetailCard';
import { useToast } from '@/components/ui/Toast';

const ViewReceptionistPage = () => {
  const [receptionist, setReceptionist] = useState<IReceptionist | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    const fetchReceptionist = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/admin/receptionist/${id}`);
        const data = await response.json();

        if (data.success) {
          setReceptionist(data.data);
          showToast('Receptionist details loaded successfully', 'success');
        } else {
          showToast(data.error || 'Failed to fetch receptionist data', 'error');
        }
      } catch (error) {
        showToast(
          'An error occurred while fetching receptionist data',
          'error'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReceptionist();
  }, [id, showToast]);

  return (
    <>
      <ReceptionistDetailCard receptionist={receptionist} loading={loading} />
      <ToastContainer />
    </>
  );
};

export default ViewReceptionistPage;
