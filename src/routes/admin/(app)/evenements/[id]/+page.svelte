<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { supabase } from '$lib/supabase';
	import { fmtDate, fmtTime, fmtDateTime, toCsv, downloadBlob, slug } from '$lib/format';
	import { fetchAttendees, fetchLocales, groupLabel, norm, errMessage } from '$lib/data';
	import { validateForm, firstError, toRow, type FormErrors } from '$lib/form';
	import { emptyForm, type Attendee, type EventRow, type FormValues, type Locale } from '$lib/types';
	import AttendeeFields from '$lib/AttendeeFields.svelte';
	import Icon from '$lib/Icon.svelte';

	const id = page.params.id as string;

	let event = $state<EventRow | null>(null);
	let attendees = $state<Attendee[]>([]);
	let locales = $state<Locale[]>([]);
	let loading = $state(true);
	let error = $state('');
	let notice = $state('');

	let q = $state('');
	let statutFilter = $state<'' | 'membre' | 'invite'>('');
	let groupFilter = $state('');

	let adding = $state(false);
	let addValues = $state<FormValues>(emptyForm());
	let addErrors = $state<FormErrors>({});
	let addError = $state('');
	let saving = $state(false);

	const localeMap = $derived(new Map(locales.map((l) => [l.id, l.nom])));
	const label = (a: Attendee) => groupLabel(a, localeMap);

	const stats = $derived.by(() => {
		const count = (list: Attendee[]) => {
			const m = new Map<string, { label: string; n: number }>();
			for (const a of list) {
				const l = label(a);
				const k = norm(l);
				const cur = m.get(k);
				if (cur) cur.n++;
				else m.set(k, { label: l, n: 1 });
			}
			return [...m.values()].sort((x, y) => y.n - x.n || x.label.localeCompare(y.label, 'fr'));
		};
		const membres = attendees.filter((a) => a.statut === 'membre');
		const invites = attendees.filter((a) => a.statut === 'invite');
		return {
			total: attendees.length,
			membres: membres.length,
			invites: invites.length,
			parJci: count(membres),
			parOrg: count(invites)
		};
	});

	const groups = $derived([...new Set(attendees.map((a) => label(a)))].sort((a, b) => a.localeCompare(b, 'fr')));

	const filtered = $derived.by(() => {
		const needle = norm(q);
		return attendees.filter((a) => {
			if (statutFilter && a.statut !== statutFilter) return false;
			if (groupFilter && label(a) !== groupFilter) return false;
			if (!needle) return true;
			return norm(`${a.nom} ${a.prenom} ${a.telephone} ${label(a)}`).includes(needle);
		});
	});

	async function load() {
		error = '';
		try {
			const [ev, list, loc] = await Promise.all([
				supabase.from('events').select('*').eq('id', id).single(),
				fetchAttendees(id),
				fetchLocales()
			]);
			if (ev.error) throw ev.error;
			event = ev.data as EventRow;
			attendees = list;
			locales = loc;
		} catch (e) {
			error = errMessage(e);
		}
		loading = false;
	}

	async function addManual(e: SubmitEvent) {
		e.preventDefault();
		addError = '';
		addErrors = validateForm(addValues);
		const first = firstError(addErrors);
		if (first) {
			await tick();
			document.getElementById(`add-${first}`)?.focus();
			return;
		}
		saving = true;
		const { error: err } = await supabase.from('attendees').insert(toRow(id, addValues));
		saving = false;
		if (err) {
			addError = err.code === '23505' ? 'Ce numéro est déjà enregistré pour cet événement.' : errMessage(err);
			return;
		}
		notice = `${addValues.prenom.trim()} ${addValues.nom.trim()} est ajouté(e) à la liste.`;
		addValues = emptyForm();
		addErrors = {};
		adding = false;
		await load();
	}

	async function remove(a: Attendee) {
		if (!confirm(`Supprimer ${a.prenom} ${a.nom} de la liste ?`)) return;
		const { error: err } = await supabase.from('attendees').delete().eq('id', a.id);
		if (err) error = errMessage(err);
		else {
			notice = `${a.prenom} ${a.nom} est supprimé(e) de la liste.`;
			await load();
		}
	}

	function exportCsv() {
		if (!event) return;
		const rows: string[][] = [['N°', 'Nom', 'Prénom', 'Contact', 'Statut', 'JCI locale', 'Organisation', 'Inscrit le']];
		attendees.forEach((a, i) =>
			rows.push([
				String(i + 1),
				a.nom,
				a.prenom,
				a.telephone,
				a.statut === 'membre' ? 'Membre JCI' : 'Invité',
				a.statut === 'membre' ? label(a) : '',
				a.statut === 'invite' ? (a.organisation ?? '') : '',
				fmtDateTime(a.created_at)
			])
		);
		downloadBlob(`presence-${slug(event.nom)}-${event.date_event}.csv`, toCsv(rows));
	}

	const pct = (n: number, total: number) => (total ? Math.max(3, Math.round((n / total) * 100)) : 0);
	const telHref = (t: string) => `tel:${t.replace(/[^\d+]/g, '')}`;

	onMount(load);
</script>

<svelte:head><title>Présences – JCI Présence</title></svelte:head>

<a class="back" href="/admin"><Icon name="back" size={20} />Événements</a>

{#if loading}
	<p class="muted" role="status">Chargement…</p>
{:else if !event}
	<div class="msg err" role="alert"><Icon name="alert" />{error || 'Événement introuvable.'}</div>
{:else}
	<div class="page-head">
		<div>
			<h1>{event.nom}</h1>
			<dl class="facts">
				<div><dt class="vh">Date</dt><Icon name="calendar" size={18} /><dd>{fmtDate(event.date_event)}</dd></div>
				<div><dt class="vh">Lieu</dt><Icon name="pin" size={18} /><dd>{event.lieu}</dd></div>
			</dl>
		</div>
		<div class="row">
			<button class="btn ghost sm" onclick={exportCsv} disabled={attendees.length === 0}><Icon name="download" size={18} />Exporter (Excel)</button>
			<a class="btn ghost sm" href="/admin/evenements/{id}/emargement"><Icon name="print" size={18} />Liste d’émargement</a>
			<button class="btn ghost sm" onclick={load}><Icon name="refresh" size={18} />Actualiser</button>
		</div>
	</div>

	{#if error}<div class="msg err" role="alert"><Icon name="alert" />{error}</div>{/if}
	{#if notice}<div class="msg ok" role="status"><Icon name="check" />{notice}</div>{/if}

	<section class="sheet summary" aria-label="Résumé">
		<p class="total"><span class="num">{stats.total}</span> <span class="muted" style="font-weight:700">présent(s)</span></p>
		{#if stats.total > 0}
			<div class="split" aria-hidden="true">
				{#if stats.membres}<i class="m" style="flex:{stats.membres}"></i>{/if}
				{#if stats.invites}<i class="g" style="flex:{stats.invites}"></i>{/if}
			</div>
		{/if}
		<p class="legend">
			<span><span class="dot m"></span>{stats.membres} membre(s) JCI</span>
			<span><span class="dot g"></span>{stats.invites} invité(s)</span>
		</p>
	</section>

	{#if stats.total > 0}
		<div class="grid" style="gap:20px; align-items:start; margin-bottom:20px">
			<section class="sheet" style="margin:0">
				<h2>Par JCI locale</h2>
				{#if stats.parJci.length === 0}<p class="muted small">Aucun membre pour l’instant.</p>{/if}
				<ul class="list bars">
					{#each stats.parJci as g (g.label)}
						<li><span>{g.label}</span><b>{g.n}</b><span class="meter" aria-hidden="true"><i style="--p:{pct(g.n, stats.membres)}%"></i></span></li>
					{/each}
				</ul>
			</section>
			<section class="sheet" style="margin:0">
				<h2>Par organisation (invités)</h2>
				{#if stats.parOrg.length === 0}<p class="muted small">Aucun invité pour l’instant.</p>{/if}
				<ul class="list bars">
					{#each stats.parOrg as g (g.label)}
						<li><span>{g.label}</span><b>{g.n}</b><span class="meter g" aria-hidden="true"><i style="--p:{pct(g.n, stats.invites)}%"></i></span></li>
					{/each}
				</ul>
			</section>
		</div>
	{/if}

	<section class="sheet" aria-labelledby="liste-h">
		<div class="page-head" style="margin-bottom:16px">
			<h2 id="liste-h" style="margin:0">Liste de présence</h2>
			<button class="btn sm" aria-expanded={adding} onclick={() => (adding = !adding)}>
				<Icon name={adding ? 'back' : 'plus'} size={18} />{adding ? 'Fermer' : 'Ajouter une personne'}
			</button>
		</div>

		{#if adding}
			<form onsubmit={addManual} novalidate style="max-width:520px; margin-bottom:24px; padding-bottom:8px; border-bottom:1px solid var(--line)">
				{#if addError}<div class="msg err" role="alert"><Icon name="alert" />{addError}</div>{/if}
				<AttendeeFields bind:values={addValues} {locales} errors={addErrors} prefix="add" />
				<button class="btn" disabled={saving}>{saving ? 'Ajout…' : 'Ajouter à la liste'}</button>
			</form>
		{/if}

		<div class="toolbar">
			<input type="search" placeholder="Rechercher un nom, un numéro…" aria-label="Rechercher dans la liste" bind:value={q} />
			<select bind:value={statutFilter} aria-label="Filtrer par statut">
				<option value="">Tous les statuts</option>
				<option value="membre">Membres JCI</option>
				<option value="invite">Invités</option>
			</select>
			<select bind:value={groupFilter} aria-label="Filtrer par JCI locale ou organisation">
				<option value="">Toutes les provenances</option>
				{#each groups as g (g)}<option value={g}>{g}</option>{/each}
			</select>
		</div>
		<p class="small muted" role="status">{filtered.length} sur {attendees.length} personne(s)</p>

		{#if attendees.length === 0}
			<p class="muted">Personne n’est encore enregistré. Les inscriptions apparaîtront ici en temps réel après actualisation.</p>
		{:else if filtered.length === 0}
			<p class="muted">Aucun résultat. Essayez d’autres mots ou retirez un filtre.</p>
		{:else}
			<div class="att-h" aria-hidden="true">
				<span style="grid-column:1">Nom</span><span style="grid-column:2">Téléphone</span><span style="grid-column:3">Statut</span><span style="grid-column:4">JCI ou organisation</span><span style="grid-column:5">Heure</span><span></span>
			</div>
			<ul class="list">
				{#each filtered as a (a.id)}
					<li class="att">
						<div class="who">{a.nom} <span>{a.prenom}</span></div>
						<a class="phone" href={telHref(a.telephone)}>{a.telephone}</a>
						<div class="tagc"><span class="tag {a.statut}">{a.statut === 'membre' ? 'Membre' : 'Invité'}</span></div>
						<div class="grp">{label(a)}</div>
						<div class="time">{fmtTime(a.created_at)}</div>
						<button class="icon-btn danger del" aria-label="Supprimer {a.prenom} {a.nom}" onclick={() => remove(a)}><Icon name="trash" /></button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}
