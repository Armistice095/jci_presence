<script lang="ts">
	// Police de la billetterie, hébergée avec le site (aucun appel à Google, utile sur réseau faible).
	import '@fontsource-variable/nunito';
	import '../styles/app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>JCI Comé Excellence – Présence</title>
</svelte:head>

{@render children()}
