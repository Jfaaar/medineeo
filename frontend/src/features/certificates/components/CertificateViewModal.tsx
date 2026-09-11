import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Certificate } from '../../../types';
import { useLanguage } from '../../language/LanguageContext';
import { formatDate } from '../../../lib/utils';
import { Printer } from 'lucide-react';

interface CertificateViewModalProps {
  certificate: Certificate;
  patientName: string;
  onClose: () => void;
  onPrint: () => void;
}

// Read-only consult view opened from the certificate list — lets the doctor
// re-read the certificate before deciding to print it, without triggering
// the browser print dialog the way CertificatePrintView does on mount.
export const CertificateViewModal: React.FC<CertificateViewModalProps> = ({
  certificate,
  patientName,
  onClose,
  onPrint,
}) => {
  const { t, language } = useLanguage();

  const daysClause = certificate.restDays
    ? t('certificateDaysClause' as any, { count: certificate.restDays })
    : '';
  const statement =
    certificate.content ||
    t(`certificateStatement_${certificate.type}` as any, { name: patientName, daysClause });

  return (
    <Modal isOpen onClose={onClose} title={t('viewCertificate')} maxWidth="lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between text-sm">
          <div className="space-y-1">
            <p className="text-surface-500">{t('certificateType')}:</p>
            <p className="font-bold text-surface-900 dark:text-white text-base">
              {t(`certificateType_${certificate.type}` as any)}
            </p>
          </div>
          <div className="text-right text-surface-500">
            <p>{certificate.createdAt ? formatDate(new Date(certificate.createdAt), language) : '—'}</p>
          </div>
        </div>

        <div className="text-xs text-surface-500">
          <span className="font-bold text-surface-700 dark:text-surface-300">{t('patient')}:</span> {patientName}
        </div>

        {(certificate.startDate || certificate.endDate || certificate.restDays) && (
          <div className="text-xs text-surface-500 flex gap-4">
            {certificate.startDate && (
              <span>
                <span className="font-bold text-surface-700 dark:text-surface-300">{t('fromLabel')}:</span>{' '}
                {formatDate(new Date(certificate.startDate), language)}
              </span>
            )}
            {certificate.endDate && (
              <span>
                <span className="font-bold text-surface-700 dark:text-surface-300">{t('toLabel')}:</span>{' '}
                {formatDate(new Date(certificate.endDate), language)}
              </span>
            )}
            {certificate.restDays && (
              <span>
                <span className="font-bold text-surface-700 dark:text-surface-300">{t('restDays')}:</span>{' '}
                {certificate.restDays}
              </span>
            )}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
            {t('certificateContentLabel')}
          </label>
          <div className="w-full p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/60 text-sm leading-relaxed whitespace-pre-wrap text-surface-900 dark:text-surface-100">
            {statement}
          </div>
        </div>

        {certificate.reason && (
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
              {t('reason')}
            </label>
            <p className="text-sm text-surface-700 dark:text-surface-300">{certificate.reason}</p>
          </div>
        )}

        {certificate.notes && (
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
              {t('instructions')}
            </label>
            <p className="text-sm text-surface-700 dark:text-surface-300">{certificate.notes}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-surface-100 dark:border-surface-800">
        <Button variant="ghost" onClick={onClose}>
          {t('close')}
        </Button>
        <Button onClick={onPrint} className="gap-2">
          <Printer size={16} /> {t('printCertificate')}
        </Button>
      </div>
    </Modal>
  );
};
