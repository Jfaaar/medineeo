
import React, { useEffect } from 'react';
import { Patient, Prescription } from '../../../types';
import { formatDate } from '../../../lib/utils';
import { useLanguage } from '../../language/LanguageContext';
import { Activity } from 'lucide-react';
import { BRAND } from '../../../lib/brand';

interface PrescriptionPrintViewProps {
  prescription: Prescription;
  patient: Patient;
  doctorName: string;
  onClose: () => void;
}

export const PrescriptionPrintView: React.FC<PrescriptionPrintViewProps> = ({
  prescription,
  patient,
  doctorName,
  onClose
}) => {
  const { language } = useLanguage();

  // Automatically trigger print dialog when mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate Age
  const age = patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : '';

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* On-screen controls (Hidden when printing) */}
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

      {/* Printable Paper Area */}
      <div className="flex-1 overflow-y-auto bg-surface-100 p-8 print:p-0 print:bg-white print:overflow-visible">
        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl print:shadow-none p-12 relative flex flex-col">
            
            {/* 1. Header */}
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
                    <p className="text-sm text-surface-600">Physician</p>
                    <p className="text-xs text-surface-500">Licence #12345</p>
                </div>
            </header>

            {/* 2. Patient Info */}
            <section className="mb-10 flex justify-between items-start text-sm border border-surface-200 rounded-lg p-4 bg-surface-50 print:bg-transparent print:border-surface-900">
                <div className="space-y-1">
                    <p><span className="font-bold text-surface-900">Patient:</span> {patient.name}</p>
                    {age && <p><span className="font-bold text-surface-900">Age:</span> {age} Years</p>}
                    <p><span className="font-bold text-surface-900">ID:</span> {patient.id.toUpperCase()}</p>
                </div>
                <div className="text-right space-y-1">
                    <p><span className="font-bold text-surface-900">Date:</span> {formatDate(new Date(prescription.date), language)}</p>
                    <p><span className="font-bold text-surface-900">Ref:</span> #{prescription.id.substring(0, 8).toUpperCase()}</p>
                </div>
            </section>

            {/* 3. Rx Body */}
            <main className="flex-1">
                <div className="text-6xl font-serif text-primary-900 mb-6 italic opacity-20 print:opacity-100">Rx</div>
                
                <ul className="space-y-8 pl-4">
                    {prescription.items.map((item, index) => (
                        <li key={index} className="relative pl-6 border-l-4 border-surface-200 print:border-surface-300">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-lg font-bold text-surface-900">{item.medicamentName}</span>
                                <span className="text-sm font-medium text-surface-700 bg-surface-100 print:bg-transparent px-2 py-0.5 rounded">
                                    {item.duration}
                                </span>
                            </div>
                            <div className="text-base text-surface-800 font-medium">
                                {item.dosage} — {item.frequency}
                            </div>
                            {item.note && (
                                <p className="text-sm text-surface-500 italic mt-1">Note: {item.note}</p>
                            )}
                        </li>
                    ))}
                </ul>

                {prescription.notes && (
                    <div className="mt-12 pt-6 border-t border-dashed border-surface-300">
                        <p className="text-sm font-bold text-surface-900 mb-1">Instructions:</p>
                        <p className="text-sm text-surface-700">{prescription.notes}</p>
                    </div>
                )}
            </main>

            {/* 4. Footer */}
            <footer className="mt-12 pt-8 flex justify-between items-end">
                <div className="text-xs text-surface-400 max-w-[200px]">
                    <p>This prescription is valid for 30 days from the date of issue unless otherwise specified.</p>
                </div>
                <div className="text-center">
                    <div className="h-20 w-48 border-b border-surface-900 mb-2"></div>
                    <p className="font-bold text-surface-900">Signature / Stamp</p>
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
          .print\\:border-surface-300 { border-color: #ccc !important; }
          .print\\:opacity-100 { opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
};
