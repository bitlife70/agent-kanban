import { useToastStore, ToastType } from '../stores/toastStore';

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500'
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
            ${TOAST_COLORS[toast.type]} text-white
            px-4 py-3 rounded-lg shadow-lg
            flex items-center gap-3
            animate-slide-in-right
          `}
        >
          <span className="text-xl">{TOAST_ICONS[toast.type]}</span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/80 hover:text-white text-xl"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
