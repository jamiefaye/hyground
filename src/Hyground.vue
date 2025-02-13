<script setup>
	 import { useRoute, useRouter } from 'vue-router';
	   import {onMounted, ref} from 'vue';
	const router = useRouter();
	const route = useRoute();
</script>

<template>

<main>
<RouterView />
</main>
</template>
