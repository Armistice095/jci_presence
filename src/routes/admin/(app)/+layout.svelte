<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { session, initSession, signOut } from '$lib/session.svelte';
	import Icon from '$lib/Icon.svelte';
	import Logo from '$lib/Logo.svelte';

	let { children }: { children: Snippet } = $props();

	const links = [
		{ href: '/admin', label: 'Événements', icon: 'events' },
		{ href: '/admin/jci', label: 'JCI locales', icon: 'building' },
		{ href: '/admin/comptes', label: 'Comptes', icon: 'users' },
		{ href: '/admin/affiche', label: 'Affiche QR', icon: 'qr' }
	];

	const active = (href: string) =>
		href === '/admin'
			? page.url.pathname === '/admin' || page.url.pathname.startsWith('/admin/evenements')
			: page.url.pathname.startsWith(href);

	onMount(initSession);

	$effect(() => {
		if (session.ready && !session.user) void goto('/admin/connexion');
	});

	async function logout() {
		await signOut();
		await goto('/admin/connexion');
	}
</script>

<svelte:head>
	<title>Administration – JCI Présence</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if !session.ready || !session.user}
	<main class="shell"><p class="muted" role="status">Chargement…</p></main>
{:else if !session.isAdmin}
	<header class="bar"><div class="bar-in"><Logo /></div></header>
	<main class="shell">
		<div class="sheet">
			<h1>Accès non autorisé</h1>
			<p class="muted">
				Le compte <strong>{session.user.email}</strong> n’a pas accès à l’administration de la présence. Demandez à un
				administrateur de l’ajouter dans « Comptes ».
			</p>
			<button class="btn ghost" onclick={logout}>Se déconnecter</button>
		</div>
	</main>
{:else}
	<a class="skip no-print" href="#contenu">Aller au contenu</a>
	<header class="bar no-print">
		<div class="bar-in">
			<Logo />
			<nav class="tabbar" aria-label="Navigation principale">
				{#each links as l (l.href)}
					<a href={l.href} aria-current={active(l.href) ? 'page' : undefined}><Icon name={l.icon} size={22} />{l.label}</a>
				{/each}
			</nav>
			<span class="grow" style="flex:1 1 0"></span>
			<span class="small muted who-mail">{session.user.email}</span>
			<button class="btn ghost sm" onclick={logout}>Déconnexion</button>
		</div>
	</header>
	<main id="contenu" class="shell wide admin-body">
		{@render children()}
	</main>
{/if}
