import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../lib/api';
import { Appointment, InventoryItem, Patient, Invoice } from '../../types';
import { formatTime, isSameDay } from '../../lib/utils';
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  User,
  Loader2,
  FileText,
  AlertOctagon,
  TrendingUp,
  Users,
  Calendar,
  Package,
  Wallet,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../features/language/LanguageContext';
import { cn } from '../../lib/utils';
import { DashboardHero } from './components/DashboardHero';
import { KpiCard } from './components/KpiCard';

const buildSparkline = (
  source: { date: Date; value: number }[],
  daysBack = 7
): number[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const series: number[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const sum = source
      .filter((s) => isSameDay(s.date, day))
      .reduce((acc, s) => acc + s.value, 0);
    series.push(sum);
  }
  return series;
};

export const DashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [appointmentToValidate, setAppointmentToValidate] = useState<Appointment | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allAppts, allInventory, allPatients, allInvoices] = await Promise.all([
        api.appointments.list(),
        api.inventory.list(),
        api.patients.list(),
        api.invoices.list(),
      ]);
      setAppointments(allAppts);
      setInventory(allInventory);
      setPatients(allPatients);
      setInvoices(allInvoices);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayAppts = appointments
      .filter((a) => isSameDay(new Date(a.start), today) && a.status !== 'canceled')
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const nextAppt =
      todayAppts.find((a) => new Date(a.start) > new Date()) ||
      todayAppts[todayAppts.length - 1];

    const activePatients = patients.filter((p) => p.status !== 'archived').length;
    const newPatientsMonth = patients.filter(
      (p) => p.createdAt && new Date(p.createdAt) >= startOfMonth
    ).length;

    const revenueToday = invoices
      .filter((i) => isSameDay(new Date(i.date), today))
      .reduce((sum, i) => sum + i.amount, 0);

    const revenueMonth = invoices
      .filter((i) => new Date(i.date) >= startOfMonth)
      .reduce((sum, i) => sum + i.amount, 0);

    const lowStock = inventory.filter((i) => i.stock <= (i.minStock || 0));
    const expiringSoon = inventory.filter((i) => {
      if (!i.expiryDate) return false;
      const expiry = new Date(i.expiryDate);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays >= 0;
    });

    const revenueSparkline = buildSparkline(
      invoices.map((i) => ({ date: new Date(i.date), value: i.amount }))
    );
    const apptSparkline = buildSparkline(
      appointments
        .filter((a) => a.status !== 'canceled')
        .map((a) => ({ date: new Date(a.start), value: 1 }))
    );
    const patientSparkline = buildSparkline(
      patients
        .filter((p) => p.createdAt)
        .map((p) => ({ date: new Date(p.createdAt!), value: 1 }))
    );

    const completionRate =
      todayAppts.length > 0
        ? Math.round(
            (todayAppts.filter((a) => a.status === 'completed').length / todayAppts.length) * 100
          )
        : 0;

    return {
      todayAppts,
      nextAppt,
      activePatients,
      newPatientsMonth,
      revenueToday,
      revenueMonth,
      alerts: { lowStock, expiringSoon },
      completionRate,
      revenueSparkline,
      apptSparkline,
      patientSparkline,
    };
  }, [appointments, inventory, patients, invoices]);

  const alertsTotal = stats.alerts.lowStock.length + stats.alerts.expiringSoon.length;

  const initiateValidate = (apt: Appointment) => {
    setAppointmentToValidate(apt);
  };

  const confirmValidate = async () => {
    if (!appointmentToValidate) return;
    setIsValidating(true);
    try {
      await api.appointments.save({ ...appointmentToValidate, status: 'completed' });
      await fetchData();
      setAppointmentToValidate(null);
    } catch (e) {
      alert('Failed to validate appointment');
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    );
  }

  // Determine where the "now" indicator goes in the agenda
  const now = new Date();
  const nowIndex = stats.todayAppts.findIndex((a) => new Date(a.start) > now);

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      <Header title={t('dashboard')} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Hero */}
          <DashboardHero />

          {/* KPI grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              tone="vital"
              icon={Wallet}
              label={t('revenueTodayLabel')}
              value={
                <>
                  {stats.revenueToday.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-surface-500">DH</span>
                </>
              }
              caption={t('revenueThisMonth', { amount: stats.revenueMonth.toLocaleString() })}
              sparkline={stats.revenueSparkline}
            />
            <KpiCard
              tone="info"
              icon={CalendarCheck}
              label={t('appointmentsLabel')}
              value={
                <>
                  {stats.todayAppts.length}{' '}
                  <span className="text-sm font-normal text-surface-500">{t('today')}</span>
                </>
              }
              caption={t('percentCompleted', { percent: stats.completionRate })}
              sparkline={stats.apptSparkline}
            />
            <KpiCard
              tone="primary"
              icon={Users}
              label={t('activePatientsLabel')}
              value={stats.activePatients}
              caption={t('newPatientsThisMonth', { count: stats.newPatientsMonth })}
              sparkline={stats.patientSparkline}
            />
            <KpiCard
              tone={alertsTotal > 0 ? 'alert' : 'vital'}
              icon={Package}
              label={t('cabinetAlertsLabel')}
              value={alertsTotal}
              caption={alertsTotal > 0 ? t('actionRequired') : t('allHealthy')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Agenda */}
            <div className="lg:col-span-2 space-y-6">
              <Card noPadding className="overflow-hidden">
                <div className="flex justify-between items-center px-6 py-5 border-b border-surface-100 dark:border-surface-800">
                  <h3 className="font-display text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                    <Calendar className="text-primary-600" size={20} />
                    {t('todaysAgenda')}
                  </h3>
                  <span className="text-xs font-medium text-surface-500 bg-surface-100 dark:bg-surface-800 px-3 py-1 rounded-full">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>

                <div className="p-6 min-h-[400px]">
                  {stats.todayAppts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-surface-400 border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-xl bg-surface-50/50 dark:bg-surface-800/30">
                      <CalendarCheck size={48} className="mb-4 opacity-30" />
                      <p>{t('noAppointmentsToday')}</p>
                      <Button variant="outline" className="mt-4">
                        {t('newAppointment')}
                      </Button>
                    </div>
                  ) : (
                    <div className="relative space-y-0">
                      <div className="absolute start-6 top-4 bottom-4 w-px bg-surface-200 dark:bg-surface-800" />

                      {stats.todayAppts.map((apt, idx) => {
                        const isNext = stats.nextAppt?.id === apt.id;
                        const isPast = new Date(apt.end) < now;
                        const showNowMarker = idx === nowIndex && nowIndex > 0;

                        return (
                          <React.Fragment key={apt.id}>
                            {showNowMarker && (
                              <div className="relative ps-14 py-2 my-2 flex items-center gap-3">
                                <div className="absolute start-[18px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-accent-500 ring-4 ring-accent-200/60 dark:ring-accent-900/40 animate-pulse-slow z-10" />
                                <div className="flex-1 h-px bg-gradient-to-r from-accent-500/60 to-transparent" />
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-300">
                                  {t('nowLabel')} ·{' '}
                                  {now.toLocaleTimeString(undefined, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}

                            <div className="relative ps-14 py-2 group">
                              <div
                                className={cn(
                                  'absolute start-0 top-3 w-12 text-xs font-bold text-end pe-4 z-10 transition-colors',
                                  isNext
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-surface-500'
                                )}
                              >
                                {formatTime(apt.start)}
                              </div>

                              <div
                                className={cn(
                                  'absolute start-[21px] top-3.5 w-3 h-3 rounded-full border-2 z-10 transition-all',
                                  apt.status === 'completed'
                                    ? 'bg-accent-500 border-accent-500'
                                    : isNext
                                      ? 'bg-white dark:bg-surface-900 border-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/30'
                                      : isPast
                                        ? 'bg-surface-300 border-surface-300'
                                        : 'bg-white dark:bg-surface-900 border-sky-400'
                                )}
                              />

                              <div
                                className={cn(
                                  'rounded-xl p-4 border transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-4',
                                  isNext
                                    ? 'bg-primary-50/60 dark:bg-primary-900/15 border-primary-200 dark:border-primary-800 ring-2 ring-accent-500/30'
                                    : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-soft',
                                  apt.status === 'completed' &&
                                    'opacity-75 bg-surface-50 dark:bg-surface-800/50'
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <h4
                                    className={cn(
                                      'font-bold text-base',
                                      apt.status === 'completed'
                                        ? 'text-surface-700 dark:text-surface-300 line-through decoration-surface-400'
                                        : 'text-surface-900 dark:text-white'
                                    )}
                                  >
                                    {apt.patientName}
                                  </h4>
                                  <div className="flex items-center gap-3 text-xs text-surface-500 mt-1 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Clock size={12} /> {formatTime(apt.start)} -{' '}
                                      {formatTime(apt.end)}
                                    </span>
                                    {apt.observation && (
                                      <span className="flex items-center gap-1 text-surface-400">
                                        <FileText size={12} /> Note
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {apt.status === 'confirmed' && (
                                    <Button
                                      size="sm"
                                      variant="accent"
                                      onClick={() => initiateValidate(apt)}
                                      className="h-8 text-xs gap-1"
                                    >
                                      <CheckCircle size={14} /> {t('validate')}
                                    </Button>
                                  )}
                                  {apt.status === 'completed' && (
                                    <Badge tone="vital" size="sm">
                                      <CheckCircle size={12} className="me-1" /> {t('completed' as any)}
                                    </Badge>
                                  )}
                                  {apt.status === 'pending' && (
                                    <Badge tone="info" size="sm">
                                      {t('pending' as any)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right column widgets */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card noPadding className="overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/10 border-b border-surface-100 dark:border-surface-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  <h3 className="font-display font-bold text-surface-900 dark:text-white text-sm uppercase tracking-wider">
                    {t('quickActions')}
                  </h3>
                </div>
                <div className="p-2 space-y-1">
                  <button className="w-full text-start p-3 hover:bg-surface-50 dark:hover:bg-surface-800 rounded-lg flex items-center justify-between group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-lg">
                        <Calendar size={18} />
                      </div>
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
                        {t('newAppointment')}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-surface-400 group-hover:text-primary-500 rtl:rotate-180"
                    />
                  </button>
                  <button className="w-full text-start p-3 hover:bg-surface-50 dark:hover:bg-surface-800 rounded-lg flex items-center justify-between group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent-100 dark:bg-accent-900/30 text-accent-600 rounded-lg">
                        <User size={18} />
                      </div>
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
                        {t('registerPatient')}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-surface-400 group-hover:text-accent-500 rtl:rotate-180"
                    />
                  </button>
                  <button className="w-full text-start p-3 hover:bg-surface-50 dark:hover:bg-surface-800 rounded-lg flex items-center justify-between group transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 rounded-lg">
                        <Wallet size={18} />
                      </div>
                      <span className="text-sm font-medium text-surface-700 dark:text-surface-200">
                        {t('createInvoice' as any)}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-surface-400 group-hover:text-sky-500 rtl:rotate-180"
                    />
                  </button>
                </div>
              </Card>

              {/* Cabinet Alerts */}
              <Card noPadding className="overflow-hidden border-amber-200/60 dark:border-amber-900/30">
                <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30 flex justify-between items-center">
                  <h3 className="font-display font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <AlertOctagon size={16} /> {t('cabinetAlertsTitle')}
                  </h3>
                  <Badge tone="alert" size="sm">
                    {alertsTotal}
                  </Badge>
                </div>
                <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {alertsTotal === 0 ? (
                    <div className="p-6 text-center text-surface-500 text-sm">
                      <CheckCircle size={32} className="mx-auto mb-2 text-accent-500 opacity-60" />
                      All items healthy.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {stats.alerts.lowStock.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 hover:bg-surface-50 dark:hover:bg-surface-800 rounded-lg flex items-start gap-3 transition-colors"
                        >
                          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-surface-900 dark:text-white line-clamp-1">
                              {item.name}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {t('lowStockDetail', { stock: item.stock, min: item.minStock })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {stats.alerts.expiringSoon.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 hover:bg-surface-50 dark:hover:bg-surface-800 rounded-lg flex items-start gap-3 transition-colors"
                        >
                          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-surface-900 dark:text-white line-clamp-1">
                              {item.name}
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              Expiring on {new Date(item.expiryDate!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-2 bg-surface-50 dark:bg-surface-800/50 border-t border-surface-100 dark:border-surface-700">
                  <button className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center justify-center gap-1 w-full py-1.5">
                    {t('goToInventory')} <ArrowRight size={12} className="rtl:rotate-180" />
                  </button>
                </div>
              </Card>

              {/* Month-to-date */}
              <Card noPadding className="overflow-hidden bg-gradient-to-br from-surface-900 via-surface-900 to-primary-950 text-white p-6 border-0">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-surface-300 text-[11px] font-semibold uppercase tracking-wider">
                      {t('monthToDate')}
                    </p>
                    <h4 className="font-display text-2xl font-bold mt-1">
                      {stats.revenueMonth.toLocaleString()}{' '}
                      <span className="text-sm font-normal text-surface-300">DH</span>
                    </h4>
                  </div>
                  <div className="bg-accent-500/20 border border-accent-400/30 p-2 rounded-xl">
                    <TrendingUp size={20} className="text-accent-300" />
                  </div>
                </div>
                <div className="w-full bg-surface-700/60 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-accent-400 to-accent-600 h-full w-[65%] rounded-full" />
                </div>
                <p className="text-xs text-surface-400 mt-2">65% of monthly goal reached</p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Modal */}
      <Modal
        isOpen={!!appointmentToValidate}
        onClose={() => setAppointmentToValidate(null)}
        title={t('validateConsultationTitle')}
        maxWidth="sm"
      >
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-accent-600 dark:text-accent-300">
            <CheckCircle size={32} />
          </div>
          <h3 className="font-display text-lg font-bold text-surface-900 dark:text-white mb-2">
            {t('validateConsultationTitle')}
          </h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6">
            {t('validateConsultationDesc').replace(
              '{name}',
              appointmentToValidate?.patientName || ''
            )}
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setAppointmentToValidate(null)}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="accent"
              className="flex-1"
              onClick={confirmValidate}
              disabled={isValidating}
              isLoading={isValidating}
            >
              {t('yesValidate')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
