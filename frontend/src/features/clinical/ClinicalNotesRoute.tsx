// Patient-scoped clinical notes route — renders the SOAP editor.
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Topbar } from '../../components/layout/Topbar';
import { SOAPNoteEditor } from './SOAPNoteEditor';

interface Props {
  patientId: string;
  patientName?: string;
  onBack?: () => void;
}

export const ClinicalNotesRoute: React.FC<Props> = ({ patientId, onBack }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      <Topbar title={t('clinicalNotes', 'Clinical notes')}>
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ChevronLeft size={16} /> {t('back', 'Back')}
          </Button>
        )}
      </Topbar>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <SOAPNoteEditor patientId={patientId} />
        </div>
      </div>
    </div>
  );
};
