import React from 'react';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  isHoverable?: boolean;
  isPressable?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  shadow = 'md',
  radius = 'lg',
  isHoverable = false,
  isPressable = false,
  onClick,
}) => {
  const shadowClasses = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const radiusClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };

  const baseClasses =
    'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700';
  const hoverClasses = isHoverable
    ? 'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200'
    : '';
  const pressableClasses = isPressable
    ? 'cursor-pointer active:scale-[0.98]'
    : '';

  const cardContent = (
    <div
      className={twMerge(
        baseClasses,
        shadowClasses[shadow],
        radiusClasses[radius],
        hoverClasses,
        pressableClasses,
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );

  return isPressable ? (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {cardContent}
    </motion.div>
  ) : (
    cardContent
  );
};

export default Card;
