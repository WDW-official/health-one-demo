'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { InventoryStockForm } from './inventory-stock-form';
import { ApiClient } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-message';

interface AddStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddStockModal({ open, onOpenChange, onSuccess }: AddStockModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (values: any) => {
    try {
      setIsSaving(true);
      await ApiClient.createStockItem(values);
      toast({ title: 'Success', description: 'Stock added successfully.' });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to add stock.'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Add New Stock</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new item to the inventory.
          </DialogDescription>
        </DialogHeader>
        <InventoryStockForm
          onSave={handleSave}
          onCancel={() => onOpenChange(false)}
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
}
