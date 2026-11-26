<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/Logo.svelte';

	const notFound = $derived(page.status === 404);
</script>

<!-- Adresse inconnue : le serveur renvoie index.html (application monopage), donc on
     marque la page noindex pour que Google ne l'enregistre jamais comme une vraie page. -->
<svelte:head>
	<title>{notFound ? 'Page introuvable' : 'Erreur'} – JCI Présence</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<header class="bar"><div class="bar-in"><Logo /></div></header>

<main class="shell">
	<div class="empty">
		<h1>{notFound ? 'Page introuvable' : 'Une erreur est survenue'}</h1>
		<p class="muted">
			{notFound
				? 'Cette adresse n’existe pas. Pour enregistrer votre présence, rendez-vous sur la page d’accueil.'
				: 'Réessayez dans un instant.'}
		</p>
		<a class="btn" href="/">Retour à l’accueil</a>
	</div>
</main>
