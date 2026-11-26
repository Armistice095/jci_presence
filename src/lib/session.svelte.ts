import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** État de connexion de l'espace admin. `isAdmin` vient de presence.is_admin() (jamais décidé côté client). */
export const session = $state<{ ready: boolean; user: User | null; isAdmin: boolean }>({
	ready: false,
	user: null,
	isAdmin: false
});

let started = false;

export async function refreshSession(user: User | null) {
	session.user = user;
	if (!user) {
		session.isAdmin = false;
		return;
	}
	const { data, error } = await supabase.rpc('is_admin');
	session.isAdmin = !error && data === true;
}

export async function initSession() {
	if (started) return;
	started = true;
	const { data } = await supabase.auth.getSession();
	await refreshSession(data.session?.user ?? null);
	session.ready = true;
	supabase.auth.onAuthStateChange((event, s) => {
		if (event === 'INITIAL_SESSION') return;
		// Ne pas appeler Supabase directement dans ce callback (risque de blocage).
		setTimeout(() => void refreshSession(s?.user ?? null), 0);
	});
}

export async function signOut() {
	await supabase.auth.signOut();
	await refreshSession(null);
}
