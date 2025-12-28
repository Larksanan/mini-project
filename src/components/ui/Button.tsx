import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  color?: 'primary' | 'secondary' | 'danger' | 'default';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost' | 'light';
  isIconOnly?: boolean;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  color = 'default',
  size = 'md',
  variant = 'solid',
  isIconOnly = false,
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseClasses =
    'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: isIconOnly ? 'p-2' : 'px-3 py-1.5 text-sm',
    md: isIconOnly ? 'p-2.5' : 'px-4 py-2.5',
    lg: isIconOnly ? 'p-3' : 'px-6 py-3 text-lg',
  };

  const colorClasses = {
    primary: {
      solid: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      outline:
        'border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
      ghost: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
      light: 'bg-blue-50 text-blue-600 hover:bg-blue-100 focus:ring-blue-500',
    },
    secondary: {
      solid: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      outline:
        'border border-gray-600 text-gray-600 hover:bg-gray-50 focus:ring-gray-500',
      ghost: 'text-gray-600 hover:bg-gray-50 focus:ring-gray-500',
      light: 'bg-gray-50 text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    },
    danger: {
      solid: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      outline:
        'border border-red-600 text-red-600 hover:bg-red-50 focus:ring-red-500',
      ghost: 'text-red-600 hover:bg-red-50 focus:ring-red-500',
      light: 'bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500',
    },
    default: {
      solid:
        'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-200',
      outline:
        'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
      ghost: 'text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
      light: 'bg-gray-50 text-gray-700 hover:bg-gray-100 focus:ring-gray-400',
    },
  };

  return (
    <button
      className={twMerge(
        baseClasses,
        sizeClasses[size],
        colorClasses[color][variant],
        isIconOnly && 'flex items-center justify-center',
        isLoading && 'opacity-70 cursor-wait',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className='flex items-center justify-center'>
          <span className='animate-spin rounded-full h-4 w-4 border-b-2 border-current'></span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
