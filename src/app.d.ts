declare global {
	interface ImportMetaEnv {
		readonly VITE_SUPABASE_URL: string;
		readonly VITE_SUPABASE_ANON_KEY: string;
		readonly VITE_PUBLIC_URL?: string;
		readonly VITE_PASSWORD_RESET_URL?: string;
	}
}

export {};
