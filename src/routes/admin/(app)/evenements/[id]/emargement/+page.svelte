<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { supabase } from '$lib/supabase';
	import { fmtDate } from '$lib/format';
	import { fetchAttendees, fetchLocales, groupLabel, errMessage } from '$lib/data';
	import type { Attendee, EventRow } from '$lib/types';
	import Icon from '$lib/Icon.svelte';
	import Logo from '$lib/Logo.svelte';

	const id = page.params.id as string;

	let event = $state<EventRow | null>(null);
	let list = $state<Attendee[]>([]);
	let labels = $state(new Map<string, string>());
	let error = $state('');
	let loading = $state(true);

	onMount(async () => {
		try {
			const [ev, att, loc] = await Promise.all([
				supabase.from('events').select('*').eq('id', id).single(),
				fetchAttendees(id),
				fetchLocales()
			]);
			if (ev.error) throw ev.error;
			event = ev.data as EventRow;
			labels = new Map(loc.map((l) => [l.id, l.nom]));
			list = att.sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'));
		} catch (e) {
			error = errMessage(e);
		}
		loading = false;
	});
</script>

<svelte:head><title>Liste d’émargement – JCI Présence</title></svelte:head>

<div class="row no-print" style="margin-bottom:20px">
	<a class="btn ghost sm" href="/admin/evenements/{id}"><Icon name="back" size={18} />Retour</a>
	<button class="btn sm" onclick={() => window.print()} disabled={!event}><Icon name="print" size={18} />Imprimer ou enregistrer en PDF</button>
</div>
<p class="small muted no-print">Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF » comme imprimante.</p>

{#if loading}
	<p class="muted" role="status">Chargement…</p>
{:else if !event}
	<div class="msg err" role="alert"><Icon name="alert" />{error || 'Événement introuvable.'}</div>
{:else}
	<section class="sheet sheet-print" style="background:#fff; color:#16103f">
		<div class="ph">
			<div>
				<h1 style="margin:0 0 4px; color:#16103f">Liste d’émargement</h1>
				<p style="margin:0; font-weight:800; font-size:1.125rem; color:#16103f">{event.nom}</p>
				<p style="margin:0; color:#4a4766">{fmtDate(event.date_event)}, {event.lieu}</p>
				<p style="margin:4px 0 0; color:#4a4766">{list.length} personne(s) enregistrée(s)</p>
			</div>
			<Logo forceLight />
		</div>

		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th style="width:2.4rem">N°</th>
						<th>Nom et prénom</th>
						<th>Téléphone</th>
						<th>Statut</th>
						<th>JCI ou organisation</th>
						<th style="width:26%">Signature</th>
					</tr>
				</thead>
				<tbody>
					{#each list as a, i (a.id)}
						<tr>
							<td>{i + 1}</td>
							<td><strong>{a.nom}</strong> {a.prenom}</td>
							<td>{a.telephone}</td>
							<td>{a.statut === 'membre' ? 'Membre' : 'Invité'}</td>
							<td>{groupLabel(a, labels)}</td>
							<td></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}
