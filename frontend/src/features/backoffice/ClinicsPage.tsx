import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Topbar } from '../../components/layout/Topbar';
import { Building2, Plus, MapPin, Phone, Mail, Calendar, Loader2, Users } from 'lucide-react';
// Backoffice pages currently rely on auth-provider-dependent endpoints
// that are stubbed (501) post-Supabase. Helper kept as a placeholder that
// reads the demo session token from localStorage; rewire when the new
// auth provider lands.
import { API_BASE_URL as API_URL } from '../../lib/apiBase';

interface Clinic {
    id: string;
    name: string;
    email: string;
    address?: string;
    phone?: string;
    subscription_status: string;
    created_at: string;
}

export const ClinicsPage: React.FC = () => {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminName, setAdminName] = useState('');

    const getAccessToken = async () => {
        try {
            return localStorage.getItem('medineeo_access_token');
        } catch {
            return null;
        }
    };

    const fetchClinics = async () => {
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/api/admin/clinics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to fetch clinics');
            }

            const data = await response.json();
            setClinics(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClinics();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const token = await getAccessToken();
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_URL}/api/admin/clinics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, address, phone, adminEmail, adminName })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create clinic');
            }

            setClinics(prev => [data.clinic, ...prev]);
            setName('');
            setAddress('');
            setPhone('');
            setAdminEmail('');
            setAdminName('');
            setShowForm(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    return (
        <>
            <Topbar title="Clinic Management" />
            <div className="p-6 space-y-6 animate-in fade-in duration-500">
                {/* Header with Add Button */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Clinics</h1>
                        <p className="text-surface-500 mt-1">Manage clinics and their administrators</p>
                    </div>
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus size={16} className="mr-2" />
                        Add Clinic
                    </Button>
                </div>

                {/* Add Clinic Form */}
                {showForm && (
                    <Card className="p-6 border-surface-200 dark:border-surface-700 border-2 border-primary-500/30">
                        <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building2 size={20} className="text-primary-600" />
                            Create New Clinic
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Clinic Name *" required value={name}
                                    onChange={(e) => setName(e.target.value)} placeholder="Riverside Medical Center" />
                                <Input label="Phone" value={phone}
                                    onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
                            </div>
                            <Input label="Address" value={address}
                                onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" />

                            <div className="border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
                                <h3 className="font-medium text-surface-700 dark:text-surface-300 mb-3">
                                    Clinic Administrator
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Admin Email *" type="email" required value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@clinic.com" />
                                    <Input label="Admin Name" value={adminName}
                                        onChange={(e) => setAdminName(e.target.value)} placeholder="John Smith" />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? <><Loader2 size={16} className="animate-spin mr-2" /> Creating...</>
                                        : <><Plus size={16} className="mr-2" /> Create Clinic</>}
                                </Button>
                                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                    </Card>
                )}

                {/* Clinics List */}
                {loading ? (
                    <div className="p-8 text-center text-surface-500">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                        Loading clinics...
                    </div>
                ) : clinics.length === 0 ? (
                    <Card className="p-12 text-center border-surface-200 dark:border-surface-700">
                        <Building2 size={48} className="mx-auto text-surface-300 mb-4" />
                        <h3 className="text-lg font-medium text-surface-700 dark:text-surface-300">No clinics yet</h3>
                        <p className="text-surface-500 mt-1">Create your first clinic to get started</p>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {clinics.map((clinic) => (
                            <Card key={clinic.id} className="p-5 border-surface-200 dark:border-surface-700 hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                            <Building2 size={24} className="text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-surface-900 dark:text-white">{clinic.name}</h3>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clinic.subscription_status === 'active'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                {clinic.subscription_status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-400">
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} />
                                        <span className="truncate">{clinic.email}</span>
                                    </div>
                                    {clinic.address && (
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} />
                                            <span className="truncate">{clinic.address}</span>
                                        </div>
                                    )}
                                    {clinic.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} />
                                            <span>{clinic.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} />
                                        <span>Created {formatDate(clinic.created_at)}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 flex gap-2">
                                    <Button variant="secondary" size="sm" className="flex-1">
                                        <Users size={14} className="mr-1" /> Staff
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};
