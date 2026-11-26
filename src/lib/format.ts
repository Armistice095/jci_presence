/** Le Bénin est en UTC+1 toute l'année (pas d'heure d'été). */
export const TZ = 'Africa/Porto-Novo';

/** « 2026-11-28 » → « samedi 28 novembre 2026 » */
export function fmtDate(d: string): string {
	return new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

export function fmtDateShort(d: string): string {
	return new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
}

export function fmtDateTime(iso: string): string {
	return new Date(iso).toLocaleString('fr-FR', {
		timeZone: TZ,
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function fmtTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

/** ISO (UTC) → valeur d'un <input type="datetime-local"> en heure du Bénin. */
export function toInputLocal(iso: string | null): string {
	if (!iso) return '';
	return new Date(new Date(iso).getTime() + 3_600_000).toISOString().slice(0, 16);
}

/** Valeur d'un <input type="datetime-local"> (heure du Bénin) → ISO UTC. */
export function fromInputLocal(v: string): string | null {
	return v ? new Date(`${v}:00+01:00`).toISOString() : null;
}

/** Date du jour au format YYYY-MM-DD, en heure du Bénin. */
export function todayBenin(): string {
	return new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
}

/** CSV lisible directement par Excel en français : séparateur « ; » et BOM UTF-8. */
export function toCsv(rows: string[][]): string {
	const esc = (v: string): string => {
		let s = v ?? '';
		// Neutralise les « formules » (=, @, +lettre…) pour qu'Excel ne les exécute pas.
		if (/^(=|@|\t|\r|[+-](?![\d\s]))/.test(s)) s = `'${s}`;
		return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
}

export function downloadBlob(name: string, content: string | Blob, type = 'text/csv;charset=utf-8') {
	const blob = content instanceof Blob ? content : new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(s: string): string {
	return (
		s
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-zA-Z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase() || 'evenement'
	);
}
