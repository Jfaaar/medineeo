
import React, { useEffect } from 'react';
import { Referral, Patient } from '../../../types';
import { formatDate } from '../../../lib/utils';
import { useLanguage } from '../../language/LanguageContext';
import { Activity } from 'lucide-react';
import { BRAND } from '../../../lib/brand';

interface ReferralPrintViewProps {
  referral: Referral;
  patient: Patient;
  doctorName: string;
  onClose: () => void;
}

// Referrals created before the `content` field existed have no saved text —
// fall back to regenerating it once, in the currently active language.
function fallbackStatement(
  t: (key: any, vars?: Record<string, string | number>) => string,
  referral: Referral,
  patientName: string,
): string {
  return t('referralStatement', { name: patientName, specialty: referral.recipientSpecialty });
}

export const ReferralPrintView: React.FC<ReferralPrintViewProps> = ({
  referral,
  patient,
  doctorName,
  onClose,
}) => {
  const { t, language } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  const statement = referral.content || fallbackStatement(t, referral, patient.name);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      <div className="print:hidden flex justify-between items-center p-4 bg-surface-900 text-white shadow-md">
        <h2 className="font-bold">Print Preview</h2>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors">
            Print Again
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg font-medium transition-colors">
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-100 p-8 print:p-0 print:bg-white print:overflow-visible">
        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl print:shadow-none p-12 relative flex flex-col">

          <header className="border-b-2 border-primary-900 pb-6 mb-8 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-3 text-primary-900 mb-2">
                <Activity size={32} />
                <h1 className="text-3xl font-bold uppercase tracking-widest">{BRAND.NAME}</h1>
              </div>
              <p className="text-sm font-semibold text-surface-600">{BRAND.NAME} Medical Clinic</p>
              <p className="text-xs text-surface-500 mt-1">123 Medical Plaza, Health District</p>
              <p className="text-xs text-surface-500">Phone: +212 5 22 00 00 00</p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-primary-800">{doctorName}</h3>
              <p className="text-sm text-surface-600">{t('physicianTitle')}</p>
              <p className="text-xs text-surface-500">Licence #12345</p>
            </div>
          </header>

          <section className="mb-8 flex justify-between items-start text-sm">
            <div className="space-y-1">
              <p className="text-surface-500">{t('referralTo')}:</p>
              <p className="font-bold text-surface-900 text-base">
                {referral.recipientName || referral.recipientSpecialty}
              </p>
              {referral.recipientName && (
                <p className="text-surface-600">{referral.recipientSpecialty}</p>
              )}
              {referral.urgency === 'urgent' && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold uppercase print:border print:border-red-700">
                  {t('urgencyUrgent')}
                </span>
              )}
            </div>
            <div className="text-right space-y-1">
              <p><span className="font-bold text-surface-900">{t('date')}:</span> {formatDate(new Date(referral.createdAt ?? Date.now()), language)}</p>
              <p><span className="font-bold text-surface-900">{t('refLabel')}:</span> #{referral.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </section>

          <section className="mb-8 text-sm border border-surface-200 rounded-lg p-4 bg-surface-50 print:bg-transparent print:border-surface-900">
            <p><span className="font-bold text-surface-900">{t('patient')}:</span> {patient.name}</p>
            <p><span className="font-bold text-surface-900">{t('idLabel')}:</span> {patient.id.toUpperCase()}</p>
          </section>

          <main className="flex-1">
            <p className="text-base text-surface-900 leading-relaxed whitespace-pre-wrap">{statement}</p>

            {referral.reason && (
              <div className="mt-8 pt-6 border-t border-dashed border-surface-300">
                <p className="text-sm font-bold text-surface-900 mb-1">{t('reason')}:</p>
                <p className="text-sm text-surface-700">{referral.reason}</p>
              </div>
            )}

            {referral.notes && (
              <div className="mt-4">
                <p className="text-sm font-bold text-surface-900 mb-1">{t('additionalNotesLabel')}:</p>
                <p className="text-sm text-surface-700">{referral.notes}</p>
              </div>
            )}
          </main>

          <footer className="mt-12 pt-8 flex justify-between items-end">
            <div className="text-xs text-surface-400 max-w-[200px]">
              <p>{t('issuedOnLabel', { date: formatDate(new Date(referral.createdAt ?? Date.now()), language) })}</p>
            </div>
            <div className="text-center">
              <div className="h-20 w-48 border-b border-surface-900 mb-2"></div>
              <p className="font-bold text-surface-900">{t('signatureStampLabel')}</p>
            </div>
          </footer>

        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          body > *:not(.fixed) { display: none; }
          .fixed { position: fixed; inset: 0; background: white; z-index: 9999; display: block; height: 100vh; width: 100vw; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:overflow-visible { overflow: visible !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .print\\:border-surface-900 { border-color: #000 !important; }
        }
      `}</style>
    </div>
  );
};
