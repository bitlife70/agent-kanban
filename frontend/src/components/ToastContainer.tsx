import { useToastStore, ToastType } from '../stores/toastStore';

// Simple monochrome icons
function ToastIcon({ type }: { type: ToastType }) {
  const iconClass = "w-4 h-4";

  switch (type) {
    case 'success':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      );
    case 'error':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      );
    case 'info':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
      );
  }
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'border-l-emerald-500 text-emerald-700 dark:text-emerald-400',
  error: 'border-l-red-500 text-red-700 dark:text-red-400',
  warning: 'border-l-amber-500 text-amber-700 dark:text-amber-400',
  info: 'border-l-blue-500 text-blue-700 dark:text-blue-400'
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            border-l-4 ${TOAST_STYLES[toast.type]}
            px-4 py-3 rounded shadow-md
            flex items-start gap-3
            animate-slide-in-right
          `}
        >
          <span className="flex-shrink-0 mt-0.5">
            <ToastIcon type={toast.type} />
          </span>
          <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">
            {toast.message}
          </span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
