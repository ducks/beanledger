<script lang="ts">
  import { page } from '$app/stores';
  import RoastPlanner from '$lib/components/RoastPlanner.svelte';

  $: date = $page.url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
</script>

<RoastPlanner initialDate={date} />
