<script lang="ts">
	import { onMount } from 'svelte';
	import { downloadBlob } from '$lib/format';
	import Icon from '$lib/Icon.svelte';
	import Logo from '$lib/Logo.svelte';

	const target = (import.meta.env.VITE_PUBLIC_URL || '').trim().replace(/\/$/, '') || location.origin;
	const host = new URL(target).hostname;
	const temporary = /(^localhost$|^127\.|workers\.dev$|pages\.dev$)/.test(host);

	let dataUrl = $state('');
	let error = $state('');

	onMount(async () => {
		try {
			const mod = await import('qrcode');
			const toDataURL = mod.toDataURL ?? (mod as unknown as { default: typeof mod }).default.toDataURL;
			// Marge de 4 modules (norme QR) et correction d'erreur élevée : lisible même un peu abîmé.
			dataUrl = await toDataURL(target, { width: 1024, margin: 4, errorCorrectionLevel: 'H' });
		} catch {
			error = 'Le QR code n’a pas pu être généré. Rechargez la page.';
		}
	});

	async function download() {
		const blob = await (await fetch(dataUrl)).blob();
		downloadBlob('qr-presence-jci.png', blob);
	}
</script>

<svelte:head><title>Affiche QR – JCI Présence</title></svelte:head>

<div class="no-print">
	<div class="page-head">
		<div>
			<h1>Affiche QR code</h1>
			<p class="muted" style="margin:0; max-width:60ch">
				Un seul QR code pour tous les événements. Il ouvre toujours <strong>{target}</strong>.
			</p>
		</div>
		<div class="row">
			<button class="btn" onclick={() => window.print()} disabled={!dataUrl}><Icon name="print" size={20} />Imprimer l’affiche A4</button>
			<button class="btn ghost" onclick={download} disabled={!dataUrl}><Icon name="download" size={20} />QR code (PNG)</button>
		</div>
	</div>
	{#if temporary}
		<div class="msg warn" role="alert">
			<Icon name="alert" />
			<span>L’adresse actuelle ({host}) est provisoire. N’imprimez pas l’affiche avant d’avoir le domaine définitif : renseignez <code>VITE_PUBLIC_URL</code>, puis redéployez.</span>
		</div>
	{/if}
	{#if error}<div class="msg err" role="alert"><Icon name="alert" />{error}</div>{/if}
</div>

<section class="poster" aria-label="Aperçu de l’affiche">
	<Logo forceLight />
	<h1>Scannez pour enregistrer votre présence</h1>
	{#if dataUrl}
		<img class="qr" src={dataUrl} alt="QR code vers {target}" />
	{:else}
		<div class="qr-ph"></div>
	{/if}
	<p class="url">{target.replace(/^https?:\/\//, '')}</p>
	<p>Le QR code ne s’ouvre pas ? Saisissez cette adresse dans votre navigateur.</p>
	<ol class="steps">
		<li>Ouvrez l’appareil photo de votre téléphone.</li>
		<li>Visez le QR code et touchez le lien.</li>
		<li>Remplissez le formulaire : moins d’une minute.</li>
	</ol>
</section>
