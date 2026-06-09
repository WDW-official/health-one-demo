'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { LoadingState } from '@/components/loading-state';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { Doctor, User } from '@/lib/types';
import { AlertCircle, CheckCircle2, Search, ShieldCheck, Stethoscope, UserCheck, UserMinus, UserPlus, Users2 } from 'lucide-react';

type CreateUserRole = 'admin' | 'doctor';
type ManagedUser = User & {
  updatedAt?: Date | string;
};

const USERS_PAGE_SIZE = 10;

export default function UsersPage() {
  const router = useRouter();
  const [currentUser] = useState<User | null>(() => getCurrentUser());
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<ManagedUser | null>(null);
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [activeUserTotal, setActiveUserTotal] = useState(0);
  const [filteredActiveUserTotal, setFilteredActiveUserTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin' as CreateUserRole,
    doctorId: '',
    isSuperAdmin: false,
    notes: '',
  });

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }

    if (currentUser.role !== 'admin' || !currentUser.isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await ApiClient.getAllDoctors();
        const list = Array.isArray((res as any)?.data) ? (res as any).data : [];
        setDoctors(list);
      } catch (err: any) {
        console.error('Failed to load doctors', err);
        setDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        const res = await ApiClient.getUsers({
          limit: USERS_PAGE_SIZE,
          skip: (userPage - 1) * USERS_PAGE_SIZE,
          search: userSearchTerm || undefined,
        });
        if (!isMounted) return;

        const usersList = Array.isArray((res as any)?.users) ? (res as any).users : [];
        setUsers(usersList);
        setUserTotal((res as any)?.total || 0);
        setActiveUserTotal((res as any)?.activeUserTotal || 0);
        setFilteredActiveUserTotal((res as any)?.activeTotal || 0);
      } catch (err: any) {
        if (!isMounted) return;

        console.error('Failed to load users', err);
        setUsers([]);
        setUserTotal(0);
        setActiveUserTotal(0);
        setFilteredActiveUserTotal(0);
        setError(err.message || 'Failed to load users');
      } finally {
        if (isMounted) {
          setLoadingUsers(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [userPage, userSearchTerm]);

  const canCreateSuperAdmin = Boolean(currentUser?.isSuperAdmin);
  const isDoctorRole = form.role === 'doctor';

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === form.doctorId),
    [doctors, form.doctorId]
  );

  const userTotalPages = Math.max(1, Math.ceil(userTotal / USERS_PAGE_SIZE));
  const firstUserNumber = userTotal === 0 ? 0 : (userPage - 1) * USERS_PAGE_SIZE + 1;
  const lastUserNumber = Math.min(userPage * USERS_PAGE_SIZE, userTotal);

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleRoleChange = (role: CreateUserRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      doctorId: role === 'doctor' ? prev.doctorId : '',
      isSuperAdmin: role === 'admin' ? prev.isSuperAdmin : false,
    }));
    setError('');
    setSuccess('');
  };

  const handleDoctorSelect = (doctorId: string) => {
    const doctor = doctors.find((item) => item.id === doctorId);

    setForm((prev) => ({
      ...prev,
      doctorId,
      name: doctor?.name || prev.name,
      email: doctor?.email || prev.email,
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const result = await ApiClient.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        doctorId: isDoctorRole ? form.doctorId : undefined,
        isSuperAdmin: form.role === 'admin' ? form.isSuperAdmin : false,
      });

      if (result?.user && userPage === 1 && !userSearchTerm) {
        setUsers((current) => [result.user, ...current].slice(0, USERS_PAGE_SIZE));
        setUserTotal((current) => current + 1);
        setActiveUserTotal((current) => current + 1);
        setFilteredActiveUserTotal((current) => current + 1);
      } else {
        setUserSearchInput('');
        setUserSearchTerm('');
        setUserPage(1);
      }

      setSuccess(
        form.role === 'doctor'
          ? 'Doctor user created successfully.'
          : form.isSuperAdmin
            ? 'Superadmin created successfully.'
            : 'Admin user created successfully.'
      );
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'admin',
        doctorId: '',
        isSuperAdmin: false,
        notes: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const updateUserStatus = async (user: ManagedUser, nextStatus: boolean) => {
    const action = nextStatus ? 'activate' : 'deactivate';

    try {
      setUpdatingUserId(user.id);
      setError('');
      setSuccess('');
      const result = await ApiClient.updateUserStatus(user.id, nextStatus);
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, ...result.user } : item))
      );
      setActiveUserTotal((current) => current + (nextStatus ? 1 : -1));
      setFilteredActiveUserTotal((current) => current + (nextStatus ? 1 : -1));
      setSuccess(result?.message || `User ${action}d successfully.`);
    } catch (err: any) {
      setError(err.message || `Failed to ${action} user`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleUserStatus = async (user: ManagedUser) => {
    const nextStatus = user.isActive === false;

    if (!nextStatus) {
      setUserToDeactivate(user);
      return;
    }

    await updateUserStatus(user, nextStatus);
  };

  const handleUserSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const nextSearchTerm = userSearchInput.trim();
    if (nextSearchTerm === userSearchTerm && userPage === 1) return;
    setLoadingUsers(true);
    setUserPage(1);
    setUserSearchTerm(nextSearchTerm);
  };

  const clearUserSearch = () => {
    if (!userSearchInput && !userSearchTerm && userPage === 1) return;
    setLoadingUsers(true);
    setUserSearchInput('');
    setUserSearchTerm('');
    setUserPage(1);
  };

  if (!currentUser) {
    return (
      <LoadingState label="Loading access" className="glass-panel rounded-[2rem] p-8" />
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel section-grid overflow-hidden rounded-[2rem]">
        <div className="grid gap-0 ">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(124,199,184,0.18),transparent_65%)] blur-3xl" />
            <div className="relative space-y-4">
              {/* <Button asChild variant="outline" className="w-fit rounded-2xl border-slate-200 bg-white/70">
                <Link href="/dashboard/settings">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to settings
                </Link>
              </Button> */}
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Superadmin only
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                User management
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Add admin or doctor accounts, set superadmin access when needed, and require each new user to create their own password on first login.
              </p>
            </div>
          </div>

          <div className=" border-t border-white/60 bg-white/50 p-6 md:p-8 lg:border-l lg:border-t-0">
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
                <Users2 className="h-5 w-5 text-teal-700" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Current access
                </p>
                <p className="mt-2 text-sm font-medium text-slate-950">
                  {currentUser.name} ({currentUser.isSuperAdmin ? 'Superadmin' : 'Admin'})
                </p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
                <UserCheck className="h-5 w-5 text-sky-700" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  User accounts
                </p>
                <p className="mt-2 text-sm font-medium text-slate-950">
                  {loadingUsers ? (
                    <span className="inline-flex items-center text-primary">
                      <Spinner className="size-4" />
                      <span className="sr-only">Loading users</span>
                    </span>
                  ) : (
                    `${activeUserTotal} active / ${userTotal} total`
                  )}
                </p>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
                <Stethoscope className="h-5 w-5 text-sky-700" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Doctor profiles
                </p>
                <p className="mt-2 text-sm font-medium text-slate-950">
                  {loadingDoctors ? (
                    <span className="inline-flex items-center text-primary">
                      <Spinner className="size-4" />
                      <span className="sr-only">Loading doctors</span>
                    </span>
                  ) : (
                    `${doctors.length} available`
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not create user</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>User created</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="glass-panel border-white/60">
          <CardHeader>
            <CardTitle className="text-slate-950">New user</CardTitle>
            <CardDescription className="text-slate-600">
              Create an admin or doctor account. The temporary password must be changed on first login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => handleRoleChange(e.target.value as CreateUserRole)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>

                {isDoctorRole && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Doctor</label>
                    <SearchableSelect
                      value={form.doctorId}
                      onValueChange={handleDoctorSelect}
                      options={doctors.map((doctor) => ({
                        value: doctor.id,
                        label: doctor.name,
                        description: `${doctor.specialization} - ${doctor.email}`,
                      }))}
                      placeholder={loadingDoctors ? 'Loading doctors...' : 'Select doctor'}
                      searchPlaceholder="Search doctors..."
                      emptyText="No doctors found."
                      disabled={loadingDoctors}
                      className="h-12 rounded-2xl border-slate-200 bg-white/80"
                    />
                  </div>
                )}
              </div>

              {isDoctorRole && selectedDoctor && (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
                  <p className="font-semibold">{selectedDoctor.name}</p>
                  <p className="mt-1 text-teal-800">
                    {selectedDoctor.email} - {selectedDoctor.specialization}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Dr. Ada Okafor"
                    required
                    className="h-12 rounded-2xl border-slate-200 bg-white/80 focus-visible:ring-teal-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="ada@clinic.com"
                    required
                    className="h-12 rounded-2xl border-slate-200 bg-white/80 focus-visible:ring-teal-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Password</label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 rounded-2xl border-slate-200 bg-white/80 focus-visible:ring-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Optional notes about this account"
                  className="min-h-[120px] rounded-2xl border-slate-200 bg-white/80 focus-visible:ring-teal-500"
                />
              </div>

              {canCreateSuperAdmin && form.role === 'admin' && (
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isSuperAdmin}
                    onChange={(e) => updateField('isSuperAdmin', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Create as superadmin
                </label>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl clinic-gradient text-white"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {submitting ? 'Creating...' : 'Create user'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl border-slate-200 bg-white/70"
                  onClick={() => router.push('/dashboard/settings')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/60">
          <CardHeader>
            <CardTitle className="text-slate-950">Preview</CardTitle>
            <CardDescription className="text-slate-600">
              Review the account before creating it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Role
              </p>
              <p className="mt-2 text-sm font-medium text-slate-950 capitalize">
                {form.role}
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Doctor assignment
              </p>
              <p className="mt-2 text-sm font-medium text-slate-950">
                {isDoctorRole ? selectedDoctor?.name || 'Not selected' : 'Not needed'}
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Superadmin
              </p>
              <p className="mt-2 text-sm font-medium text-slate-950">
                {form.isSuperAdmin ? 'Yes' : 'No'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-white/60">
        <CardHeader>
          <CardTitle className="text-slate-950">All users</CardTitle>
          <CardDescription className="text-slate-600">
            Review account access and deactivate users who should no longer sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleUserSearch} className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                value={userSearchInput}
                onChange={(event) => setUserSearchInput(event.target.value)}
                placeholder="Search by name, email, or role..."
                className="h-11 rounded-2xl border-slate-200 bg-white/80 pl-10 focus-visible:ring-teal-500"
              />
            </div>
            <Button type="submit" className="rounded-2xl">
              Search
            </Button>
            {userSearchTerm && (
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={clearUserSearch}
              >
                Clear
              </Button>
            )}
          </form>

          <div className="flex flex-col gap-1 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <p>
              Showing {firstUserNumber}-{lastUserNumber} of {userTotal} user
              {userTotal !== 1 ? 's' : ''}
            </p>
            {userSearchTerm && (
              <p>
                {filteredActiveUserTotal} active match
                {filteredActiveUserTotal !== 1 ? 'es' : ''}
              </p>
            )}
          </div>

          {loadingUsers ? (
            <LoadingState label="Loading users" />
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No users found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Password</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isCurrentUser = user.id === currentUser.id;
                      const isActive = user.isActive !== false;

                      return (
                        <tr key={user.id} className="border-b border-slate-100">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-950">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="capitalize">
                                {user.role}
                              </Badge>
                              {user.isSuperAdmin && (
                                <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
                                  Superadmin
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              className={
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-200'
                              }
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {user.mustChangePassword ? 'Reset required' : 'Set'}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              type="button"
                              variant={isActive ? 'outline' : 'default'}
                              size="sm"
                              disabled={isCurrentUser || updatingUserId === user.id}
                              onClick={() => handleToggleUserStatus(user)}
                              className="rounded-2xl"
                            >
                              {isActive ? (
                                <UserMinus className="mr-2 h-4 w-4" />
                              ) : (
                                <UserCheck className="mr-2 h-4 w-4" />
                              )}
                              {updatingUserId === user.id
                                ? 'Updating...'
                                : isActive
                                  ? 'Make inactive'
                                  : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {userTotalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (userPage === 1) return;
                          setLoadingUsers(true);
                          setUserPage((current) => Math.max(1, current - 1));
                        }}
                      />
                    </PaginationItem>
                    {Array.from({ length: userTotalPages }, (_, index) => index + 1)
                      .slice(Math.max(0, userPage - 2), Math.min(userTotalPages, userPage + 1))
                      .map((pageNumber) => (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            isActive={pageNumber === userPage}
                            onClick={(event) => {
                              event.preventDefault();
                              if (pageNumber === userPage) return;
                              setLoadingUsers(true);
                              setUserPage(pageNumber);
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (userPage === userTotalPages) return;
                          setLoadingUsers(true);
                          setUserPage((current) => Math.min(userTotalPages, current + 1));
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(userToDeactivate)}
        onOpenChange={(open) => {
          if (!open && !updatingUserId) setUserToDeactivate(null);
        }}
        title="Make user inactive?"
        description={`This will stop ${userToDeactivate?.name || 'this user'} from signing in until the account is activated again.`}
        confirmLabel={updatingUserId ? 'Updating...' : 'Make inactive'}
        variant="destructive"
        disabled={Boolean(updatingUserId)}
        onConfirm={async () => {
          if (!userToDeactivate) return;
          await updateUserStatus(userToDeactivate, false);
          setUserToDeactivate(null);
        }}
      />
    </div>
  );
}
