import { toast, type ToastOptions } from 'react-hot-toast'

const DEFAULTS: ToastOptions = { duration: 3000 }

export function showSuccess(message: string, opts?: ToastOptions) {
  return toast.success(message, { ...DEFAULTS, ...opts })
}

export function showError(message: string, opts?: ToastOptions) {
  return toast.error(message, { ...DEFAULTS, ...opts })
}

export function showInfo(message: string, opts?: ToastOptions) {
  return toast(message, { ...DEFAULTS, ...opts })
}

export function notify(type: 'success' | 'error' | 'info', message: string, opts?: ToastOptions) {
  if (type === 'success') return showSuccess(message, opts)
  if (type === 'error') return showError(message, opts)
  return showInfo(message, opts)
}

const api = { showSuccess, showError, showInfo, notify }
export default api
