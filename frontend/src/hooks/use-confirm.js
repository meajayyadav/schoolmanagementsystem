import { useState } from 'react';
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

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState({
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
    resolve: null,
  });

  const confirm = (options) => {
    return new Promise((resolve) => {
      setConfig({
        title: options.title || 'Confirm Action',
        description: options.description || 'Are you sure you want to proceed?',
        resolve,
      });
      setOpen(true);
    });
  };

  const handleConfirm = () => {
    setOpen(false);
    if (config.resolve) {
      config.resolve(true);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    if (config.resolve) {
      config.resolve(false);
    }
  };

  const ConfirmDialog = () => (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleCancel();
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>{config.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}

