<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase, configOk } from '$lib/supabase';
	import { session, initSession, refreshSession } from '$lib/session.svelte';
	import Icon from '$lib/Icon.svelte';
	import Logo from '$lib/Logo.svelte';

	let email = $state('');
	let password = $state('');
	let show = $state(false);
	let busy = $state(false);
	let error = $state('');

	const resetUrl = import.meta.env.VITE_PASSWORD_RESET_URL;

	onMount(async () => {
		await initSession();
		if (session.user && session.isAdmin) void goto('/admin');
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (!configOk) {
			error = 'Configuration manquante (fichier .env).';
			return;
		}
		busy = true;
		const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
		if (err || !data.user) {
			busy = false;
			error = 'Adresse e-mail ou mot de passe incorrect. Vérifiez-les, puis réessayez.';
			return;
		}
		await refreshSession(data.user);
		busy = false;
		await goto('/admin');
	}
</script>

<svelte:head>
	<title>Connexion – JCI Présence</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<header class="bar"><div class="bar-in"><Logo /></div></header>

<main class="shell" id="contenu">
	<h1>Connexion</h1>
	<p class="muted">Espace du bureau : événements, présences et exports.</p>

	<form class="sheet" onsubmit={submit}>
		{#if error}<div class="msg err" role="alert"><Icon name="alert" />{error}</div>{/if}
		<div class="field">
			<label for="email">Adresse e-mail</label>
			<input id="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" bind:value={email} required />
		</div>
		<div class="field">
			<label for="pwd">Mot de passe</label>
			<input id="pwd" type={show ? 'text' : 'password'} autocomplete="current-password" bind:value={password} required />
			<button type="button" class="link-btn" style="padding-left:0; margin-top:4px" aria-pressed={show} onclick={() => (show = !show)}>
				{show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
			</button>
		</div>
		<button class="btn block" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
		{#if resetUrl}
			<p class="small" style="margin-top:16px">
				<a href={resetUrl}>Mot de passe oublié ?</a>
				<span class="muted"> Ce sont les mêmes identifiants que la billetterie.</span>
			</p>
		{/if}
	</form>
</main>
