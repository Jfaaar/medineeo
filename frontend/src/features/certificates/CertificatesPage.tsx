import React, { useEffect, useMemo, useState } from 'react';
import { Topbar } from '../../components/layout/Topbar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PatientSelect } from '../patients/components/PatientSelect';
import { CertificateModal } from './CertificateModal';
import { CertificateViewModal } from './components/CertificateViewModal';
import { CertificatePrintView } from './components/CertificatePrintView';
import { api } from '../../lib/api';
import { useAuth } from '../auth/useAuth';
import { useLanguage } from '../language/LanguageContext';
import { hasPermission } from '../../lib/permissions';
import { toastError } from '../../lib/toast';
import { formatDate } from '../../lib/utils';
import type { Certificate, CertificateType, Patient } from '../../types';
import { PlusCircle, FileText, Search, Eye, Printer, Loader2 } from 'lucide-react';

const CERTIFICATE_TYPES: CertificateType[] = ['sick_leave', 'fitness', 'school_work', 'travel', 'other'];

export const CertificatesPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CertificateType>('all');

  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [pickedPatient, setPickedPatient] = useState<Patient | null>(null);
  const [certificatePatient, setCertificatePatient] = useState<Patient | null>(null);

  const [certificateToView, setCertificateToView] = useState<Certificate | null>(null);
  const [certificateToPrint, setCertificateToPrint] = useState<Certificate | null>(null);

  const canCreate = hasPermission(user?.role, 'certificates.create');

  const refresh = async () => {
    setIsLoading(true);
    try {
      const certs = await api.certificates.listAll();
      setCertificates(certs);
    } catch (e) {
      toastError(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const patientNameFor = (cert: Certificate) => cert.patientName || '—';

  const filtered = useMemo(() => {
    return certificates
      .filter((cert) => {
        const name = patientNameFor(cert).toLowerCase();
        const matchSearch =
          !search ||
          name.includes(search.toLowerCase()) ||
          (cert.reason ?? '').toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === 'all' || cert.type === typeFilter;
        return matchSearch && matchType;
      })
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [certificates, search, typeFilter]);

  const patientFor = (cert: Certificate): Patient => ({
    id: cert.patientId,
    name: patientNameFor(cert),
    phone: '',
  });

  const handleCreate = async (data: Omit<Certificate, 'id'>) => {
    try {
      await api.certificates.create(data);
      setCertificatePatient(null);
      refresh();
    } catch (e) {
      toastError(e, t('createCertificateFailed'));
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      <Topbar title={t('certificates')}>
        {canCreate && (
          <Button className="gap-2" onClick={() => { setPickedPatient(null); setShowPatientPicker(true); }}>
            <PlusCircle size={18} /> {t('createCertificate')}
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
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | CertificateType)}
              className="bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg px-3 h-9 text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">{t('all')}</option>
              {CERTIFICATE_TYPES.map((ct) => (
                <option key={ct} value={ct}>{t(`certificateType_${ct}` as any)}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">{t('tableDate')}</th>
                  <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">{t('tableName')}</th>
                  <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">{t('certificateType')}</th>
                  <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">{t('reason')}</th>
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
                      <FileText size={28} className="mx-auto mb-2 text-surface-300" />
                      {t('noCertificatesFound')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((cert) => (
                    <tr
                      key={cert.id}
                      className="group hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer"
                      onClick={() => setCertificateToView(cert)}
                    >
                      <td className="py-4 px-4 text-sm font-medium text-surface-600 dark:text-surface-300">
                        {cert.createdAt ? formatDate(new Date(cert.createdAt), language) : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-surface-900 dark:text-white">{patientNameFor(cert)}</div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                          {t(`certificateType_${cert.type}` as any)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-surface-600 dark:text-surface-300">
                        {cert.reason || '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-surface-400 hover:text-surface-600 h-8 w-8"
                            title={t('viewCertificate')}
                            onClick={(e) => { e.stopPropagation(); setCertificateToView(cert); }}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary-500 hover:text-primary-600 h-8 w-8"
                            title={t('printCertificate')}
                            onClick={(e) => { e.stopPropagation(); setCertificateToPrint(cert); }}
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
                setCertificatePatient(pickedPatient);
                setShowPatientPicker(false);
              }}
            >
              {t('confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {certificatePatient && (
        <CertificateModal
          isOpen
          onClose={() => setCertificatePatient(null)}
          patientId={certificatePatient.id}
          patientName={certificatePatient.name}
          onSubmit={handleCreate}
        />
      )}

      {certificateToView && (
        <CertificateViewModal
          certificate={certificateToView}
          patientName={patientNameFor(certificateToView)}
          onClose={() => setCertificateToView(null)}
          onPrint={() => { setCertificateToPrint(certificateToView); setCertificateToView(null); }}
        />
      )}

      {certificateToPrint && (
        <CertificatePrintView
          certificate={certificateToPrint}
          patient={patientFor(certificateToPrint)}
          doctorName={user?.name || 'Doctor'}
          onClose={() => setCertificateToPrint(null)}
        />
      )}
    </div>
  );
};
