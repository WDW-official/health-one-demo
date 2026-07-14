'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState } from '@/components/loading-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Link from 'next/link';
import { Doctor } from '@/lib/types';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { getErrorMessage } from '@/lib/error-message';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Mail, Phone, Award, MoreHorizontal, Eye } from 'lucide-react';

const PAGE_SIZE = 10;

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);
  const [isDeletingDoctor, setIsDeletingDoctor] = useState(false);
  const user = getCurrentUser();
  const canManageDoctors = Boolean(user?.role === 'admin' && user.isSuperAdmin);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        setIsLoading(true);
        const res = await ApiClient.getAllDoctors({
          limit: PAGE_SIZE,
          skip: (page - 1) * PAGE_SIZE,
          search: searchTerm.trim() || undefined,
        });
        setDoctors(res?.data || []);
        setTotal(res?.total || 0);
      } catch (error) {
        console.error('Error loading doctors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctors();
  }, [page, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstDoctorNumber = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastDoctorNumber = Math.min(page * PAGE_SIZE, total);

  const handleDelete = async () => {
    if (!doctorToDelete) return;

    try {
      setIsDeletingDoctor(true);
      await ApiClient.deleteDoctor(doctorToDelete.id);
      toast({ title: 'Doctor deleted', description: `${doctorToDelete.name} was removed.` });
      setDoctorToDelete(null);
      const res = await ApiClient.getAllDoctors({
        limit: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        search: searchTerm.trim() || undefined,
      });
      setDoctors(res?.data || []);
      setTotal(res?.total || 0);
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast({
        title: 'Could not delete doctor',
        description: getErrorMessage(error, 'Failed to delete doctor'),
        variant: 'destructive',
      });
    } finally {
      setIsDeletingDoctor(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Doctors Management</h1>
          <p className="text-gray-600 mt-1">Manage clinic doctors and their specializations</p>
        </div>
        {canManageDoctors && (
          <Link href="/dashboard/doctors/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Doctor
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Doctors</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, specialization, or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Doctors</CardTitle>
          <CardDescription>
            {total} doctor{total !== 1 ? 's' : ''} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState label="Loading doctors" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                      No doctors found
                    </TableCell>
                  </TableRow>
                ) : (
                  doctors.map((doctor) => (
                    <TableRow
                      key={doctor.id}
                      className="cursor-pointer"
                      onClick={() => {
                        window.location.href = `/dashboard/doctors/${doctor.id}`;
                      }}
                    >
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/doctors/${doctor.id}`} className="text-blue-700 hover:underline">
                          {doctor.name}
                        </Link>
                      </TableCell>
                      <TableCell>{doctor.specialization}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-blue-600" />
                        {doctor.yearsOfExperience} years
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {doctor.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {doctor.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          doctor.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doctor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        {canManageDoctors && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open doctor actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/doctors/${doctor.id}`}>
                                  <Eye className="h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/doctors/${doctor.id}/edit`}>
                                  <Edit2 className="h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDoctorToDelete(doctor)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && total > 0 && (
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-600">
                Showing {firstDoctorNumber}-{lastDoctorNumber} of {total} doctor
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
        open={Boolean(doctorToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingDoctor) setDoctorToDelete(null);
        }}
        title="Delete doctor?"
        description={`This will remove ${doctorToDelete?.name || 'this doctor'} from the database. This action cannot be undone.`}
        confirmLabel={isDeletingDoctor ? 'Deleting...' : 'Delete doctor'}
        variant="destructive"
        disabled={isDeletingDoctor}
        onConfirm={handleDelete}
      />
    </div>
  );
}
