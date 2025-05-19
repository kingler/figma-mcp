/**
 * Card component
 */

import React from 'react';

export interface CardProps {
  className?: string;
  title?: string;
  children: React.ReactNode;
}

/**
 * Card component for content containers
 */
export const Card: React.FC<CardProps> = ({
  className = '',
  title,
  children
}) => {
  const baseClasses = 'bg-white rounded-lg shadow-md p-4';
  
  return (
    <div className={`${baseClasses} ${className}`}>
      {title && (
        <h3 className="text-lg font-medium mb-2">{title}</h3>
      )}
      {children}
    </div>
  );
}; 