<script setup lang="ts">
import type { FrontendSettings } from '@n8n/api-types';
import { ref, computed, useCssModule, onMounted } from 'vue';

import LogoIcon from '../../../public/static/n8n-logo.png';
import LogoIconLight from '../../../public/static/n8n-logo.png';
import CollapsedLogo from '../../../public/static/collapsed_sin_fondo.png';

const props = defineProps<
	(
		| {
				location: 'authView';
		  }
		| {
				location: 'sidebar';
				collapsed: boolean;
		  }
	) & {
		releaseChannel: FrontendSettings['releaseChannel'];
	}
>();

const { location, releaseChannel } = props;

const $style = useCssModule();

const isDark = ref(false);
onMounted(() => {
	isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		isDark.value = e.matches;
	});
});

const logoSrc = computed(() => {
	if (location === 'sidebar' && (props as any).collapsed) {
		return CollapsedLogo;
	}
	return isDark.value ? LogoIcon : LogoIconLight;
});

const containerClasses = computed(() => {
	if (location === 'authView') {
		return [$style.logoContainer, $style.authView];
	}
	return [
		$style.logoContainer,
		$style.sidebar,
		(props as any).collapsed ? $style.sidebarCollapsed : $style.sidebarExpanded,
	];
});
</script>

<template>
	<div :class="containerClasses" data-test-id="n8n-logo">
		<img :src="logoSrc" :alt="'Logo'" :class="$style.logo" />
		<slot />
	</div>
</template>

<style lang="scss" module>
.logoContainer {
	display: flex;
	justify-content: center;
	align-items: center;
}

.logoText {
	margin-left: var(--spacing-5xs);
	path {
		fill: var(--color-text-dark);
	}
}

.authView {
	transform: scale(2);
	margin-bottom: var(--spacing-xl);
}

.logo {
	max-width: 100px;
	width: 100px;
	height: auto !important;
}

.logo,
.logoText {
	transform: scale(1.3) translateY(-2px);
}

.logoText {
	margin-left: var(--spacing-xs);
	margin-right: var(--spacing-3xs);
}

.sidebarExpanded .logo {
	margin-left: var(--spacing-2xs);
}

.sidebarCollapsed .logo {
	width: 40px;
	height: 30px;
	padding: 0 var(--spacing-4xs);
}
</style>
