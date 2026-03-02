import React, { useEffect } from 'react';
import { useBeforeUnload } from 'react-router-dom';

interface UnsavedChangesWarningProps {
  hasUnsavedChanges: boolean;
}

export const UnsavedChangesWarning: React.FC<UnsavedChangesWarningProps> = ({ hasUnsavedChanges }) => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return null;
};

