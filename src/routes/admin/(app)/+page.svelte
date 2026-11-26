<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { fmtDate, fmtDateTime, toInputLocal, fromInputLocal, todayBenin } from '$lib/format';
	import { errMessage } from '$lib/data';
	import type { EventRow } from '$lib/types';
	import Icon from '$lib/Icon.svelte';

	type Row = EventRow & { attendees: { count: number }[] };
	type Draft = { id: string | null; nom: string; date_event: string; lieu: string; ferme_a: string };

	let rows = $state<Row[]>([]);
	let loading = $state(true);
	let error = $state('');
	let notice = $state('');
	let draft = $state<Draft | null>(null);
	let saving = $state(false);

	function etat(e: EventRow): 'ouvert' | 'ferme' | 'inactif' {
		if (!e.actif) return 'inactif';
		if (e.ferme_a && new Date(e.ferme_a) <= new Date()) return 'ferme';
		return 'ouvert';
	}
	const etatLabel = { ouvert: 'Inscriptions ouvertes', ferme: 'Fermé automatiquement', inactif: 'Inactif' };

	async function load() {
		const { data, error: e } = await supabase
			.from('events')
			.select('*, attendees(count)')
			.order('date_event', { ascending: false })
			.order('created_at', { ascending: false });
		loading = false;
		if (e) error = errMessage(e);
		else rows = (data ?? []) as Row[];
	}

	function openEditor(r?: Row, message = '') {
		error = '';
		notice = message;
		draft = r
			? { id: r.id, nom: r.nom, date_event: r.date_event, lieu: r.lieu, ferme_a: toInputLocal(r.ferme_a) }
			: { id: null, nom: '', date_event: todayBenin(), lieu: '', ferme_a: '' };
		queueMicrotask(() => document.getElementById('e-nom')?.focus());
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (!draft) return;
		saving = true;
		error = '';
		const payload = {
			nom: draft.nom.trim(),
			date_event: draft.date_event,
			lieu: draft.lieu.trim(),
			ferme_a: fromInputLocal(draft.ferme_a)
		};
		const { error: err } = draft.id
			? await supabase.from('events').update(payload).eq('id', draft.id)
			: await supabase.from('events').insert({ ...payload, actif: false });
		saving = false;
		if (err) {
			error = errMessage(err);
			return;
		}
		notice = draft.id
			? 'Événement modifié.'
			: 'Événement créé, encore inactif. Activez-le quand les inscriptions doivent s’ouvrir.';
		draft = null;
		await load();
	}

	async function toggle(r: Row) {
		error = '';
		notice = '';
		if (!r.actif && r.ferme_a && new Date(r.ferme_a) <= new Date()) {
			openEditor(r, 'L’heure de fermeture automatique est dépassée. Modifiez-la (ou videz-la), puis activez l’événement.');
			return;
		}
		const { error: err } = await supabase.from('events').update({ actif: !r.actif }).eq('id', r.id);
		if (err) error = errMessage(err);
		else {
			notice = r.actif ? `« ${r.nom} » est désactivé.` : `« ${r.nom} » est activé : le QR code ouvre son formulaire.`;
			await load();
		}
	}

	async function duplicate(r: Row) {
		error = '';
		const { data, error: err } = await supabase
			.from('events')
			.insert({ nom: `${r.nom} (copie)`, date_event: todayBenin(), lieu: r.lieu, actif: false, ferme_a: null })
			.select()
			.single();
		if (err || !data) {
			error = errMessage(err);
			return;
		}
		await load();
		const copy = rows.find((x) => x.id === (data as EventRow).id);
		if (copy) openEditor(copy, 'Copie créée, encore inactive. Vérifiez le nom et la date.');
	}

	onMount(load);
</script>

<div class="page-head">
	<h1>Événements</h1>
	<button class="btn" onclick={() => openEditor()}><Icon name="plus" size={20} />Nouvel événement</button>
</div>

{#if error}<div class="msg err" role="alert"><Icon name="alert" />{error}</div>{/if}
{#if notice}<div class="msg ok" role="status"><Icon name="check" />{notice}</div>{/if}

{#if draft}
	<form class="sheet" onsubmit={save}>
		<h2>{draft.id ? 'Modifier l’événement' : 'Nouvel événement'}</h2>
		<div class="grid">
			<div class="field">
				<label for="e-nom">Nom</label>
				<input id="e-nom" bind:value={draft.nom} maxlength="160" required />
			</div>
			<div class="field">
				<label for="e-lieu">Lieu</label>
				<input id="e-lieu" bind:value={draft.lieu} maxlength="160" required />
			</div>
			<div class="field">
				<label for="e-date">Date</label>
				<input id="e-date" type="date" bind:value={draft.date_event} required />
			</div>
			<div class="field">
				<label for="e-ferme">Fermeture automatique <span class="opt">(facultatif)</span></label>
				<input id="e-ferme" type="datetime-local" bind:value={draft.ferme_a} aria-describedby="e-ferme-h" />
				<p class="hint" id="e-ferme-h">Heure du Bénin. Après cette heure, plus personne ne peut s’enregistrer.</p>
			</div>
		</div>
		<div class="row">
			<button class="btn" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
			<button type="button" class="btn ghost" onclick={() => (draft = null)}>Annuler</button>
		</div>
	</form>
{/if}

{#if loading}
	<p class="muted" role="status">Chargement…</p>
{:else if rows.length === 0}
	<div class="sheet empty">
		<h2>Aucun événement</h2>
		<p class="muted">Créez le premier événement, puis activez-le : le QR code ouvrira alors son formulaire.</p>
	</div>
{:else}
	<ul class="sheet list list-card">
		{#each rows as r (r.id)}
			{@const s = etat(r)}
			<li class="ev">
				<div class="top">
					<h2>{r.nom}</h2>
					<span class="tag {s}">{etatLabel[s]}</span>
				</div>
				<dl class="facts">
					<div><dt class="vh">Date</dt><Icon name="calendar" size={18} /><dd>{fmtDate(r.date_event)}</dd></div>
					<div><dt class="vh">Lieu</dt><Icon name="pin" size={18} /><dd>{r.lieu}</dd></div>
					{#if r.ferme_a}<div><dt class="vh">Fermeture</dt><Icon name="clock" size={18} /><dd>Ferme le {fmtDateTime(r.ferme_a)}</dd></div>{/if}
				</dl>
				<p class="meta">{r.attendees?.[0]?.count ?? 0} présent(s) enregistré(s)</p>
				<div class="row">
					<a class="btn sm" href="/admin/evenements/{r.id}">Voir les présences</a>
					<button class="btn ghost sm" onclick={() => toggle(r)}>{r.actif ? 'Désactiver' : 'Activer'}</button>
					<button class="btn ghost sm" onclick={() => openEditor(r)}>Modifier</button>
					<button class="btn ghost sm" onclick={() => duplicate(r)}>Dupliquer</button>
				</div>
			</li>
		{/each}
	</ul>
{/if}
