export type Statut = 'membre' | 'invite';

export type Locale = { id: string; nom: string; ordre: number; actif: boolean };

export type EventRow = {
	id: string;
	nom: string;
	date_event: string; // YYYY-MM-DD
	lieu: string;
	actif: boolean;
	ferme_a: string | null; // ISO
	created_at: string;
};

export type OpenEvent = Pick<EventRow, 'id' | 'nom' | 'date_event' | 'lieu'>;

export type Attendee = {
	id: string;
	event_id: string;
	nom: string;
	prenom: string;
	telephone: string;
	statut: Statut;
	jci_locale_id: string | null;
	jci_autre: string | null;
	organisation: string | null;
	created_at: string;
};

export type AdminRow = { user_id: string; email: string; created_at: string };

/** Valeurs du formulaire (public et ajout manuel). */
export type FormValues = {
	nom: string;
	prenom: string;
	telephone: string;
	statut: '' | Statut;
	/** id d'une JCI locale, ou 'autre' */
	jciLocaleId: string;
	jciAutre: string;
	organisation: string;
};

export const emptyForm = (): FormValues => ({
	nom: '',
	prenom: '',
	telephone: '',
	statut: '',
	jciLocaleId: '',
	jciAutre: '',
	organisation: ''
});
