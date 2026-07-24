'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Download,
  FileText,
  Package,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/loading-state';
import { ApiClient } from '@/lib/api-client';
import {
  Appointment,
  Billing,
  Consultation,
  Doctor,
  Patient,
} from '@/lib/types';

type RangeFilter = 'today' | '7d' | '30d' | 'month';

type PaymentStatus =
  | 'paid'
  | 'unpaid'
  | 'partially_paid'
  | 'hmo_pending';

const rangeOptions: Array<{
  value: RangeFilter;
  label: string;
}> = [
  {
    value: 'today',
    label: 'Today',
  },
  {
    value: '7d',
    label: '7 Days',
  },
  {
    value: '30d',
    label: '30 Days',
  },
  {
    value: 'month',
    label: 'This Month',
  },
];

const paymentLabels: Record<PaymentStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  hmo_pending: 'HMO Pending',
};

function formatNaira(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function getRangeStart(range: RangeFilter): Date {
  const date = new Date();

  if (range === 'today') {
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (range === '7d') {
    date.setDate(date.getDate() - 6);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (range === '30d') {
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateKey(value: Date | string): string {
  const date = new Date(value);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getProcedureAmount(consultation: Consultation) {
  const procedureTotal = (consultation.procedures || [])
    .filter((item) => item.status !== 'cancelled')
    .reduce((sum, item) => sum + Number(item.price || 0), 0);

  return Number(consultation.paymentAmount || procedureTotal || 0);
}

function getBillingStatusForFilter(
  consultation: Consultation,
  bill?: Billing,
) {
  if (!bill) return consultation.paymentStatus || 'unpaid';
  if (bill.paymentStatus === 'Paid' || bill.paymentStatus === 'HMO Paid') return 'paid';
  if (bill.paymentStatus === 'Part Paid') return 'partially_paid';
  if (bill.paymentStatus.startsWith('HMO')) return 'hmo_pending';
  return 'unpaid';
}

function getBillingSnapshot(consultation: Consultation, bill?: Billing) {
  const billed = bill?.totalAmount ?? getProcedureAmount(consultation);
  const paid = bill?.amountPaid ?? (consultation.paymentStatus === 'paid' ? billed : 0);
  const balance = bill?.balance ?? Math.max(billed - paid, 0);

  return {
    billed,
    paid,
    balance,
  };
}

export default function ReportsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [billingRecords, setBillingRecords] = useState<Billing[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [range, setRange] = useState<RangeFilter>('30d');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setIsLoading(true);

        const [
          appointmentRes,
          consultationRes,
          billingRes,
          patientRes,
          doctorRes,
        ] = await Promise.all([
          ApiClient.getAllAppointments({
            limit: 200,
            skip: 0,
          }),
          ApiClient.getAllConsultations({
            limit: 200,
            skip: 0,
          }),
          ApiClient.getBilling({
            limit: 200,
            skip: 0,
          }),
          ApiClient.getAllPatients({
            limit: 200,
            skip: 0,
          }),
          ApiClient.getAllDoctors({
            limit: 200,
            skip: 0,
          }),
        ]);

        setAppointments(appointmentRes?.data || []);
        setConsultations(consultationRes?.data || []);
        setBillingRecords(billingRes?.data || []);
        setPatients(patientRes?.data || []);
        setDoctors(doctorRes?.data || []);
      } catch (error) {
        console.error('Failed to load reports:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadReports();
  }, []);

  const reportData = useMemo(() => {
    const start = getRangeStart(range);
    const billingMap = new Map(
      billingRecords.map((bill) => [bill.consultationId, bill]),
    );

    const filteredAppointments = appointments.filter(
      (appointment) => {
        const appointmentDate = new Date(appointment.dateTime);

        return (
          appointmentDate >= start &&
          (doctorFilter === 'all' ||
            appointment.doctorId === doctorFilter)
        );
      },
    );

    const filteredConsultations = consultations.filter(
      (consultation) => {
        const consultationDate = new Date(
          consultation.createdAt,
        );

        return (
          consultationDate >= start &&
          (doctorFilter === 'all' ||
            consultation.doctorId === doctorFilter) &&
          (paymentFilter === 'all' ||
            getBillingStatusForFilter(
              consultation,
              billingMap.get(consultation.id),
            ) === paymentFilter)
        );
      },
    );

    const filteredPatients = patients.filter(
      (patient) => new Date(patient.createdAt) >= start,
    );

    const paidRevenue = filteredConsultations.reduce(
      (sum, consultation) =>
        sum +
        getBillingSnapshot(
          consultation,
          billingMap.get(consultation.id),
        ).paid,
      0,
    );

    const outstanding = filteredConsultations.reduce(
      (sum, consultation) =>
        sum +
        getBillingSnapshot(
          consultation,
          billingMap.get(consultation.id),
        ).balance,
      0,
    );

    const trendMap = new Map<
      string,
      {
        label: string;
        appointments: number;
        procedures: number;
        revenue: number;
      }
    >();

    filteredAppointments.forEach((appointment) => {
      const label = dateKey(appointment.dateTime);

      const entry = trendMap.get(label) || {
        label,
        appointments: 0,
        procedures: 0,
        revenue: 0,
      };

      entry.appointments += 1;
      trendMap.set(label, entry);
    });

    filteredConsultations.forEach((consultation) => {
      const label = dateKey(consultation.createdAt);

      const entry = trendMap.get(label) || {
        label,
        appointments: 0,
        procedures: 0,
        revenue: 0,
      };

      entry.procedures += Math.max(
        1,
        consultation.procedures?.length || 0,
      );

      entry.revenue += getBillingSnapshot(
        consultation,
        billingMap.get(consultation.id),
      ).paid;

      trendMap.set(label, entry);
    });

    const doctorMap = new Map<
      string,
      {
        name: string;
        appointments: number;
        procedures: number;
        revenue: number;
      }
    >();

    doctors.forEach((doctor) => {
      doctorMap.set(doctor.id, {
        name: doctor.name,
        appointments: 0,
        procedures: 0,
        revenue: 0,
      });
    });

    filteredAppointments.forEach((appointment) => {
      const entry = doctorMap.get(appointment.doctorId) || {
        name:
          appointment.doctorName || 'Unknown doctor',
        appointments: 0,
        procedures: 0,
        revenue: 0,
      };

      entry.appointments += 1;

      doctorMap.set(appointment.doctorId, entry);
    });

    filteredConsultations.forEach((consultation) => {
      const entry = doctorMap.get(consultation.doctorId) || {
        name:
          consultation.doctorName || 'Unknown doctor',
        appointments: 0,
        procedures: 0,
        revenue: 0,
      };

      entry.procedures += Math.max(
        1,
        consultation.procedures?.length || 0,
      );

      entry.revenue += getBillingSnapshot(
        consultation,
        billingMap.get(consultation.id),
      ).paid;

      doctorMap.set(consultation.doctorId, entry);
    });

    const procedureMap = new Map<
      string,
      {
        name: string;
        count: number;
        revenue: number;
      }
    >();

    filteredConsultations.forEach((consultation) => {
      const consultationProcedures =
        consultation.procedures?.length
          ? consultation.procedures
          : [
              {
                procedure:
                  consultation.treatment || 'Consultation',
                category: 'Consultation',
              },
            ];

      consultationProcedures.forEach((item) => {
        const procedureName =
          item.procedure || 'Unknown procedure';

        const entry = procedureMap.get(procedureName) || {
          name: procedureName,
          count: 0,
          revenue: 0,
        };

        entry.count += 1;

        entry.revenue +=
          getBillingSnapshot(
            consultation,
            billingMap.get(consultation.id),
          ).paid / consultationProcedures.length;

        procedureMap.set(procedureName, entry);
      });
    });

    const trends = Array.from(trendMap.values()).sort(
      (first, second) => {
        const firstDate = new Date(
          `${first.label}, ${new Date().getFullYear()}`,
        );
        const secondDate = new Date(
          `${second.label}, ${new Date().getFullYear()}`,
        );

        return firstDate.getTime() - secondDate.getTime();
      },
    );

    const doctorActivity = Array.from(
      doctorMap.values(),
    )
      .filter(
        (item) =>
          item.appointments ||
          item.procedures ||
          item.revenue,
      )
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const topProcedures = Array.from(
      procedureMap.values(),
    )
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      filteredAppointments,
      filteredConsultations,
      filteredPatients,
      paidRevenue,
      outstanding,
      trends,
      doctorActivity,
      topProcedures,
    };
  }, [
    appointments,
    billingRecords,
    consultations,
    doctors,
    doctorFilter,
    patients,
    paymentFilter,
    range,
  ]);

  const exportCsv = () => {
    const rows: Array<Array<string | number>> = [
      ['Metric', 'Value'],
      [
        'Appointments',
        reportData.filteredAppointments.length,
      ],
      [
        'Procedures',
        reportData.topProcedures.reduce(
          (sum, item) => sum + item.count,
          0,
        ),
      ],
      [
        'Active doctors',
        reportData.doctorActivity.length,
      ],
      [
        'Revenue generated',
        reportData.paidRevenue,
      ],
      ['Outstanding', reportData.outstanding],
      [
        'New patients',
        reportData.filteredPatients.length,
      ],
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(cell).replace(/"/g, '""')}"`,
          )
          .join(','),
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `health-one-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <LoadingState
        label="Loading reports"
        className="rounded-2xl border border-slate-200 bg-white p-6"
      />
    );
  }

  const totalProcedures =
    reportData.topProcedures.reduce(
      (sum, item) => sum + item.count,
      0,
    );

  const kpis = [
    {
      label: 'Appointments',
      value: reportData.filteredAppointments.length,
      icon: Calendar,
    },
    {
      label: 'Procedures',
      value: totalProcedures,
      icon: Activity,
    },
    {
      label: 'Active Doctors',
      value: reportData.doctorActivity.length,
      icon: Stethoscope,
    },
    {
      label: 'Revenue Generated',
      value: formatNaira(reportData.paidRevenue),
      icon: Wallet,
    },
    {
      label: 'New Patients',
      value: reportData.filteredPatients.length,
      icon: Users,
    },
    {
      label: 'Outstanding',
      value: formatNaira(reportData.outstanding),
      icon: AlertTriangle,
    },
  ];

  const selectedPaymentLabel =
    paymentFilter === 'all'
      ? null
      : paymentLabels[
          paymentFilter as PaymentStatus
        ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Reports & Analytics
          </h1>

          <p className="mt-1 max-w-3xl text-gray-600">
            View clinic performance by date, procedure,
            doctor, patient flow, revenue, and payment
            status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/reports/inventory">
            <Button variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Inventory Report
            </Button>
          </Link>
          
          <Button onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-4">
          <Select
            value={range}
            onValueChange={(value) => setRange(value as RangeFilter)}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
            {rangeOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>

          <Select
            value={doctorFilter}
            onValueChange={setDoctorFilter}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="all">All doctors</SelectItem>

            {doctors.map((doctor) => (
              <SelectItem
                key={doctor.id}
                value={doctor.id}
              >
                {doctor.name}
              </SelectItem>
            ))}
            </SelectContent>
          </Select>

          <Select
            value={paymentFilter}
            onValueChange={setPaymentFilter}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue placeholder="Select payment status" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="all">
              All payment statuses
            </SelectItem>

            {Object.entries(paymentLabels).map(
              ([value, label]) => (
                <SelectItem
                  key={value}
                  value={value}
                >
                  {label}
                </SelectItem>
              ),
            )}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setRange('30d');
              setDoctorFilter('all');
              setPaymentFilter('all');
            }}
          >
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <Card key={kpi.label}>
              <CardContent className="pt-5">
                <Icon className="h-5 w-5 text-blue-700" />

                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {kpi.label}
                </p>

                <p className="mt-2 break-words text-2xl font-bold text-slate-950">
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/reports/inventory"
          className="block"
        >
          <Card className="h-full transition-all hover:border-blue-500 hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Inventory Report

                <ArrowRight className="h-5 w-5 text-gray-400" />
              </CardTitle>

              <CardDescription>
                Track stock levels, view item statuses, and
                manage inventory.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div> */}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Revenue Generated
                </CardTitle>

                <CardDescription>
                  Consultation payment amounts by date
                </CardDescription>
              </CardHeader>

              <CardContent className="h-72">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart data={reportData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="label" />

                    <YAxis />

                    <Tooltip
                      formatter={(value) =>
                        formatNaira(Number(value))
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0f766e"
                      fill="#99f6e4"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Appointments & Procedure Trend
                </CardTitle>

                <CardDescription>
                  Activity trend for the selected period
                </CardDescription>
              </CardHeader>

              <CardContent className="h-72">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart data={reportData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="label" />

                    <YAxis />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="appointments"
                      stroke="#2563eb"
                      strokeWidth={2}
                    />

                    <Line
                      type="monotone"
                      dataKey="procedures"
                      stroke="#0f766e"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Doctor Activity</CardTitle>

                <CardDescription>
                  Appointments, procedures, and revenue
                </CardDescription>
              </CardHeader>

              <CardContent>
                {reportData.doctorActivity.length > 0 ? (
                  <div className="space-y-3">
                    {reportData.doctorActivity.map(
                      (doctor, index) => (
                        <div
                          key={`${doctor.name}-${index}`}
                          className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl border border-slate-200 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-950">
                              {doctor.name}
                            </p>

                            <p className="text-sm text-slate-500">
                              {doctor.appointments}{' '}
                              appointments ·{' '}
                              {doctor.procedures}{' '}
                              procedures
                            </p>
                          </div>

                          <p className="whitespace-nowrap font-semibold">
                            {formatNaira(
                              doctor.revenue,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No doctor activity found for the
                    selected filters.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Procedures</CardTitle>

                <CardDescription>
                  Most common procedures by count and
                  revenue
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {reportData.topProcedures.length > 0 ? (
                  <>
                    <div className="h-48">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={
                            reportData.topProcedures
                          }
                        >
                          <XAxis
                            dataKey="name"
                            hide
                          />

                          <YAxis />

                          <Tooltip />

                          <Bar
                            dataKey="count"
                            fill="#2563eb"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {reportData.topProcedures.map(
                        (procedure, index) => (
                          <div
                            key={`${procedure.name}-${index}`}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0 truncate font-medium">
                              {procedure.name}
                            </span>

                            <span className="shrink-0 text-slate-600">
                              {procedure.count} ·{' '}
                              {formatNaira(
                                procedure.revenue,
                              )}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    No procedure data found for the
                    selected filters.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-700" />

              <span>AI Reporting</span>

              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                Beta
              </span>
            </CardTitle>

            <CardDescription>
              Operational summaries from the current
              report filters.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {[
              [
                'Executive Summary',
                `${reportData.filteredAppointments.length} appointments and ${reportData.filteredConsultations.length} consultations in view.`,
              ],
              [
                'Revenue Insights',
                `${formatNaira(
                  reportData.paidRevenue,
                )} collected with ${formatNaira(
                  reportData.outstanding,
                )} outstanding.`,
              ],
              [
                'Payment Status',
                paymentFilter === 'all'
                  ? 'All payment states are included.'
                  : `Filtered to ${
                      selectedPaymentLabel ||
                      paymentFilter
                    }.`,
              ],
              [
                'Procedure Trends',
                `${
                  reportData.topProcedures[0]?.name ||
                  'No procedure'
                } is currently the leading procedure.`,
              ],
              [
                'Consumables Impact',
                'Inventory deductions can be linked from saved consultation procedures in the next inventory pass.',
              ],
              [
                'Suggested Questions',
                'Which doctor has the highest revenue? Which procedure has the highest unpaid amount?',
              ],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 p-3"
              >
                <p className="font-semibold text-slate-950">
                  {title}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  {body}
                </p>
              </div>
            ))}

            <p className="text-xs text-slate-500">
              AI summaries are for operational support
              only.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
