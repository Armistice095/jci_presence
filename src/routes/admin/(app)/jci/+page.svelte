<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { fetchLocales, errMessage } from '$lib/data';
	import type { Locale } from '$lib/types';
	import Icon from '$lib/Icon.svelte';

	let locales = $state<Locale[]>([]);
	let loading = $state(true);
	let error = $state('');
	let notice = $state('');
	let newName = $state('');
	let bulk = $state('');
	let editId = $state<string | null>(null);
	let editName = $state('');

	async function load() {
		try {
			locales = await fetchLocales();
		} catch (e) {
			error = errMessage(e);
		}
		loading = false;
	}

	async function insertNames(names: string[]) {
		error = '';
		notice = '';
		const known = new Set(locales.map((l) => l.nom.trim().toLowerCase()));
		const fresh = [...new Set(names.map((n) => n.trim()).filter(Boolean))].filter((n) => !known.has(n.toLowerCase()));
		if (fresh.length === 0) {
			notice = 'Rien à ajouter : ces noms sont déjà dans la liste, ou le champ est vide.';
			return false;
		}
		const { error: err } = await supabase.from('jci_locales').insert(fresh.map((nom) => ({ nom, ordre: 100 })));
		if (err) {
			error = errMessage(err);
			return false;
		}
		notice = `${fresh.length} JCI locale(s) ajoutée(s).`;
		await load();
		return true;
	}

	async function addOne(e: SubmitEvent) {
		e.preventDefault();
		if (await insertNames([newName])) newName = '';
	}

	async function addBulk(e: SubmitEvent) {
		e.preventDefault();
		if (await insertNames(bulk.split('\n'))) bulk = '';
	}

	async function rename(l: Locale) {
		const nom = editName.trim();
		if (!nom) return;
		const { error: err } = await supabase.from('jci_locales').update({ nom }).eq('id', l.id);
		if (err) error = errMessage(err);
		else {
			editId = null;
			await load();
		}
	}

	async function toggle(l: Locale) {
		const { error: err } = await supabase.from('jci_locales').update({ actif: !l.actif }).eq('id', l.id);
		if (err) error = errMessage(err);
		else await load();
	}

	onMount(load);
</script>

<svelte:head><title>JCI locales – JCI Présence</title></svelte:head>

<div class="page-head">
	<div>
		<h1>JCI locales et provinces</h1>
		<p class="muted" style="margin:0; max-width:60ch">
			Cette liste alimente le menu « Membre JCI » du formulaire. Une entrée désactivée n’est plus proposée, mais les
			présences déjà enregistrées gardent leur valeur.
		</p>
	</div>
</div>

{#if error}<div class="msg err" role="alert"><Icon name="alert" />{error}</div>{/if}
{#if notice}<div class="msg ok" role="status"><Icon name="check" />{notice}</div>{/if}

<div class="grid" style="gap:20px; align-items:start; margin-bottom:20px">
	<form class="sheet" onsubmit={addOne} style="margin:0">
		<h2>Ajouter une JCI locale</h2>
		<div class="field">
			<label for="n1">Nom</label>
			<input id="n1" bind:value={newName} maxlength="120" required />
		</div>
		<button class="btn">Ajouter</button>
	</form>
	<form class="sheet" onsubmit={addBulk} style="margin:0">
		<h2>Ajouter plusieurs JCI d’un coup</h2>
		<div class="field">
			<label for="n2">Un nom par ligne</label>
			<textarea id="n2" rows="4" bind:value={bulk}></textarea>
		</div>
		<button class="btn">Ajouter la liste</button>
	</form>
</div>

<div class="sheet list-card">
	{#if loading}
		<p class="muted" role="status" style="padding:16px 0">Chargement…</p>
	{:else if locales.length === 0}
		<p class="muted" style="padding:16px 0">Aucune JCI locale. Ajoutez-en avec les formulaires ci-dessus.</p>
	{:else}
		<ul class="list">
			{#each locales as l (l.id)}
				<li class="simple">
					{#if editId === l.id}
						<form class="row" onsubmit={(e) => { e.preventDefault(); void rename(l); }} style="flex:1 1 100%">
							<label class="vh" for="r-{l.id}">Nouveau nom</label>
							<input id="r-{l.id}" bind:value={editName} style="flex:1; min-width:200px; width:auto" />
							<button class="btn sm">Enregistrer</button>
							<button type="button" class="btn ghost sm" onclick={() => (editId = null)}>Annuler</button>
						</form>
					{:else}
						<span class="name">{l.nom}</span>
						<span class="tag {l.actif ? 'ouvert' : ''}">{l.actif ? 'Proposée' : 'Désactivée'}</span>
						<span class="row">
							<button class="btn ghost sm" onclick={() => { editId = l.id; editName = l.nom; }}>Renommer</button>
							<button class="btn ghost sm" onclick={() => toggle(l)}>{l.actif ? 'Désactiver' : 'Réactiver'}</button>
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
