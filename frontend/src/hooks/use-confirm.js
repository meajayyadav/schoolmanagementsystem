// hooks/use-confirm.js
import { useState, useCallback, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

/**
 * @typedef {Object} ConfirmOptions
 * @property {string} title - The title of the confirmation dialog
 * @property {string} description - The description/message of the dialog
 * @property {string} [variant] - The variant of the dialog: 'default', 'destructive', 'success', 'warning', 'info'
 * @property {string} [confirmText] - Text for the confirm button
 * @property {string} [cancelText] - Text for the cancel button
 * @property {string} [confirmButtonVariant] - Variant for the confirm button
 * @property {boolean} [showLoader] - Whether to show a loader on confirm
 * @property {number} [timeout] - Auto-close timeout in milliseconds
 * @property {Function} [onConfirm] - Callback function after confirmation
 * @property {Function} [onCancel] - Callback function after cancellation
 * @property {boolean} [preventCloseOnOutsideClick] - Prevent closing by clicking outside
 * @property {boolean} [preventCloseOnEscape] - Prevent closing with Escape key
 * @property {React.ReactNode} [icon] - Custom icon component
 */

/**
 * @typedef {Object} ConfirmHook
 * @property {Function} confirm - Function to trigger confirmation dialog
 * @property {React.Component} ConfirmDialog - The dialog component
 * @property {boolean} isOpen - Whether the dialog is currently open
 * @property {Function} closeDialog - Function to manually close the dialog
 */

/**
 * Professional useConfirm hook with enhanced features
 * @returns {ConfirmHook}
 */
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
    variant: 'default',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmButtonVariant: 'default',
    showLoader: false,
    timeout: null,
    onConfirm: null,
    onCancel: null,
    preventCloseOnOutsideClick: false,
    preventCloseOnEscape: false,
    icon: null,
    resolve: null,
  });

  // Map variants to colors and icons
  const variantConfig = useMemo(() => ({
    default: {
      icon: Info,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-100',
      confirmButtonVariant: 'default',
    },
    destructive: {
      icon: XCircle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-100',
      confirmButtonVariant: 'destructive',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-100',
      confirmButtonVariant: 'default',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      confirmButtonVariant: 'default',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-100',
      confirmButtonVariant: 'default',
    },
  }), []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setLoading(false);
  }, []);

  /**
   * Trigger a confirmation dialog
   * @param {ConfirmOptions} options - Configuration options for the dialog
   * @returns {Promise<boolean>} - Resolves to true if confirmed, false if canceled
   */
  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      const variant = options.variant || 'default';
      const variantStyle = variantConfig[variant] || variantConfig.default;
      
      setConfig({
        title: options.title || 'Confirm Action',
        description: options.description || 'Are you sure you want to proceed?',
        variant,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        confirmButtonVariant: options.confirmButtonVariant || variantStyle.confirmButtonVariant,
        showLoader: options.showLoader || false,
        timeout: options.timeout || null,
        onConfirm: options.onConfirm || null,
        onCancel: options.onCancel || null,
        preventCloseOnOutsideClick: options.preventCloseOnOutsideClick || false,
        preventCloseOnEscape: options.preventCloseOnEscape || false,
        icon: options.icon || variantStyle.icon,
        resolve,
      });
      
      setOpen(true);
      setLoading(false);

      // Auto-close timeout
      if (options.timeout && options.timeout > 0) {
        setTimeout(() => {
          if (open) {
            handleCancel();
          }
        }, options.timeout);
      }
    });
  }, [open, variantConfig]);

  const handleConfirm = useCallback(async () => {
    if (config.showLoader) {
      setLoading(true);
    }

    try {
      if (config.onConfirm) {
        await config.onConfirm();
      }
      
      closeDialog();
      
      setTimeout(() => {
        if (config.resolve) {
          config.resolve(true);
        }
      }, 0);
    } catch (error) {
      console.error('Confirm callback error:', error);
      setLoading(false);
      // Don't close dialog on error, let user retry
    }
  }, [config, closeDialog]);

  const handleCancel = useCallback(() => {
    closeDialog();
    
    if (config.onCancel) {
      config.onCancel();
    }
    
    setTimeout(() => {
      if (config.resolve) {
        config.resolve(false);
      }
    }, 0);
  }, [config, closeDialog]);

  const handleOpenChange = useCallback((isOpen) => {
    if (!isOpen) {
      // Prevent close if configured
      if (config.preventCloseOnOutsideClick || config.preventCloseOnEscape) {
        return;
      }
      handleCancel();
    }
  }, [config, handleCancel]);

  const IconComponent = config.icon || variantConfig[config.variant]?.icon || Info;
  const variantStyle = variantConfig[config.variant] || variantConfig.default;

  const ConfirmDialog = useCallback(() => (
    <AlertDialog 
      open={open} 
      onOpenChange={handleOpenChange}
    >
      <AlertDialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="z-[9999] max-w-md"
        onEscapeKeyDown={(e) => {
          if (config.preventCloseOnEscape) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (config.preventCloseOnOutsideClick) {
            e.preventDefault();
          }
        }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${variantStyle.bgColor}`}>
              <IconComponent className={`h-5 w-5 ${variantStyle.iconColor}`} />
            </div>
            <AlertDialogTitle className="text-lg font-semibold">
              {config.title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-600 mt-2">
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel 
            onClick={handleCancel}
            type="button"
            disabled={loading}
            className="px-4 py-2"
          >
            {config.cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            type="button"
            disabled={loading}
            variant={config.confirmButtonVariant}
            className="px-4 py-2 min-w-[100px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              config.confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
        
        {/* Auto-close timer indicator */}
        {config.timeout && config.timeout > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-linear"
              style={{ 
                width: '100%',
                animation: `shrink ${config.timeout}ms linear forwards`
              }}
            />
            <style jsx>{`
              @keyframes shrink {
                from { width: 100%; }
                to { width: 0%; }
              }
            `}</style>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  ), [open, config, loading, handleOpenChange, handleCancel, handleConfirm, IconComponent, variantStyle]);

  // Convenience methods for common confirmation types
  const confirmDestructive = useCallback((options) => {
    return confirm({ ...options, variant: 'destructive' });
  }, [confirm]);

  const confirmSuccess = useCallback((options) => {
    return confirm({ ...options, variant: 'success' });
  }, [confirm]);

  const confirmWarning = useCallback((options) => {
    return confirm({ ...options, variant: 'warning' });
  }, [confirm]);

  const confirmInfo = useCallback((options) => {
    return confirm({ ...options, variant: 'info' });
  }, [confirm]);

  // Quick confirm methods
  const quickConfirm = useCallback((message, title = 'Confirm') => {
    return confirm({ title, description: message });
  }, [confirm]);

  const quickDelete = useCallback((itemName = 'item', title = 'Delete Confirmation') => {
    return confirmDestructive({
      title,
      description: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
    });
  }, [confirmDestructive]);

  return {
    confirm,
    ConfirmDialog,
    isOpen: open,
    closeDialog,
    loading,
    // Convenience methods
    confirmDestructive,
    confirmSuccess,
    confirmWarning,
    confirmInfo,
    quickConfirm,
    quickDelete,
  };
}

/**
 * Hook for confirming dangerous actions (like delete)
 * @returns {Function} - A specialized confirm function for destructive actions
 */
export function useConfirmDelete() {
  const { confirmDestructive } = useConfirm();
  
  const confirmDelete = useCallback((itemName, options = {}) => {
    return confirmDestructive({
      title: options.title || 'Delete Confirmation',
      description: options.description || `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: options.confirmText || 'Delete',
      cancelText: options.cancelText || 'Cancel',
      showLoader: options.showLoader !== undefined ? options.showLoader : true,
      ...options,
    });
  }, [confirmDestructive]);

  return confirmDelete;
}

/**
 * Hook for confirming form submissions
 * @returns {Function} - A specialized confirm function for form submissions
 */
export function useConfirmSubmit() {
  const { confirmSuccess } = useConfirm();
  
  const confirmSubmit = useCallback((options = {}) => {
    return confirmSuccess({
      title: options.title || 'Submit Changes',
      description: options.description || 'Are you sure you want to submit these changes?',
      confirmText: options.confirmText || 'Submit',
      cancelText: options.cancelText || 'Cancel',
      showLoader: options.showLoader !== undefined ? options.showLoader : true,
      ...options,
    });
  }, [confirmSuccess]);

  return confirmSubmit;
}