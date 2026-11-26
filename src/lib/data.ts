import { supabase } from './supabase';
import type { Attendee, Locale } from './types';

/** Minuscules sans accents : pour la recherche et le regroupement. */
export const norm = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();

/** Toutes les inscriptions d'un événement (par pages de 1000, limite de Supabase). */
export async function fetchAttendees(eventId: string): Promise<Attendee[]> {
	const out: Attendee[] = [];
	for (let from = 0; ; from += 1000) {
		const { data, error } = await supabase
			.from('attendees')
			.select('*')
			.eq('event_id', eventId)
			.order('created_at', { ascending: true })
			.range(from, from + 999);
		if (error) throw error;
		const page = (data ?? []) as Attendee[];
		out.push(...page);
		if (page.length < 1000) break;
	}
	return out;
}

export async function fetchLocales(): Promise<Locale[]> {
	const { data, error } = await supabase.from('jci_locales').select('*').order('ordre').order('nom');
	if (error) throw error;
	return (data ?? []) as Locale[];
}

/** « JCI locale » pour un membre, « organisation » pour un invité. */
export function groupLabel(a: Attendee, locales: Map<string, string>): string {
	if (a.statut === 'membre') {
		if (a.jci_locale_id) return locales.get(a.jci_locale_id) ?? 'JCI locale (supprimée)';
		return a.jci_autre ? `Autre : ${a.jci_autre}` : 'Autre';
	}
	return a.organisation?.trim() || '—';
}

export const errMessage = (e: unknown): string =>
	e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Erreur inattendue.';
