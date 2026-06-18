<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	let {
		label,
		value,
		hint = '',
		tone = 'default',
		children
	}: {
		label: string;
		value: string;
		hint?: string;
		tone?: 'default' | 'primary' | 'accent';
		children?: Snippet;
	} = $props();

	const toneClasses = {
		default: 'border-[hsl(var(--border))] bg-[hsl(var(--card))]',
		primary: 'border-[hsl(var(--primary)/0.24)] bg-[hsl(var(--primary)/0.04)]',
		accent: 'border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.07)]'
	};
</script>

<div
	class={cn('rounded-lg border p-4 shadow-sm', toneClasses[tone])}
>
	<div class="flex min-w-0 items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
		{#if children}
			<span class="grid size-6 shrink-0 place-items-center rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]">
				{@render children()}
			</span>
		{/if}
		<p class="truncate">{label}</p>
	</div>
	<p class="mt-3 break-words text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] tabular-nums">{value}</p>
	{#if hint}
		<p class="mt-1 break-words text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>
	{/if}
</div>
