import React, { useEffect, useMemo, useState } from 'react';
import { Topbar } from '../../components/layout/Topbar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PatientSelect } from '../patients/components/PatientSelect';
import { ReferralModal } from './ReferralModal';
import { ReferralViewModal } from './components/ReferralViewModal';
import { ReferralPrintView } from './components/ReferralPrintView';
import { api } from '../../lib/api';
import { useAuth } from '../auth/useAuth';
import { useLanguage } from '../language/LanguageContext';
import { hasPermission } from '../../lib/permissions';
import { toastError } from '../../lib/toast';
import { formatDate, cn } from '../../lib/utils';
import type { Patient, Referral } from '../../types';
import { PlusCircle, Send, Search, Eye, Printer, Loader2 } from 'lucide-react';

export const ReferralsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'routine' | 'urgent'>('all');

  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [pickedPatient, setPickedPatient] = useState<Patient | null>(null);
  const [referralPatient, setReferralPatient] = useState<Patient | null>(null);

  const [referralToView, setReferralToView] = useState<Referral | null>(null);
  const [referralToPrint, setReferralToPrint] = useState<Referral | null>(null);

  const canCreate = hasPermission(user?.role, 'referrals.create');

  const refresh = async () => {
    setIsLoading(true);
    try {
      const refs = await api.referrals.listAll();
      setReferrals(refs);
    } catch (e) {
      toastError(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const patientNameFor = (ref: Referral) => ref.patientName || '—';

  const filtered = useMemo(() => {
    return referrals
      .filter((ref) => {
        const name = patientNameFor(ref).toLowerCase();
        const matchSearch =
          !search ||
          name.includes(search.toLowerCase()) ||
          ref.recipientSpecialty.toLowerCase().includes(search.toLowerCase()) ||
          (ref.recipientName ?? '').toLowerCase().includes(search.toLowerCase());
        const matchUrgency = urgencyFilter === 'all' || ref.urgency === urgencyFilter;
        return matchSearch && matchUrgency;
      })
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [referrals, search, urgencyFilter]);

  const patientFor = (ref: Referral): Patient => ({
    id: ref.patientId,
    name: patientNameFor(ref),
    phone: '',
  });

  const handleCreate = async (data: Omit<Referral, 'id'>) => {
    try {
      await api.referrals.create(data);
      setReferralPatient(null);
      refresh();
    } catch (e) {
      toastError(e, t('createReferralFailed'));
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      <Topbar title={t('referrals')}>
        {canCreate && (
          <Button className="gap-2" onClick={() => { setPickedPatient(null); setShowPatientPicker(true); }}>
            <PlusCircle size={18} /> {t('createReferral')}
          </Button>
        )}
      </Topbar>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-4">
        <Card className="overflow-hidden border-none shadow-md" noPadding>
          <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
              <input
                type="text"
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={t('searchPatient') + '...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg p-1 w-fit">
              {(['all', 'routine', 'urgent'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUrgencyFilter(u)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    urgencyFilter === u
                      ? u === 'urgent'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-surface-500'
                  )}
                >
                  {u === 'all' ? t('all') : u === 'routine' ? t('urgencyRoutine') : t('urgencyUrgent')}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">{t('tableDate')}</th>
                  <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">{t('tableName')}</th>
                  <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">{t('referralTo')}</th>
                  <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider text-center">{t('urgency')}</th>
                  <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider text-right">{t('tableAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-700 bg-white dark:bg-surface-900">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-surface-400">
                      <Loader2 className="inline-block animate-spin" size={20} />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-surface-400">
                      <Send size={28} className="mx-auto mb-2 text-surface-300" />
                      {t('noReferralsFound')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((ref) => (
                    <tr
                      key={ref.id}
                      className="group hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer"
                      onClick={() => setReferralToView(ref)}
                    >
                      <td className="py-4 px-4 text-sm font-medium text-surface-600 dark:text-surface-300">
                        {ref.createdAt ? formatDate(new Date(ref.createdAt), language) : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-surface-900 dark:text-white">{patientNameFor(ref)}</div>
                      </td>
                      <td className="py-4 px-4 text-sm text-surface-600 dark:text-surface-300">
                        <div className="font-medium text-surface-900 dark:text-white">
                          {ref.recipientName || ref.recipientSpecialty}
                        </div>
                        {ref.recipientName && (
                          <div className="text-xs text-surface-500">{ref.recipientSpecialty}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {ref.urgency === 'urgent' ? (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {t('urgencyUrgent')}
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400">
                            {t('urgencyRoutine')}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-surface-400 hover:text-surface-600 h-8 w-8"
                            title={t('viewReferral')}
                            onClick={(e) => { e.stopPropagation(); setReferralToView(ref); }}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary-500 hover:text-primary-600 h-8 w-8"
                            title={t('printReferral')}
                            onClick={(e) => { e.stopPropagation(); setReferralToPrint(ref); }}
                          >
                            <Printer size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showPatientPicker}
        onClose={() => setShowPatientPicker(false)}
        title={t('selectPatient')}
        maxWidth="sm"
        scrollBody={false}
      >
        <div className="space-y-4">
          <PatientSelect value={pickedPatient} onChange={setPickedPatient} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowPatientPicker(false)}>
              {t('cancel')}
            </Button>
            <Button
              disabled={!pickedPatient}
              onClick={() => {
                setReferralPatient(pickedPatient);
                setShowPatientPicker(false);
              }}
            >
              {t('confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {referralPatient && (
        <ReferralModal
          isOpen
          onClose={() => setReferralPatient(null)}
          patientId={referralPatient.id}
          patientName={referralPatient.name}
          onSubmit={handleCreate}
        />
      )}

      {referralToView && (
        <ReferralViewModal
          referral={referralToView}
          patientName={patientNameFor(referralToView)}
          onClose={() => setReferralToView(null)}
          onPrint={() => { setReferralToPrint(referralToView); setReferralToView(null); }}
        />
      )}

      {referralToPrint && (
        <ReferralPrintView
          referral={referralToPrint}
          patient={patientFor(referralToPrint)}
          doctorName={user?.name || 'Doctor'}
          onClose={() => setReferralToPrint(null)}
        />
      )}
    </div>
  );
};
