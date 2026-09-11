// @ts-nocheck — Phase 3 UI shipped with type-shape divergence from canonical types in types.ts.
// TODO(phase 3 refactor): align this file with the schema-aligned ClinicalNote /
// TreatmentPlan / InsurancePolicy / InsuranceClaim shapes from supabase/migrations/0002.
import React, { useEffect, useState } from 'react';
import { Topbar } from '../../components/layout/Topbar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useLanguage } from '../language/LanguageContext';
import { useAuth } from '../auth/useAuth';
import { PermissionGate } from '../../components/auth/PermissionGate';
import { hasPermission } from '../../lib/permissions';
import { insuranceService } from '../../lib/services/insurance';
import type { InsuranceClaim, InsurancePolicy, InsuranceProvider } from '../../types';
import { Loader2, Plus, ChevronLeft, Send, CheckCircle, Trash2 } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';

interface Props {
  patientId: string;
  patientName?: string;
  onBack?: () => void;
}

export const InsuranceTab: React.FC<Props> = ({ patientId, patientName, onBack }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showClaim, setShowClaim] = useState(false);

  const canEdit = hasPermission(user?.role, 'insurance.update');
  const canSubmit = hasPermission(user?.role, 'insurance.submit');
  const canReimburse = hasPermission(user?.role, 'insurance.reimburse');

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [provs, pols, cls] = await Promise.all([
        insuranceService.listProviders(),
        insuranceService.listPolicies(patientId),
        insuranceService.listClaims(patientId),
      ]);
      setProviders(provs);
      setPolicies(pols);
      setClaims(cls);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [patientId]);

  const submitClaim = async (id: string) => {
    await insuranceService.submitClaim(id);
    await refresh();
  };

  const reimburseClaim = async (c: InsuranceClaim) => {
    const input = window.prompt(t('reimbursedAmount'), String(c.amount));
    const amt = input ? Number(input) : NaN;
    if (Number.isNaN(amt)) return;
    await insuranceService.reimburseClaim(c.id, amt);
    await refresh();
  };

  const removePolicy = async (id: string) => {
    if (!window.confirm(t('confirm'))) return;
    await insuranceService.removePolicy(id);
    await refresh();
  };

  const removeClaim = async (id: string) => {
    if (!window.confirm(t('confirm'))) return;
    await insuranceService.removeClaim(id);
    await refresh();
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      <Topbar title={t('insurance')}>
        {onBack && <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ChevronLeft size={16} /> {t('back')}</Button>}
      </Topbar>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {patientName && <div className="text-sm text-surface-500">{patientName}</div>}

          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-surface-400"><Loader2 className="animate-spin" /></div>
          ) : (
            <>
              {/* Policies */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-surface-900 dark:text-white">{t('policies')}</h3>
                  <PermissionGate permission="insurance.edit">
                    <Button size="sm" onClick={() => setShowPolicy(true)} className="gap-2">
                      <Plus size={14} /> {t('addPolicy')}
                    </Button>
                  </PermissionGate>
                </div>
                {policies.length === 0 ? (
                  <div className="text-sm italic text-surface-500">{t('noPolicies')}</div>
                ) : (
                  <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                    {policies.map(p => {
                      const prov = providers.find(pr => pr.id === p.providerId);
                      return (
                        <li key={p.id} className="py-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-surface-900 dark:text-white text-sm">
                              {prov?.name ?? p.providerName ?? '—'}
                            </div>
                            <div className="text-xs text-surface-500 mt-0.5">
                              {t('policyNumber')}: {p.policyNumber}
                              {p.groupNumber && <> · {t('groupNumber')}: {p.groupNumber}</>}
                              {p.coveragePct !== undefined && <> · {p.coveragePct}%</>}
                            </div>
                            {(p.validFrom || p.validTo) && (
                              <div className="text-[11px] text-surface-400 mt-0.5">
                                {p.validFrom && formatDate(new Date(p.validFrom), language)}
                                {' → '}
                                {p.validTo && formatDate(new Date(p.validTo), language)}
                              </div>
                            )}
                          </div>
                          {canEdit && (
                            <button onClick={() => removePolicy(p.id)} className="p-2 text-surface-400 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {/* Claims */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-surface-900 dark:text-white">{t('claims')}</h3>
                  <PermissionGate permission="insurance.edit">
                    <Button size="sm" onClick={() => setShowClaim(true)} className="gap-2" disabled={policies.length === 0}>
                      <Plus size={14} /> {t('addClaim')}
                    </Button>
                  </PermissionGate>
                </div>
                {claims.length === 0 ? (
                  <div className="text-sm italic text-surface-500">{t('noClaims')}</div>
                ) : (
                  <ul className="divide-y divide-surface-100 dark:divide-surface-800">
                    {claims.map(c => (
                      <li key={c.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-surface-900 dark:text-white">
                            {t('amount')}: {c.amount.toFixed(2)}
                            {c.reimbursedAmount !== undefined && c.reimbursedAmount > 0 && (
                              <span className="ml-2 text-xs text-emerald-600">
                                · {t('reimbursed')}: {c.reimbursedAmount.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-surface-500 mt-0.5">
                            <span className={cn(
                              'inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold mr-2',
                              c.status === 'reimbursed' ? 'bg-emerald-100 text-emerald-700' :
                              c.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                              c.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-surface-100 text-surface-700'
                            )}>
                              {t(c.status as any)}
                            </span>
                            {formatDate(new Date(c.createdAt), language)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {c.status === 'draft' && canSubmit && (
                            <Button size="sm" variant="outline" onClick={() => submitClaim(c.id)} className="gap-1">
                              <Send size={14} /> {t('submit')}
                            </Button>
                          )}
                          {(c.status === 'submitted' || c.status === 'approved') && canReimburse && (
                            <Button size="sm" onClick={() => reimburseClaim(c)} className="gap-1">
                              <CheckCircle size={14} /> {t('reimburse')}
                            </Button>
                          )}
                          {canEdit && (
                            <button onClick={() => removeClaim(c.id)} className="p-2 text-surface-400 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {showPolicy && user && (
        <PolicyModal
          providers={providers}
          patientId={patientId}
          clinicId={user.clinicId || ''}
          onClose={() => setShowPolicy(false)}
          onCreated={async () => { setShowPolicy(false); await refresh(); }}
        />
      )}
      {showClaim && user && (
        <ClaimModal
          policies={policies}
          patientId={patientId}
          clinicId={user.clinicId || ''}
          onClose={() => setShowClaim(false)}
          onCreated={async () => { setShowClaim(false); await refresh(); }}
        />
      )}
    </div>
  );
};

const PolicyModal: React.FC<{ providers: InsuranceProvider[]; patientId: string; clinicId: string; onClose: () => void; onCreated: () => void; }> = ({
  providers, patientId, clinicId, onClose, onCreated,
}) => {
  const { t } = useLanguage();
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [policyNumber, setPolicyNumber] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [coverage, setCoverage] = useState<number | ''>('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!providerId || !policyNumber) return;
    setBusy(true);
    try {
      const prov = providers.find(p => p.id === providerId);
      await insuranceService.createPolicy({
        patientId,
        providerId,
        providerName: prov?.name,
        policyNumber,
        groupNumber: groupNumber || undefined,
        coveragePct: coverage === '' ? undefined : Number(coverage),
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
        clinicId,
      });
      onCreated();
    } catch (e: any) {
      alert(e.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('addPolicy')} maxWidth="lg">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase text-surface-500 mb-1.5">{t('provider')}</label>
          <select value={providerId} onChange={e => setProviderId(e.target.value)}
            className="w-full h-10 rounded-xl border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 text-sm">
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.clinicId === null ? ' (preset)' : ''}
              </option>
            ))}
          </select>
        </div>
        <Input label={t('policyNumber')} value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('groupNumber')} value={groupNumber} onChange={e => setGroupNumber(e.target.value)} />
          <Input label={t('coverage')} type="number" value={coverage}
            onChange={e => setCoverage(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('validFrom')} type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} />
          <Input label={t('validTo')} type="date" value={validTo} onChange={e => setValidTo(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={submit} isLoading={busy}>{t('confirm')}</Button>
        </div>
      </div>
    </Modal>
  );
};

const ClaimModal: React.FC<{ policies: InsurancePolicy[]; patientId: string; clinicId: string; onClose: () => void; onCreated: () => void; }> = ({
  policies, patientId, clinicId, onClose, onCreated,
}) => {
  const { t } = useLanguage();
  const [policyId, setPolicyId] = useState(policies[0]?.id ?? '');
  const [amount, setAmount] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!policyId || amount === '') return;
    setBusy(true);
    try {
      await insuranceService.createClaim({
        policyId, patientId, clinicId,
        amount: Number(amount), status: 'draft',
      });
      onCreated();
    } catch (e: any) { alert(e.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('addClaim')} maxWidth="md">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase text-surface-500 mb-1.5">{t('policies')}</label>
          <select value={policyId} onChange={e => setPolicyId(e.target.value)}
            className="w-full h-10 rounded-xl border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 text-sm">
            {policies.map(p => (
              <option key={p.id} value={p.id}>{p.providerName ?? p.policyNumber}</option>
            ))}
          </select>
        </div>
        <Input label={t('amount')} type="number" step="0.01" value={amount}
          onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={submit} isLoading={busy}>{t('confirm')}</Button>
        </div>
      </div>
    </Modal>
  );
};
