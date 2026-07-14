'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  FileDown,
  ListFilter,
  Package,
  PackageCheck,
  PackageX,
  Clock,
  Bell,
  Lightbulb,
  Activity,
  Info,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/loading-state';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ApiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-message';
import { toast } from '@/hooks/use-toast';
import { Inventory, InventorySummary, InventoryActivity } from '@/lib/types';
import { AddStockModal } from '@/components/add-stock-modal';
import { InventoryStockForm } from '@/components/inventory-stock-form';

const PAGE_SIZE = 10;

type ProcedureConsumableTemplate = {
  id: string;
  category: string;
  procedure: string;
  consumables: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  totalConsumableLines: number;
  directMaterialLines: number;
};

type InventoryCategoryOption = {
  value: string;
  label: string;
};

type InventoryItem = Inventory & {
  description?: string;
  storageLocation?: string;
  supplierName?: string;
  batchNumber?: string;
  purchasePrice?: number;
  sellingPrice?: number;
};

const statusMap: { [key: string]: { label: string; color: string } } = {
  'in-stock': { label: 'In Stock', color: 'bg-green-100 text-green-800' },
  'low-stock': { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' },
  'out-of-stock': { label: 'Out of Stock', color: 'bg-red-100 text-red-800' },
  'needs-review': { label: 'Needs Review', color: 'bg-blue-100 text-blue-800' },
};

const getStatusBadge = (status: string) => {
  const statusInfo = statusMap[status] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  return <Badge className={`${statusInfo.color} hover:${statusInfo.color}`}>{statusInfo.label}</Badge>;
};

export default function InventoryReportPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Inventory[]>([]);
  const [activity, setActivity] = useState<InventoryActivity[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategoryOption[]>([]);
  const [procedureConsumables, setProcedureConsumables] = useState<ProcedureConsumableTemplate[]>([]);
  const [procedureConsumableTotal, setProcedureConsumableTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    dateRange: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [isActionSaving, setIsActionSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const skip = (page - 1) * PAGE_SIZE;
      const params = {
        limit: PAGE_SIZE,
        skip,
        search: searchTerm.trim() || undefined,
        ...filters,
      };

      const [inventoryRes, summaryRes, lowStockRes, activityRes, procedureConsumableRes, categoriesRes] = await Promise.all([
        ApiClient.getInventoryReport(params),
        ApiClient.getInventorySummary(),
        ApiClient.getLowStockItems(),
        ApiClient.getInventoryActivity(),
        ApiClient.getProcedureConsumableTemplates({
          limit: 8,
          skip: 0,
          search: searchTerm.trim() || undefined,
        }),
        ApiClient.getInventoryCategories(),
      ]);

      setInventory(inventoryRes?.data || []);
      setTotal(inventoryRes?.total || 0);
      setSummary(summaryRes?.data || null);
      setLowStockItems(lowStockRes?.data || []);
      setActivity(activityRes?.data || []);
      setProcedureConsumables(procedureConsumableRes?.data || []);
      setProcedureConsumableTotal(procedureConsumableRes?.total || 0);
      setInventoryCategories(categoriesRes?.data || []);
    } catch (error) {
      toast({
        title: 'Error fetching data',
        description: getErrorMessage(error, 'Could not load inventory reports.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, searchTerm]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
    });
  }, [fetchData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const openViewDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const openAdjustDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustQuantity(String(item.quantity ?? 0));
    setAdjustNote('');
    setIsAdjustOpen(true);
  };

  const handleEditStock = async (values: any) => {
    if (!selectedItem) return;

    try {
      setIsActionSaving(true);
      await ApiClient.updateStockItem(selectedItem.id, values);
      toast({ title: 'Stock updated', description: 'Inventory item details were saved.' });
      setIsEditOpen(false);
      setSelectedItem(null);
      await fetchData();
    } catch (error) {
      toast({
        title: 'Error updating stock',
        description: getErrorMessage(error, 'Could not update this inventory item.'),
        variant: 'destructive',
      });
    } finally {
      setIsActionSaving(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedItem) return;
    const quantity = Number(adjustQuantity);

    if (!Number.isFinite(quantity) || quantity < 0) {
      toast({
        title: 'Invalid quantity',
        description: 'Enter a quantity of 0 or more.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsActionSaving(true);
      await ApiClient.updateStockItem(selectedItem.id, {
        quantity,
        adjustmentType: 'manual-adjustment',
        adjustmentNote: adjustNote || 'Manual stock adjustment',
      });
      toast({ title: 'Stock adjusted', description: 'The recorded quantity has been updated.' });
      setIsAdjustOpen(false);
      setSelectedItem(null);
      await fetchData();
    } catch (error) {
      toast({
        title: 'Error adjusting stock',
        description: getErrorMessage(error, 'Could not adjust this stock item.'),
        variant: 'destructive',
      });
    } finally {
      setIsActionSaving(false);
    }
  };

  const handleDeleteStock = async (item: InventoryItem) => {
    const confirmed = window.confirm(`Delete ${item.name} from inventory?`);
    if (!confirmed) return;

    try {
      await ApiClient.deleteStockItem(item.id);
      toast({ title: 'Stock deleted', description: `${item.name} was removed from inventory.` });
      await fetchData();
    } catch (error) {
      toast({
        title: 'Error deleting stock',
        description: getErrorMessage(error, 'Could not delete this inventory item.'),
        variant: 'destructive',
      });
    }
  };

  const handleExportInventory = () => {
    const headers = ['Item', 'Category', 'Quantity', 'Unit', 'Amount Used', 'Status', 'Last Updated'];
    const rows = inventory.map((item) => [
      item.name,
      item.category,
      item.quantity,
      item.unit,
      item.reorderLevel,
      statusMap[item.status]?.label || item.status,
      new Date(item.lastUpdated).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedItemInitialValues = selectedItem
    ? {
        itemName: selectedItem.name,
        categoryId: selectedItem.category,
        quantity: selectedItem.quantity,
        unit: selectedItem.unit,
        reorderLevel: selectedItem.reorderLevel,
        description: selectedItem.description || '',
      }
    : undefined;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstItemNumber = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItemNumber = Math.min(page * PAGE_SIZE, total);
  const suggestedItems = inventory
    .filter((item) => item.status === 'needs-review' || item.status === 'low-stock' || item.status === 'out-of-stock')
    .slice(0, 3);
  const activityPreview = activity.slice(0, 3);

  return (
    <>
      <AddStockModal
        open={isAddStockModalOpen}
        onOpenChange={setIsAddStockModalOpen}
        onSuccess={() => fetchData()}
      />
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name || 'Inventory item'}</DialogTitle>
            <DialogDescription>
              Current stock details and usage counters for this item.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-slate-500">Category</p>
                <p className="font-medium text-slate-950">{selectedItem.category}</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <div className="mt-1">{getStatusBadge(selectedItem.status)}</div>
              </div>
              <div>
                <p className="text-slate-500">Quantity</p>
                <p className="font-medium text-slate-950">
                  {selectedItem.quantity} {selectedItem.unit}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Amount Used</p>
                <p className="font-medium text-slate-950">
                  {selectedItem.reorderLevel} {selectedItem.unit}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Last Updated</p>
                <p className="font-medium text-slate-950">
                  {new Date(selectedItem.lastUpdated).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Location</p>
                <p className="font-medium text-slate-950">{selectedItem.storageLocation || 'Not set'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-500">Description</p>
                <p className="font-medium text-slate-950">{selectedItem.description || 'No description.'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Edit Stock Item</DialogTitle>
            <DialogDescription>
              Update the item record. Quantity remains the real stock count, while amount used tracks procedure usage.
            </DialogDescription>
          </DialogHeader>
          <InventoryStockForm
            initialValues={selectedItemInitialValues}
            onSave={handleEditStock}
            onCancel={() => setIsEditOpen(false)}
            isSaving={isActionSaving}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock Quantity</DialogTitle>
            <DialogDescription>
              Update the hospital&apos;s actual stock count for {selectedItem?.name || 'this item'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjustQuantity">Quantity</Label>
              <Input
                id="adjustQuantity"
                type="number"
                min="0"
                value={adjustQuantity}
                onChange={(event) => setAdjustQuantity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustNote">Note</Label>
              <Input
                id="adjustNote"
                value={adjustNote}
                onChange={(event) => setAdjustNote(event.target.value)}
                placeholder="Reason for adjustment"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAdjustOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAdjustStock} disabled={isActionSaving}>
                {isActionSaving ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Report</h1>
            <p className="text-gray-600 mt-1">
              Track stock levels, view item statuses, and manage inventory.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button variant="outline" onClick={handleExportInventory} className="w-full sm:w-auto">
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setIsAddStockModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add New Stock
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalItems || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <PackageX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.lowStockCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
              <PackageCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.needsReviewCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recently Updated</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.recentlyUpdatedCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
              <div className="relative min-w-[260px] flex-1 snap-start md:min-w-0">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by item name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex min-w-max snap-start gap-2">
                <Select value={filters.category || 'all'} onValueChange={(value) => handleFilterChange('category', value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {inventoryCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-10">
                  <ListFilter className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState label="Loading inventory..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Item</th>
                      <th className="text-left py-3 px-4 font-medium">Category</th>
                      <th className="text-right py-3 px-4 font-medium">Quantity</th>
                      <th className="text-left py-3 px-4 font-medium">Unit</th>
                      <th className="text-right py-3 px-4 font-medium">Amount Used</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Last Updated</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500">
                          No inventory items found.
                        </td>
                      </tr>
                    ) : (
                      inventory.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                          <td className="py-3 px-4 text-gray-600">{item.category}</td>
                          <td className="py-3 px-4 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-3 px-4 text-gray-600">{item.unit}</td>
                          <td className="py-3 px-4 text-right text-gray-600">{item.reorderLevel}</td>
                          <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {new Date(item.lastUpdated).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openViewDialog(item)}>View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(item)}>Edit Item</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAdjustDialog(item)}>Adjust Stock</DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleDeleteStock(item)}
                                >
                                  Delete Item
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {!isLoading && total > 0 && (
              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-600">
                  Showing {firstItemNumber}-{lastItemNumber} of {total} items
                </p>
                <Pagination className="mx-0 w-auto justify-start md:justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage(Math.max(1, page - 1)); }}
                        className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage(Math.min(totalPages, page + 1)); }}
                        className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Procedure Consumable Standards</CardTitle>
                <p className="mt-1 text-sm text-gray-600">
                  Background estimates used to compare expected consumable usage with hospital stock.
                </p>
              </div>
              <Badge variant="outline">
                {procedureConsumableTotal} procedure{procedureConsumableTotal === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState label="Loading procedure consumables..." />
            ) : procedureConsumables.length === 0 ? (
              <p className="text-sm text-gray-500">No procedure consumable standards found.</p>
            ) : (
              <div className="space-y-3">
                {procedureConsumables.map((template) => (
                  <div key={template.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
                          {template.category}
                        </p>
                        <p className="mt-1 font-semibold text-slate-950">{template.procedure}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{template.totalConsumableLines} lines</Badge>
                        <Badge variant="outline">{template.directMaterialLines} direct</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {template.consumables.slice(0, 8).map((item, index) => (
                        <span
                          key={`${template.id}-${item.name}-${index}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                        >
                          {item.name}: {item.quantity} {item.unit}
                        </span>
                      ))}
                      {template.consumables.length > 8 && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                          +{template.consumables.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card> */}
      </div>

      {/* Sidebar */}
      <aside className="lg:col-span-1">
        <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <PackageCheck className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-950">Stock Check Assistant</h2>
                <Badge variant="outline" className="mt-1 border-blue-100 bg-blue-50 px-2 py-0 text-[10px] text-blue-700">
                  BETA
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4 p-4">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-950">Low Stock Alerts</h3>
                </div>
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-50 px-2 text-xs font-bold text-blue-700">
                  {lowStockItems.length}
                </span>
              </div>
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-slate-500">No items are currently below the review level.</p>
              ) : (
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {lowStockItems.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <span className="font-medium">{item.name}</span> has {item.quantity} {item.unit} on hand.
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                variant="link"
                className="mt-3 h-auto p-0 text-sm font-semibold text-blue-700"
                onClick={() => handleFilterChange('status', 'low-stock')}
              >
                View all low stock
              </Button>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-950">Suggested Stock to Check</h3>
              </div>
              {suggestedItems.length === 0 ? (
                <p className="text-sm text-slate-500">No stock checks suggested right now.</p>
              ) : (
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {suggestedItems.map((item) => (
                    <li key={item.id}>
                      Check <span className="font-medium">{item.name}</span> against the physical stock count.
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                variant="link"
                className="mt-3 h-auto p-0 text-sm font-semibold text-blue-700"
                onClick={() => handleFilterChange('status', 'needs-review')}
              >
                View suggestions
              </Button>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-1 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-950">Recent Procedure Activity</h3>
              </div>
              <p className="mb-3 text-xs text-slate-500">Latest inventory usage and stock updates</p>
              {activityPreview.length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity.</p>
              ) : (
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {activityPreview.map((act) => (
                    <li key={act.id}>{act.description}</li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                variant="link"
                className="mt-3 h-auto p-0 text-sm font-semibold text-blue-700"
                onClick={() => setPage(1)}
              >
                View full activity
              </Button>
            </section>

            <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <p className="text-sm font-medium leading-6 text-slate-700">
                  This assistant only suggests items to review based on procedure activity.
                  Admin confirmation is required before any stock update.
                </p>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  </div>
  </>
  );
}
