import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Referral, ReferralUrgency } from '../../types';
import { useLanguage } from '../language/LanguageContext';
import { Send } from 'lucide-react';
import { BRAND } from '../../lib/brand';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onSubmit: (data: Omit<Referral, 'id'>) => void;
}

// Quick-fill suggestions for the free-text recipient specialty field — the
// doctor can always type anything else (any specialist, any wording).
const SPECIALTY_SUGGESTIONS = [
  'emergency', 'cardiology', 'dermatology', 'ent', 'ophthalmology',
  'orthopedics', 'neurology', 'gynecology', 'pediatrics', 'psychiatry',
  'gastroenterology',
] as const;

// Builds the suggested letter body in the currently active app language.
// The doctor can freely edit the result before saving — what gets saved (and
// later printed) is exactly this text, never regenerated later.
function buildSuggestedContent(
  t: (key: any, vars?: Record<string, string | number>) => string,
  patientName: string,
  specialty: string,
): string {
  return t('referralStatement', { name: patientName, specialty: specialty || '…' });
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  onSubmit,
}) => {
  const { t, language } = useLanguage();
  const [recipientSpecialty, setRecipientSpecialty] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [urgency, setUrgency] = useState<ReferralUrgency>('routine');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [content, setContent] = useState('');
  const [contentTouched, setContentTouched] = useState(false);

  const reset = () => {
    setRecipientSpecialty('');
    setRecipientName('');
    setUrgency('routine');
    setReason('');
    setNotes('');
    setContent('');
    setContentTouched(false);
  };

  // Re-suggest the wording whenever the recipient specialty/language changes
  // — unless the doctor has already started editing it by hand.
  useEffect(() => {
    if (contentTouched) return;
    setContent(buildSuggestedContent(t, patientName, recipientSpecialty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientSpecialty, patientName, language, contentTouched]);

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!recipientSpecialty.trim()) return;
    onSubmit({
      patientId,
      recipientSpecialty: recipientSpecialty.trim(),
      recipientName: recipientName || undefined,
      urgency,
      reason: reason || undefined,
      content: content || undefined,
      notes: notes || undefined,
    });
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('createReferral')} maxWidth="3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Input
              label={t('recipientSpecialty')}
              value={recipientSpecialty}
              onChange={(e) => setRecipientSpecialty(e.target.value)}
              placeholder="e.g. Cardiology"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {SPECIALTY_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRecipientSpecialty(t(`referralSpecialty_${s}` as any))}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  {t(`referralSpecialty_${s}` as any)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={t('recipientName')}
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase text-surface-500 tracking-wider">
              {t('urgency')}
            </label>
            <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-lg h-10 w-fit">
              <button
                type="button"
                onClick={() => setUrgency('routine')}
                className={`px-4 text-xs font-medium rounded-md transition-all ${urgency === 'routine' ? 'bg-white dark:bg-surface-600 shadow-sm text-primary-600' : 'text-surface-500'}`}
              >
                {t('urgencyRoutine')}
              </button>
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`px-4 text-xs font-medium rounded-md transition-all ${urgency === 'urgent' ? 'bg-white dark:bg-surface-600 shadow-sm text-red-600' : 'text-surface-500'}`}
              >
                {t('urgencyUrgent')}
              </button>
            </div>
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
            {t('referralPreview')}
          </label>
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/60 p-5 flex flex-col gap-3">
            <div className="text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary-700 dark:text-primary-400">
                {BRAND.NAME}
              </div>
              <div className="text-sm font-bold uppercase tracking-wide text-surface-900 dark:text-white mt-1">
                {t('referralPrintTitle')}
              </div>
            </div>
            <div className="text-xs text-surface-500 space-y-0.5">
              <div>
                <span className="font-bold text-surface-700 dark:text-surface-300">{t('referralTo')}:</span>{' '}
                {recipientName || recipientSpecialty || '—'}
                {recipientName && recipientSpecialty ? ` (${recipientSpecialty})` : ''}
              </div>
              <div>
                <span className="font-bold text-surface-700 dark:text-surface-300">{t('patient')}:</span> {patientName}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-surface-400 tracking-wider">
                {t('referralContentLabel')}
              </label>
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setContentTouched(true); }}
                rows={8}
                className="w-full p-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-sm leading-relaxed whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-primary-500"
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
        <Button onClick={handleSubmit} className="gap-2" disabled={!recipientSpecialty.trim()}>
          <Send size={16} /> {t('createReferral')}
        </Button>
      </div>
    </Modal>
  );
};
