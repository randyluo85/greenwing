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
  color: #6b7280;
  font-size: 11px;
  margin-bottom: 4px;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}
.stat-change {
  font-size: 11px;
  margin-top: 4px;
}
</style>
