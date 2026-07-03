<script lang="ts">
	import { CircleAlert, X } from '@lucide/svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let {
		open = false,
		title,
		message,
		items = [],
		onClose
	}: {
		open?: boolean;
		title: string;
		message: string;
		items?: string[];
		onClose?: () => void;
	} = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm" role="presentation">
		<div
			class="w-full max-w-md rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="validation-dialog-title"
			data-testid="validation-dialog"
		>
			<div class="flex items-start gap-3">
				<span class="grid size-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]">
					<CircleAlert class="size-5" aria-hidden="true" />
				</span>
				<div class="min-w-0">
					<h2 id="validation-dialog-title" class="text-lg font-semibold text-[hsl(var(--foreground))]">{title}</h2>
					<p class="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{message}</p>
				</div>
			</div>

			{#if items.length > 0}
				<ul class="mt-4 space-y-2 rounded-lg border border-[hsl(var(--destructive)/0.14)] bg-[hsl(var(--destructive)/0.04)] px-4 py-3 text-sm text-[hsl(var(--foreground))]">
					{#each items as item}
						<li class="flex items-start gap-2">
							<span class="mt-2 size-1.5 shrink-0 rounded-full bg-[hsl(var(--destructive))]" aria-hidden="true"></span>
							<span class="min-w-0 break-words">{item}</span>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="mt-6 flex justify-end">
				<Button type="button" variant="secondary" onclick={onClose} autofocus data-testid="validation-dialog-close">
					<X class="size-4" aria-hidden="true" />
					Cerrar
				</Button>
			</div>
		</div>
	</div>
{/if}
