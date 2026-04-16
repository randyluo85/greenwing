<template>
  <div
    class="base-card"
    :class="[
      `base-card--shadow-${shadow}`,
      {
        'base-card--hoverable': hoverable,
        'base-card--bordered': bordered,
      }
    ]"
    :style="{ padding }"
  >
    <!-- Card Header -->
    <div v-if="title || $slots.header" class="base-card__header">
      <slot name="header">
        <div class="base-card__title-section">
          <h3 class="base-card__title">{{ title }}</h3>
          <p v-if="subtitle" class="base-card__subtitle">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.extra" class="base-card__extra">
          <slot name="extra"></slot>
        </div>
      </slot>
    </div>

    <!-- Card Body -->
    <div class="base-card__body">
      <slot></slot>
    </div>

    <!-- Card Footer -->
    <div v-if="$slots.footer" class="base-card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
/**
 * BaseCard - 统一卡片组件
 *
 * 功能特性：
 * - 统一阴影和圆角
 * - 悬停微交互（上移 + 阴影加深）
 * - 可配置 header 和 footer
 * - 响应式内边距
 * - 支持不同变体（default/flat/bordered）
 */

defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  shadow: {
    type: String,
    default: 'sm',
    validator: (value) => ['none', 'xs', 'sm', 'md', 'lg', 'xl'].includes(value)
  },
  hoverable: {
    type: Boolean,
    default: false
  },
  bordered: {
    type: Boolean,
    default: false
  },
  padding: {
    type: String,
    default: 'var(--sp-5)'
  }
})
</script>

<style scoped>
.base-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  transition: box-shadow var(--transition-base),
              transform var(--transition-base);
}

/* Shadow variants */
.base-card--shadow-none {
  box-shadow: none;
}

.base-card--shadow-xs {
  box-shadow: var(--shadow-xs);
}

.base-card--shadow-sm {
  box-shadow: var(--shadow-sm);
}

.base-card--shadow-md {
  box-shadow: var(--shadow-md);
}

.base-card--shadow-lg {
  box-shadow: var(--shadow-lg);
}

.base-card--shadow-xl {
  box-shadow: var(--shadow-xl);
}

/* Hover effect */
.base-card--hoverable {
  cursor: pointer;
}

.base-card--hoverable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.base-card--shadow-sm.base-card--hoverable:hover,
.base-card--shadow-xs.base-card--hoverable:hover {
  box-shadow: var(--shadow-md);
}

.base-card--shadow-lg.base-card--hoverable:hover {
  box-shadow: var(--shadow-xl);
}

/* Bordered variant */
.base-card--bordered {
  border: 1px solid var(--color-border);
}

/* Card Header */
.base-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: var(--sp-4);
}

.base-card__title-section {
  flex: 1;
}

.base-card__title {
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: var(--lh-normal);
}

.base-card__subtitle {
  margin: var(--sp-1) 0 0 0;
  font-size: var(--fs-base);
  color: var(--color-text-secondary);
  line-height: var(--lh-normal);
}

.base-card__extra {
  flex-shrink: 0;
  margin-left: var(--sp-4);
}

/* Card Body */
.base-card__body {
  flex: 1;
}

/* Card Footer */
.base-card__footer {
  padding-top: var(--sp-4);
  border-top: 1px solid var(--color-border-light);
  margin-top: var(--sp-4);
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .base-card {
    border-radius: var(--radius-md);
  }

  .base-card__header {
    flex-direction: column;
  }

  .base-card__extra {
    margin-left: 0;
    margin-top: var(--sp-3);
    width: 100%;
  }
}
</style>
