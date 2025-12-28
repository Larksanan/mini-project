/* eslint-disable no-undef */
import { FiSearch } from 'react-icons/fi';

interface PatientFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  genderFilter: string;
  onGenderFilterChange: (value: string) => void;
  bloodTypeFilter: string;
  onBloodTypeFilterChange: (value: string) => void;
  ageFilter: string;
  onAgeFilterChange: (value: string) => void;
  maritalStatusFilter: string;
  onMaritalStatusFilterChange: (value: string) => void;
  isActiveFilter: boolean;
  onIsActiveFilterChange: (value: boolean) => void;
  sortBy?: string;
  sortOrder?: string;
  onSortChange?: (sortBy: string, sortOrder: string) => void;
  limit?: number;
  onLimitChange?: (value: number) => void;
}

const PatientFilters: React.FC<PatientFiltersProps> = ({
  searchTerm,
  onSearchChange,
  genderFilter,
  onGenderFilterChange,
  bloodTypeFilter,
  onBloodTypeFilterChange,
  ageFilter,
  onAgeFilterChange,
  maritalStatusFilter,
  onMaritalStatusFilterChange,
  isActiveFilter,
  onIsActiveFilterChange,
  sortBy = 'name',
  sortOrder = 'asc',
  onSortChange,
  limit = 10,
  onLimitChange,
}) => {
  return (
    <div className='bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6'>
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        {/* Search input */}
        <div className='relative'>
          <FiSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
          <input
            type='text'
            placeholder='Search patients...'
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          />
        </div>

        {/* Gender filter */}
        <select
          value={genderFilter}
          onChange={e => onGenderFilterChange(e.target.value)}
          className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        >
          <option value='ALL'>All Genders</option>
          <option value='MALE'>Male</option>
          <option value='FEMALE'>Female</option>
          <option value='OTHER'>Other</option>
        </select>

        {/* Blood type filter */}
        <select
          value={bloodTypeFilter}
          onChange={e => onBloodTypeFilterChange(e.target.value)}
          className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        >
          <option value='ALL'>All Blood Types</option>
          <option value='O+'>O+</option>
          <option value='O-'>O-</option>
          <option value='A+'>A+</option>
          <option value='A-'>A-</option>
          <option value='B+'>B+</option>
          <option value='B-'>B-</option>
          <option value='AB+'>AB+</option>
          <option value='AB-'>AB-</option>
        </select>

        {/* Age filter */}
        <select
          value={ageFilter}
          onChange={e => onAgeFilterChange(e.target.value)}
          className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        >
          <option value='ALL'>All Ages</option>
          <option value='CHILD'>Children (&lt;18)</option>
          <option value='ADULT'>Adults (18-64)</option>
          <option value='SENIOR'>Seniors (65+)</option>
        </select>

        {/* Marital status filter */}
        <select
          value={maritalStatusFilter}
          onChange={e => onMaritalStatusFilterChange(e.target.value)}
          className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        >
          <option value='ALL'>All Status</option>
          <option value='SINGLE'>Single</option>
          <option value='MARRIED'>Married</option>
          <option value='DIVORCED'>Divorced</option>
          <option value='WIDOWED'>Widowed</option>
        </select>

        {/* Active status filter */}
        <select
          value={isActiveFilter ? 'ACTIVE' : 'INACTIVE'}
          onChange={e => onIsActiveFilterChange(e.target.value === 'ACTIVE')}
          className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        >
          <option value='ACTIVE'>Active</option>
          <option value='INACTIVE'>Inactive</option>
        </select>

        {/* Sort by */}
        {onSortChange && (
          <select
            value={sortBy}
            onChange={e => onSortChange(e.target.value, sortOrder)}
            className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          >
            <option value='name'>Sort by Name</option>
            <option value='age'>Sort by Age</option>
            <option value='recent'>Sort by Recent</option>
            <option value='gender'>Sort by Gender</option>
          </select>
        )}

        {/* Sort order */}
        {onSortChange && (
          <select
            value={sortOrder}
            onChange={e => onSortChange(sortBy, e.target.value)}
            className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          >
            <option value='asc'>Ascending</option>
            <option value='desc'>Descending</option>
          </select>
        )}

        {/* Limit */}
        {onLimitChange && (
          <select
            value={limit}
            onChange={e => onLimitChange(Number(e.target.value))}
            className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          >
            <option value='10'>10 per page</option>
            <option value='25'>25 per page</option>
            <option value='50'>50 per page</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default PatientFilters;
