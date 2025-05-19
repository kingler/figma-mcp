/**
 * Button component
 */

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * Primary button component
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  children,
  ...props
}, ref) => {
  
  // Would use a proper styling system like Tailwind or styled-components in an actual implementation
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white';
      case 'secondary':
        return 'bg-gray-200 text-gray-800';
      case 'outline':
        return 'border border-gray-300 text-gray-800';
      case 'ghost':
        return 'text-gray-800 bg-transparent';
      default:
        return 'bg-blue-600 text-white';
    }
  };
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-sm';
      case 'md':
        return 'px-4 py-2';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2';
    }
  };
  
  const baseClasses = 'rounded font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50';
  const disabledClasses = disabled || isLoading ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${getVariantClasses()} ${getSizeClasses()} ${disabledClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2">Loading...</span>
      ) : null}
      {children}
    </button>
  );
}); 