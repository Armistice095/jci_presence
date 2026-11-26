<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { session } from '$lib/session.svelte';
	import { fmtDateTime } from '$lib/format';
	import { errMessage } from '$lib/data';
	import type { AdminRow } from '$lib/types';
	import Icon from '$lib/Icon.svelte';

	let admins = $state<AdminRow[]>([]);
	let loading = $state(true);
	let error = $state('');
	let notice = $state('');
	let email = $state('');
	let busy = $state(false);

	async function load() {
		const { data, error: e } = await supabase.from('admins').select('*').order('created_at');
		if (e) error = errMessage(e);
		else admins = (data ?? []) as AdminRow[];
		loading = false;
	}

	async function add(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		notice = '';
		busy = true;
		const { data, error: err } = await supabase.rpc('add_admin', { p_email: email });
		busy = false;
		if (err) {
			error = errMessage(err);
			return;
		}
		if (data === 'not_found') {
			error = 'Aucun compte avec cette adresse. Invitez d’abord la personne dans l’administration de la billetterie (menu Membres), puis revenez ici.';
			return;
		}
		notice = `${email.trim()} peut maintenant se connecter à l’administration de la présence.`;
		email = '';
		await load();
	}

	async function remove(a: AdminRow) {
		if (!confirm(`Retirer l’accès de ${a.email} ? Son compte reste valable pour la billetterie.`)) return;
		const { error: err } = await supabase.from('admins').delete().eq('user_id', a.user_id);
		if (err) error = errMessage(err);
		else await load();
	}

	onMount(load);
</script>

<svelte:head><title>Comptes – JCI Présence</title></svelte:head>

<div class="page-head">
	<div>
		<h1>Comptes administrateurs</h1>
		<p class="muted" style="margin:0; max-width:60ch">
			Les comptes sont ceux de la billetterie : même adresse, même mot de passe. Pour donner l’accès à quelqu’un,
			invitez-le d’abord dans la billetterie, puis ajoutez son adresse ici.
		</p>
	</div>
</div>

{#if error}<div class="msg err" role="alert"><Icon name="alert" />{error}</div>{/if}
{#if notice}<div class="msg ok" role="status"><Icon name="check" />{notice}</div>{/if}

<form class="sheet" onsubmit={add}>
	<div class="field">
		<label for="mail">Adresse e-mail du compte</label>
		<input id="mail" type="email" inputmode="email" autocapitalize="none" spellcheck="false" bind:value={email} required />
	</div>
	<button class="btn" disabled={busy}>{busy ? 'Ajout…' : 'Donner l’accès'}</button>
</form>

<div class="sheet list-card">
	{#if loading}
		<p class="muted" role="status" style="padding:16px 0">Chargement…</p>
	{:else}
		<ul class="list">
			{#each admins as a (a.user_id)}
				<li class="simple">
					<span class="name">
						{a.email}
						{#if a.user_id === session.user?.id}<span class="tag membre" style="margin-left:6px">Vous</span>{/if}
						<br /><span class="small muted" style="font-weight:500">Ajouté le {fmtDateTime(a.created_at)}</span>
					</span>
					{#if a.user_id !== session.user?.id}
						<button class="btn danger sm" onclick={() => remove(a)}>Retirer l’accès</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
