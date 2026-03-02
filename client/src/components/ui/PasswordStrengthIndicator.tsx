import React from 'react';
import { getPasswordStrength } from '@/utils/validationSchemas';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  if (!password) return null;

  const { strength, score } = getPasswordStrength(password);
  
  const strengthConfig = {
    weak: { color: 'bg-red-500', text: 'Weak', width: '25%' },
    medium: { color: 'bg-yellow-500', text: 'Medium', width: '50%' },
    strong: { color: 'bg-blue-500', text: 'Strong', width: '75%' },
    'very-strong': { color: 'bg-green-500', text: 'Very Strong', width: '100%' },
  };

  const config = strengthConfig[strength];

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">Password Strength:</span>
        <span className={`text-xs font-medium ${
          strength === 'weak' ? 'text-red-600 dark:text-red-400' :
          strength === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
          strength === 'strong' ? 'text-blue-600 dark:text-blue-400' :
          'text-green-600 dark:text-green-400'
        }`}>
          {config.text}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${config.color}`}
          style={{ width: config.width }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {score}/7 criteria met
      </div>
    </div>
  );
};

