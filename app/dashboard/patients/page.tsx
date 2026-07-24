'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileUp,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  CalendarDays,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/loading-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-message';
import { getCurrentUser } from '@/lib/auth';
import { Patient, User } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { withHospitalDashboardPath } from '@/lib/tenant-routing';

const PAGE_SIZE = 10;

type LegacyPatientForm = {
  id: string;
  recordDate: string;
  name: string;
  dateOfBirth: string;
  familyStatus: string;
  sex: string;
  phoneNumber: string;
  homeAddress: string;
  hmoProvider: string;
  hmo: string;
  status: string;
  notes: string;
  procedureType: string;
  nextAppointment: string;
  followUp: string;
  whatsappFollowUp: string;
};

const emptyLegacyPatientForm: LegacyPatientForm = {
  id: '',
  recordDate: '',
  name: '',
  dateOfBirth: '',
  familyStatus: 'individual',
  sex: '',
  phoneNumber: '',
  homeAddress: '',
  hmoProvider: '',
  hmo: '',
  status: '',
  notes: '',
  procedureType: '',
  nextAppointment: '',
  followUp: '',
  whatsappFollowUp: '',
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [user] = useState<User | null>(() => getCurrentUser());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped: number;
    skippedRows: Array<{ row: number; reason: string }>;
    remappedMrns: Array<{ row: number; name?: string; csvId: string; newMrn: string }>;
  } | null>(null);
  const [importError, setImportError] = useState('');
  const [legacyForm, setLegacyForm] = useState<LegacyPatientForm>(emptyLegacyPatientForm);
  const [savingLegacyPatient, setSavingLegacyPatient] = useState(false);
  const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setIsLoading(true);
        const currentUser = getCurrentUser();
        const skip = (page - 1) * PAGE_SIZE;
        const params = {
    limit: PAGE_SIZE,
          skip,
          search: searchTerm.trim() || undefined,
          doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
        };

        const res = await ApiClient.getAllPatients(params);
        setPatients(res?.data || []);
        setTotal(res?.total || 0);
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatients();
  }, [page, searchTerm]);

  const handleDelete = async () => {
    if (!patientToDelete) return;

    try {
      setIsDeletingPatient(true);
      await ApiClient.deletePatient(patientToDelete.id);
      toast({ title: 'Patient deleted', description: 'The patient was removed from the database.' });
      setPatientToDelete(null);
      const currentUser = getCurrentUser();
      const skip = (page - 1) * PAGE_SIZE;
      const res = await ApiClient.getAllPatients({
        limit: PAGE_SIZE,
        skip,
        search: searchTerm.trim() || undefined,
        doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
      });
      setPatients(res?.data || []);
      setTotal(res?.total || 0);
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: 'Could not delete patient',
        description: getErrorMessage(error, 'Failed to delete patient'),
        variant: 'destructive',
      });
    } finally {
      setIsDeletingPatient(false);
    }
  };

  const handleImportPatients = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!importFile) {
      setImportError('Please choose a CSV or TSV file first.');
      return;
    }

    try {
      setImporting(true);
      setImportError('');
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', importFile);

      const headers = new Headers();
      const token = ApiClient.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch('/api/patients/import', {
        method: 'POST',
        headers,
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Import failed');
      }

      setImportResult({
        created: payload.data?.created ?? 0,
        skipped: payload.data?.skipped ?? 0,
        skippedRows: payload.data?.skippedRows ?? [],
        remappedMrns: payload.data?.remappedMrns ?? [],
      });
      setImportFile(null);

      const currentUser = getCurrentUser();
      const res = await ApiClient.getAllPatients({
        limit: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        search: searchTerm.trim() || undefined,
        doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
      });
      setPatients(res?.data || []);
      setTotal(res?.total || 0);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to import patients');
      setImportError(message);
      toast({ title: 'Import failed', description: message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const updateLegacyField = (field: keyof LegacyPatientForm, value: string) => {
    setLegacyForm((current) => ({ ...current, [field]: value }));
  };

  const refreshPatients = async () => {
    const currentUser = getCurrentUser();
    const res = await ApiClient.getAllPatients({
      limit: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      search: searchTerm.trim() || undefined,
      doctorId: currentUser?.role === 'doctor' ? currentUser.doctorId : undefined,
    });
    setPatients(res?.data || []);
    setTotal(res?.total || 0);
  };

  const handleCreateLegacyPatient = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!legacyForm.id.trim()) {
      setImportError('Old record ID is required.');
      return;
    }

    try {
      setSavingLegacyPatient(true);
      setImportError('');
      setImportResult(null);

      const response = await fetch('/api/patients/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ApiClient.getToken() ? { Authorization: `Bearer ${ApiClient.getToken()}` } : {}),
        },
        body: JSON.stringify({
          row: {
            Id: legacyForm.id,
            Timestamp: legacyForm.recordDate,
            NAME: legacyForm.name,
            'DATE OF BIRTH': legacyForm.dateOfBirth,
            'Family Status': legacyForm.familyStatus,
            Sex: legacyForm.sex,
            'Phone Number': legacyForm.phoneNumber,
            'Home Address': legacyForm.homeAddress,
            'HMO Provider': legacyForm.hmoProvider,
            HMO: legacyForm.hmo,
            Status: legacyForm.status,
            Notes: legacyForm.notes,
            'Procedure Type': legacyForm.procedureType,
            'Next Appointment': legacyForm.nextAppointment,
            'Follow-up': legacyForm.followUp,
            'WhatsApp Follow-up': legacyForm.whatsappFollowUp,
          },
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save old record');
      }

      setImportResult({
        created: payload.data?.created ?? 0,
        skipped: payload.data?.skipped ?? 0,
        skippedRows: payload.data?.skippedRows ?? [],
        remappedMrns: payload.data?.remappedMrns ?? [],
      });
      setLegacyForm(emptyLegacyPatientForm);
      await refreshPatients();
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to save old record');
      setImportError(message);
      toast({ title: 'Could not save old record', description: message, variant: 'destructive' });
    } finally {
      setSavingLegacyPatient(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstPatientNumber = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastPatientNumber = Math.min(page * PAGE_SIZE, total);
  const canDeletePatients = Boolean(user?.role === 'admin' && user.isSuperAdmin);
  const activeHospital = ApiClient.getActiveHospital();
  const routeUser = user
    ? { ...user, hospitalSlug: activeHospital?.slug || user.hospitalSlug || null }
    : user;

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'doctor' ? 'My Patients' : 'All Patients'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'doctor'
              ? 'Patients assigned to you'
              : 'Manage patient records and information'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={withHospitalDashboardPath('/dashboard/patients/birthdays', routeUser)}>
              <Button type="button" variant="outline">
                <CalendarDays className="w-4 h-4 mr-2" />
                Birthday Calendar
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImportError('');
                setImportResult(null);
                setIsLegacyModalOpen(true);
              }}
            >
              <FileUp className="w-4 h-4 mr-2" />
              Old Book Record
            </Button>
            <Link href="/dashboard/patients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Patient
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by MRN, name, email, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* {user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Import Patients</CardTitle>
            <CardDescription>
              Upload a CSV or TSV exported from Excel or Google Sheets. Legacy headers like
              `Id, NAME, DATE OF BIRTH, Family Status, Sex, Phone Number, Home Address, HMO Provider, HMO`
              are supported. CSV Id becomes the MRN with ARC added.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleImportPatients} className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium">Spreadsheet file</label>
                <Input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  disabled={importing}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Excel files should be saved as CSV first.
                </p>
              </div>
              <Button type="submit" disabled={importing || !importFile}>
                <FileUp className="mr-2 h-4 w-4" />
                {importing ? 'Importing...' : 'Import Spreadsheet'}
              </Button>
            </form>

            {importError && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span>{importError}</span>
              </div>
            )}

            {importResult && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Imported {importResult.created} patient{importResult.created !== 1 ? 's' : ''}
                </div>
                <p className="mt-1">
                  Skipped {importResult.skipped} row{importResult.skipped !== 1 ? 's' : ''}.
                </p>
                {importResult.skippedRows.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-emerald-700">
                    {importResult.skippedRows.slice(0, 5).map((row) => (
                      <li key={`${row.row}-${row.reason}`}>
                        Row {row.row}: {row.reason}
                      </li>
                    ))}
                    {importResult.skippedRows.length > 5 && (
                      <li>And {importResult.skippedRows.length - 5} more skipped rows.</li>
                    )}
                  </ul>
                )}
                {importResult.remappedMrns.length > 0 && (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-white/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Existing CSV IDs given new MRNs
                    </p>
                    <textarea
                      readOnly
                      value={importResult.remappedMrns
                        .map((row) => `Row ${row.row}: ${row.csvId} -> ${row.newMrn}`)
                        .join('\n')}
                      className="mt-2 h-32 w-full rounded border border-emerald-200 bg-white p-2 font-mono text-xs text-emerald-900"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )} */}

      {user?.role === 'admin' && (
        <Dialog open={isLegacyModalOpen} onOpenChange={setIsLegacyModalOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Old Book Record Entry</DialogTitle>
              <DialogDescription>
                Add one old patient record manually. The old ID becomes the MRN with ARC added, and duplicates are given the next available MRN.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
            <form onSubmit={handleCreateLegacyPatient} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Old ID</label>
                  <Input
                    value={legacyForm.id}
                    onChange={(event) => updateLegacyField('id', event.target.value)}
                    placeholder="19282"
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Record Date</label>
                  <Input
                    type="date"
                    value={legacyForm.recordDate}
                    onChange={(event) => updateLegacyField('recordDate', event.target.value)}
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Name</label>
                  <Input
                    value={legacyForm.name}
                    onChange={(event) => updateLegacyField('name', event.target.value)}
                    placeholder="Patient full name"
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Date of Birth</label>
                  <Input
                    type="date"
                    value={legacyForm.dateOfBirth}
                    onChange={(event) => updateLegacyField('dateOfBirth', event.target.value)}
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Family Status</label>
                  <Select
                    value={legacyForm.familyStatus}
                    disabled={savingLegacyPatient}
                    onValueChange={(value) => updateLegacyField('familyStatus', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select family status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Sex</label>
                  <Select
                    value={legacyForm.sex || 'not_provided'}
                    disabled={savingLegacyPatient}
                    onValueChange={(value) => updateLegacyField('sex', value === 'not_provided' ? '' : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_provided">Not provided</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Phone Number</label>
                  <Input
                    value={legacyForm.phoneNumber}
                    onChange={(event) => updateLegacyField('phoneNumber', event.target.value)}
                    placeholder="08100784221"
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-2 block text-sm font-medium">Home Address</label>
                  <Input
                    value={legacyForm.homeAddress}
                    onChange={(event) => updateLegacyField('homeAddress', event.target.value)}
                    placeholder="Home address from old record"
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">HMO Provider</label>
                  <Input
                    value={legacyForm.hmoProvider}
                    onChange={(event) => updateLegacyField('hmoProvider', event.target.value)}
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">HMO</label>
                  <Input
                    value={legacyForm.hmo}
                    onChange={(event) => updateLegacyField('hmo', event.target.value)}
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Status</label>
                  <Input
                    value={legacyForm.status}
                    onChange={(event) => updateLegacyField('status', event.target.value)}
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Procedure Type</label>
                  <Input
                    value={legacyForm.procedureType}
                    onChange={(event) => updateLegacyField('procedureType', event.target.value)}
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Next Appointment</label>
                  <Input
                    value={legacyForm.nextAppointment}
                    onChange={(event) => updateLegacyField('nextAppointment', event.target.value)}
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Follow-up</label>
                  <Input
                    value={legacyForm.followUp}
                    onChange={(event) => updateLegacyField('followUp', event.target.value)}
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">WhatsApp Follow-up</label>
                  <Input
                    value={legacyForm.whatsappFollowUp}
                    onChange={(event) => updateLegacyField('whatsappFollowUp', event.target.value)}
                    disabled={savingLegacyPatient}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-2 block text-sm font-medium">Notes</label>
                  <textarea
                    value={legacyForm.notes}
                    onChange={(event) => updateLegacyField('notes', event.target.value)}
                    disabled={savingLegacyPatient}
                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Notes from the old book"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={savingLegacyPatient}>
                  <Plus className="mr-2 h-4 w-4" />
                  {savingLegacyPatient ? 'Saving...' : 'Save Old Record'}
                </Button>
              </div>
            </form>

            {importError && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span>{importError}</span>
              </div>
            )}

            {importResult && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved {importResult.created} old record{importResult.created !== 1 ? 's' : ''}
                </div>
                {importResult.remappedMrns.length > 0 && (
                  <textarea
                    readOnly
                    value={importResult.remappedMrns
                      .map((row) => `Row ${row.row}: ${row.name ? `${row.name} | ` : ''}${row.csvId} -> ${row.newMrn}`)
                      .join('\n')}
                    className="mt-2 h-24 w-full rounded border border-emerald-200 bg-white p-2 font-mono text-xs text-emerald-900"
                  />
                )}
              </div>
            )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Patient Records</CardTitle>
          <CardDescription>
            {total} patient{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {isLoading ? (
            <LoadingState label="Loading patients" />
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full table-fixed text-xs sm:table-auto sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="w-[70px] px-2 py-3 text-left font-medium sm:w-auto sm:px-4">MRN</th>
                    <th className="px-2 py-3 text-left font-medium sm:px-4">Name</th>
                    <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Email</th>
                    <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Phone</th>
                    <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">DOB</th>
                    <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Registered</th>
                    <th className="w-[52px] px-2 py-3 text-right font-medium sm:w-auto sm:px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        {user?.role === 'doctor' ? 'No assigned patients found' : 'No patients found'}
                      </td>
                    </tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-2 py-3 sm:px-4">
                          <Link
                            href={`/dashboard/patients/${patient.id}`}
                            className="block max-w-[60px] truncate font-semibold text-gray-900 hover:text-blue-600 hover:underline sm:max-w-none"
                          >
                            {patient.mrn || patient.id}
                          </Link>
                        </td>
                        <td className="min-w-0 px-2 py-3 sm:px-4">
                          <Link
                            href={`/dashboard/patients/${patient.id}`}
                            className="group block min-w-0"
                          >
                            <span className="block truncate font-medium text-gray-900 group-hover:text-blue-600 group-hover:underline">
                              {patient.firstName} {patient.lastName}
                            </span>
                          </Link>
                          <p className="truncate text-[11px] font-semibold text-teal-700 sm:text-xs">
                            MRN {patient.mrn || patient.id}
                          </p>
                        </td>
                        <td className="hidden max-w-[220px] truncate px-4 py-3 text-gray-600 md:table-cell">{patient.email}</td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-gray-600 lg:table-cell">{patient.phone}</td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-gray-600 sm:table-cell">
                          {new Date(patient.dateOfBirth).toLocaleDateString()}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-gray-600 lg:table-cell">
                          {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'Not recorded'}
                        </td>
                        <td className="px-2 py-3 text-right sm:px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open patient actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/patients/${patient.id}`}>
                                  <Eye className="h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              {user?.role === 'admin' && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/dashboard/patients/${patient.id}/edit`}>
                                      <Edit2 className="h-4 w-4" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  {canDeletePatients && (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onSelect={() => setPatientToDelete(patient)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
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
                Showing {firstPatientNumber}-{lastPatientNumber} of {total} patient
                {total !== 1 ? 's' : ''} · Page {page} of {totalPages}
              </p>
              <Pagination className="mx-0 w-auto justify-start md:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page === 1) return;
                        setPage((current) => Math.max(1, current - 1));
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .slice(Math.max(0, page - 2), Math.min(totalPages, page + 1))
                    .map((pageNumber) => (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === page}
                          onClick={(event) => {
                            event.preventDefault();
                            setPage(pageNumber);
                          }}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className={page === totalPages ? 'pointer-events-none opacity-50' : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page === totalPages) return;
                        setPage((current) => Math.min(totalPages, current + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(patientToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingPatient) setPatientToDelete(null);
        }}
        title="Delete patient?"
        description={`This will permanently remove ${
          patientToDelete
            ? `${patientToDelete.firstName} ${patientToDelete.lastName}`
            : 'this patient'
        } from the database. This action cannot be undone.`}
        confirmLabel={isDeletingPatient ? 'Deleting...' : 'Delete patient'}
        variant="destructive"
        disabled={isDeletingPatient}
        onConfirm={handleDelete}
      />
    </div>
  );
}
