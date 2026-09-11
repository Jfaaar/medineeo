import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  CircleDollarSign,
  Edit3,
  FileText,
  ListChecks,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Topbar } from '../../components/layout/Topbar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useLanguage } from '../language/LanguageContext';
import { useAuth } from '../auth/useAuth';
import { PermissionGate } from '../../components/auth/PermissionGate';
import { hasPermission } from '../../lib/permissions';
import {
  treatmentPlansService,
  type AddItemInput,
} from '../../lib/services/treatmentPlans';
import { PatientSelect } from '../patients/components/PatientSelect';
import type { Patient, TreatmentPlan, TreatmentPlanItem } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { toastError, toastSuccess } from '../../lib/toast';

type PlanStatus = TreatmentPlan['status'];

const STATUS_COLORS: Record<PlanStatus, string> = {
  draft: 'bg-surface-200 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
  proposed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  canceled: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-500',
};

const STATUS_FILTERS: Array<{ key: PlanStatus | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'all' },
  { key: 'draft', labelKey: 'draft' },
  { key: 'proposed', labelKey: 'proposed' },
  { key: 'accepted', labelKey: 'accepted' },
  { key: 'rejected', labelKey: 'rejected' },
  { key: 'completed', labelKey: 'completed' },
  { key: 'canceled', labelKey: 'canceled' },
];

const fmtMoney = (n: number | undefined): string =>
  `${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

// ─── Page ────────────────────────────────────────────────────────────────────

export const TreatmentPlanPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [items, setItems] = useState<TreatmentPlanItem[]>([]);
  const [active, setActive] = useState<TreatmentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showConvertAppts, setShowConvertAppts] = useState(false);

  const canCreate = hasPermission(user?.role, 'treatments.create');
  const canEdit = hasPermission(user?.role, 'treatments.update');
  const canAccept = hasPermission(user?.role, 'treatments.accept');
  const canConvert = hasPermission(user?.role, 'treatments.convert');
  const canDelete = hasPermission(user?.role, 'treatments.delete');

  const refreshList = async (preserveActive = true) => {
    setIsLoading(true);
    try {
      const { data } = await treatmentPlansService.list({
        search: search || undefined,
        filters: { status: statusFilter === 'all' ? undefined : statusFilter },
      });
      setPlans(data);
      if (preserveActive && active) {
        const fresh = await treatmentPlansService.get(active.id);
        if (fresh) setActive(fresh);
        else setActive(null);
      }
    } catch (e) {
      toastError(e, t('failedToLoad' as any));
    } finally {
      setIsLoading(false);
    }
  };

  const refreshItems = async (planId: string) => {
    setIsLoadingItems(true);
    try {
      const data = await treatmentPlansService.listItems(planId);
      setItems(data);
    } catch (e) {
      toastError(e);
      setItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  };

  useEffect(() => {
    void refreshList(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Debounced search
  useEffect(() => {
    const id = window.setTimeout(() => void refreshList(true), 250);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openPlan = async (id: string) => {
    try {
      const p = await treatmentPlansService.get(id);
      if (!p) {
        toastError(new Error('Plan not found'));
        return;
      }
      setActive(p);
      void refreshItems(p.id);
    } catch (e) {
      toastError(e);
    }
  };

  const refreshActiveAndList = async () => {
    if (active) {
      const [fresh] = await Promise.all([
        treatmentPlansService.get(active.id),
        refreshItems(active.id),
      ]);
      if (fresh) setActive(fresh);
    }
    await refreshList(false);
  };

  const onAccept = async () => {
    if (!active) return;
    try {
      const fresh = await treatmentPlansService.accept(active.id);
      setActive(fresh);
      toastSuccess(t('accepted'));
      await refreshList(false);
    } catch (e) { toastError(e); }
  };

  const onReject = async () => {
    if (!active) return;
    try {
      const fresh = await treatmentPlansService.reject(active.id);
      setActive(fresh);
      toastSuccess(t('rejected'));
      await refreshList(false);
    } catch (e) { toastError(e); }
  };

  const onCancel = async () => {
    if (!active) return;
    if (!window.confirm(t('confirm'))) return;
    try {
      await treatmentPlansService.cancel(active.id);
      const fresh = await treatmentPlansService.get(active.id);
      setActive(fresh);
      toastSuccess(t('canceled'));
      await refreshList(false);
    } catch (e) { toastError(e); }
  };

  const onConvertInvoice = async () => {
    if (!active) return;
    if (!window.confirm(t('confirm'))) return;
    try {
      const r = await treatmentPlansService.convertToInvoice(active.id);
      toastSuccess(t('convertToInvoice'), `${fmtMoney(r.amount)}`);
    } catch (e) { toastError(e); }
  };

  const onRemoveItem = async (itemId: string) => {
    if (!window.confirm(t('confirm'))) return;
    try {
      await treatmentPlansService.removeItem(itemId);
      await refreshActiveAndList();
    } catch (e) { toastError(e); }
  };

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const drafts = plans.filter((p) => p.status === 'draft' || p.status === 'proposed').length;
    const accepted = plans.filter((p) => p.status === 'accepted').length;
    const planned = plans
      .filter((p) => p.status !== 'rejected' && p.status !== 'canceled')
      .reduce((sum, p) => sum + (p.estimatedTotal ?? 0), 0);
    const acceptedValue = plans
      .filter((p) => p.status === 'accepted' || p.status === 'completed')
      .reduce((sum, p) => sum + (p.estimatedTotal ?? 0), 0);
    return { drafts, accepted, planned, acceptedValue };
  }, [plans]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      <Topbar title={t('treatmentPlans')}>
        <PermissionGate permission="treatments.create">
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus size={16} /> {t('newTreatmentPlan')}
          </Button>
        </PermissionGate>
      </Topbar>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={FileText}
              label={t('inProgressPlans' as any) || 'Drafts & Proposed'}
              value={stats.drafts.toString()}
              tone="primary"
            />
            <StatCard
              icon={Check}
              label={t('accepted')}
              value={stats.accepted.toString()}
              tone="accent"
            />
            <StatCard
              icon={ListChecks}
              label={t('plannedRevenue' as any) || 'Planned revenue'}
              value={fmtMoney(stats.planned)}
              tone="primary"
            />
            <StatCard
              icon={CircleDollarSign}
              label={t('acceptedRevenue' as any) || 'Accepted revenue'}
              value={fmtMoney(stats.acceptedValue)}
              tone="accent"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlans' as any) || 'Search plans or patients…'}
                className="w-full ps-9 pe-3 h-10 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => {
                const isActive = statusFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={cn(
                      'px-3 h-9 rounded-lg text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-primary-600 text-white shadow-soft'
                        : 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-300 hover:border-primary-300 dark:hover:border-primary-700',
                    )}
                  >
                    {t(f.labelKey as any)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List + Detail */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Plan list */}
            <div className="md:col-span-4 lg:col-span-3 space-y-2">
              {isLoading && (
                <div className="flex items-center justify-center p-6 text-surface-400">
                  <Loader2 className="animate-spin" />
                </div>
              )}
              {!isLoading && plans.length === 0 && (
                <Card className="text-sm italic text-surface-500">
                  {t('noPlans')}
                </Card>
              )}
              {!isLoading &&
                plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => void openPlan(p.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      active?.id === p.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 shadow-soft'
                        : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:border-primary-300 hover:-translate-y-0.5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-surface-900 dark:text-white truncate">
                          {p.title || t('untitledPlan' as any) || 'Untitled plan'}
                        </div>
                        <div className="text-xs text-surface-500 mt-0.5 truncate">
                          {p.patientName || p.patientId}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] uppercase font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                          STATUS_COLORS[p.status],
                        )}
                      >
                        {t(p.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-surface-400">
                        {p.createdAt ? formatDate(new Date(p.createdAt), language) : ''}
                      </span>
                      <span className="font-bold text-primary-600 dark:text-primary-400 font-mono">
                        {fmtMoney(p.estimatedTotal)}
                      </span>
                    </div>
                  </button>
                ))}
            </div>

            {/* Detail */}
            <div className="md:col-span-8 lg:col-span-9">
              {!active ? (
                <Card className="text-center text-surface-400 py-12">
                  <FileText size={32} className="mx-auto mb-3 opacity-50" />
                  {t('selectPlan')}
                </Card>
              ) : (
                <PlanDetail
                  plan={active}
                  items={items}
                  isLoadingItems={isLoadingItems}
                  canEdit={canEdit}
                  canAccept={canAccept}
                  canConvert={canConvert}
                  canDelete={canDelete}
                  onEdit={() => setShowEdit(true)}
                  onAddItem={() => setShowAddItem(true)}
                  onRemoveItem={onRemoveItem}
                  onAccept={onAccept}
                  onReject={onReject}
                  onCancel={onCancel}
                  onConvertInvoice={onConvertInvoice}
                  onConvertAppts={() => setShowConvertAppts(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreate && user && canCreate && (
        <CreatePlanModal
          onClose={() => setShowCreate(false)}
          onCreated={async (newId) => {
            setShowCreate(false);
            await refreshList(false);
            await openPlan(newId);
          }}
        />
      )}

      {showEdit && active && canEdit && (
        <EditPlanModal
          plan={active}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await refreshActiveAndList();
          }}
        />
      )}

      {showAddItem && active && (
        <AddItemModal
          planId={active.id}
          onClose={() => setShowAddItem(false)}
          onAdded={async () => {
            setShowAddItem(false);
            await refreshActiveAndList();
          }}
        />
      )}

      {showConvertAppts && active && (
        <ConvertToAppointmentsModal
          planId={active.id}
          onClose={() => setShowConvertAppts(false)}
          onDone={async (count) => {
            setShowConvertAppts(false);
            toastSuccess(t('convertToAppointments'), `+${count}`);
          }}
        />
      )}
    </div>
  );
};

// ─── Stat card ───────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  tone: 'primary' | 'accent' | 'amber';
}> = ({ icon: Icon, label, value, tone }) => {
  const toneClasses = {
    primary: 'border-l-primary-500 bg-primary-50/40 dark:bg-primary-900/10',
    accent: 'border-l-accent-500 bg-accent-50/40 dark:bg-accent-900/10',
    amber: 'border-l-amber-500 bg-amber-50/40 dark:bg-amber-900/10',
  };
  const iconClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300',
    accent: 'bg-accent-100 dark:bg-accent-900/40 text-accent-600 dark:text-accent-300',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300',
  };
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 border-l-4',
        toneClasses[tone],
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          iconClasses[tone],
        )}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-surface-500 dark:text-surface-400 font-semibold truncate">
          {label}
        </div>
        <div className="font-display font-bold text-lg text-surface-900 dark:text-white truncate">
          {value}
        </div>
      </div>
    </div>
  );
};

// ─── Plan detail ─────────────────────────────────────────────────────────────

interface PlanDetailProps {
  plan: TreatmentPlan;
  items: TreatmentPlanItem[];
  isLoadingItems: boolean;
  canEdit: boolean;
  canAccept: boolean;
  canConvert: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
  onConvertInvoice: () => void;
  onConvertAppts: () => void;
}

const PlanDetail: React.FC<PlanDetailProps> = ({
  plan,
  items,
  isLoadingItems,
  canEdit,
  canAccept,
  canConvert,
  canDelete,
  onEdit,
  onAddItem,
  onRemoveItem,
  onAccept,
  onReject,
  onCancel,
  onConvertInvoice,
  onConvertAppts,
}) => {
  const { t, language } = useLanguage();
  const subtotal = items.reduce((sum, it) => sum + (it.price || 0), 0);
  const discount = plan.discount ?? 0;
  const insurance = plan.insuranceCovered ?? 0;
  const patientResp = Math.max(0, subtotal - discount - insurance);
  const isLocked = plan.status === 'completed' || plan.status === 'canceled';
  const isPending = plan.status === 'draft' || plan.status === 'proposed';

  return (
    <Card>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold text-surface-900 dark:text-white truncate">
              {plan.title || t('untitledPlan' as any) || 'Untitled plan'}
            </h3>
            {canEdit && !isLocked && (
              <button
                onClick={onEdit}
                aria-label={t('edit' as any) || 'Edit'}
                className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <Edit3 size={15} />
              </button>
            )}
          </div>
          <div className="text-sm text-surface-500 mt-1">
            {plan.patientName || plan.patientId}
            {plan.createdAt && ` · ${formatDate(new Date(plan.createdAt), language)}`}
          </div>
          {plan.notes && (
            <p className="text-sm text-surface-600 dark:text-surface-300 mt-3 whitespace-pre-wrap">
              {plan.notes}
            </p>
          )}
        </div>
        <span
          className={cn(
            'text-xs uppercase font-bold px-3 py-1 rounded-full whitespace-nowrap',
            STATUS_COLORS[plan.status],
          )}
        >
          {t(plan.status)}
        </span>
      </div>

      {/* Items */}
      <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase text-surface-500 tracking-wider">
            {t('items' as any) || 'Items'}
          </h4>
          {canEdit && !isLocked && (
            <Button variant="ghost" size="sm" onClick={onAddItem} className="gap-1">
              <Plus size={14} /> {t('addItem')}
            </Button>
          )}
        </div>

        {isLoadingItems ? (
          <div className="flex items-center justify-center p-6 text-surface-400">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm italic text-surface-400 py-4 text-center border border-dashed border-surface-200 dark:border-surface-800 rounded-xl">
            —
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase text-surface-500 tracking-wider">
                <tr className="text-left">
                  <th className="py-2 font-semibold">{t('description')}</th>
                  <th className="py-2 font-semibold text-right">{t('price')}</th>
                  <th className="py-2 font-semibold text-right">{t('status' as any) || 'Status'}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    className="border-t border-surface-100 dark:border-surface-800"
                  >
                    <td className="py-2.5">{it.description}</td>
                    <td className="py-2.5 text-right font-mono">{fmtMoney(it.price)}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase',
                          it.status === 'completed'
                            ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                            : it.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : it.status === 'canceled'
                            ? 'bg-surface-100 text-surface-500 dark:bg-surface-800'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                        )}
                      >
                        {it.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {canDelete && it.status === 'planned' && !isLocked && (
                        <button
                          onClick={() => onRemoveItem(it.id)}
                          className="p-1.5 rounded-md text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          aria-label="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-surface-200 dark:border-surface-700 pt-4">
        <div />
        <div className="space-y-1.5 text-sm">
          <Row label={t('subtotal' as any) || 'Subtotal'} value={fmtMoney(subtotal)} />
          {discount > 0 && (
            <Row
              label={t('discount' as any) || 'Discount'}
              value={`− ${fmtMoney(discount)}`}
              tone="negative"
            />
          )}
          {insurance > 0 && (
            <Row
              label={t('insuranceCovered' as any) || 'Insurance covered'}
              value={`− ${fmtMoney(insurance)}`}
              tone="positive"
            />
          )}
          <div className="border-t border-surface-200 dark:border-surface-700 pt-2 flex items-center justify-between">
            <span className="font-bold uppercase text-xs text-surface-500 tracking-wider">
              {t('patientResponsibility' as any) || 'Patient owes'}
            </span>
            <span className="font-display font-bold text-xl text-primary-600 dark:text-primary-400 font-mono">
              {fmtMoney(patientResp)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-2 justify-end border-t border-surface-200 dark:border-surface-700 pt-4">
        {canEdit && plan.status === 'draft' && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="gap-2 text-red-600 dark:text-red-400 border-red-200 hover:border-red-300"
          >
            <X size={16} /> {t('cancel')}
          </Button>
        )}
        {canAccept && isPending && (
          <>
            <Button variant="outline" onClick={onReject} className="gap-2">
              <X size={16} /> {t('reject')}
            </Button>
            <Button onClick={onAccept} variant="accent" className="gap-2">
              <Check size={16} /> {t('accept')}
            </Button>
          </>
        )}
        {canConvert && plan.status === 'accepted' && (
          <>
            <Button variant="outline" onClick={onConvertAppts} className="gap-2">
              <CalendarPlus size={16} /> {t('convertToAppointments')}
            </Button>
            <Button onClick={onConvertInvoice} className="gap-2">
              <Receipt size={16} /> {t('convertToInvoice')}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

const Row: React.FC<{ label: string; value: string; tone?: 'positive' | 'negative' }> = ({
  label,
  value,
  tone,
}) => (
  <div className="flex items-center justify-between text-surface-700 dark:text-surface-300">
    <span>{label}</span>
    <span
      className={cn(
        'font-mono',
        tone === 'positive' && 'text-accent-600 dark:text-accent-400',
        tone === 'negative' && 'text-red-600 dark:text-red-400',
      )}
    >
      {value}
    </span>
  </div>
);

// ─── Modals ──────────────────────────────────────────────────────────────────

const CreatePlanModal: React.FC<{
  onClose: () => void;
  onCreated: (id: string) => void;
}> = ({ onClose, onCreated }) => {
  const { t } = useLanguage();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!patient) {
      toastError(new Error(t('selectPatient' as any) || 'Pick a patient'));
      return;
    }
    setBusy(true);
    try {
      const created = await treatmentPlansService.create({
        patientId: patient.id,
        title: title || undefined,
        notes: notes || undefined,
        status: 'draft',
      });
      toastSuccess(t('newTreatmentPlan'));
      onCreated(created.id);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('newTreatmentPlan')} maxWidth="lg">
      <div className="space-y-3">
        <PatientSelect value={patient} onChange={setPatient} />
        <Input
          label={t('planTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('planTitle')}
        />
        <div>
          <label className="block text-xs font-bold uppercase text-surface-500 mb-1.5 tracking-wider">
            {t('planNotes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-xl border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} isLoading={busy}>
            {t('confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const EditPlanModal: React.FC<{
  plan: TreatmentPlan;
  onClose: () => void;
  onSaved: () => void;
}> = ({ plan, onClose, onSaved }) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState(plan.title ?? '');
  const [notes, setNotes] = useState(plan.notes ?? '');
  const [discount, setDiscount] = useState(String(plan.discount ?? ''));
  const [insurance, setInsurance] = useState(String(plan.insuranceCovered ?? ''));
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await treatmentPlansService.update(plan.id, {
        title: title || undefined,
        notes: notes || undefined,
        discount: discount === '' ? undefined : Number(discount),
        insuranceCovered: insurance === '' ? undefined : Number(insurance),
      });
      toastSuccess(t('confirm'));
      onSaved();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('edit' as any) || 'Edit'} maxWidth="lg">
      <div className="space-y-3">
        <Input
          label={t('planTitle')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <label className="block text-xs font-bold uppercase text-surface-500 mb-1.5 tracking-wider">
            {t('planNotes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-xl border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('discount' as any) || 'Discount'}
            type="number"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <Input
            label={t('insuranceCovered' as any) || 'Insurance covered'}
            type="number"
            step="0.01"
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} isLoading={busy}>
            {t('confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const AddItemModal: React.FC<{
  planId: string;
  onClose: () => void;
  onAdded: () => void;
}> = ({ planId, onClose, onAdded }) => {
  const { t } = useLanguage();
  const [item, setItem] = useState<AddItemInput>({
    description: '',
    price: 0,
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!item.description) {
      toastError(new Error(t('description')));
      return;
    }
    setBusy(true);
    try {
      await treatmentPlansService.addItem(planId, {
        description: item.description,
        price: Number(item.price) || 0,
      });
      onAdded();
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('addItem')} maxWidth="lg">
      <div className="space-y-3">
        <Input
          label={t('description')}
          value={item.description}
          onChange={(e) => setItem({ ...item, description: e.target.value })}
          autoFocus
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label={t('price')}
            type="number"
            step="0.01"
            value={item.price}
            onChange={(e) => setItem({ ...item, price: Number(e.target.value) })}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} isLoading={busy}>
            {t('addItem')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const ConvertToAppointmentsModal: React.FC<{
  planId: string;
  onClose: () => void;
  onDone: (count: number) => void;
}> = ({ planId, onClose, onDone }) => {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(30);
  const [spacing, setSpacing] = useState(7);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await treatmentPlansService.convertToAppointments(planId, {
        startDate: new Date(startDate).toISOString(),
        durationMinutes: duration,
        spacingDays: spacing,
      });
      onDone(r.appointments.length);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('convertToAppointments')}
      maxWidth="lg"
    >
      <div className="space-y-3">
        <p className="text-sm text-surface-600 dark:text-surface-300">
          {t('convertToAppointmentsHelp' as any) ||
            'One appointment will be created per planned item, starting at the date below and spaced by the given days.'}
        </p>
        <Input
          label={t('startDate' as any) || 'Start date'}
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('estimatedDuration')}
            type="number"
            min={5}
            max={480}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <Input
            label={t('spacingDays' as any) || 'Days between'}
            type="number"
            min={0}
            max={365}
            value={spacing}
            onChange={(e) => setSpacing(Number(e.target.value))}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} isLoading={busy}>
            {t('confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
