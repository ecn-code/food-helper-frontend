<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'icon';

	const variantClasses: Record<Variant, string> = {
		primary:
			'border border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm hover:bg-[hsl(var(--primary)/0.92)]',
		secondary:
			'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm hover:bg-[hsl(var(--secondary))]',
		ghost:
			'border border-transparent bg-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
		danger:
			'border border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] shadow-sm hover:bg-[hsl(var(--destructive)/0.92)]'
	};

	const sizeClasses: Record<Size, string> = {
		sm: 'h-9 px-3 text-sm',
		md: 'h-10 px-3.5 text-sm',
		icon: 'size-9 px-0'
	};

	let {
		variant = 'primary',
		size = 'md',
		class: className = '',
		children,
		type = 'button',
		...rest
	}: HTMLButtonAttributes & {
		variant?: Variant;
		size?: Size;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<button
	{type}
	class={cn(
		'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
		variantClasses[variant],
		sizeClasses[size],
		className
	)}
	{...rest}
>
	{@render children?.()}
</button>
