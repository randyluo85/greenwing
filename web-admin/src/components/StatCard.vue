<template>
  <div class="stat-card card" :style="{ borderLeftColor: color }">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-change" :style="{ color: changeColor }">{{ change }}</div>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  value: [String, Number],
  change: String,
  color: { type: String, default: '#00897B' },
  changeColor: { type: String, default: '#00897B' }
})
</script>

<style scoped>
.stat-card {
  border-left: 4px solid;
}
.stat-label {
  color: var(--color-text-secondary);
  font-size: var(--fs-sm);
  margin-bottom: var(--sp-1);
}
.stat-value {
  font-size: var(--fs-stat);
  font-weight: 700;
  color: var(--color-text-primary);
}
.stat-change {
  font-size: var(--fs-sm);
  margin-top: var(--sp-1);
}
</style>
