import { toast } from 'react-toastify';

const DEDUPE_WINDOW_MS = 1500;
const TOAST_METHODS = ['error', 'success', 'warning', 'warn', 'info'];

function normalizeToastContent(content) {
    if (typeof content === 'string') {
        return content;
    }

    if (typeof content === 'number' || typeof content === 'boolean') {
        return String(content);
    }

    return content?.props?.children ? String(content.props.children) : String(content);
}

export function installToastDedupe() {
    if (toast.__espmiDedupeInstalled) {
        return;
    }

    const recentToasts = new Map();

    TOAST_METHODS.forEach((method) => {
        const originalMethod = toast[method];

        if (typeof originalMethod !== 'function') {
            return;
        }

        toast[method] = (content, options = {}) => {
            if (options.toastId) {
                return originalMethod(content, options);
            }

            const key = `${method}:${normalizeToastContent(content)}`;
            const now = Date.now();
            const recentToast = recentToasts.get(key);

            if (recentToast && (now - recentToast.createdAt < DEDUPE_WINDOW_MS || toast.isActive(recentToast.id))) {
                return recentToast.id;
            }

            const id = originalMethod(content, options);
            recentToasts.set(key, { id, createdAt: now });

            return id;
        };
    });

    Object.defineProperty(toast, '__espmiDedupeInstalled', {
        value: true,
        enumerable: false,
        configurable: false,
    });
}
