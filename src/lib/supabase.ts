import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Faux si .env n'est pas renseigné : l'interface affiche alors un message clair. */
export const configOk = Boolean(url && key);

// Même projet Supabase que la billetterie (donc mêmes comptes), mais schéma « presence ».
export const supabase = createClient(url || 'http://localhost', key || 'missing', {
	db: { schema: 'presence' }
});
