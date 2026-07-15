<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Workspace from '$lib/components/app/Workspace.svelte';
	import { sectionFromPath } from '$lib/navigation';

	let { children } = $props();
	const section = $derived(sectionFromPath(page.url.pathname));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Workspace {section} />
<div class="hidden">{@render children()}</div>
