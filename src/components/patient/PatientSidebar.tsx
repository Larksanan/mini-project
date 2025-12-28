'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome,
  FiCalendar,
  FiFileText,
  FiDollarSign,
  FiMessageSquare,
  FiSettings,
  FiMenu,
  FiX,
  FiUser,
  FiHeart,
  FiClipboard,
} from 'react-icons/fi';

const navigation = [
  { name: 'Dashboard', href: '/patient', icon: FiHome },
  { name: 'My Profile', href: '/patient/profile', icon: FiUser },
  { name: 'Appointments', href: '/patient/appointments', icon: FiCalendar },
  { name: 'Medical Records', href: '/patient/records', icon: FiFileText },
  { name: 'Health Data', href: '/patient/health', icon: FiHeart },
  { name: 'Billing & Payments', href: '/patient/billing', icon: FiDollarSign },
  { name: 'Messages', href: '/patient/messages', icon: FiMessageSquare },
  { name: 'Prescriptions', href: '/patient/prescriptions', icon: FiClipboard },
];

export function PatientSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className='flex items-center justify-between h-16 px-4 border-b border-gray-200'>
          <div className='flex items-center'>
            <div className='shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center'>
              <FiUser className='text-white text-sm' />
            </div>
            <span className='ml-3 text-xl font-bold text-gray-900'>
              Patient Portal
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className='lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500'
          >
            <FiX className='h-6 w-6' />
          </button>
        </div>

        {/* Navigation */}
        <nav className='mt-8 px-4'>
          <div className='space-y-2'>
            {navigation.map(item => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon
                    className={`
                    mr-3 h-5 w-5 shrink-0
                    ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Settings */}
          <div className='mt-12 pt-8 border-t border-gray-200'>
            <Link
              href='/patient/settings'
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${
                  pathname === '/patient/settings' ||
                  pathname.startsWith('/patient/settings/')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
              onClick={() => setSidebarOpen(false)}
            >
              <FiSettings className='mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500' />
              Settings
            </Link>
          </div>
        </nav>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className='lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-lg border border-gray-200'
      >
        <FiMenu className='h-6 w-6 text-gray-600' />
      </button>
    </>
  );
}

// Add default export for compatibility
export default PatientSidebar;
