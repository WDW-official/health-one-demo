'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Spinner } from '@/components/ui/spinner';
import {
  Consultation,
  ConsultationAttachment,
  ConsultationConsumableUsage,
  Patient,
  Appointment,
  Doctor,
} from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import { ApiClient } from '@/lib/api-client';
import { getProcedureCategory, PROCEDURE_GROUPS, type ConsultationProcedure } from '@/lib/procedure-types';
import { getErrorMessage } from '@/lib/error-message';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, FileUp, Plus, Paperclip, Sparkles, Trash2, X } from 'lucide-react';

interface ConsultationFormProps {
  consultation?: Consultation;
  isEditing?: boolean;
}

type ConsultationChartBlock = {
  upperLeft: string;
  upperRight: string;
  lowerLeft: string;
  lowerRight: string;
};

type DiagnosisSuggestion = {
  diagnosis: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
};

const emptyChartBlock: ConsultationChartBlock = {
  upperLeft: '',
  upperRight: '',
  lowerLeft: '',
  lowerRight: '',
};
const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const chartFieldClass =
  'min-h-24 w-full resize-none border-0 bg-transparent p-3 text-base leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0 md:text-sm';

const emptyProcedure: ConsultationProcedure = {
  category: PROCEDURE_GROUPS[0].category,
  procedure: PROCEDURE_GROUPS[0].procedures[0],
  status: 'completed',
};

const emptyActualConsumable: ConsultationConsumableUsage = {
  name: '',
  quantity: 1,
  unit: '',
  source: 'actual',
  notes: '',
};

export default function ConsultationForm({
  consultation,
  isEditing = false,
}: ConsultationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const appointmentIdParam = searchParams.get('appointmentId');
  const currentUser = getCurrentUser();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [attachments, setAttachments] = useState<ConsultationAttachment[]>(
    (consultation as any)?.attachments || []
  );
  const [chartBlocks, setChartBlocks] = useState<ConsultationChartBlock[]>(
    ((consultation as any)?.chartBlocks || []).length > 0
      ? (consultation as any).chartBlocks
      : [{ ...emptyChartBlock }]
  );
  const [procedures, setProcedures] = useState<ConsultationProcedure[]>(
    ((consultation as any)?.procedures || []).length > 0
      ? (consultation as any).procedures
      : [{ ...emptyProcedure }]
  );
  const [actualConsumables, setActualConsumables] = useState<ConsultationConsumableUsage[]>(
    ((consultation as any)?.actualConsumables || []).length > 0
      ? (consultation as any).actualConsumables
      : []
  );
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestingDiagnosis, setIsSuggestingDiagnosis] = useState(false);
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<DiagnosisSuggestion[]>([]);
  const [aiDisclaimer, setAiDisclaimer] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    patientId: consultation?.patientId || patientIdParam || '',
    appointmentId: consultation?.appointmentId || appointmentIdParam || '',
    doctorId: consultation?.doctorId || currentUser?.doctorId || '',
    presentingComplaints: consultation?.presentingComplaints || '',
    examination: consultation?.examination || '',
    diagnosis: consultation?.diagnosis || '',
    treatmentPlan: consultation?.treatmentPlan || '',
    treatment: consultation?.treatment || '',
    prescription: consultation?.prescription || '',
    nextVisitDate: consultation?.nextVisitDate
      ? consultation.nextVisitDate.toISOString().slice(0, 16)
      : '',
    notes: consultation?.notes || '',
  });

  const selectedPatientAppointments = appointments.filter(
    (appointment) => appointment.patientId === formData.patientId
  );

  useEffect(() => {
    const loadFormData = async () => {
      const doctorParams = currentUser?.role === 'doctor' ? { doctorId: currentUser.doctorId } : {};
      const [patientRes, appointmentRes, doctorRes] = await Promise.all([
        ApiClient.getAllPatients({
          ...doctorParams,
          limit: 200,
          skip: 0,
        }),
        ApiClient.getAllAppointments({
          ...doctorParams,
          limit: 200,
          skip: 0,
        }),
        ApiClient.getAllDoctors({ limit: 200, skip: 0 }),
      ]);

      setPatients(patientRes?.data || []);
      setAppointments(appointmentRes?.data || []);
      setDoctors((doctorRes?.data || []).filter((doctor: Doctor) => doctor.isActive));
      setAttachments((consultation as any)?.attachments || []);
      setChartBlocks(
        ((consultation as any)?.chartBlocks || []).length > 0
          ? (consultation as any).chartBlocks
          : [{ ...emptyChartBlock }]
      );
      setProcedures(
        ((consultation as any)?.procedures || []).length > 0
          ? (consultation as any).procedures
          : [{ ...emptyProcedure }]
      );
      setActualConsumables((consultation as any)?.actualConsumables || []);

      if (!consultation?.patientId && appointmentIdParam) {
        const linkedAppointment = (appointmentRes?.data || []).find((apt: Appointment) => apt.id === appointmentIdParam);
        if (linkedAppointment?.patientId) {
          setFormData((prev) => ({
            ...prev,
            patientId: linkedAppointment.patientId,
            doctorId: linkedAppointment.doctorId || prev.doctorId,
          }));
        }
      }
    };

    loadFormData().catch((error) => {
      console.error('Failed to load consultation form data:', error);
    });
  }, [appointmentIdParam, consultation, consultation?.patientId, currentUser?.doctorId, currentUser?.role]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePatientSelect = (patientId: string) => {
    setFormData((prev) => ({
      ...prev,
      patientId,
      appointmentId: prev.patientId !== patientId ? '' : prev.appointmentId,
    }));
  };

  const handleAppointmentSelect = (appointmentId: string) => {
    const appointment = appointments.find((item) => item.id === appointmentId);
    setFormData((prev) => ({
      ...prev,
      appointmentId,
      doctorId: appointment?.doctorId || prev.doctorId,
    }));
  };

  const handleDoctorSelect = (doctorId: string) => {
    setFormData((prev) => ({
      ...prev,
      doctorId,
    }));
  };

  const addChartBlock = () => {
    setChartBlocks((current) => [...current, { ...emptyChartBlock }]);
  };

  const removeChartBlock = (index: number) => {
    setChartBlocks((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateChartBlock = (
    index: number,
    field: keyof ConsultationChartBlock,
    value: string
  ) => {
    setChartBlocks((current) =>
      current.map((block, currentIndex) =>
        currentIndex === index ? { ...block, [field]: value } : block
      )
    );
  };

  const getFilledChartBlocks = () =>
    chartBlocks.filter((block) =>
      Object.values(block).some((value) => value.trim().length > 0)
    );

  const addProcedure = () => {
    setProcedures((current) => [...current, { ...emptyProcedure }]);
  };

  const removeProcedure = (index: number) => {
    setProcedures((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateProcedureCategory = (index: number, category: string) => {
    const group = PROCEDURE_GROUPS.find((item) => item.category === category);
    setProcedures((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              category,
              procedure: group?.procedures[0] || item.procedure,
            }
          : item
      )
    );
  };

  const updateProcedure = (index: number, procedure: string) => {
    setProcedures((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              category: item.category || getProcedureCategory(procedure),
              procedure,
            }
          : item
      )
    );
  };

  const updateProcedureStatus = (index: number, status: ConsultationProcedure['status']) => {
    setProcedures((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              status,
            }
          : item
      )
    );
  };

  const getFilledProcedures = () =>
    procedures
      .filter((item) => item.procedure && item.procedure.trim().length > 0)
      .map((item) => ({
        ...item,
        status: item.status || 'completed',
      }));

  const addActualConsumable = () => {
    setActualConsumables((current) => [...current, { ...emptyActualConsumable }]);
  };

  const removeActualConsumable = (index: number) => {
    setActualConsumables((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateActualConsumable = (
    index: number,
    field: keyof ConsultationConsumableUsage,
    value: string
  ) => {
    setActualConsumables((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              [field]: field === 'quantity' ? Number(value || 0) : value,
              source: 'actual',
            }
          : item
      )
    );
  };

  const getFilledActualConsumables = () =>
    actualConsumables
      .filter((item) => item.name && item.name.trim().length > 0)
      .map((item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        source: 'actual' as const,
      }));

  const aiAssistReady = [
    formData.presentingComplaints,
    formData.examination,
    formData.treatmentPlan,
    ...chartBlocks.flatMap((block) => Object.values(block)),
    ...procedures.map((item) => item.procedure || ''),
  ].some((value) => value.trim().length > 0);

  const getChartNotes = () =>
    getFilledChartBlocks()
      .map((block, index) =>
        [
          `Chart ${index + 1}:`,
          block.upperRight && `Upper right: ${block.upperRight}`,
          block.upperLeft && `Upper left: ${block.upperLeft}`,
          block.lowerRight && `Lower right: ${block.lowerRight}`,
          block.lowerLeft && `Lower left: ${block.lowerLeft}`,
        ]
          .filter(Boolean)
          .join(' ')
      )
      .join('\n');

  const getPatientContext = () => {
    const patient = patients.find((item) => item.id === formData.patientId);
    if (!patient) return '';

    return [
      patient.gender && `Gender: ${patient.gender}`,
      patient.dateOfBirth && `DOB: ${new Date(patient.dateOfBirth).toLocaleDateString()}`,
      patient.medicalHistory && `Medical history: ${patient.medicalHistory}`,
      patient.allergies && `Allergies: ${patient.allergies}`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const suggestDiagnosis = async () => {
    if (!aiAssistReady) {
      toast({
        title: 'Add clinical notes first',
        description: 'Enter complaints, examination findings, chart notes, or procedures before requesting suggestions.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSuggestingDiagnosis(true);
      setDiagnosisSuggestions([]);
      setAiDisclaimer('');

      const response = await ApiClient.suggestConsultationDiagnosis({
        presentingComplaints: formData.presentingComplaints,
        examination: formData.examination,
        chartNotes: getChartNotes(),
        treatmentPlan: formData.treatmentPlan,
        procedures: getFilledProcedures(),
        patientContext: getPatientContext(),
      });

      const suggestions = response?.data?.suggestions || response?.suggestions || [];
      setDiagnosisSuggestions(suggestions);
      setAiDisclaimer(response?.data?.disclaimer || response?.disclaimer || '');

      if (suggestions.length === 0) {
        toast({
          title: 'No suggestions returned',
          description: 'Add more clinical details and try again.',
        });
      }
    } catch (suggestionError) {
      const message = getErrorMessage(suggestionError, 'Could not generate diagnosis suggestions.');
      toast({ title: 'AI suggestion failed', description: message, variant: 'destructive' });
    } finally {
      setIsSuggestingDiagnosis(false);
    }
  };

  const applyDiagnosisSuggestion = (suggestion: DiagnosisSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      diagnosis: suggestion.diagnosis,
    }));
  };

  const appendDiagnosisSuggestion = (suggestion: DiagnosisSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      diagnosis: [prev.diagnosis.trim(), suggestion.diagnosis].filter(Boolean).join('\n'),
    }));
  };

  const uploadSingleAttachment = (file: File, progressCallback?: (percent: number) => void) => {
    return new Promise<ConsultationAttachment>((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'consultations');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.responseType = 'json';

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && progressCallback) {
          progressCallback(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = xhr.response;
          const uploadedFile = (data?.uploads?.[0] || data || {}) as ConsultationAttachment;
          resolve({
            url: uploadedFile.url,
            publicId: uploadedFile.publicId,
            name: uploadedFile.name || file.name,
            mimeType: uploadedFile.mimeType || file.type,
            kind:
              uploadedFile.kind ||
              (uploadedFile.mimeType?.startsWith('image/') || file.type.startsWith('image/')
                ? 'image'
                : 'file'),
          });
        } else {
          reject(new Error('File upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('File upload failed'));
      xhr.send(formData);
    });
  };

  const uploadAttachments = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setUploadingFiles(true);
    setUploadProgress(0);
    setUploadStatus(`Preparing ${fileList.length} file${fileList.length > 1 ? 's' : ''}...`);
    setError('');

    try {
      const uploaded: ConsultationAttachment[] = [];

      for (let index = 0; index < fileList.length; index += 1) {
        const file = fileList[index];
        setUploadStatus(`Uploading ${file.name} (${index + 1}/${fileList.length})`);

        const uploadedFile = await uploadSingleAttachment(file, (fileProgress) => {
          const overallProgress = ((index + fileProgress / 100) / fileList.length) * 100;
          setUploadProgress(Math.min(99, Math.round(overallProgress)));
        });

        uploaded.push(uploadedFile);
        setAttachments((current) => [...current, uploadedFile]);
        const batchProgress = Math.round(((index + 1) / fileList.length) * 100);
        setUploadProgress(index === fileList.length - 1 ? 100 : Math.min(99, batchProgress));
      }

      setUploadStatus(`Uploaded ${uploaded.length} file${uploaded.length > 1 ? 's' : ''}`);
    } catch (uploadError) {
      console.error('Attachment upload failed:', uploadError);
      const message = getErrorMessage(uploadError, 'Failed to upload attachment(s).');
      setError(message);
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
    } finally {
      setUploadingFiles(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('');
      }, 800);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validation
      if (!formData.patientId) {
        setError('Patient is required');
        setIsLoading(false);
        return;
      }
      if (!formData.doctorId) {
        setError('Doctor is required');
        setIsLoading(false);
        return;
      }
      if (!formData.diagnosis.trim()) {
        setError('Diagnosis is required');
        setIsLoading(false);
        return;
      }
      if (!formData.treatment.trim()) {
        setError('Treatment is required');
        setIsLoading(false);
        return;
      }

      const nextVisitDate = formData.nextVisitDate
        ? new Date(formData.nextVisitDate)
        : undefined;

      if (isEditing && consultation) {
        await ApiClient.updateConsultation(consultation.id, {
          ...formData,
          nextVisitDate,
          doctorId: consultation.doctorId,
          chartBlocks: getFilledChartBlocks(),
          attachments,
          procedures: getFilledProcedures(),
          actualConsumables: getFilledActualConsumables(),
        });
        toast({ title: 'Consultation updated', description: 'The consultation record was saved successfully.' });
        router.push(`/dashboard/consultations/${consultation.id}`);
      } else {
        const res = await ApiClient.createConsultation({
          ...formData,
          nextVisitDate,
          doctorId: formData.doctorId,
          chartBlocks: getFilledChartBlocks(),
          attachments,
          procedures: getFilledProcedures(),
          actualConsumables: getFilledActualConsumables(),
          // paymentAmount: Number(formData.paymentAmount || 0),
          // paymentStatus: formData.paymentStatus,
        });
        const newConsultation = res?.data || res?.consultation;
        toast({ title: 'Consultation created', description: 'The consultation record was saved successfully.' });
        router.push(`/dashboard/consultations/${newConsultation?.id || newConsultation?._id}`);
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to save consultation. Please try again.');
      setError(message);
      toast({ title: 'Could not save consultation', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Consultation' : 'New Consultation'}</CardTitle>
        <CardDescription>
          {isEditing
            ? 'Update consultation record'
            : 'Record a new consultation for a patient'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Patient *</label>
              <SearchableSelect
                value={formData.patientId}
                onValueChange={handlePatientSelect}
                options={patients.map((patient) => ({
                  value: patient.id,
                  label: `${patient.mrn || patient.id} • ${patient.firstName} ${patient.lastName}`,
                  description: patient.email,
                }))}
                placeholder="Select a patient"
                searchPlaceholder="Search patients..."
                emptyText="No patients found."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Appointment</label>
              <SearchableSelect
                value={formData.appointmentId}
                onValueChange={handleAppointmentSelect}
                options={selectedPatientAppointments.map((apt) => {
                  const patient = patients.find((p) => p.id === apt.patientId);
                  const appointmentLabel = apt.appointmentNumber || apt.id;
                  return {
                    value: apt.id,
                    label: `Appointment ${appointmentLabel}`,
                    description: patient
                      ? `${patient.mrn || patient.id} - ${patient.firstName} ${patient.lastName} - ${new Date(apt.dateTime).toLocaleDateString()}`
                      : new Date(apt.dateTime).toLocaleDateString(),
                  };
                })}
                placeholder={
                  formData.patientId ? 'Select related appointment (optional)' : 'Select a patient first'
                }
                searchPlaceholder="Search appointments..."
                emptyText={
                  formData.patientId
                    ? 'No appointments found for this patient.'
                    : 'Select a patient to see their appointments.'
                }
                disabled={!formData.patientId}
              />
            </div>

            {currentUser?.role !== 'doctor' && (
              <div>
                <label className="block text-sm font-medium mb-1">Doctor *</label>
                <SearchableSelect
                  value={formData.doctorId}
                  onValueChange={handleDoctorSelect}
                  options={doctors.map((doctor) => ({
                    value: doctor.id,
                    label: doctor.name,
                    description: doctor.specialization,
                  }))}
                  placeholder={
                    formData.appointmentId ? 'Doctor from selected appointment' : 'Select a doctor'
                  }
                  searchPlaceholder="Search doctors..."
                  emptyText="No doctors found."
                  disabled={Boolean(formData.appointmentId)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Presenting Complaints</label>
            <textarea
              name="presentingComplaints"
              value={formData.presentingComplaints}
              onChange={handleChange}
              placeholder="What is the patient complaining about?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Examination</label>
            <textarea
              name="examination"
              value={formData.examination}
              onChange={handleChange}
              placeholder="Record clinical examination findings..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Chart</h3>
                <p className="text-sm text-slate-500">Use the four fields around the T chart for tooth notes.</p>
              </div>
              <Button type="button" variant="outline" onClick={addChartBlock}>
                <Plus className="mr-2 h-4 w-4" />
                Add Chart
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {chartBlocks.map((block, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Chart {index + 1}</p>
                    {chartBlocks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChartBlock(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="mx-auto grid max-w-xl grid-cols-2 overflow-hidden rounded-2xl border-2 border-black bg-white">
                    <textarea
                      value={block.upperRight}
                      onChange={(event) => updateChartBlock(index, 'upperRight', event.target.value)}
                      placeholder="Upper right"
                      rows={3}
                      className={`${chartFieldClass} border-b-2 border-black`}
                    />
                    <textarea
                      value={block.upperLeft}
                      onChange={(event) => updateChartBlock(index, 'upperLeft', event.target.value)}
                      placeholder="Upper left"
                      rows={3}
                      className={`${chartFieldClass} border-b-2 border-l-2 border-black`}
                    />
                    <textarea
                      value={block.lowerRight}
                      onChange={(event) => updateChartBlock(index, 'lowerRight', event.target.value)}
                      placeholder="Lower right"
                      rows={3}
                      className={chartFieldClass}
                    />
                    <textarea
                      value={block.lowerLeft}
                      onChange={(event) => updateChartBlock(index, 'lowerLeft', event.target.value)}
                      placeholder="Lower left"
                      rows={3}
                      className={`${chartFieldClass} border-l-2 border-black`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Impression/Diagnosis *</label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              placeholder="Document the impression or diagnosis..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-2xl bg-blue-600 p-2 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="whitespace-nowrap font-semibold text-slate-950">AI Assist</h3>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Beta
                        </span>
                      </div>
                      <span className="w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Clinician review required
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={suggestDiagnosis}
                  disabled={!aiAssistReady || isSuggestingDiagnosis || isLoading}
                  className="w-full sm:w-auto"
                >
                  {isSuggestingDiagnosis ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Suggest Diagnosis
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Generate possible impression/diagnosis options from complaints, examination, chart notes, and procedures.
              </p>

              {!aiAssistReady && (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  Add complaints, examination findings, chart notes, or procedures to enable AI suggestions.
                </p>
              )}

              {diagnosisSuggestions.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4space-y-2">
                  {diagnosisSuggestions.map((suggestion, index) => (
                    <div key={`${suggestion.diagnosis}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">{suggestion.diagnosis}</p>
                          <p className="mt-1 text-sm text-slate-600">{suggestion.reason}</p>
                          <span className="mt-2 inline-flex rounded-full bg-white px-2 py-0.5 text-xs font-semibold capitalize text-slate-600 ring-1 ring-slate-200">
                            {suggestion.confidence} confidence
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button type="button" size="sm" onClick={() => applyDiagnosisSuggestion(suggestion)}>
                            Use
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => appendDiagnosisSuggestion(suggestion)}
                          >
                            Append
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {aiDisclaimer && <p className="pt-1 text-xs text-slate-500">{aiDisclaimer}</p>}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Treatment Plan</label>
            <textarea
              name="treatmentPlan"
              value={formData.treatmentPlan}
              onChange={handleChange}
              placeholder="Planned treatment steps..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Procedures</h3>
                <p className="text-sm text-slate-500">Add every procedure required or completed for this visit.</p>
              </div>
              <Button type="button" variant="outline" onClick={addProcedure}>
                <Plus className="mr-2 h-4 w-4" />
                Add Procedure
              </Button>
            </div>
            <div className="space-y-3">
              {procedures.map((procedure, index) => {
                const category = procedure.category || getProcedureCategory(procedure.procedure);
                const group = PROCEDURE_GROUPS.find((item) => item.category === category) || PROCEDURE_GROUPS[0];

                return (
                  <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_0.8fr_auto]">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(event) => updateProcedureCategory(index, event.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {PROCEDURE_GROUPS.map((groupOption) => (
                          <option key={groupOption.category} value={groupOption.category}>
                            {groupOption.category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Procedure
                      </label>
                      <select
                        value={procedure.procedure}
                        onChange={(event) => updateProcedure(index, event.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {group.procedures.map((procedureOption) => (
                          <option key={procedureOption} value={procedureOption}>
                            {procedureOption}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Status
                      </label>
                      <select
                        value={procedure.status || 'completed'}
                        onChange={(event) =>
                          updateProcedureStatus(index, event.target.value as ConsultationProcedure['status'])
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="completed">Completed</option>
                        <option value="pending">Planned</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div> */}
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProcedure(index)}
                        disabled={procedures.length === 1}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Actual Consumables Used</h3>
                <p className="text-sm text-slate-500">
                  Optional. Use this when the real materials used differ from the standard background estimate.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={addActualConsumable}>
                <Plus className="mr-2 h-4 w-4" />
                Add Consumable
              </Button>
            </div>

            {actualConsumables.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                No actual consumables recorded. The system will still estimate usage from selected procedures.
              </p>
            ) : (
              <div className="space-y-3">
                {actualConsumables.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.4fr_0.7fr_0.8fr_1.4fr_auto]">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Item
                      </label>
                      <Input
                        value={item.name}
                        onChange={(event) => updateActualConsumable(index, 'name', event.target.value)}
                        placeholder="e.g. Gloves"
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Qty
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={String(item.quantity ?? '')}
                        onChange={(event) => updateActualConsumable(index, 'quantity', event.target.value)}
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Unit
                      </label>
                      <Input
                        value={item.unit || ''}
                        onChange={(event) => updateActualConsumable(index, 'unit', event.target.value)}
                        placeholder="pair, each"
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Notes
                      </label>
                      <Input
                        value={item.notes || ''}
                        onChange={(event) => updateActualConsumable(index, 'notes', event.target.value)}
                        placeholder="Reason or detail"
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActualConsumable(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div> */}

          <div>
            <label className="block text-sm font-medium mb-1">Treatment Done *</label>
            <textarea
              name="treatment"
              value={formData.treatment}
              onChange={handleChange}
              placeholder="Describe the treatment completed..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prescription</label>
            <textarea
              name="prescription"
              value={formData.prescription}
              onChange={handleChange}
              placeholder="Any prescriptions or recommendations..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Record Attachments</label>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
              <div className="md:flex items-center gap-3">
                <div className="rounded-xl bg-teal-50 p-2 text-teal-700">
                  <FileUp className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    Upload one or more images or files for this consultation
                  </p>
                  <p className="text-xs text-slate-500">
                    Images, PDFs, and documents are saved to the consultation record in a batch.
                  </p>
                </div>
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => uploadAttachments(e.target.files)}
                  disabled={uploadingFiles || isLoading}
                  className="max-w-xs"
                />
              </div>

              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={`${attachment.url}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        {attachment.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label={`Remove ${attachment.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {uploadingFiles && (
              <div className="mt-3 space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Spinner className="size-4" />
                  <span>{uploadProgress}%</span>
                  <span className="sr-only">{uploadStatus || 'Uploading files'}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Next Visit Date</label>
            {/* <Input
              type="date"
              name="nextVisitDate"
              value={formData.nextVisitDate}
              onChange={handleChange}
            /> */}
            <Input
              type="datetime-local"
              name="nextVisitDate"
              value={formData.nextVisitDate}
              onChange={handleChange}
              min={minDateTime}
              required
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner />
                  <span className="sr-only">Saving consultation</span>
                </>
              ) : isEditing ? (
                'Update Consultation'
              ) : (
                'Create Consultation'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(
                  isEditing && consultation
                    ? `/dashboard/consultations/${consultation.id}`
                    : '/dashboard/consultations'
                )
              }
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
