

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Prescription, PrescriptionItem } from '../../types';
import { useLanguage } from '../language/LanguageContext';
import { Search, Plus, Trash2, Printer, Pill } from 'lucide-react';
import { medicamentsCatalogService, type CatalogMedicament } from '../../lib/services/medicamentsCatalog';
import { cn } from '../../lib/utils';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSubmit: (data: Omit<Prescription, 'id'>) => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  patientId,
  onSubmit
}) => {
  const { t } = useLanguage();
  const [results, setResults] = useState<CatalogMedicament[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [notes, setNotes] = useState('');

  // Item Form State
  const [selectedDrug, setSelectedDrug] = useState<CatalogMedicament | null>(null);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [itemNote, setItemNote] = useState('');

  useEffect(() => {
      if (isOpen) {
          setItems([]);
          setNotes('');
          resetItemForm();
      }
  }, [isOpen]);

  // Debounced server-side search against the full medicaments catalog
  // (~9800 reference drugs), not just the clinic's own stocked inventory.
  useEffect(() => {
      if (!isOpen) return;
      let active = true;
      const handle = setTimeout(() => {
          medicamentsCatalogService
              .list({ search: searchQuery.trim() || undefined, pageSize: 15 })
              .then(res => { if (active) setResults(res.data); })
              .catch(() => { if (active) setResults([]); });
      }, 250);
      return () => { active = false; clearTimeout(handle); };
  }, [isOpen, searchQuery]);

  const resetItemForm = () => {
      setSelectedDrug(null);
      setSearchQuery('');
      setDosage('');
      setFrequency('');
      setDuration('');
      setItemNote('');
  };

  const selectDrug = (drug: CatalogMedicament) => {
      setSelectedDrug(drug);
      setDosage(drug.dosage || '');
      // Don't clear search query, keeps context
  };

  const addItem = () => {
      if (!selectedDrug) return;
      const newItem: PrescriptionItem = {
          medicamentName: selectedDrug.specialite,
          dosage,
          frequency,
          duration,
          note: itemNote
      };
      setItems([...items, newItem]);
      resetItemForm();
  };

  const removeItem = (index: number) => {
      setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
      onSubmit({
          patientId,
          date: new Date().toISOString(),
          items,
          notes
      });
      onClose();
  };

  const quickDosages = ['500mg', '1g', '1 Tablet', '5ml'];
  const quickFreq = ['1x / day', '2x / day', '3x / day', 'Before meal'];
  const quickDur = ['3 days', '5 days', '7 days', '1 month'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('createPrescription')}
      maxWidth="5xl"
    >
      <div className="flex h-[70vh] divide-x divide-surface-200 dark:divide-surface-700 overflow-hidden -mx-6 -mb-6">
         
         {/* COLUMN 1: DRUG SELECTION */}
         <div className="w-1/4 flex flex-col bg-surface-50 dark:bg-surface-800/50">
             <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 sticky top-0 z-10">
                 <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                     <input 
                        type="text" 
                        placeholder={t('search') + "..."}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                     />
                 </div>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                 {results.length === 0 && (
                     <div className="text-xs italic text-surface-400 p-2">—</div>
                 )}
                 {results.map(drug => (
                        <div
                            key={drug.id}
                            className={cn(
                                "p-3 rounded-lg cursor-pointer transition-all border",
                                selectedDrug?.id === drug.id
                                    ? "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 ring-1 ring-primary-500"
                                    : "bg-white dark:bg-surface-800 border-transparent hover:border-surface-200 dark:hover:border-surface-700 hover:shadow-sm"
                            )}
                            onClick={() => selectDrug(drug)}
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-sm text-surface-900 dark:text-white line-clamp-1">{drug.specialite}</span>
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-surface-500">
                                <span>{[drug.dosage, drug.forme].filter(Boolean).join(' · ') || '—'}</span>
                                {drug.laboratoire && <span className="line-clamp-1">{drug.laboratoire}</span>}
                            </div>
                        </div>
                 ))}
             </div>
         </div>

         {/* COLUMN 2: CONFIGURATION */}
         <div className="w-1/3 flex flex-col p-6 bg-white dark:bg-surface-900 overflow-y-auto">
             {!selectedDrug ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-surface-400 text-center opacity-60">
                     <div className="w-16 h-16 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mb-4">
                        <Pill size={32} />
                     </div>
                     <p>Select a medicament from the list to configure dosage.</p>
                 </div>
             ) : (
                 <div className="space-y-5 animate-fade-in">
                     <div>
                         <h3 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
                             {selectedDrug.specialite}
                             {selectedDrug.forme && (
                                 <span className="text-xs font-normal bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500">{selectedDrug.forme}</span>
                             )}
                         </h3>
                         {selectedDrug.laboratoire && (
                             <div className="text-xs text-surface-500 mt-1">{selectedDrug.laboratoire}</div>
                         )}
                     </div>

                     <div className="space-y-4">
                         {/* Dosage */}
                         <div className="space-y-2">
                             <label className="text-xs font-bold text-surface-500 uppercase">{t('dosage')}</label>
                             <Input 
                                placeholder="e.g. 500mg"
                                value={dosage}
                                onChange={e => setDosage(e.target.value)}
                             />
                             <div className="flex flex-wrap gap-2">
                                 {quickDosages.map(d => (
                                     <button key={d} onClick={() => setDosage(d)} className="px-2 py-1 text-xs bg-surface-100 dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded border border-surface-200 dark:border-surface-700 transition-colors">
                                         {d}
                                     </button>
                                 ))}
                             </div>
                         </div>

                         {/* Frequency */}
                         <div className="space-y-2">
                             <label className="text-xs font-bold text-surface-500 uppercase">{t('frequency')}</label>
                             <Input 
                                placeholder="e.g. 2 times a day"
                                value={frequency}
                                onChange={e => setFrequency(e.target.value)}
                             />
                             <div className="flex flex-wrap gap-2">
                                 {quickFreq.map(f => (
                                     <button key={f} onClick={() => setFrequency(f)} className="px-2 py-1 text-xs bg-surface-100 dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded border border-surface-200 dark:border-surface-700 transition-colors">
                                         {f}
                                     </button>
                                 ))}
                             </div>
                         </div>

                         {/* Duration */}
                         <div className="space-y-2">
                             <label className="text-xs font-bold text-surface-500 uppercase">{t('duration')}</label>
                             <Input 
                                placeholder="e.g. 5 days"
                                value={duration}
                                onChange={e => setDuration(e.target.value)}
                             />
                             <div className="flex flex-wrap gap-2">
                                 {quickDur.map(d => (
                                     <button key={d} onClick={() => setDuration(d)} className="px-2 py-1 text-xs bg-surface-100 dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded border border-surface-200 dark:border-surface-700 transition-colors">
                                         {d}
                                     </button>
                                 ))}
                             </div>
                         </div>
                         
                         {/* Note */}
                         <Input 
                            label="Instructions (Optional)"
                            placeholder="e.g. Take after meal"
                            value={itemNote}
                            onChange={e => setItemNote(e.target.value)}
                         />
                     </div>

                     <div className="pt-4 border-t border-surface-100 dark:border-surface-800">
                         <Button onClick={addItem} className="w-full gap-2">
                             <Plus size={18} /> Add to Prescription
                         </Button>
                     </div>
                 </div>
             )}
         </div>

         {/* COLUMN 3: PREVIEW & SAVE */}
         <div className="flex-1 flex flex-col bg-surface-50 dark:bg-surface-800/30">
             <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
                 <h4 className="font-bold text-surface-900 dark:text-white uppercase tracking-wide text-xs flex items-center gap-2">
                     <Printer size={14} className="text-primary-500"/> Prescription Preview
                 </h4>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                 {items.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-surface-400 text-sm italic">
                         <div className="w-12 h-12 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg flex items-center justify-center mb-2">
                             0
                         </div>
                         No items added yet.
                     </div>
                 ) : (
                     items.map((item, idx) => (
                         <div key={idx} className="group bg-white dark:bg-surface-800 p-4 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm relative hover:border-primary-300 transition-colors">
                             <button 
                                onClick={() => removeItem(idx)}
                                className="absolute top-2 right-2 p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                             >
                                 <Trash2 size={16} />
                             </button>
                             <div className="pr-8">
                                 <h5 className="font-bold text-surface-900 dark:text-white">{item.medicamentName}</h5>
                                 <div className="flex flex-wrap gap-2 mt-2 text-sm text-surface-600 dark:text-surface-400">
                                     <span className="bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded text-xs font-medium">{item.dosage}</span>
                                     <span className="text-surface-300">•</span>
                                     <span>{item.frequency}</span>
                                     <span className="text-surface-300">•</span>
                                     <span>{item.duration}</span>
                                 </div>
                                 {item.note && (
                                     <p className="text-xs text-surface-500 italic mt-2 border-l-2 border-surface-300 pl-2">
                                         "{item.note}"
                                     </p>
                                 )}
                             </div>
                         </div>
                     ))
                 )}
             </div>

             <div className="p-4 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700">
                 <textarea 
                    className="w-full p-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px] resize-none mb-4"
                    placeholder="General notes for pharmacist (Optional)..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                 />
                 <div className="flex gap-3">
                     <Button variant="ghost" onClick={onClose} className="flex-1">{t('cancel')}</Button>
                     <Button onClick={handleSubmit} disabled={items.length === 0} className="flex-[2]">
                         Save Prescription
                     </Button>
                 </div>
             </div>
         </div>
      </div>
    </Modal>
  );
};