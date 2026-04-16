<template>
  <div class="empty-state">
    <div v-if="icon" class="empty-state__icon">
      <i :class="icon"></i>
    </div>
    <div v-else class="empty-state__icon empty-state__icon--default">
      <i :class="defaultIcon"></i>
    </div>

    <h3 v-if="title" class="empty-state__title">{{ title }}</h3>
    <h3 v-else class="empty-state__title">{{ defaultTitle }}</h3>

    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <p v-else-if="defaultDescription" class="empty-state__description">{{ defaultDescription }}</p>

    <div v-if="$slots.default" class="empty-state__content">
      <slot></slot>
    </div>

    <div v-if="actionText || $slots.action" class="empty-state__action">
      <slot name="action">
        <el-button type="primary" @click="handleAction">
          {{ actionText }}
        </el-button>
      </slot>
    </div>
  </div>
</template>

<script setup>
/**
 * EmptyState - 统一空状态组件
 *
 * 功能特性：
 * - 统一的空状态视觉
 * - 可配置图标和文案
 * - 支持操作按钮
 * - 插槽支持自定义内容
 * - 3 种预设类型（noData/noResult/error）
 */

import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'noData',
    validator: (value) => ['noData', 'noResult', 'error'].includes(value)
  },
  icon: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  actionText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['action'])

const defaultIcon = computed(() => {
  switch (props.type) {
    case 'noResult':
      return 'fa-solid fa-search'
    case 'error':
      return 'fa-solid fa-circle-exclamation'
    case 'noData':
    default:
      return 'fa-solid fa-inbox'
  }
})

const defaultTitle = computed(() => {
  switch (props.type) {
    case 'noResult':
      return '未找到相关内容'
    case 'error':
      return '出错了'
    case 'noData':
    default:
      return '暂无数据'
  }
})

const defaultDescription = computed(() => {
  switch (props.type) {
    case 'noResult':
      return '请尝试调整筛选条件或搜索关键词'
    case 'error':
      return '加载失败，请稍后重试'
    case 'noData':
    default:
      return '还没有任何数据'
  }
})

const handleAction = () => {
  emit('action')
}
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px var(--sp-5);
  text-align: center;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
}

.empty-state__icon {
  font-size: 48px;
  margin-bottom: var(--sp-4);
  opacity: 0.5;
  line-height: 1;
}

.empty-state__icon--default {
  color: var(--color-text-tertiary);
}

.empty-state__title {
  margin: 0 0 var(--sp-2) 0;
  font-size: var(--fs-lg);
  font-weight: 500;
  color: var(--color-text-primary);
}

.empty-state__description {
  margin: 0 0 var(--sp-4) 0;
  font-size: var(--fs-base);
  line-height: var(--lh-normal);
  max-width: 400px;
}

.empty-state__content {
  margin-bottom: var(--sp-4);
}

.empty-state__action {
  display: flex;
  gap: var(--sp-3);
  justify-content: center;
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .empty-state {
    padding: 32px var(--sp-4);
  }

  .empty-state__icon {
    font-size: 36px;
  }

  .empty-state__title {
    font-size: var(--fs-base);
  }

  .empty-state__description {
    font-size: var(--fs-sm);
  }
}
</style>
