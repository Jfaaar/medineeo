
import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Treatment, InventoryItem, ConsumedMaterial } from '../../../types';
import { useLanguage } from '../../../features/language/LanguageContext';
import { Package, Plus, Trash2, Search } from 'lucide-react';
import { api } from '../../../lib/api';

interface TreatmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Treatment, 'id' | 'patientId'>) => void;
}

export const TreatmentFormModal: React.FC<TreatmentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { t } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<'planned' | 'completed'>('completed');
  
  // Materials Logic
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [materialsUsed, setMaterialsUsed] = useState<ConsumedMaterial[]>([]);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
        setDescription('');
        setMaterialsUsed([]);

        // Fetch inventory for consumables selection
        api.inventory.list().then(items => {
            // Filter to show primarily consumables and medicaments
            setInventory(items.filter(i => i.type === 'consumable' || i.type === 'medicament'));
        });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !price) return;

    onSubmit({
        date: new Date(date).toISOString(),
        description,
        price: parseFloat(price),
        status,
        materialsUsed
    });
    onClose();
    // Reset form
    setDescription('');
    setPrice('');
    setMaterialsUsed([]);
  };

  const addMaterial = (item: InventoryItem) => {
      setMaterialsUsed(prev => {
          const existing = prev.find(m => m.itemId === item.id);
          if (existing) {
              return prev.map(m => m.itemId === item.id ? { ...m, quantity: m.quantity + 1 } : m);
          }
          return [...prev, { itemId: item.id, itemName: item.name, quantity: 1 }];
      });
      setShowMaterialSearch(false);
      setMaterialSearchQuery('');
  };

  const removeMaterial = (itemId: string) => {
      setMaterialsUsed(prev => prev.filter(m => m.itemId !== itemId));
  };

  const updateMaterialQuantity = (itemId: string, qty: number) => {
      if (qty <= 0) {
          removeMaterial(itemId);
          return;
      }
      setMaterialsUsed(prev => prev.map(m => m.itemId === itemId ? { ...m, quantity: qty } : m));
  };

  const filteredInventory = inventory.filter(i => 
      i.name.toLowerCase().includes(materialSearchQuery.toLowerCase()) && i.stock > 0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('addTreatment')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
            <Input 
                type="date" 
                label={t('date')} 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                required
            />
            
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                    {t('status')}
                </label>
                <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-lg h-10">
                    <button
                        type="button"
                        onClick={() => setStatus('planned')}
                        className={`flex-1 text-xs font-medium rounded-md transition-all ${status === 'planned' ? 'bg-white shadow-sm text-blue-600' : 'text-surface-500'}`}
                    >
                        {t('status_planned')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus('completed')}
                        className={`flex-1 text-xs font-medium rounded-md transition-all ${status === 'completed' ? 'bg-white shadow-sm text-green-600' : 'text-surface-500'}`}
                    >
                        {t('status_completed')}
                    </button>
                </div>
            </div>
        </div>
        
        <div className="flex gap-4">
            <div className="flex-1">
                 <Input
                    label={t('price')}
                    placeholder="0.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    required
                    type="number"
                />
            </div>
        </div>

        <Input
            label={t('actDescription')} 
            placeholder="e.g. Physical therapy session" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            autoFocus
            required
        />

        {/* Material Consumption Section */}
        {status === 'completed' && (
            <div className="border-t border-surface-100 dark:border-surface-700 pt-4">
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Package size={14} /> Materials Consumed
                </label>
                
                <div className="space-y-2 mb-3">
                    {materialsUsed.map(mat => (
                        <div key={mat.itemId} className="flex items-center justify-between bg-surface-50 dark:bg-surface-800 p-2 rounded-lg border border-surface-200 dark:border-surface-700">
                            <span className="text-sm font-medium text-surface-900 dark:text-white">{mat.itemName}</span>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => updateMaterialQuantity(mat.itemId, mat.quantity - 1)}
                                        className="w-6 h-6 rounded bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 flex items-center justify-center hover:bg-surface-100"
                                    >
                                        -
                                    </button>
                                    <span className="text-sm font-bold w-4 text-center">{mat.quantity}</span>
                                    <button 
                                        type="button"
                                        onClick={() => updateMaterialQuantity(mat.itemId, mat.quantity + 1)}
                                        className="w-6 h-6 rounded bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 flex items-center justify-center hover:bg-surface-100"
                                    >
                                        +
                                    </button>
                                </div>
                                <button type="button" onClick={() => removeMaterial(mat.itemId)} className="text-surface-400 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="relative">
                    {!showMaterialSearch ? (
                        <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm" 
                            className="w-full border-dashed border-surface-300 dark:border-surface-600"
                            onClick={() => setShowMaterialSearch(true)}
                        >
                            <Plus size={16} className="mr-2"/> Add Material / Item
                        </Button>
                    ) : (
                        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg z-10 p-2 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 mb-2 bg-surface-50 dark:bg-surface-900 rounded-lg px-3 py-2">
                                <Search size={14} className="text-surface-400"/>
                                <input 
                                    type="text"
                                    placeholder="Search inventory..."
                                    className="bg-transparent text-sm w-full focus:outline-none"
                                    value={materialSearchQuery}
                                    onChange={e => setMaterialSearchQuery(e.target.value)}
                                    autoFocus
                                />
                                <button type="button" onClick={() => setShowMaterialSearch(false)} className="text-xs text-surface-400">Esc</button>
                            </div>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                                {filteredInventory.map(item => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => addMaterial(item)}
                                        className="w-full text-left px-3 py-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg text-sm flex justify-between items-center group"
                                    >
                                        <span className="text-surface-900 dark:text-white">{item.name}</span>
                                        <span className="text-xs text-surface-500 group-hover:text-primary-600">Stock: {item.stock}</span>
                                    </button>
                                ))}
                                {filteredInventory.length === 0 && (
                                    <div className="text-center text-xs text-surface-400 py-2">No items found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
            <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit">{t('saveTreatment')}</Button>
        </div>
      </form>
    </Modal>
  );
};
