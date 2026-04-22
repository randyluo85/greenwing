<template>
  <span
    class="status-badge"
    :class="[
      `status-badge--${type}`,
      `status-badge--${size}`
    ]"
  >
    <i v-if="icon" :class="icon" class="status-badge__icon"></i>
    <span class="status-badge__text">{{ displayValue }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

/**
 * StatusBadge - 统一状态徽章组件
 *
 * 功能特性：
 * - 5 种预设类型（success/warning/danger/info/primary）
 * - 3 种尺寸（small/medium/large）
 * - 可配置颜色和图标
 * - 圆角和阴影统一
 */

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['success', 'warning', 'danger', 'info', 'primary'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  text: {
    type: [String, Number],
    default: ''
  },
  icon: {
    type: String,
    default: ''
  }
})

const displayValue = computed(() => {
  if (props.text === undefined || props.text === null || props.text === '') {
    return '未知'
  }
  return String(props.text)
})
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  border-radius: var(--radius-full);
  font-weight: 500;
  white-space: nowrap;
}

/* Size variants */
.status-badge--small {
  padding: 2px var(--sp-2);
  font-size: var(--fs-xs);
  line-height: 1.4;
}

.status-badge--medium {
  padding: 4px var(--sp-3);
  font-size: var(--fs-sm);
  line-height: 1.5;
}

.status-badge--large {
  padding: 6px var(--sp-4);
  font-size: var(--fs-base);
  line-height: 1.5;
}

/* Type variants - Success */
.status-badge--success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.status-badge--success .status-badge__icon {
  color: var(--color-success);
}

/* Type variants - Warning */
.status-badge--warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.status-badge--warning .status-badge__icon {
  color: var(--color-warning);
}

/* Type variants - Danger */
.status-badge--danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.status-badge--danger .status-badge__icon {
  color: var(--color-danger);
}

/* Type variants - Info */
.status-badge--info {
  background: var(--color-info-light);
  color: var(--color-info);
}

.status-badge--info .status-badge__icon {
  color: var(--color-info);
}

/* Type variants - Primary */
.status-badge--primary {
  background: var(--color-primary-lighter);
  color: var(--color-primary);
}

.status-badge--primary .status-badge__icon {
  color: var(--color-primary);
}

/* Icon styling */
.status-badge__icon {
  font-size: 1em;
  line-height: 1;
}

/* Text styling */
.status-badge__text {
  line-height: 1;
}
</style>
