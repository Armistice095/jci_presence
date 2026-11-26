import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			// Application monopage : toute adresse inconnue renvoie vers index.html
			adapter: adapter({ fallback: 'index.html' }),
			// Alias $lib conservé (déprécié dans SvelteKit 3, toujours fonctionnel)
			alias: { $lib: 'src/lib' }
		})
	]
});
