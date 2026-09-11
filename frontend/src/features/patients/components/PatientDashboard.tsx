
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Patient, Appointment, Invoice, Treatment, Payment, Prescription, Certificate, Referral } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { formatDate, formatTime, cn } from '../../../lib/utils';
import {
  ArrowLeft, Phone, Mail, Calendar, Clock, Receipt,
  Image as ImageIcon, Activity, AlertCircle, MoreVertical,
  Plus, Archive, Stethoscope, Coins,
  CheckCircle, MessageCircle, Trash2, Undo2, Loader2, Search, Pencil,
  CreditCard, Printer, PlusCircle, Check, Pill,
  FolderOpen, FileText, Send, Eye
} from 'lucide-react';
import { useLanguage } from '../../language/LanguageContext';
import { RadiologyGalleryModal } from './RadiologyGalleryModal';
import { DocumentsTab } from './DocumentsTab';
import { TreatmentFormModal } from './TreatmentFormModal';
import { BodyRegionChart } from './BodyRegionChart';
import { PaymentModal } from '../../invoices/components/PaymentModal';
import { PrescriptionModal } from '../../prescriptions/PrescriptionModal';
import { PrescriptionPrintView } from '../../prescriptions/components/PrescriptionPrintView';
import { CertificateModal } from '../../certificates/CertificateModal';
import { CertificatePrintView } from '../../certificates/components/CertificatePrintView';
import { ReferralModal } from '../../referrals/ReferralModal';
import { ReferralPrintView } from '../../referrals/components/ReferralPrintView';
import { ReferralViewModal } from '../../referrals/components/ReferralViewModal';
import { api } from '../../../lib/api';
import { storage } from '../../../lib/storage';
import { toastError } from '../../../lib/toast';
import { list as listDocuments, type DocumentWithUrl } from '../../../lib/services/documents';
import { VitalsForm } from '../../clinical/VitalsForm';
import { VitalsTimeline } from '../../clinical/VitalsTimeline';
import { ProblemListPanel } from '../../clinical/ProblemListPanel';
import { VaccinationsList } from '../../clinical/VaccinationsList';
import { Heart, ClipboardList, Syringe } from 'lucide-react';

interface PatientDashboardProps {
  patient: Patient;
  allPatients: Patient[];
  onBack: () => void;
  onSwitchPatient: (patient: Patient) => void;
  onEdit: (patient: Patient) => void;
  onPatientUpdate?: (patient: Patient) => void;
  onNewAppointment: (patient: Patient) => void;
  onDataUpdate?: () => void;
  appointments: Appointment[];
  invoices: Invoice[];
}

type TabType =
  | 'overview'
  | 'acts'
  | 'appointments'
  | 'financials'
  | 'radiology'
  | 'prescriptions'
  | 'certificates'
  | 'referrals'
  | 'documents'
  | 'vitals'
  | 'problems'
  | 'vaccinations';

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  patient,
  allPatients,
  onBack,
  onSwitchPatient,
  onEdit,
  onPatientUpdate,
  onNewAppointment,
  onDataUpdate,
  appointments,
  invoices
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Global Patient Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Data States
  const [radios, setRadios] = useState<DocumentWithUrl[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [showRadioGallery, setShowRadioGallery] = useState(false);

  const refreshRadios = () => {
      listDocuments(patient.id, { category: 'radiology' })
          .then(setRadios)
          .catch(err => console.error('Failed to load radiology docs', err));
  };
  
  // Treatment Form State
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);

  // Invoice Form State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [newInvoiceAmount, setNewInvoiceAmount] = useState('');
  const [newInvoiceStatus, setNewInvoiceStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');

  // Payment Modal
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState<string | null>(null);

  // Prescription Modal
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  // Prescription Print State
  const [prescriptionToPrint, setPrescriptionToPrint] = useState<Prescription | null>(null);

  // Certificate Modal
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  // Certificate Print State
  const [certificateToPrint, setCertificateToPrint] = useState<Certificate | null>(null);

  // Referral Modal
  const [showReferralModal, setShowReferralModal] = useState(false);
  // Referral Print State
  const [referralToPrint, setReferralToPrint] = useState<Referral | null>(null);
  // Referral View (consult before printing)
  const [referralToView, setReferralToView] = useState<Referral | null>(null);

  // Notes State
  const [notes, setNotes] = useState(patient.medicalHistory?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
              setIsMenuOpen(false);
          }
          if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
              setShowSearchDropdown(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    refreshRadios();
    api.treatments.list(patient.id).then(setTreatments);
    api.prescriptions.list(patient.id).then(setPrescriptions);
    api.certificates.list(patient.id).then(setCertificates);
    api.referrals.list(patient.id).then(setReferrals);
    // Initialize notes from patient prop
    setNotes(patient.medicalHistory?.notes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  // --- Filter Logic ---
  
  const filteredAppointments = useMemo(() => {
    const patientAppts = appointments.filter(a => a.patientId === patient.id);
    const now = new Date();
    const upcoming = patientAppts
        .filter(a => new Date(a.start) >= now && a.status !== 'canceled')
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const history = patientAppts
        .filter(a => new Date(a.start) < now || a.status === 'canceled')
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    return { upcoming, history };
  }, [appointments, patient.id]);

  const financialStats = useMemo(() => {
    const patientInvoices = invoices.filter(i => i.patientId === patient.id);
    const total = patientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    // Use paidAmount if available, fallback to full amount if status is paid
    const paid = patientInvoices.reduce((sum, inv) => sum + (inv.paidAmount || (inv.status === 'paid' ? inv.amount : 0)), 0);
    const due = total - paid;
    const progress = total > 0 ? (paid / total) * 100 : 0;
    
    // Filter list for table
    const filteredList = patientInvoices
        .filter(i => invoiceFilter === 'all' || i.status === invoiceFilter)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { total, paid, due, progress, list: filteredList };
  }, [invoices, patient.id, invoiceFilter]);

  // Global Patient Search Logic
  const matchedPatients = useMemo(() => {
      if (!searchQuery.trim()) return [];
      const lower = searchQuery.toLowerCase();
      return allPatients.filter(p => 
          p.id !== patient.id && // Exclude current patient
          (p.name.toLowerCase().includes(lower) || p.phone.includes(lower))
      ).slice(0, 6); // Limit results
  }, [allPatients, searchQuery, patient.id]);

  const handlePatientSelect = (selected: Patient) => {
      onSwitchPatient(selected);
      setSearchQuery('');
      setShowSearchDropdown(false);
  };

  const patientAge = useMemo(() => {
      if (!patient.birthDate) return null;
      const today = new Date();
      const birthDate = new Date(patient.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      return age;
  }, [patient.birthDate]);

  const lastVisit = filteredAppointments.history[0];

  const openWhatsApp = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleAddTreatment = async (data: Omit<Treatment, 'id' | 'patientId'>) => {
      try {
          const newTreatment = await api.treatments.create({
              ...data,
              patientId: patient.id
          });
          setTreatments(prev => [...prev, newTreatment]);
      } catch (e) {
          toastError(e, t('addTreatmentFailed'));
      }
  };

  const handleCreatePrescription = async (data: Omit<Prescription, 'id'>) => {
      try {
          const newPrescription = await api.prescriptions.create(data);
          setPrescriptions(prev => [newPrescription, ...prev]);
      } catch (e) {
          toastError(e, t('createPrescriptionFailed'));
      }
  };

  const handleCreateCertificate = async (data: Omit<Certificate, 'id'>) => {
      try {
          const newCertificate = await api.certificates.create(data);
          setCertificates(prev => [newCertificate, ...prev]);
      } catch (e) {
          toastError(e, t('createCertificateFailed'));
      }
  };

  const handleCreateReferral = async (data: Omit<Referral, 'id'>) => {
      try {
          const newReferral = await api.referrals.create(data);
          setReferrals(prev => [newReferral, ...prev]);
      } catch (e) {
          toastError(e, t('createReferralFailed'));
      }
  };

  const handleToggleStatus = async () => {
      const newStatus = patient.status === 'archived' ? 'active' : 'archived';
      try {
          const updated = await api.patients.update({ ...patient, status: newStatus });
          if (onPatientUpdate) onPatientUpdate(updated);
          onBack(); // Go back to list to see updated status
      } catch (e) {
          toastError(e, t('updateStatusFailed'));
      }
  };

  const handleDelete = async () => {
      if (window.confirm(t('deletePatientConfirm'))) {
          try {
              await api.patients.delete(patient.id);
              onBack();
          } catch (e) {
              toastError(e, t('deletePatientFailed'));
          }
      }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
        const updatedPatient: Patient = {
            ...patient,
            medicalHistory: {
                allergies: patient.medicalHistory?.allergies || [],
                conditions: patient.medicalHistory?.conditions || [],
                medications: patient.medicalHistory?.medications || [],
                notes: notes
            }
        };
        const result = await api.patients.update(updatedPatient);
        if (onPatientUpdate) onPatientUpdate(result);
    } catch (e) {
        toastError(e, t('saveNotesFailed'));
    } finally {
        setIsSavingNotes(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newInvoiceAmount) return;
      setIsCreatingInvoice(true);
      try {
          const totalAmount = parseFloat(newInvoiceAmount);
          const initialPaid = newInvoiceStatus === 'paid' ? totalAmount : 0;
          
          // Manual invoice creation, no linked appointment for now (MVP)
          const dummyApptId = appointments.find(a => a.patientId === patient.id)?.id || 'manual';

          await api.invoices.create({
              appointmentId: dummyApptId,
              patientId: patient.id,
              patientName: patient.name,
              amount: totalAmount,
              paidAmount: initialPaid,
              payments: newInvoiceStatus === 'paid' ? [{
                 id: Math.random().toString(36).substr(2, 9),
                 amount: totalAmount,
                 date: new Date().toISOString(),
                 method: 'cash' 
              }] : [],
              status: newInvoiceStatus,
              date: new Date().toISOString()
          });
          if (onDataUpdate) onDataUpdate();
          setShowInvoiceModal(false);
          setNewInvoiceAmount('');
      } catch (e) {
          toastError(e, t('createInvoiceFailed'));
      } finally {
          setIsCreatingInvoice(false);
      }
  };

  const handleMarkAsPaid = async (inv: Invoice) => {
      const remaining = inv.amount - (inv.paidAmount || 0);
      if (remaining <= 0) return;

      if (!window.confirm(t('markAsPaidConfirm').replace('{amount}', inv.amount.toFixed(2)))) return;

      setIsMarkingPaid(inv.id);
      try {
          const newPayment: Payment = {
              id: Math.random().toString(36).substr(2, 9),
              amount: remaining,
              date: new Date().toISOString(),
              method: 'cash'
          };

          const updatedInvoice: Invoice = {
              ...inv,
              paidAmount: inv.amount,
              status: 'paid',
              payments: [...(inv.payments || []), newPayment]
          };

          await api.invoices.update(updatedInvoice);
          if (onDataUpdate) onDataUpdate();
      } catch (e) {
          toastError(e, t('updateInvoiceFailed'));
      } finally {
          setIsMarkingPaid(null);
      }
  };

  const handleOpenTreatmentModal = () => {
      setShowTreatmentModal(true);
  }

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
          case 'partial': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
          default: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      }
  };

  const tabs = [
    { id: 'overview', label: t('overview'), icon: Activity },
    { id: 'acts', label: t('treatments'), icon: Stethoscope },
    { id: 'appointments', label: t('schedule'), icon: Calendar },
    { id: 'prescriptions', label: t('prescriptions'), icon: Pill },
    { id: 'certificates', label: t('certificates'), icon: FileText },
    { id: 'referrals', label: t('referrals'), icon: Send },
    { id: 'vitals', label: t('vitals'), icon: Heart },
    { id: 'problems', label: t('problems'), icon: ClipboardList },
    { id: 'vaccinations', label: t('vaccinations'), icon: Syringe },
    { id: 'financials', label: t('billing'), icon: Receipt },
    { id: 'radiology', label: t('radiologyGallery'), icon: ImageIcon },
    { id: 'documents', label: t('documents'), icon: FolderOpen },
  ];

  const currentUser = storage.getUser();

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950 overflow-hidden">
      
      {/* 1. Sticky Patient Header */}
      <div className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 shadow-sm z-30 sticky top-0">
        
        {/* Actions Row */}
        <div className="px-4 md:px-6 pt-4 pb-3 flex flex-col md:flex-row gap-4 md:items-center justify-between">
            {/* Left: Back & Search */}
            <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
                <Button variant="ghost" size="icon" onClick={onBack} className="text-surface-500 hover:text-surface-900 shrink-0">
                    <ArrowLeft size={20} />
                </Button>
                
                {/* Global Patient Switcher */}
                <div className="relative flex-1 max-w-md group" ref={searchContainerRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                    <input 
                        type="text"
                        placeholder={t('searchPatientsPlaceholder') + "..."}
                        value={searchQuery}
                        onChange={(e) => {
                             setSearchQuery(e.target.value);
                             setShowSearchDropdown(true);
                        }}
                        onFocus={() => setShowSearchDropdown(true)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-surface-900 transition-all text-surface-900 dark:text-white"
                    />
                    
                    {/* Search Dropdown */}
                    {showSearchDropdown && searchQuery && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-surface-800 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                             {matchedPatients.length > 0 ? (
                                 <div className="py-1">
                                     <div className="px-3 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                                         {t('switchToPatient')}
                                     </div>
                                     {matchedPatients.map(p => (
                                         <button
                                            key={p.id}
                                            onClick={() => handlePatientSelect(p)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors text-left"
                                         >
                                             <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs">
                                                 {p.name.charAt(0).toUpperCase()}
                                             </div>
                                             <div className="flex-1 min-w-0">
                                                 <div className="text-sm font-medium text-surface-900 dark:text-white truncate">{p.name}</div>
                                                 <div className="text-xs text-surface-500 truncate">{p.phone}</div>
                                             </div>
                                         </button>
                                     ))}
                                 </div>
                             ) : (
                                 <div className="p-4 text-center text-sm text-surface-500">
                                     {t('noPatientsFoundShort')}
                                 </div>
                             )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Primary Actions */}
            <div className="flex items-center gap-2 justify-end">
                <Button 
                    onClick={() => onNewAppointment(patient)} 
                    disabled={patient.status === 'archived'} 
                    className="gap-2 shadow-md shadow-primary-200 dark:shadow-none"
                >
                    <Plus size={18} /> {t('newAppointment')}
                </Button>

                <Button variant="outline" size="icon" onClick={() => onEdit(patient)} title={t('editProfile')}>
                    <Pencil size={18} className="text-surface-600 dark:text-surface-300" />
                </Button>

                <div className="relative" ref={menuRef}>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <MoreVertical size={20}/>
                    </Button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-surface-800 rounded-xl shadow-xl border border-surface-200 dark:border-surface-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <button
                                onClick={() => { handleToggleStatus(); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                            >
                                {patient.status === 'archived' ? <Undo2 size={16}/> : <Archive size={16}/>}
                                {patient.status === 'archived' ? t('activatePatient') : t('archivePatient')}
                            </button>
                            <div className="h-px bg-surface-100 dark:bg-surface-700 my-1" />
                            <button
                                onClick={() => { handleDelete(); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <Trash2 size={16}/>
                                {t('deletePatient')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Profile Info Row */}
        <div className="px-6 pb-6 flex flex-col md:flex-row gap-6 items-start">
            {/* Identity */}
            <div className="flex items-start gap-4 min-w-[300px]">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-2xl font-bold text-primary-600 dark:text-primary-400 border-4 border-white dark:border-surface-800 shadow-sm overflow-hidden">
                        {patient.profilePicture ? (
                            <img src={patient.profilePicture} alt={patient.name} className="w-full h-full object-cover" />
                        ) : (
                            <span>{patient.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white dark:border-surface-900 bg-green-500" />
                </div>
                
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                        {patient.name}
                        {patient.gender && (
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide",
                                patient.gender === 'male' ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                            )}>
                                {patient.gender === 'male' ? 'M' : 'F'} {patientAge ? `• ${patientAge} ${t('yearsAbbrev')}` : ''}
                            </span>
                        )}
                    </h1>
                    
                    <div className="flex flex-col gap-1 mt-1 text-sm text-surface-500 dark:text-surface-400">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 hover:text-primary-600 transition-colors cursor-pointer">
                                <Phone size={14} /> {patient.phone}
                            </span>
                            <button onClick={(e) => openWhatsApp(e, patient.phone)} className="text-green-500 hover:text-green-600" title={t('chatOnWhatsapp')}>
                                <MessageCircle size={14} />
                            </button>
                            {patient.email && (
                                <span className="flex items-center gap-1.5">
                                    <Mail size={14} /> {patient.email}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {patient.insuranceProvider ? (
                                <span className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 text-xs font-medium border border-surface-200 dark:border-surface-700">
                                    {patient.insuranceProvider}
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-400 text-xs font-medium">
                                    {t('noInsurance')}
                                </span>
                            )}
                            {patient.address && <span className="text-xs opacity-75">• {patient.address}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-surface-200 dark:border-surface-700 pt-4 md:pt-0 md:pl-6">
                <div>
                    <p className="text-xs text-surface-500 uppercase font-semibold">{t('totalInvoiced')}</p>
                    <p className="text-lg font-bold text-surface-900 dark:text-white mt-0.5">{financialStats.total.toFixed(0)} <span className="text-xs font-normal text-surface-500">DH</span></p>
                </div>
                <div>
                    <p className="text-xs text-surface-500 uppercase font-semibold">{t('due')}</p>
                    <p className={cn("text-lg font-bold mt-0.5", financialStats.due > 0 ? "text-red-600" : "text-green-600")}>
                        {financialStats.due.toFixed(0)} <span className="text-xs font-normal text-surface-500">DH</span>
                    </p>
                </div>
                <div>
                    <p className="text-xs text-surface-500 uppercase font-semibold">{t('lastVisit')}</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white mt-1">
                        {lastVisit ? formatDate(new Date(lastVisit.start), language) : t('noVisitYet')}
                    </p>
                </div>
            </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 gap-6 border-t border-surface-200 dark:border-surface-700 overflow-x-auto scrollbar-none">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={cn(
                        "py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
                        activeTab === tab.id 
                            ? "border-primary-600 text-primary-600 dark:text-primary-400" 
                            : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                    )}
                >
                    <tab.icon size={16} />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* 2. Main Dashboard Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-6xl mx-auto">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Col: Medical & Alerts */}
                    <div className="space-y-6">
                        <Card className="border-l-4 border-l-red-500">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                    <AlertCircle size={18} className="text-red-500" /> {t('medicalHistory')}
                                </h3>
                                <Button variant="ghost" size="sm" onClick={() => onEdit(patient)} className="h-6 text-xs">{t('editProfile')}</Button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-semibold text-surface-500 uppercase">{t('allergies')}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {patient.medicalHistory?.allergies?.length ? (
                                            patient.medicalHistory.allergies.map(a => (
                                                <span key={a} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded border border-red-100">{a}</span>
                                            ))
                                        ) : <span className="text-sm text-surface-400 italic">{t('noneRecorded')}</span>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-surface-500 uppercase">{t('conditions')}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {patient.medicalHistory?.conditions?.length ? (
                                            patient.medicalHistory.conditions.map(c => (
                                                <span key={c} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded border border-orange-100">{c}</span>
                                            ))
                                        ) : <span className="text-sm text-surface-400 italic">{t('noneRecorded')}</span>}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-surface-900 dark:text-white">{t('notes')}</h3>
                                {isSavingNotes && <span className="text-xs text-surface-400 animate-pulse">{t('saving')}</span>}
                            </div>
                            <textarea 
                                className="w-full h-32 p-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 text-surface-900 dark:text-white"
                                placeholder={t('notesPlaceholder')}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <div className="mt-2 flex justify-end">
                                <Button size="sm" onClick={handleSaveNotes} disabled={isSavingNotes}>
                                    {isSavingNotes ? <Loader2 className="animate-spin mr-2" size={16}/> : null}
                                    {t('saveNotes')}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Right Col: Activity & Summary */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Next Appointment Card */}
                            <Card className={cn("flex flex-col justify-between", !filteredAppointments.upcoming[0] && "opacity-60")}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-surface-700 dark:text-surface-300">{t('nextVisit')}</h4>
                                    <Calendar size={18} className="text-primary-500" />
                                </div>
                                {filteredAppointments.upcoming[0] ? (
                                    <>
                                        <p className="text-xl font-bold text-surface-900 dark:text-white">
                                            {formatDate(new Date(filteredAppointments.upcoming[0].start), language)}
                                        </p>
                                        <p className="text-sm text-surface-500 mt-1">
                                            {formatTime(filteredAppointments.upcoming[0].start)} - {formatTime(filteredAppointments.upcoming[0].end)}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-surface-500 italic">{t('noUpcoming')}</p>
                                )}
                            </Card>

                            {/* Financial Summary Card */}
                            <Card className="flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-surface-700 dark:text-surface-300">{t('balanceDue')}</h4>
                                    <Coins size={18} className={financialStats.due > 0 ? "text-red-500" : "text-green-500"} />
                                </div>
                                <p className={cn("text-2xl font-bold", financialStats.due > 0 ? "text-red-600" : "text-green-600")}>
                                    {financialStats.due.toFixed(2)} <span className="text-sm text-surface-500 font-normal">DH</span>
                                </p>
                                <p className="text-xs text-surface-500 mt-1">{t('totalInvoicedShort')}: {financialStats.total.toFixed(0)} DH</p>
                            </Card>
                        </div>

                        {/* Recent History */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-surface-900 dark:text-white">{t('historyPreview')}</h3>
                                <Button variant="ghost" size="sm" onClick={() => setActiveTab('appointments')} className="text-primary-600">{t('viewAll')}</Button>
                            </div>
                            <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
                                {filteredAppointments.history.slice(0, 3).map((apt, i) => (
                                    <div key={apt.id} className={cn("p-4 flex justify-between items-center hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors", i !== 0 && "border-t border-surface-100 dark:border-surface-700")}>
                                        <div className="flex items-center gap-4">
                                            <div className="bg-surface-100 dark:bg-surface-700 p-2 rounded-lg text-surface-500">
                                                <CheckCircle size={18} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-surface-900 dark:text-white">{formatDate(new Date(apt.start), language)}</p>
                                                <p className="text-xs text-surface-500">{t(apt.status as any)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{formatTime(apt.start)}</p>
                                            {apt.observation && <p className="text-xs text-surface-400 italic max-w-[200px] truncate">{apt.observation}</p>}
                                        </div>
                                    </div>
                                ))}
                                {filteredAppointments.history.length === 0 && (
                                    <div className="p-6 text-center text-surface-400 italic text-sm">{t('noHistory')}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TREATMENTS TAB */}
            {activeTab === 'acts' && (
                <div className="space-y-6">
                    <BodyRegionChart patientId={patient.id} />

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-surface-900 dark:text-white">{t('treatmentHistory')}</h3>
                            <Button className="gap-2" onClick={handleOpenTreatmentModal}><Plus size={16}/> {t('addTreatment')}</Button>
                        </div>
                        
                        <Card className="overflow-hidden" noPadding>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold text-surface-500">{t('date')}</th>
                                        <th className="py-3 px-4 font-semibold text-surface-500">{t('actDescription')}</th>
                                        <th className="py-3 px-4 font-semibold text-surface-500 text-right">{t('price')}</th>
                                        <th className="py-3 px-4 font-semibold text-surface-500 text-right">{t('status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                                    {treatments.length > 0 ? treatments.map(treatment => (
                                        <tr key={treatment.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/50">
                                            <td className="py-3 px-4">{formatDate(new Date(treatment.date), language)}</td>
                                            <td className="py-3 px-4">{treatment.description}</td>
                                            <td className="py-3 px-4 text-right font-medium">{treatment.price} DH</td>
                                            <td className="py-3 px-4 text-right">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-bold uppercase",
                                                    treatment.status === 'completed' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                                )}>{treatment.status === 'completed' ? t('status_completed') : t('status_planned')}</span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="p-8 text-center text-surface-400 italic">{t('noTreatmentsFound')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </Card>
                    </div>
                </div>
            )}

            {/* APPOINTMENTS TAB */}
            {activeTab === 'appointments' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-surface-900 dark:text-white mb-3">{t('upcoming')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAppointments.upcoming.map(apt => (
                                <Card key={apt.id} className="p-4 border-l-4 border-l-primary-500">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold">{formatDate(new Date(apt.start), language)}</span>
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{t(apt.status as any)}</span>
                                    </div>
                                    <div className="text-sm text-surface-600 flex items-center gap-2">
                                        <Clock size={14}/> {formatTime(apt.start)} - {formatTime(apt.end)}
                                    </div>
                                </Card>
                            ))}
                            {filteredAppointments.upcoming.length === 0 && <p className="text-surface-500 italic text-sm">{t('noUpcoming')}</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-surface-900 dark:text-white mb-3">{t('pastHistory')}</h3>
                        <div className="space-y-2">
                            {filteredAppointments.history.map(apt => (
                                <div key={apt.id} className="flex justify-between items-center p-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg">
                                    <div className="flex gap-4">
                                        <span className="text-surface-500 font-mono text-sm w-24">{formatDate(new Date(apt.start), language)}</span>
                                        <span className={cn("text-sm font-medium", apt.status === 'canceled' ? "text-red-500 line-through" : "text-surface-900 dark:text-white")}>
                                            {t('consultation')}
                                        </span>
                                    </div>
                                    <span className="text-xs uppercase font-bold text-surface-400">{t(apt.status as any)}</span>
                                </div>
                            ))}
                            {filteredAppointments.history.length === 0 && <p className="text-surface-500 italic text-sm">{t('noHistory')}</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* PRESCRIPTIONS TAB */}
            {activeTab === 'prescriptions' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg text-surface-900 dark:text-white">{t('prescriptions')}</h3>
                        <Button className="gap-2" onClick={() => setShowPrescriptionModal(true)}>
                            <Plus size={16}/> {t('createPrescription')}
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {prescriptions.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
                                <Pill size={32} className="mx-auto text-surface-300 mb-2" />
                                <p className="text-surface-500">{t('noPrescriptions')}</p>
                            </div>
                        ) : (
                            prescriptions.map(pres => (
                                <Card key={pres.id} className="p-4 flex flex-col gap-3 group hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
                                    <div className="flex justify-between items-start border-b border-surface-100 dark:border-surface-700 pb-2">
                                        <div className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                            <Calendar size={14} className="text-surface-400" />
                                            {formatDate(new Date(pres.date), language)}
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-6 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                                            onClick={() => setPrescriptionToPrint(pres)}
                                        >
                                            <Printer size={14} className="mr-1" /> {t('printPrescription')}
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {pres.items.map((item, i) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span className="font-medium text-surface-900 dark:text-white">{item.medicamentName}</span>
                                                <span className="text-surface-500">{item.dosage} • {item.frequency} • {item.duration}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {pres.notes && (
                                        <div className="text-xs text-surface-500 italic bg-surface-50 dark:bg-surface-800 p-2 rounded mt-1">
                                            {pres.notes}
                                        </div>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* CERTIFICATES TAB */}
            {activeTab === 'certificates' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg text-surface-900 dark:text-white">{t('certificates')}</h3>
                        <Button className="gap-2" onClick={() => setShowCertificateModal(true)}>
                            <Plus size={16}/> {t('createCertificate')}
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {certificates.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
                                <FileText size={32} className="mx-auto text-surface-300 mb-2" />
                                <p className="text-surface-500">{t('noCertificatesFound')}</p>
                            </div>
                        ) : (
                            certificates.map(cert => (
                                <Card key={cert.id} className="p-4 flex flex-col gap-3 group hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
                                    <div className="flex justify-between items-start border-b border-surface-100 dark:border-surface-700 pb-2">
                                        <div className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                            <Calendar size={14} className="text-surface-400" />
                                            {cert.createdAt ? formatDate(new Date(cert.createdAt), language) : '—'}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                                            onClick={() => setCertificateToPrint(cert)}
                                        >
                                            <Printer size={14} className="mr-1" /> {t('printCertificate')}
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-surface-900 dark:text-white">
                                            {t(`certificateType_${cert.type}` as any)}
                                        </span>
                                        <span className="text-surface-500">
                                            {cert.startDate && cert.endDate
                                                ? `${formatDate(new Date(cert.startDate), language)} – ${formatDate(new Date(cert.endDate), language)}`
                                                : cert.restDays ? `${cert.restDays} ${t('restDays').toLowerCase()}` : ''}
                                        </span>
                                    </div>
                                    {cert.reason && (
                                        <div className="text-xs text-surface-500 italic bg-surface-50 dark:bg-surface-800 p-2 rounded mt-1">
                                            {cert.reason}
                                        </div>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* REFERRALS TAB */}
            {activeTab === 'referrals' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg text-surface-900 dark:text-white">{t('referrals')}</h3>
                        <Button className="gap-2" onClick={() => setShowReferralModal(true)}>
                            <Plus size={16}/> {t('createReferral')}
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        {referrals.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
                                <Send size={32} className="mx-auto text-surface-300 mb-2" />
                                <p className="text-surface-500">{t('noReferralsFound')}</p>
                            </div>
                        ) : (
                            referrals.map(ref => (
                                <Card
                                    key={ref.id}
                                    className="p-4 flex flex-col gap-3 group hover:border-primary-200 dark:hover:border-primary-800 transition-colors cursor-pointer"
                                    onClick={() => setReferralToView(ref)}
                                >
                                    <div className="flex justify-between items-start border-b border-surface-100 dark:border-surface-700 pb-2">
                                        <div className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
                                            <Calendar size={14} className="text-surface-400" />
                                            {ref.createdAt ? formatDate(new Date(ref.createdAt), language) : '—'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                                                onClick={(e) => { e.stopPropagation(); setReferralToView(ref); }}
                                            >
                                                <Eye size={14} className="mr-1" /> {t('viewReferral')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                                                onClick={(e) => { e.stopPropagation(); setReferralToPrint(ref); }}
                                            >
                                                <Printer size={14} className="mr-1" /> {t('printReferral')}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-surface-900 dark:text-white">
                                            {ref.recipientName || ref.recipientSpecialty}
                                        </span>
                                        {ref.urgency === 'urgent' && (
                                            <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase">
                                                {t('urgencyUrgent')}
                                            </span>
                                        )}
                                    </div>
                                    {ref.reason && (
                                        <div className="text-xs text-surface-500 italic bg-surface-50 dark:bg-surface-800 p-2 rounded mt-1">
                                            {ref.reason}
                                        </div>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* FINANCIALS TAB */}
            {activeTab === 'financials' && (
                <div className="space-y-6">
                    {/* Header Actions */}
                    <div className="flex justify-between items-center bg-white dark:bg-surface-800 p-4 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm">
                        <div>
                            <h2 className="text-lg font-bold text-surface-900 dark:text-white">{t('billingAndInvoices')}</h2>
                            <p className="text-sm text-surface-500 dark:text-surface-400">{t('managePaymentRecords')}</p>
                        </div>
                        <Button className="gap-2" onClick={() => setShowInvoiceModal(true)}>
                            <Plus size={18} /> {t('createInvoice')}
                        </Button>
                    </div>

                    {/* Summary Cards with Progress */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 flex flex-col justify-between">
                             <div className="flex justify-between items-start">
                                 <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">{t('totalBilled')}</p>
                                 <div className="p-2 bg-white/50 dark:bg-surface-800/50 rounded-lg text-blue-600"><Receipt size={18}/></div>
                             </div>
                             <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">{financialStats.total.toFixed(0)} <span className="text-sm">DH</span></p>
                         </Card>
                         
                         <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/10 border-green-200 dark:border-green-800 flex flex-col justify-between">
                             <div className="flex justify-between items-start">
                                 <p className="text-xs font-bold text-green-700 dark:text-green-300 uppercase">{t('amountPaid')}</p>
                                 <div className="p-2 bg-white/50 dark:bg-surface-800/50 rounded-lg text-green-600"><CreditCard size={18}/></div>
                             </div>
                             <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">{financialStats.paid.toFixed(0)} <span className="text-sm">DH</span></p>
                         </Card>

                         <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/10 border-red-200 dark:border-red-800 flex flex-col justify-between">
                             <div className="flex justify-between items-start">
                                 <p className="text-xs font-bold text-red-700 dark:text-red-300 uppercase">{t('balanceDue')}</p>
                                 <div className="p-2 bg-white/50 dark:bg-surface-800/50 rounded-lg text-red-600"><Coins size={18}/></div>
                             </div>
                             <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-2">{financialStats.due.toFixed(0)} <span className="text-sm">DH</span></p>
                         </Card>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-surface-100 dark:bg-surface-800 rounded-full h-4 overflow-hidden w-full border border-surface-200 dark:border-surface-700 relative group">
                        <div 
                            className="bg-green-500 h-full transition-all duration-1000 ease-out flex items-center justify-end px-2" 
                            style={{ width: `${Math.max(5, financialStats.progress)}%` }}
                        >
                            {financialStats.progress > 20 && <span className="text-[10px] font-bold text-white leading-none">{t('paidPercent').replace('{percent}', financialStats.progress.toFixed(0))}</span>}
                        </div>
                    </div>

                    {/* Invoice List */}
                    <Card className="overflow-hidden flex flex-col" noPadding>
                         {/* Toolbar */}
                         <div className="p-4 border-b border-surface-100 dark:border-surface-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-50/50 dark:bg-surface-800/50">
                            <h3 className="font-bold text-sm text-surface-700 dark:text-surface-300 uppercase tracking-wide">{t('transactions')}</h3>
                            
                            <div className="flex bg-surface-200 dark:bg-surface-700 p-1 rounded-lg">
                                {(['all', 'paid', 'unpaid', 'partial'] as const).map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setInvoiceFilter(filter)}
                                        className={cn(
                                            "px-3 py-1 text-xs font-bold uppercase rounded-md transition-all",
                                            invoiceFilter === filter 
                                                ? "bg-white dark:bg-surface-600 text-surface-900 dark:text-white shadow-sm" 
                                                : "text-surface-500 hover:text-surface-700 dark:text-surface-400"
                                        )}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                         </div>
                         
                         {/* Table */}
                         <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold text-surface-500">{t('date')}</th>
                                        <th className="py-3 px-4 font-semibold text-surface-500">{t('refNumber')}</th>
                                        <th className="py-3 px-4 font-semibold text-surface-500">{t('amount')}</th>
                                        <th className="py-3 px-4 font-semibold text-surface-500">{t('paid')}</th>
                                        <th className="py-3 px-4 font-semibold text-surface-500 text-center">{t('status')}</th>
                                        <th className="py-3 px-4 font-semibold text-surface-500 text-right">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
                                    {financialStats.list.length > 0 ? financialStats.list.map(inv => (
                                        <tr key={inv.id} className="group hover:bg-surface-50 dark:hover:bg-surface-700/50 transition-colors">
                                            <td className="py-3 px-4 text-surface-600 dark:text-surface-300">
                                                {formatDate(new Date(inv.date), language)}
                                                <div className="text-xs text-surface-400">{formatTime(inv.date)}</div>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs text-surface-500">
                                                INV-{inv.id.substring(0, 6).toUpperCase()}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-surface-900 dark:text-white">{inv.amount.toFixed(2)} DH</td>
                                            <td className="py-3 px-4 text-sm text-surface-600 dark:text-surface-300">{(inv.paidAmount || 0).toFixed(2)} DH</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-bold uppercase inline-flex items-center gap-1 border",
                                                    getStatusBadge(inv.status)
                                                )}>
                                                    {inv.status === 'paid' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                                    {t(inv.status)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => alert(t('printingFunctionality'))}
                                                        className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-600 rounded"
                                                        title={t('printReceipt')}
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    {inv.status !== 'paid' && (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                className="h-7 text-xs bg-green-600 hover:bg-green-700 px-2 shadow-none gap-1"
                                                                onClick={() => handleMarkAsPaid(inv)}
                                                                disabled={isMarkingPaid === inv.id}
                                                                title={t('markPaid')}
                                                            >
                                                                {isMarkingPaid === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12}/>} 
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="h-7 text-xs bg-primary-600 hover:bg-primary-700 px-2 shadow-none gap-1"
                                                                onClick={() => setInvoiceToPay(inv)}
                                                                title={t('addPartialPayment')}
                                                            >
                                                                <PlusCircle size={12}/>
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-surface-400 italic">
                                                <div className="flex flex-col items-center">
                                                    <Receipt size={32} className="mb-2 opacity-20" />
                                                    {t('noInvoicesMatchFilter')}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                         </div>
                    </Card>
                </div>
            )}

            {/* RADIOLOGY TAB */}
            {activeTab === 'radiology' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-surface-900 dark:text-white">{t('radiologyGallery')}</h3>
                        <Button onClick={() => setShowRadioGallery(true)} className="gap-2">
                            <Plus size={16}/> {t('uploadImage')}
                        </Button>
                    </div>
                    {radios.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {radios.map(r => (
                                <div key={r.id} className="aspect-square bg-black rounded-xl overflow-hidden relative group cursor-pointer" onClick={() => setShowRadioGallery(true)}>
                                    {r.signed_url ? (
                                        <img src={r.signed_url} alt={r.file_name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-surface-500">
                                            <ImageIcon size={28} />
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-2">
                                        <p className="text-white text-xs truncate">{r.file_name}</p>
                                        <p className="text-surface-400 text-[10px]">
                                            {r.category} • {formatDate(new Date(r.uploaded_at), language)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
                            <ImageIcon size={48} className="mx-auto text-surface-300 mb-2"/>
                            <p className="text-surface-500">{t('noRadios')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* DOCUMENTS TAB (consents, insurance, certificates, etc.) */}
            {activeTab === 'documents' && (
                <DocumentsTab patientId={patient.id} />
            )}

            {/* VITALS TAB (medical specialties) */}
            {activeTab === 'vitals' && (
                <div className="space-y-6">
                    <VitalsForm patientId={patient.id} />
                    <VitalsTimeline patientId={patient.id} />
                </div>
            )}

            {/* PROBLEM LIST TAB (medical specialties) */}
            {activeTab === 'problems' && (
                <ProblemListPanel patientId={patient.id} />
            )}

            {/* VACCINATIONS TAB (medical specialties) */}
            {activeTab === 'vaccinations' && (
                <VaccinationsList patientId={patient.id} />
            )}

        </div>
      </div>

      {/* Modals */}
      {showRadioGallery && (
        <RadiologyGalleryModal
            isOpen={showRadioGallery}
            onClose={() => { setShowRadioGallery(false); refreshRadios(); }}
            patientId={patient.id}
            onChange={refreshRadios}
        />
      )}

      {showTreatmentModal && (
          <TreatmentFormModal
            isOpen={showTreatmentModal}
            onClose={() => setShowTreatmentModal(false)}
            onSubmit={handleAddTreatment}
          />
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
          <Modal
            isOpen={showInvoiceModal}
            onClose={() => setShowInvoiceModal(false)}
            title={t('createInvoice')}
            maxWidth="sm"
          >
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                  <div className="bg-surface-50 dark:bg-surface-800 p-3 rounded-lg border border-surface-200 dark:border-surface-700">
                        <p className="text-sm font-bold text-surface-900 dark:text-white">{patient.name}</p>
                        <p className="text-xs text-surface-500">{t('today')}</p>
                  </div>
                  
                  <Input 
                        label={t('amount') + " (DH)"}
                        type="number"
                        placeholder="0.00"
                        value={newInvoiceAmount}
                        onChange={e => setNewInvoiceAmount(e.target.value)}
                        autoFocus
                        required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                        {t('status')}
                    </label>
                    <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setNewInvoiceStatus('unpaid')}
                            className={cn(
                                "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                                newInvoiceStatus === 'unpaid' 
                                    ? "bg-white dark:bg-surface-600 text-red-600 shadow-sm" 
                                    : "text-surface-500 hover:text-surface-900 dark:text-surface-400"
                            )}
                        >
                            {t('unpaid')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewInvoiceStatus('paid')}
                            className={cn(
                                "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                                newInvoiceStatus === 'paid' 
                                    ? "bg-white dark:bg-surface-600 text-green-600 shadow-sm" 
                                    : "text-surface-500 hover:text-surface-900 dark:text-surface-400"
                            )}
                        >
                            {t('paid')}
                        </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setShowInvoiceModal(false)}>{t('cancel')}</Button>
                      <Button type="submit" disabled={isCreatingInvoice}>
                          {isCreatingInvoice && <Loader2 className="animate-spin mr-2" size={16}/>}
                          {t('createInvoice')}
                      </Button>
                  </div>
              </form>
          </Modal>
      )}

      {invoiceToPay && (
          <PaymentModal
            isOpen={!!invoiceToPay}
            onClose={() => setInvoiceToPay(null)}
            invoice={invoiceToPay}
            onPaymentRecorded={() => {
                if (onDataUpdate) onDataUpdate();
            }}
          />
      )}

      {showPrescriptionModal && (
          <PrescriptionModal
            isOpen={showPrescriptionModal}
            onClose={() => setShowPrescriptionModal(false)}
            patientId={patient.id}
            onSubmit={handleCreatePrescription}
          />
      )}

      {prescriptionToPrint && (
          <PrescriptionPrintView
            prescription={prescriptionToPrint}
            patient={patient}
            doctorName={currentUser?.name || "Doctor"}
            onClose={() => setPrescriptionToPrint(null)}
          />
      )}

      {showCertificateModal && (
          <CertificateModal
            isOpen={showCertificateModal}
            onClose={() => setShowCertificateModal(false)}
            patientId={patient.id}
            patientName={patient.name}
            onSubmit={handleCreateCertificate}
          />
      )}

      {certificateToPrint && (
          <CertificatePrintView
            certificate={certificateToPrint}
            patient={patient}
            doctorName={currentUser?.name || "Doctor"}
            onClose={() => setCertificateToPrint(null)}
          />
      )}

      {showReferralModal && (
          <ReferralModal
            isOpen={showReferralModal}
            onClose={() => setShowReferralModal(false)}
            patientId={patient.id}
            patientName={patient.name}
            onSubmit={handleCreateReferral}
          />
      )}

      {referralToPrint && (
          <ReferralPrintView
            referral={referralToPrint}
            patient={patient}
            doctorName={currentUser?.name || "Doctor"}
            onClose={() => setReferralToPrint(null)}
          />
      )}

      {referralToView && (
          <ReferralViewModal
            referral={referralToView}
            patientName={patient.name}
            onClose={() => setReferralToView(null)}
            onPrint={() => { setReferralToPrint(referralToView); setReferralToView(null); }}
          />
      )}
    </div>
  );
};
