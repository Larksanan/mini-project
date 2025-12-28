/* eslint-disable no-undef */
import { FiUser } from 'react-icons/fi';
import { Patient } from '@/types/patient';
import PatientTableRow from './PatientTableRow';

interface PatientTableProps {
  patients: Patient[];
  deletingId: string | null;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddPatient?: () => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (field: string) => void;
}

const SortIcon = ({
  field,
  sortBy,
  sortOrder,
}: {
  field: string;
  sortBy: string;
  sortOrder: string;
}) => {
  if (sortBy !== field) return <span className='ml-1 text-gray-400'>⇅</span>;
  return <span className='ml-1'>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
};

const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  deletingId,
  onView,
  onEdit,
  onDelete,
  onAddPatient,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  if (patients.length === 0) {
    return (
      <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
        <div className='text-center py-12'>
          <FiUser className='mx-auto h-12 w-12 text-gray-400 mb-4' />
          <h3 className='text-lg font-medium text-gray-900 mb-2'>
            No patients found
          </h3>
          <p className='text-gray-500 mb-4'>No patients in your records yet.</p>
          {onAddPatient && (
            <button
              onClick={onAddPatient}
              className='text-blue-600 hover:text-blue-700 font-medium'
            >
              Add your first patient
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead className='bg-gray-50'>
            <tr>
              <th
                onClick={() => onSortChange('name')}
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
              >
                Patient{' '}
                <SortIcon field='name' sortBy={sortBy} sortOrder={sortOrder} />
              </th>

              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Contact
              </th>

              <th
                onClick={() => onSortChange('age')}
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
              >
                Age & Gender{' '}
                <SortIcon field='age' sortBy={sortBy} sortOrder={sortOrder} />
              </th>

              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Medical Info
              </th>

              <th
                onClick={() => onSortChange('joinDate')}
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
              >
                Joined{' '}
                <SortIcon
                  field='joinDate'
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              </th>

              <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Actions
              </th>
            </tr>
          </thead>

          <tbody className='bg-white divide-y divide-gray-200'>
            {patients.map((patient, index) => (
              <PatientTableRow
                key={patient._id}
                patient={patient}
                index={index}
                deletingId={deletingId}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientTable;
