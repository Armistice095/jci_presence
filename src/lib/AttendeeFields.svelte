<script lang="ts">
	import Icon from './Icon.svelte';
	import type { FormErrors } from './form';
	import type { FormValues, Locale } from './types';

	/** `prefix` rend les identifiants uniques si le formulaire apparaît deux fois sur une page. */
	let {
		values = $bindable(),
		locales,
		errors = {},
		prefix = 'f'
	}: { values: FormValues; locales: Locale[]; errors?: FormErrors; prefix?: string } = $props();

	const id = (k: string) => `${prefix}-${k}`;
</script>

{#snippet err(key: keyof FormErrors)}
	{#if errors[key]}
		<p class="field-err" id={id(key + '-err')}><Icon name="alert" size={18} />{errors[key]}</p>
	{/if}
{/snippet}

<div class="field">
	<label for={id('nom')}>Nom</label>
	<input
		id={id('nom')}
		bind:value={values.nom}
		autocomplete="family-name"
		autocapitalize="words"
		maxlength="80"
		aria-required="true"
		aria-invalid={errors.nom ? 'true' : undefined}
		aria-describedby={errors.nom ? id('nom-err') : undefined}
	/>
	{@render err('nom')}
</div>

<div class="field">
	<label for={id('prenom')}>Prénom</label>
	<input
		id={id('prenom')}
		bind:value={values.prenom}
		autocomplete="given-name"
		autocapitalize="words"
		maxlength="80"
		aria-required="true"
		aria-invalid={errors.prenom ? 'true' : undefined}
		aria-describedby={errors.prenom ? id('prenom-err') : undefined}
	/>
	{@render err('prenom')}
</div>

<div class="field">
	<label for={id('telephone')}>Téléphone</label>
	<input
		id={id('telephone')}
		type="tel"
		inputmode="tel"
		autocomplete="tel"
		placeholder="01 97 00 00 00"
		bind:value={values.telephone}
		maxlength="30"
		aria-required="true"
		aria-invalid={errors.telephone ? 'true' : undefined}
		aria-describedby={errors.telephone ? id('telephone-err') : id('telephone-hint')}
	/>
	{#if errors.telephone}
		{@render err('telephone')}
	{:else}
		<p class="hint" id={id('telephone-hint')}>Il sert à éviter les doublons.</p>
	{/if}
</div>

<fieldset class="field" aria-describedby={errors.statut ? id('statut-err') : undefined}>
	<legend>Statut</legend>
	<div class="choice" aria-invalid={errors.statut ? 'true' : undefined}>
		<label>
			<input id={id('statut')} type="radio" name={id('statut')} value="membre" bind:group={values.statut} />
			Membre JCI
		</label>
		<label>
			<input type="radio" name={id('statut')} value="invite" bind:group={values.statut} />
			Invité
		</label>
	</div>
	{@render err('statut')}
</fieldset>

{#if values.statut === 'membre'}
	<div class="field">
		<label for={id('jciLocaleId')}>Votre JCI locale ou province</label>
		<select
			id={id('jciLocaleId')}
			bind:value={values.jciLocaleId}
			aria-required="true"
			aria-invalid={errors.jciLocaleId ? 'true' : undefined}
			aria-describedby={errors.jciLocaleId ? id('jciLocaleId-err') : undefined}
		>
			<option value="" disabled>Choisir dans la liste</option>
			{#each locales as l (l.id)}
				<option value={l.id}>{l.nom}</option>
			{/each}
			<option value="autre">Autre (à préciser)</option>
		</select>
		{@render err('jciLocaleId')}
	</div>
	{#if values.jciLocaleId === 'autre'}
		<div class="field">
			<label for={id('jciAutre')}>Nom de votre JCI locale</label>
			<input
				id={id('jciAutre')}
				bind:value={values.jciAutre}
				maxlength="120"
				aria-required="true"
				aria-invalid={errors.jciAutre ? 'true' : undefined}
				aria-describedby={errors.jciAutre ? id('jciAutre-err') : undefined}
			/>
			{@render err('jciAutre')}
		</div>
	{/if}
{:else if values.statut === 'invite'}
	<div class="field">
		<label for={id('organisation')}>Votre organisation</label>
		<input
			id={id('organisation')}
			bind:value={values.organisation}
			placeholder="Entreprise, association, institution…"
			maxlength="120"
			aria-required="true"
			aria-invalid={errors.organisation ? 'true' : undefined}
			aria-describedby={errors.organisation ? id('organisation-err') : undefined}
		/>
		{@render err('organisation')}
	</div>
{/if}
