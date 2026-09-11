// SOAP-format clinical note editor.
// Writes to the new subjective/objective/assessment/plan columns on
// clinical_notes. Lists existing SOAP notes for the patient and lets
// the user create a new one. Signing/locking flows through the same
// /clinical/notes/:id/sign endpoint as the legacy editor.
import React, { useEffect, useState } from 'react';
import { FileSignature, Plus, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  useListClinicalNotesQuery,
  useCreateClinicalNoteMutation,
  useUpdateClinicalNoteMutation,
  useSignClinicalNoteMutation,
  type ClinicalNote,
} from './api/clinicalApi';
import { useAuth } from '../auth/useAuth';

interface Props {
  patientId: string;
}

interface SOAPDraft {
  id?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const blank: SOAPDraft = { subjective: '', objective: '', assessment: '', plan: '' };

function fromNote(n: ClinicalNote): SOAPDraft {
  return {
    id: n.id,
    subjective: n.subjective ?? '',
    objective: n.objective ?? '',
    assessment: n.assessment ?? '',
    plan: n.plan ?? '',
  };
}

export const SOAPNoteEditor: React.FC<Props> = ({ patientId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data } = useListClinicalNotesQuery({ patientId, pageSize: 50 });
  const [createNote, { isLoading: isCreating }] = useCreateClinicalNoteMutation();
  const [updateNote, { isLoading: isSaving }] = useUpdateClinicalNoteMutation();
  const [signNote, { isLoading: isSigning }] = useSignClinicalNoteMutation();

  const notes = data?.data ?? [];
  const soapNotes = notes.filter(
    (n) => n.subjective || n.objective || n.assessment || n.plan,
  );

  const [draft, setDraft] = useState<SOAPDraft | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && soapNotes.length > 0) setActiveId(soapNotes[0].id);
  }, [soapNotes, activeId]);

  const active = activeId ? soapNotes.find((n) => n.id === activeId) : null;
  const isLocked = !!active?.signedAt;

  const startNew = () => {
    setActiveId(null);
    setDraft({ ...blank });
  };

  const startEdit = () => {
    if (!active || isLocked) return;
    setDraft(fromNote(active));
  };

  const cancelDraft = () => {
    setDraft(null);
    if (soapNotes.length > 0) setActiveId(soapNotes[0].id);
  };

  const save = async () => {
    if (!draft || !user) return;
    if (draft.id) {
      await updateNote({ id: draft.id, patch: draft }).unwrap();
    } else {
      const created = await createNote({
        patientId,
        doctorId: user.id,
        subjective: draft.subjective || undefined,
        objective: draft.objective || undefined,
        assessment: draft.assessment || undefined,
        plan: draft.plan || undefined,
      }).unwrap();
      setActiveId(created.id);
    }
    setDraft(null);
  };

  const sign = async () => {
    if (!active) return;
    if (!window.confirm(t('confirmSign', 'Sign and lock this note?'))) return;
    await signNote(active.id).unwrap();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('soapNotes', 'SOAP notes')}</h3>
        <Button onClick={startNew} size="sm">
          <Plus size={14} className="mr-1" /> {t('newNote', 'New note')}
        </Button>
      </div>

      {soapNotes.length > 0 && !draft && (
        <div className="flex gap-2 flex-wrap">
          {soapNotes.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveId(n.id)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                activeId === n.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500'
                  : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
              }`}
            >
              {new Date(n.createdAt).toLocaleDateString()}
              {n.signedAt && <span className="ml-2 text-amber-500">🔒</span>}
            </button>
          ))}
        </div>
      )}

      {(draft || active) && (
        <Card className="space-y-4">
          {[
            ['subjective', t('soapSubjective', 'Subjective')],
            ['objective', t('soapObjective', 'Objective')],
            ['assessment', t('soapAssessment', 'Assessment')],
            ['plan', t('soapPlan', 'Plan')],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-bold uppercase text-surface-500 mb-1">{label}</label>
              <textarea
                value={
                  draft
                    ? (draft[key as keyof SOAPDraft] as string)
                    : (active?.[key as keyof ClinicalNote] as string) ?? ''
                }
                onChange={(e) =>
                  draft && setDraft({ ...draft, [key]: e.target.value })
                }
                disabled={!draft}
                rows={3}
                className="w-full p-3 rounded-xl border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-70 disabled:bg-surface-50 dark:disabled:bg-surface-800/50"
              />
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            {draft ? (
              <>
                <Button variant="ghost" onClick={cancelDraft}>{t('cancel', 'Cancel')}</Button>
                <Button onClick={save} isLoading={isCreating || isSaving}>
                  <Save size={14} className="mr-1" /> {t('save', 'Save')}
                </Button>
              </>
            ) : active && !isLocked ? (
              <>
                <Button variant="outline" onClick={startEdit}>{t('edit', 'Edit')}</Button>
                <Button onClick={sign} isLoading={isSigning}>
                  <FileSignature size={14} className="mr-1" /> {t('signNote', 'Sign')}
                </Button>
              </>
            ) : null}
          </div>
        </Card>
      )}

      {!draft && !active && (
        <Card className="text-sm text-surface-500 italic">
          {t('soapEmpty', 'No SOAP notes yet. Click "New note" to start.')}
        </Card>
      )}
    </div>
  );
};
