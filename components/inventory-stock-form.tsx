import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ApiClient } from '@/lib/api-client';

const formSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  quantity: z.coerce.number().min(0, 'Quantity must be a positive number'),
  unit: z.string().min(1, 'Unit is required'),
  reorderLevel: z.coerce.number().min(0, 'Amount used must be a positive number'),
  supplierId: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.date().optional(),
  purchasePrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  storageLocation: z.string().optional(),
  description: z.string().optional(),
});

type InventoryStockFormValues = z.infer<typeof formSchema>;

interface InventoryStockFormProps {
  initialValues?: Partial<InventoryStockFormValues>;
  onSave: (values: InventoryStockFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const unitOptions = [
  'each', 'pair', 'pieces', 'wipes', 'box', 'pack', 'bottle', 'roll', 'carton', 'kit', 'sachet'
];

export function InventoryStockForm({ initialValues, onSave, onCancel, isSaving }: InventoryStockFormProps) {
  const [categories, setCategories] = useState<{ value: string, label: string }[]>([]);
  const [, setSuppliers] = useState<{ value: string, label: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const catRes = await ApiClient.getInventoryCategories();
        setCategories(catRes.data || []);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
      try {
        const supRes = await ApiClient.getInventorySuppliers();
        setSuppliers(supRes.data || []);
      } catch (error) {
        console.error("Failed to fetch suppliers", error);
      }
    };
    fetchOptions();
  }, []);

  const form = useForm<InventoryStockFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues || {},
  });

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;

    try {
      setIsAddingCategory(true);
      const response = await ApiClient.createInventoryCategory(name);
      const option = response?.data || { value: name, label: name };

      setCategories((current) => {
        const exists = current.some((item) => item.value.toLowerCase() === option.value.toLowerCase());
        return exists ? current : [...current, option].sort((a, b) => a.label.localeCompare(b.label));
      });
      form.setValue('categoryId', option.value, { shouldDirty: true, shouldValidate: true });
      setNewCategory('');
    } catch (error) {
      console.error('Failed to add category', error);
      const option = { value: name, label: name };
      setCategories((current) => {
        const exists = current.some((item) => item.value.toLowerCase() === option.value.toLowerCase());
        return exists ? current : [...current, option].sort((a, b) => a.label.localeCompare(b.label));
      });
      form.setValue('categoryId', option.value, { shouldDirty: true, shouldValidate: true });
      setNewCategory('');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    await onSave(values);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="itemName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Gloves" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={categories}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select a category"
                    searchPlaceholder="Search categories..."
                    emptyText="No categories found."
                  />
                </FormControl>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder="Add category"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCategory}
                    disabled={isAddingCategory || newCategory.trim().length === 0}
                  >
                    Add
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {unitOptions.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reorderLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Used</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Item description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier (Optional)</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={suppliers}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a supplier"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="batchNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch Number (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Expiry Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date()
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchasePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Price (Optional)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price (Optional)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="storageLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Location (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div> */}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Stock'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
