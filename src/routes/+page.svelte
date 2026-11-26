<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { supabase, configOk } from '$lib/supabase';
	import { fmtDate, fmtTime } from '$lib/format';
	import { validateForm, firstError, toRpcArgs, type FormErrors } from '$lib/form';
	import { emptyForm, type FormValues, type Locale, type OpenEvent } from '$lib/types';
	import AttendeeFields from '$lib/AttendeeFields.svelte';
	import Icon from '$lib/Icon.svelte';
	import Logo from '$lib/Logo.svelte';

	type Phase = 'loading' | 'error' | 'none' | 'pick' | 'form' | 'done';

	let phase = $state<Phase>('loading');
	let events = $state<OpenEvent[]>([]);
	let locales = $state<Locale[]>([]);
	let chosen = $state<OpenEvent | null>(null);
	let values = $state<FormValues>(emptyForm());
	let errors = $state<FormErrors>({});
	let consentError = $state('');
	let honeypot = $state('');
	let consent = $state(false);
	let sending = $state(false);
	let message = $state('');
	let doneTitle = $state('');
	let doneName = $state('');
	let doneTime = $state('');
	let doneDuplicate = $state(false);
	let openedAt = 0;

	async function load() {
		phase = 'loading';
		if (!configOk) {
			message = 'Configuration manquante : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.';
			phase = 'error';
			return;
		}
		const [ev, loc] = await Promise.all([
			supabase.rpc('evenements_ouverts'),
			supabase.from('jci_locales').select('id,nom,ordre,actif').eq('actif', true).order('ordre').order('nom')
		]);
		if (ev.error || loc.error) {
			message = 'Connexion impossible. Vérifiez votre réseau, puis réessayez.';
			phase = 'error';
			return;
		}
		events = (ev.data ?? []) as OpenEvent[];
		locales = (loc.data ?? []) as Locale[];
		if (events.length === 0) phase = 'none';
		else if (events.length === 1) choose(events[0]);
		else phase = 'pick';
	}

	function choose(e: OpenEvent) {
		chosen = e;
		message = '';
		errors = {};
		consentError = '';
		openedAt = Date.now();
		phase = 'form';
	}

	async function focusField(key: string) {
		await tick();
		document.getElementById(`f-${key}`)?.focus();
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!chosen || sending) return;
		message = '';
		errors = validateForm(values);
		consentError = consent ? '' : 'Cochez la case pour continuer.';
		const first = firstError(errors);
		if (first) {
			await focusField(first);
			return;
		}
		if (consentError) {
			await focusField('consent');
			return;
		}
		// Anti-spam léger : champ piège rempli, ou formulaire envoyé en moins de 2 s.
		if (honeypot || Date.now() - openedAt < 2000) {
			message = 'Réessayez dans un instant.';
			return;
		}
		sending = true;
		const { data, error } = await supabase.rpc('register', toRpcArgs(chosen.id, values));
		sending = false;
		if (error || !data) {
			message = 'Connexion impossible. Vos informations sont conservées : appuyez de nouveau sur « Enregistrer ma présence ».';
			return;
		}
		const res = data as { status: string; field?: string };
		switch (res.status) {
			case 'ok':
			case 'duplicate':
				doneDuplicate = res.status === 'duplicate';
				doneTitle = doneDuplicate ? 'Vous êtes déjà enregistré(e)' : 'Présence enregistrée';
				doneName = `${values.prenom.trim()} ${values.nom.trim()}`;
				doneTime = fmtTime(new Date().toISOString());
				phase = 'done';
				window.scrollTo({ top: 0 });
				break;
			case 'closed':
				await load();
				message = 'Les inscriptions à cet événement viennent de se terminer.';
				break;
			case 'busy':
				message = 'Beaucoup de personnes s’enregistrent en même temps. Réessayez dans une minute.';
				break;
			default:
				message = 'Certaines informations sont invalides. Vérifiez le formulaire.';
		}
	}

	function another() {
		values = emptyForm();
		errors = {};
		consent = false;
		consentError = '';
		message = '';
		openedAt = Date.now();
		phase = 'form';
	}

	onMount(load);
</script>

<svelte:head>
	<title>{chosen && phase === 'form' ? `${chosen.nom} – Présence` : 'Enregistrement de présence – JCI Comé Excellence'}</title>
	<link rel="canonical" href="https://presence.jcicomee.org/" />
</svelte:head>

<header class="bar">
	<div class="bar-in"><Logo /></div>
</header>

{#if phase === 'done' && chosen}
	<main class="confirm" aria-live="polite">
		<div class="confirm-in">
			<svg class="big" width="72" height="72" viewBox="0 0 72 72" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<circle class="ring" cx="36" cy="36" r="32" />
				<path class="tick" d="M22 37l10 10 18-21" />
			</svg>
			<h1>{doneTitle}</h1>
			<p class="who">{doneName}</p>
			<p>{chosen.nom}</p>
			{#if !doneDuplicate}<p>Enregistré à {doneTime}.</p>{/if}
			<hr />
			<button class="btn" onclick={another}>Enregistrer une autre personne</button>
		</div>
	</main>
{:else}
	<main id="contenu" class="shell" class:form-page={phase === 'form'}>
		{#if phase === 'loading'}
			<p class="muted" role="status">Chargement…</p>
		{:else if phase === 'error'}
			<div class="msg err" role="alert"><Icon name="alert" />{message}</div>
			<button class="btn" onclick={load}>Réessayer</button>
		{:else if phase === 'none'}
			<div class="empty">
				<div class="ico"><Icon name="calendar" size={26} /></div>
				<h1>Aucune inscription ouverte</h1>
				<p class="muted">Les inscriptions s’ouvrent quand le bureau active un événement. Revenez ici une fois l’événement commencé.</p>
				<button class="btn ghost" onclick={load}><Icon name="refresh" size={18} />Actualiser</button>
			</div>
		{:else if phase === 'pick'}
			<h1>Quel événement ?</h1>
			<p class="muted">Plusieurs événements sont ouverts. Choisissez celui auquel vous assistez.</p>
			<ul class="pick-list">
				{#each events as ev (ev.id)}
					<li>
						<button class="pick" onclick={() => choose(ev)}>
							<span class="t">
								<strong>{ev.nom}</strong>
								<dl class="facts">
									<div><dt class="vh">Date</dt><dd>{fmtDate(ev.date_event)}</dd></div>
									<div><dt class="vh">Lieu</dt><dd>{ev.lieu}</dd></div>
								</dl>
							</span>
							<Icon name="chevron" />
						</button>
					</li>
				{/each}
			</ul>
		{:else if phase === 'form' && chosen}
			<section class="hero">
				<h1>{chosen.nom}</h1>
				<dl class="facts">
					<div><dt class="vh">Date</dt><Icon name="calendar" size={18} /><dd>{fmtDate(chosen.date_event)}</dd></div>
					<div><dt class="vh">Lieu</dt><Icon name="pin" size={18} /><dd>{chosen.lieu}</dd></div>
				</dl>
				{#if events.length > 1}
					<button class="link-btn" style="padding-left:0" onclick={() => (phase = 'pick')}>Changer d’événement</button>
				{/if}
			</section>

			{#if message}<div class="msg err" role="alert"><Icon name="alert" />{message}</div>{/if}

			<form class="sheet" onsubmit={submit} novalidate>
				<h2 class="form-title">Enregistrez votre présence</h2>
				<AttendeeFields bind:values {locales} {errors} />

				<div class="hp" aria-hidden="true">
					<label for="site-web">Ne pas remplir</label>
					<input id="site-web" tabindex="-1" autocomplete="off" bind:value={honeypot} />
				</div>

				<div class="consent-wrap">
					<label class="consent">
						<input
							id="f-consent"
							type="checkbox"
							bind:checked={consent}
							aria-invalid={consentError ? 'true' : undefined}
							aria-describedby={consentError ? 'f-consent-err' : undefined}
						/>
						<span>J’accepte que JCI Comé Excellence conserve ces informations pour suivre la présence à cet événement.</span>
					</label>
					{#if consentError}<p class="field-err" id="f-consent-err"><Icon name="alert" size={18} />{consentError}</p>{/if}
				</div>

				<div class="submit-bar">
					<button class="btn block" disabled={sending}>{sending ? 'Envoi en cours…' : 'Enregistrer ma présence'}</button>
				</div>
			</form>
		{/if}
	</main>
{/if}

{#if phase !== 'done'}
	<footer class="site-foot">
		<p>
			JCI Présence est la plateforme d’enregistrement des présences aux événements de
			<a href="https://jcicomee.org">JCI Comé Excellence</a>.
		</p>
	</footer>
{/if}
