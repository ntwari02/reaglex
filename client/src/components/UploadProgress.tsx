import React from 'react';
import { Loader2, X } from 'lucide-react';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  onCancel?: () => void;
  onRetry?: () => void;
  error?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  fileName,
  progress,
  onCancel,
  onRetry,
  error,
}) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{fileName}</p>
        {error ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-red-500">{error}</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-[10px] text-blue-500 hover:text-blue-600 underline"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <div className="mt-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">
              {progress}%
            </span>
          </div>
        )}
      </div>
      {onCancel && !error && (
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-red-500 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      {error && !onRetry && (
        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
      )}
    </div>
  );
};

