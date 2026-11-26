import type { FormValues } from './types';

export type FieldKey = 'nom' | 'prenom' | 'telephone' | 'statut' | 'jciLocaleId' | 'jciAutre' | 'organisation';
export type FormErrors = Partial<Record<FieldKey, string>>;

/** Ordre d'affichage : sert à placer le curseur sur la première erreur. */
const ORDER: FieldKey[] = ['nom', 'prenom', 'telephone', 'statut', 'jciLocaleId', 'jciAutre', 'organisation'];

/** Nombre de chiffres d'un numéro saisi (espaces, +, points ignorés). */
const digits = (s: string) => s.replace(/\D/g, '').length;

/** Erreurs par champ, en français. Objet vide = formulaire valide. */
export function validateForm(v: FormValues): FormErrors {
	const e: FormErrors = {};
	if (!v.nom.trim()) e.nom = 'Saisissez votre nom.';
	if (!v.prenom.trim()) e.prenom = 'Saisissez votre prénom.';
	if (digits(v.telephone) < 8) e.telephone = 'Saisissez un numéro de téléphone valide (8 chiffres ou plus).';
	if (!v.statut) e.statut = 'Choisissez Membre JCI ou Invité.';
	if (v.statut === 'membre') {
		if (!v.jciLocaleId) e.jciLocaleId = 'Choisissez votre JCI locale.';
		else if (v.jciLocaleId === 'autre' && !v.jciAutre.trim()) e.jciAutre = 'Indiquez le nom de votre JCI locale.';
	}
	if (v.statut === 'invite' && !v.organisation.trim()) e.organisation = 'Indiquez votre organisation.';
	return e;
}

export const firstError = (e: FormErrors): FieldKey | null => ORDER.find((k) => e[k]) ?? null;

/** Arguments de la fonction SQL presence.register(). */
export function toRpcArgs(eventId: string, v: FormValues) {
	const membre = v.statut === 'membre';
	const autre = membre && v.jciLocaleId === 'autre';
	return {
		p_event_id: eventId,
		p_nom: v.nom.trim(),
		p_prenom: v.prenom.trim(),
		p_telephone: v.telephone.trim(),
		p_statut: v.statut,
		p_jci_locale_id: membre && !autre ? v.jciLocaleId : null,
		p_jci_autre: autre ? v.jciAutre.trim() : null,
		p_organisation: !membre ? v.organisation.trim() : null
	};
}

/** Ligne à insérer directement dans presence.attendees (ajout manuel par un admin). */
export function toRow(eventId: string, v: FormValues) {
	const membre = v.statut === 'membre';
	const autre = membre && v.jciLocaleId === 'autre';
	return {
		event_id: eventId,
		nom: v.nom.trim(),
		prenom: v.prenom.trim(),
		telephone: v.telephone.trim(),
		statut: v.statut,
		jci_locale_id: membre && !autre ? v.jciLocaleId : null,
		jci_autre: autre ? v.jciAutre.trim() : null,
		organisation: !membre ? v.organisation.trim() : null
	};
}
