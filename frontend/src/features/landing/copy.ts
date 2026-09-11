// All marketing copy for the landing page, per language.
//
// The landing page is public — it renders before anyone signs in — so it reads
// its text from here rather than from the app's `t()` catalogue. Keeping it in
// one typed object (instead of a few hundred flat keys) means the nested
// structures — showcase tabs, pricing plans, FAQ entries — stay intact and a
// missing translation is a type error rather than a key that silently falls
// back to its English name.
//
// Structure (icons, colours, screenshot names, hrefs) lives in LandingPage.tsx.
// Only words live here.

import { BRAND } from '../../lib/brand';
import type { LanguageCode } from '../language/LanguageContext';

interface TitledItem {
  title: string;
  body: string;
}

export interface LandingCopy {
  nav: { product: string; workflow: string; security: string; pricing: string; faq: string };
  actions: {
    signIn: string;
    startFreeTrial: string;
    startFree: string;
    createAccount: string;
    contact: string;
  };
  a11y: {
    home: string;
    toggleMenu: string;
    backToTop: string;
    switchToLight: string;
    switchToDark: string;
    productModules: string;
    billingPeriod: string;
    showTestimonial: string;
    expandImage: string;
    closeImage: string;
  };
  hero: {
    badge: string;
    titleTop: string;
    titleAccent: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    bullets: [string, string, string];
    todayLabel: string;
    todayValue: string;
    lowStockLabel: string;
    lowStockValue: string;
    stats: [string, string, string, string];
  };
  trustedBy: string;
  showcase: {
    eyebrow: string;
    title: string;
    subtitle: string;
    bullets: [string, string, string];
    tabs: Record<
      'dashboard' | 'patient' | 'calendar' | 'inventory' | 'prescriptions' | 'invoices',
      { label: string; title: string; body: string; alt: string }
    >;
  };
  workflow: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: Record<'book' | 'see' | 'prescribe' | 'bill', TitledItem & { alt: string }>;
  };
  features: { eyebrow: string; title: string; items: TitledItem[] };
  audience: { eyebrow: string; title: string; subtitle: string; items: TitledItem[] };
  security: {
    eyebrow: string;
    title: string;
    body: string;
    badge: string;
    items: TitledItem[];
  };
  testimonials: { quote: string; name: string; role: string; initials: string }[];
  pricing: {
    eyebrow: string;
    title: string;
    subtitle: string;
    monthly: string;
    annual: string;
    mostPopular: string;
    plans: {
      name: string;
      blurb: string;
      cta: string;
      features: string[];
      monthlyPrice: { value: string; period: string };
      annualPrice: { value: string; period: string };
    }[];
  };
  faq: {
    eyebrow: string;
    title: string;
    subtitleBefore: string;
    subtitleAfter: string;
    items: { q: string; a: string }[];
  };
  finalCta: { title: string; body: string; primary: string; secondary: string };
  footer: {
    tagline: string;
    product: string;
    account: string;
    features: string;
    workflow: string;
    pricing: string;
    security: string;
    faq: string;
    rights: string;
  };
}

const en: LandingCopy = {
  nav: { product: 'Product', workflow: 'Workflow', security: 'Security', pricing: 'Pricing', faq: 'FAQ' },
  actions: {
    signIn: 'Sign in',
    startFreeTrial: 'Start free trial',
    startFree: 'Start free',
    createAccount: 'Create account',
    contact: 'Contact',
  },
  a11y: {
    home: `${BRAND.NAME} home`,
    toggleMenu: 'Toggle menu',
    backToTop: 'Back to top',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
    productModules: 'Product modules',
    billingPeriod: 'Billing period',
    showTestimonial: 'Show testimonial',
    expandImage: 'Enlarge screenshot',
    closeImage: 'Close',
  },
  hero: {
    badge: 'The all-in-one platform for medical clinics',
    titleTop: 'Run a modern clinic',
    titleAccent: 'without the busywork.',
    subtitle: `${BRAND.NAME} is the operating system for multi-specialty clinics — appointments, clinical records, prescriptions, billing, and stock in one secure, multi-language platform.`,
    ctaPrimary: 'Start your free trial',
    ctaSecondary: 'See it in action',
    bullets: ['No credit card', '14-day trial', 'Setup in < 1 day'],
    todayLabel: 'Today',
    todayValue: '12 appointments',
    lowStockLabel: 'Low stock',
    lowStockValue: 'Surgical gloves (M)',
    stats: ['Integrated modules', 'Languages', 'Target uptime', 'Aligned encryption'],
  },
  trustedBy: 'Trusted by clinics across Morocco and beyond',
  showcase: {
    eyebrow: 'See it in action',
    title: 'One platform. Sixteen modules. Zero context-switching.',
    subtitle: `Stop stitching together booking apps, billing tools, and paper charts. ${BRAND.NAME} ties every part of clinic operations together so your team works from a single source of truth.`,
    bullets: [
      'Role-aware permissions across the team',
      'Multi-language UI (FR · EN · AR · ES · DE)',
      'Built for desktop, tablet, and mobile',
    ],
    tabs: {
      dashboard: {
        label: 'Dashboard',
        title: 'A control room for your clinic.',
        body: 'Today’s revenue, appointments, alerts, and quick actions — a single screen the whole team starts the day with.',
        alt: 'Dashboard — revenue, appointments and cabinet alerts for the day',
      },
      patient: {
        label: 'Patients',
        title: 'Every chart in one tab.',
        body: 'Treatments, prescriptions, vitals, problems, vaccinations, billing, radiology — unified per patient with audit-grade signed notes.',
        alt: 'Patient chart — history, next visit, balance and clinical notes',
      },
      calendar: {
        label: 'Calendar',
        title: 'Smart scheduling.',
        body: 'Drag-to-reschedule, cross-staff and per-room views, conflict detection, and a glanceable monthly heatmap.',
        alt: 'Calendar — month view with confirmed and pending appointments',
      },
      inventory: {
        label: 'Inventory',
        title: 'Stock control with AMMPS sync.',
        body: 'Track every consumable, drug, and material with low-stock alerts and direct sync from the official medicament catalog.',
        alt: 'Inventory — stock levels, expiry dates and low-stock alerts',
      },
      prescriptions: {
        label: 'Prescriptions',
        title: 'Build, preview, print Rx.',
        body: 'Searchable medicaments, stock-aware dosing, live preview, and a clean branded printout in seconds.',
        alt: 'Prescription editor — searchable medicaments with stock-aware dosing',
      },
      invoices: {
        label: 'Invoices',
        title: 'Invoices, payments, claims — automated.',
        body: 'Invoice status flips automatically as payments come in. Track AR in real time and file insurance claims from the same view.',
        alt: 'Invoices — revenue trend, payment methods and invoice history',
      },
    },
  },
  workflow: {
    eyebrow: 'A day in your clinic',
    title: 'Book → See → Prescribe → Bill.',
    subtitle:
      'The four moments that define every patient visit, designed to flow into each other without leaving the platform.',
    steps: {
      book: {
        title: 'Book',
        body: 'Drag-and-drop calendar with conflict detection and patient search.',
        alt: 'New appointment — patient search and available time slots',
      },
      see: {
        title: 'See',
        body: 'Pull up the patient chart in one click — vitals, history, allergies.',
        alt: 'Patient vitals — blood pressure, heart rate and history',
      },
      prescribe: {
        title: 'Prescribe',
        body: 'Search the AMMPS catalog, build the Rx, print or share digitally.',
        alt: 'Prescription — build the Rx and print it',
      },
      bill: {
        title: 'Bill',
        body: 'Generate the invoice, take payment, file the insurance claim.',
        alt: 'Billing — invoices, payments and outstanding balance',
      },
    },
  },
  features: {
    eyebrow: 'Everything in one place',
    title: 'Every module your clinic needs.',
    items: [
      { title: 'Patient management', body: 'Unified records — demographics, history, allergies, contacts, documents.' },
      { title: 'Smart scheduling', body: 'Conflict detection, drag-to-reschedule, cross-staff and per-room views.' },
      { title: 'Clinical records', body: 'Notes, vitals, problem list, treatment history — every change auditable.' },
      { title: 'Billing & insurance', body: 'Invoices and payments with auto-status, plus claims management.' },
      { title: 'Inventory & catalog', body: 'Stock control, supplier orders, AMMPS drug catalog at your fingertips.' },
      { title: 'Treatments & Rx', body: 'Plans, quotes, e-prescriptions linked to your medicaments database.' },
    ],
  },
  audience: {
    eyebrow: 'Built for clinic teams',
    title: 'Designed for everyone in the clinic.',
    subtitle:
      'Role-aware permissions and tailored dashboards mean each person sees exactly what they need — and nothing they don’t.',
    items: [
      { title: 'Doctors', body: 'Spend more time with patients. Pull a chart in one click, sign notes from any device, prescribe in seconds.' },
      { title: 'Clinic admins', body: 'See revenue, occupancy, and stock in real time. Manage staff, roles, and clinics from one backoffice.' },
      { title: 'Assistants', body: 'Daily workflows that just work — booking, check-in, billing — built for the way clinic teams operate.' },
    ],
  },
  security: {
    eyebrow: 'Security first',
    title: 'Healthcare-grade security, by default.',
    body: `Patient data deserves more than checkbox compliance. ${BRAND.NAME} is built on principles you’d expect from a hospital information system — encryption, auditability, and clinic isolation enforced at the database layer.`,
    badge: 'Row-level security enforced at the database layer',
    items: [
      { title: 'Encrypted end-to-end', body: 'TLS in transit, AES-256 at rest. Secrets and tokens never leave your environment.' },
      { title: 'Role-based access', body: 'Granular permissions: super_admin, clinic_admin, doctor, assistant. Clinics fully isolated.' },
      { title: 'Full audit trails', body: 'Every clinical-record change is signed, timestamped, and lock-protected for compliance.' },
      { title: 'Data sovereignty', body: 'Self-hostable on your own infrastructure. Your data stays where your regulator wants it.' },
    ],
  },
  testimonials: [
    {
      quote:
        'We replaced four different tools with MediNEEO. Booking, charting, billing and stock — all in one place. Our front desk closes the day in half the time.',
      name: 'Dr. S. Bennani',
      role: 'Multi-specialty clinic, Casablanca',
      initials: 'SB',
    },
    {
      quote:
        'The patient chart is genuinely all-in-one. I can see vitals, prescriptions, and the latest invoice without leaving the page — it changed how I run consultations.',
      name: 'Dr. Y. Idrissi',
      role: 'Pediatrics, Rabat',
      initials: 'YI',
    },
    {
      quote:
        'Audit trails and role-based access were the deal-breakers for us. MediNEEO ticks every box our compliance team asked for.',
      name: 'A. El Mansouri',
      role: 'Operations Director, Marrakech',
      initials: 'AE',
    },
  ],
  pricing: {
    eyebrow: 'Simple pricing',
    title: 'One platform. Transparent plans.',
    subtitle:
      'No per-feature surprises. Pick a plan that matches your team size — upgrade only when you need to.',
    monthly: 'Monthly',
    annual: 'Annual',
    mostPopular: 'Most popular',
    plans: [
      {
        name: 'Starter',
        blurb: 'Test every feature with your team. No credit card.',
        cta: 'Start free trial',
        features: ['Up to 3 staff', '1 clinic', 'All clinical modules', 'Email support'],
        monthlyPrice: { value: 'Free', period: 'for 14 days' },
        annualPrice: { value: 'Free', period: 'for 14 days' },
      },
      {
        name: 'Clinic',
        blurb: 'For growing single-site clinics that need the full platform.',
        cta: 'Get started',
        features: ['Unlimited staff', '1 clinic', 'Insurance & claims', 'AMMPS catalog sync', 'Priority support'],
        monthlyPrice: { value: '599 DH', period: 'per month' },
        annualPrice: { value: '479 DH', period: 'per month, billed annually' },
      },
      {
        name: 'Group',
        blurb: 'Multi-clinic groups with backoffice and consolidated reporting.',
        cta: 'Talk to sales',
        features: ['Unlimited clinics', 'Super-admin backoffice', 'Cross-clinic analytics', 'Self-hosting option', 'Dedicated CSM'],
        monthlyPrice: { value: 'Custom', period: 'per month' },
        annualPrice: { value: 'Custom', period: 'per month, billed annually' },
      },
    ],
  },
  faq: {
    eyebrow: 'Questions, answered',
    title: 'Frequently asked.',
    subtitleBefore: 'Can’t find what you’re looking for? Email us at',
    subtitleAfter: '.',
    items: [
      {
        q: 'How quickly can my clinic be onboarded?',
        a: `Most clinics are live on ${BRAND.NAME} in less than a day. We import your existing patient and appointment data for you, and our team walks you through staff training during a 60-minute kickoff call.`,
      },
      {
        q: 'Is patient data stored securely?',
        a: 'Yes. All traffic is encrypted in transit (TLS 1.3) and at rest (AES-256). Row-level security is enforced at the database layer so each clinic only ever sees its own data, and every clinical-record change is audit-logged with a signed timestamp.',
      },
      {
        q: 'Can I switch from another platform?',
        a: 'Absolutely. We support imports from spreadsheets and most popular EMRs. During your free trial we’ll migrate your existing patient records, appointments, and stock for you at no extra cost.',
      },
      {
        q: 'Does it work on tablets and phones?',
        a: `${BRAND.NAME} is fully responsive. The web app runs in any modern browser — desktop, tablet, or phone — and the vitals, treatment history, and prescription editor are all touch-optimized.`,
      },
      {
        q: 'Can I self-host?',
        a: 'Yes. The Group plan includes a self-hosting option for clinics with strict data-sovereignty requirements. Our team helps you provision and stays on call for upgrades.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to modernize your clinic?',
    body: 'Get your team onboarded in less than a day. We’ll migrate your patient records for you.',
    primary: 'Start free trial',
    secondary: 'Sign in',
  },
  footer: {
    tagline: 'The operating system for modern medical clinics.',
    product: 'Product',
    account: 'Account',
    features: 'Features',
    workflow: 'Workflow',
    pricing: 'Pricing',
    security: 'Security',
    faq: 'FAQ',
    rights: 'All rights reserved.',
  },
};

const fr: LandingCopy = {
  nav: { product: 'Produit', workflow: 'Parcours', security: 'Sécurité', pricing: 'Tarifs', faq: 'FAQ' },
  actions: {
    signIn: 'Se connecter',
    startFreeTrial: 'Essai gratuit',
    startFree: 'Commencer',
    createAccount: 'Créer un compte',
    contact: 'Contact',
  },
  a11y: {
    home: `Accueil ${BRAND.NAME}`,
    toggleMenu: 'Ouvrir le menu',
    backToTop: 'Retour en haut',
    switchToLight: 'Passer en mode clair',
    switchToDark: 'Passer en mode sombre',
    productModules: 'Modules du produit',
    billingPeriod: 'Période de facturation',
    showTestimonial: 'Afficher le témoignage',
    expandImage: 'Agrandir la capture',
    closeImage: 'Fermer',
  },
  hero: {
    badge: 'La plateforme tout-en-un des cabinets médicaux',
    titleTop: 'Gérez un cabinet moderne',
    titleAccent: 'sans la paperasse.',
    subtitle: `${BRAND.NAME} est le système d’exploitation des cabinets pluridisciplinaires — rendez-vous, dossiers cliniques, ordonnances, facturation et stock réunis dans une plateforme sécurisée et multilingue.`,
    ctaPrimary: 'Démarrer l’essai gratuit',
    ctaSecondary: 'Voir la démo',
    bullets: ['Sans carte bancaire', 'Essai de 14 jours', 'Installation en moins d’un jour'],
    todayLabel: "Aujourd'hui",
    todayValue: '12 rendez-vous',
    lowStockLabel: 'Stock faible',
    lowStockValue: 'Gants chirurgicaux (M)',
    stats: ['Modules intégrés', 'Langues', 'Disponibilité visée', 'Chiffrement conforme'],
  },
  trustedBy: 'La confiance des cabinets au Maroc et au-delà',
  showcase: {
    eyebrow: 'Voir la démo',
    title: 'Une plateforme. Seize modules. Zéro va-et-vient.',
    subtitle: `Fini les outils de réservation, les logiciels de facturation et les dossiers papier bricolés ensemble. ${BRAND.NAME} relie chaque partie de l’activité du cabinet pour que votre équipe travaille à partir d’une source unique de vérité.`,
    bullets: [
      'Permissions adaptées au rôle de chacun',
      'Interface multilingue (FR · EN · AR · ES · DE)',
      'Conçu pour ordinateur, tablette et mobile',
    ],
    tabs: {
      dashboard: {
        label: 'Tableau de bord',
        title: 'La tour de contrôle de votre cabinet.',
        body: 'Recettes du jour, rendez-vous, alertes et actions rapides — un seul écran avec lequel toute l’équipe commence la journée.',
        alt: 'Tableau de bord — recettes, rendez-vous et alertes cabinet du jour',
      },
      patient: {
        label: 'Patients',
        title: 'Tout le dossier dans un seul onglet.',
        body: 'Soins, ordonnances, constantes, problèmes, vaccinations, facturation, radiologie — réunis par patient, avec des notes signées et traçables.',
        alt: 'Dossier patient — historique, prochaine visite, solde et notes cliniques',
      },
      calendar: {
        label: 'Agenda',
        title: 'Une planification intelligente.',
        body: 'Replanification par glisser-déposer, vues par praticien et par salle, détection des conflits et vue mensuelle en un coup d’œil.',
        alt: 'Agenda — vue mensuelle avec rendez-vous confirmés et en attente',
      },
      inventory: {
        label: 'Stock',
        title: 'Un stock maîtrisé, synchronisé avec l’AMMPS.',
        body: 'Suivez chaque consommable, médicament et matériau, avec alertes de stock faible et synchronisation directe du catalogue officiel des médicaments.',
        alt: 'Stock — niveaux, dates de péremption et alertes de stock faible',
      },
      prescriptions: {
        label: 'Ordonnances',
        title: 'Rédigez, prévisualisez, imprimez.',
        body: 'Médicaments recherchables, posologies tenant compte du stock, aperçu en direct et impression soignée à votre en-tête en quelques secondes.',
        alt: 'Éditeur d’ordonnance — recherche de médicaments et posologie liée au stock',
      },
      invoices: {
        label: 'Factures',
        title: 'Factures, paiements, remboursements — automatisés.',
        body: 'Le statut d’une facture change tout seul dès qu’un paiement arrive. Suivez vos impayés en temps réel et déposez vos demandes de remboursement depuis le même écran.',
        alt: 'Factures — tendance des revenus, modes de paiement et historique',
      },
    },
  },
  workflow: {
    eyebrow: 'Une journée dans votre cabinet',
    title: 'Planifier → Consulter → Prescrire → Facturer.',
    subtitle:
      'Les quatre moments qui rythment chaque visite, pensés pour s’enchaîner sans jamais quitter la plateforme.',
    steps: {
      book: {
        title: 'Planifier',
        body: 'Agenda en glisser-déposer, avec détection des conflits et recherche de patient.',
        alt: 'Nouveau rendez-vous — recherche du patient et créneaux disponibles',
      },
      see: {
        title: 'Consulter',
        body: 'Ouvrez le dossier du patient en un clic — constantes, historique, allergies.',
        alt: 'Constantes du patient — tension, fréquence cardiaque et historique',
      },
      prescribe: {
        title: 'Prescrire',
        body: 'Cherchez dans le catalogue AMMPS, composez l’ordonnance, imprimez ou partagez.',
        alt: 'Ordonnance — composez l’ordonnance et imprimez-la',
      },
      bill: {
        title: 'Facturer',
        body: 'Générez la facture, encaissez le paiement, déposez la demande de remboursement.',
        alt: 'Facturation — factures, paiements et solde dû',
      },
    },
  },
  features: {
    eyebrow: 'Tout au même endroit',
    title: 'Tous les modules dont votre cabinet a besoin.',
    items: [
      { title: 'Gestion des patients', body: 'Dossiers unifiés — état civil, antécédents, allergies, contacts, documents.' },
      { title: 'Planification intelligente', body: 'Détection des conflits, replanification par glisser-déposer, vues par praticien et par salle.' },
      { title: 'Dossiers cliniques', body: 'Notes, constantes, liste des problèmes, historique des soins — chaque modification est traçable.' },
      { title: 'Facturation & assurance', body: 'Factures et paiements au statut automatique, et gestion des remboursements.' },
      { title: 'Stock & catalogue', body: 'Gestion du stock, commandes fournisseurs et catalogue AMMPS à portée de main.' },
      { title: 'Soins & ordonnances', body: 'Plans de traitement, devis et ordonnances reliés à votre base de médicaments.' },
    ],
  },
  audience: {
    eyebrow: 'Pensé pour les équipes de cabinet',
    title: 'Conçu pour chacun, au cabinet.',
    subtitle:
      'Des permissions selon le rôle et des tableaux de bord sur mesure : chacun voit exactement ce dont il a besoin — et rien d’autre.',
    items: [
      { title: 'Praticiens', body: 'Passez plus de temps avec vos patients. Ouvrez un dossier en un clic, signez vos notes depuis n’importe quel appareil, prescrivez en quelques secondes.' },
      { title: 'Administrateurs', body: 'Suivez recettes, taux d’occupation et stock en temps réel. Gérez équipes, rôles et cabinets depuis un seul backoffice.' },
      { title: 'Assistant(e)s', body: 'Des tâches quotidiennes qui fonctionnent — réservation, accueil, facturation — pensées pour la réalité du cabinet.' },
    ],
  },
  security: {
    eyebrow: 'La sécurité d’abord',
    title: 'Une sécurité de niveau hospitalier, par défaut.',
    body: `Les données de santé méritent mieux qu’une conformité de façade. ${BRAND.NAME} repose sur les principes que l’on attend d’un système d’information hospitalier — chiffrement, traçabilité et cloisonnement des cabinets appliqué au niveau de la base de données.`,
    badge: 'Sécurité au niveau des lignes, appliquée dans la base de données',
    items: [
      { title: 'Chiffrement de bout en bout', body: 'TLS en transit, AES-256 au repos. Vos secrets et jetons ne quittent jamais votre environnement.' },
      { title: 'Accès selon le rôle', body: 'Permissions fines : super_admin, clinic_admin, praticien, assistant(e). Cabinets totalement cloisonnés.' },
      { title: 'Traçabilité complète', body: 'Chaque modification d’un dossier clinique est signée, horodatée et verrouillée à des fins de conformité.' },
      { title: 'Souveraineté des données', body: 'Hébergement possible sur votre propre infrastructure. Vos données restent là où votre régulateur l’exige.' },
    ],
  },
  testimonials: [
    {
      quote:
        'Nous avons remplacé quatre outils par MediNEEO. Rendez-vous, dossiers, facturation et stock — tout au même endroit. Notre accueil boucle la journée deux fois plus vite.',
      name: 'Dr S. Bennani',
      role: 'Cabinet pluridisciplinaire, Casablanca',
      initials: 'SB',
    },
    {
      quote:
        'Le dossier patient est vraiment tout-en-un. Je vois les constantes, les ordonnances et la dernière facture sans quitter la page — cela a changé ma façon de consulter.',
      name: 'Dr Y. Idrissi',
      role: 'Pédiatrie, Rabat',
      initials: 'YI',
    },
    {
      quote:
        'La traçabilité et la gestion des rôles ont été décisives pour nous. MediNEEO coche toutes les cases exigées par notre équipe conformité.',
      name: 'A. El Mansouri',
      role: 'Directrice des opérations, Marrakech',
      initials: 'AE',
    },
  ],
  pricing: {
    eyebrow: 'Des tarifs simples',
    title: 'Une plateforme. Des offres claires.',
    subtitle:
      'Aucune mauvaise surprise à la fonctionnalité. Choisissez l’offre adaptée à la taille de votre équipe — et changez seulement quand vous en avez besoin.',
    monthly: 'Mensuel',
    annual: 'Annuel',
    mostPopular: 'Le plus choisi',
    plans: [
      {
        name: 'Découverte',
        blurb: 'Testez toutes les fonctionnalités avec votre équipe. Sans carte bancaire.',
        cta: 'Essai gratuit',
        features: ["Jusqu'à 3 collaborateurs", '1 cabinet', 'Tous les modules cliniques', 'Support par e-mail'],
        monthlyPrice: { value: 'Gratuit', period: 'pendant 14 jours' },
        annualPrice: { value: 'Gratuit', period: 'pendant 14 jours' },
      },
      {
        name: 'Cabinet',
        blurb: 'Pour les cabinets mono-site en croissance qui veulent toute la plateforme.',
        cta: 'Commencer',
        features: ['Collaborateurs illimités', '1 cabinet', 'Assurance & remboursements', 'Synchronisation AMMPS', 'Support prioritaire'],
        monthlyPrice: { value: '599 DH', period: 'par mois' },
        annualPrice: { value: '479 DH', period: 'par mois, facturé annuellement' },
      },
      {
        name: 'Groupe',
        blurb: 'Groupes multi-cabinets, avec backoffice et reporting consolidé.',
        cta: 'Parler à un conseiller',
        features: ['Cabinets illimités', 'Backoffice super-admin', 'Analyses inter-cabinets', 'Option d’auto-hébergement', 'Chargé de compte dédié'],
        monthlyPrice: { value: 'Sur mesure', period: 'par mois' },
        annualPrice: { value: 'Sur mesure', period: 'par mois, facturé annuellement' },
      },
    ],
  },
  faq: {
    eyebrow: 'Vos questions, nos réponses',
    title: 'Questions fréquentes.',
    subtitleBefore: 'Vous ne trouvez pas votre réponse ? Écrivez-nous à',
    subtitleAfter: '.',
    items: [
      {
        q: 'En combien de temps mon cabinet peut-il démarrer ?',
        a: `La plupart des cabinets sont opérationnels sur ${BRAND.NAME} en moins d’une journée. Nous importons pour vous vos patients et vos rendez-vous existants, et notre équipe forme la vôtre lors d’un appel de lancement de 60 minutes.`,
      },
      {
        q: 'Les données des patients sont-elles bien sécurisées ?',
        a: 'Oui. Tout le trafic est chiffré en transit (TLS 1.3) et au repos (AES-256). La sécurité au niveau des lignes est appliquée dans la base de données : chaque cabinet ne voit que ses propres données, et chaque modification d’un dossier clinique est journalisée avec un horodatage signé.',
      },
      {
        q: 'Puis-je migrer depuis une autre plateforme ?',
        a: 'Bien sûr. Nous prenons en charge les imports depuis des tableurs et depuis la plupart des logiciels médicaux du marché. Pendant votre essai gratuit, nous migrons vos dossiers patients, vos rendez-vous et votre stock, sans frais supplémentaires.',
      },
      {
        q: 'Est-ce que cela fonctionne sur tablette et sur mobile ?',
        a: `${BRAND.NAME} est entièrement responsive. L’application web fonctionne dans tout navigateur moderne — ordinateur, tablette ou téléphone — et les constantes, l’historique des soins et l’éditeur d’ordonnance sont optimisés pour le tactile.`,
      },
      {
        q: 'Puis-je héberger la solution moi-même ?',
        a: 'Oui. L’offre Groupe inclut une option d’auto-hébergement pour les cabinets soumis à des exigences strictes de souveraineté des données. Notre équipe vous accompagne à l’installation et reste disponible pour les mises à jour.',
      },
    ],
  },
  finalCta: {
    title: 'Prêt à moderniser votre cabinet ?',
    body: 'Votre équipe est opérationnelle en moins d’une journée. Nous migrons vos dossiers patients pour vous.',
    primary: 'Essai gratuit',
    secondary: 'Se connecter',
  },
  footer: {
    tagline: 'Le système d’exploitation des cabinets médicaux modernes.',
    product: 'Produit',
    account: 'Compte',
    features: 'Fonctionnalités',
    workflow: 'Parcours',
    pricing: 'Tarifs',
    security: 'Sécurité',
    faq: 'FAQ',
    rights: 'Tous droits réservés.',
  },
};

// Only the languages the landing switcher offers are translated. Anything else
// (a visitor whose app language is es/it) falls back to English rather than
// rendering a half-translated page.
const LANDING_COPY: Partial<Record<LanguageCode, LandingCopy>> = { en, fr };

export const getLandingCopy = (language: LanguageCode): LandingCopy =>
  LANDING_COPY[language] ?? en;
