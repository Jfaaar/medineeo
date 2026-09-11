import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Referral } from '../../../types';
import { useLanguage } from '../../language/LanguageContext';
import { formatDate } from '../../../lib/utils';
import { Printer } from 'lucide-react';

interface ReferralViewModalProps {
  referral: Referral;
  patientName: string;
  onClose: () => void;
  onPrint: () => void;
}

// Read-only consult view opened from the referral list — lets the doctor
// re-read the letter before deciding to print it, without triggering the
// browser print dialog the way ReferralPrintView does on mount.
export const ReferralViewModal: React.FC<ReferralViewModalProps> = ({
  referral,
  patientName,
  onClose,
  onPrint,
}) => {
  const { t, language } = useLanguage();
  const statement = referral.content || t('referralStatement', { name: patientName, specialty: referral.recipientSpecialty });

  return (
    <Modal isOpen onClose={onClose} title={t('viewReferral')} maxWidth="lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between text-sm">
          <div className="space-y-1">
            <p className="text-surface-500">{t('referralTo')}:</p>
            <p className="font-bold text-surface-900 dark:text-white text-base">
              {referral.recipientName || referral.recipientSpecialty}
            </p>
            {referral.recipientName && (
              <p className="text-surface-600 dark:text-surface-400">{referral.recipientSpecialty}</p>
            )}
            {referral.urgency === 'urgent' && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold uppercase">
                {t('urgencyUrgent')}
              </span>
            )}
          </div>
          <div className="text-right text-surface-500">
            <p>{referral.createdAt ? formatDate(new Date(referral.createdAt), language) : '—'}</p>
          </div>
        </div>

        <div className="text-xs text-surface-500">
          <span className="font-bold text-surface-700 dark:text-surface-300">{t('patient')}:</span> {patientName}
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
            {t('referralContentLabel')}
          </label>
          <div className="w-full p-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/60 text-sm leading-relaxed whitespace-pre-wrap text-surface-900 dark:text-surface-100">
            {statement}
          </div>
        </div>

        {referral.reason && (
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
              {t('reason')}
            </label>
            <p className="text-sm text-surface-700 dark:text-surface-300">{referral.reason}</p>
          </div>
        )}

        {referral.notes && (
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
              {t('instructions')}
            </label>
            <p className="text-sm text-surface-700 dark:text-surface-300">{referral.notes}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-surface-100 dark:border-surface-800">
        <Button variant="ghost" onClick={onClose}>
          {t('close')}
        </Button>
        <Button onClick={onPrint} className="gap-2">
          <Printer size={16} /> {t('printReferral')}
        </Button>
      </div>
    </Modal>
  );
};
