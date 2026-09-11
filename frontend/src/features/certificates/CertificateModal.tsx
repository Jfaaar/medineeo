import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Certificate, CertificateType } from '../../types';
import { useLanguage } from '../language/LanguageContext';
import { FileText } from 'lucide-react';
import { BRAND } from '../../lib/brand';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onSubmit: (data: Omit<Certificate, 'id'>) => void;
}

const CERTIFICATE_TYPES: CertificateType[] = ['sick_leave', 'fitness', 'school_work', 'travel', 'other'];

// Builds the suggested certificate wording in the currently active app
// language. The doctor can freely edit the result before saving — what gets
// saved (and later printed) is exactly this text, never regenerated later.
function buildSuggestedContent(
  t: (key: any, vars?: Record<string, string | number>) => string,
  type: CertificateType,
  patientName: string,
  restDays?: number,
): string {
  const daysClause = restDays ? t('certificateDaysClause', { count: restDays }) : '';
  return t(`certificateStatement_${type}` as any, { name: patientName, daysClause });
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  onSubmit,
}) => {
  const { t, language } = useLanguage();
  const [type, setType] = useState<CertificateType>('sick_leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [restDays, setRestDays] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [content, setContent] = useState('');
  const [contentTouched, setContentTouched] = useState(false);

  const reset = () => {
    setType('sick_leave');
    setStartDate('');
    setEndDate('');
    setRestDays('');
    setReason('');
    setNotes('');
    setContent('');
    setContentTouched(false);
  };

  // Re-suggest the wording whenever type/duration/language changes — unless
  // the doctor has already started editing it by hand, in which case their
  // text wins and is left alone.
  useEffect(() => {
    if (contentTouched) return;
    const days = restDays ? Number(restDays) : undefined;
    setContent(buildSuggestedContent(t, type, patientName, days));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, restDays, patientName, language, contentTouched]);

  // Keep restDays in sync when both dates are picked, but let the doctor
  // override it manually afterwards (e.g. non-consecutive days).
  const handleDateChange = (nextStart: string, nextEnd: string) => {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    if (nextStart && nextEnd) {
      const days = Math.round(
        (new Date(nextEnd).getTime() - new Date(nextStart).getTime()) / 86_400_000,
      ) + 1;
      if (days > 0) setRestDays(String(days));
    }
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    onSubmit({
      patientId,
      type,
      reason: reason || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      restDays: restDays ? Number(restDays) : undefined,
      content: content || undefined,
      notes: notes || undefined,
    });
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('createCertificate')} maxWidth="3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase text-surface-500 tracking-wider">
              {t('certificateType')}
            </label>
            <div className="flex flex-wrap gap-2">
              {CERTIFICATE_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setType(ct)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    type === ct
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-300'
                  }`}
                >
                  {t(`certificateType_${ct}` as any)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              type="date"
              label={t('startDate')}
              value={startDate}
              onChange={(e) => handleDateChange(e.target.value, endDate)}
            />
            <Input
              type="date"
              label={t('endDate')}
              value={endDate}
              onChange={(e) => handleDateChange(startDate, e.target.value)}
            />
            <Input
              type="number"
              label={t('restDays')}
              value={restDays}
              onChange={(e) => setRestDays(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase text-surface-500 tracking-wider">
              {t('reason')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase text-surface-500 tracking-wider">
              {t('instructions')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Right: live preview — the content textarea is the actual saved/printed text */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase text-surface-500 tracking-wider">
            {t('certificatePreview')}
          </label>
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/60 p-5 flex flex-col gap-3">
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary-700 dark:text-primary-400">
                {BRAND.NAME}
              </div>
              <div className="text-sm font-bold uppercase tracking-wide text-surface-900 dark:text-white mt-1">
                {t('certificatePrintTitle')}
              </div>
            </div>
            <div className="text-xs text-surface-500">
              <span className="font-bold text-surface-700 dark:text-surface-300">{t('patient')}:</span> {patientName}
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
                {t('certificateContentLabel')}
              </label>
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setContentTouched(true); }}
                rows={7}
                className="w-full p-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="text-center text-[11px] text-surface-400 border-t border-dashed border-surface-300 dark:border-surface-700 pt-3">
              {t('signatureStampLabel')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-surface-100 dark:border-surface-800">
        <Button variant="ghost" onClick={handleClose}>
          {t('cancel')}
        </Button>
        <Button onClick={handleSubmit} className="gap-2">
          <FileText size={16} /> {t('createCertificate')}
        </Button>
      </div>
    </Modal>
  );
};
