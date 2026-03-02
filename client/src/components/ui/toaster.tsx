import { useToast } from '@/components/ui/use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-lg bg-gray-900 text-white px-4 py-3 shadow-lg flex items-start gap-3 max-w-sm"
          role="status"
        >
          <div className="flex-1 text-sm">
            {toast.title && <p className="font-semibold">{toast.title}</p>}
            {toast.description && (
              <p className="text-xs text-gray-200 mt-0.5">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="ml-2 text-xs text-gray-400 hover:text-white"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

