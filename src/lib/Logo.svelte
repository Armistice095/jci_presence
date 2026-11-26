<script lang="ts">
	/** Logo officiel : version claire sur fond clair, version blanche en mode sombre. */
	let { forceLight = false }: { forceLight?: boolean } = $props();
</script>

{#if forceLight}
	<img class="logo" src="/logo.png" alt="JCI Comé Excellence" width="260" height="116" />
{:else}
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="/logo-dark.png" />
		<img class="logo" src="/logo.png" alt="JCI Comé Excellence" width="260" height="116" />
	</picture>
{/if}
