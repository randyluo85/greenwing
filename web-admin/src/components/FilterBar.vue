<template>
  <div class="filter-bar">
    <!-- Search Input -->
    <div v-if="searchable" class="filter-bar__search">
      <el-input
        :model-value="searchValue"
        :placeholder="searchPlaceholder"
        clearable
        @input="handleSearchInput"
        @clear="handleSearchClear"
      >
        <template #prefix>
          <i class="fa-solid fa-search"></i>
        </template>
      </el-input>
    </div>

    <!-- Filters -->
    <div class="filter-bar__filters">
      <template v-for="(filter, index) in filters" :key="index">
        <!-- Select Filter -->
        <el-select
          v-if="filter.type === 'select'"
          :model-value="filterValues[filter.key]"
          :placeholder="filter.placeholder"
          clearable
          @change="handleFilterChange(filter.key, $event)"
        >
          <el-option
            v-for="option in filter.options"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <!-- Date Range Filter -->
        <el-date-picker
          v-else-if="filter.type === 'date'"
          :model-value="filterValues[filter.key]"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :placeholder="filter.placeholder"
          @change="handleFilterChange(filter.key, $event)"
        />

        <!-- Multiple Select Filter -->
        <el-select
          v-else-if="filter.type === 'multiple'"
          :model-value="filterValues[filter.key]"
          :placeholder="filter.placeholder"
          multiple
          collapse-tags
          collapse-tags-tooltip
          @change="handleFilterChange(filter.key, $event)"
        >
          <el-option
            v-for="option in filter.options"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </template>
    </div>

    <!-- Actions -->
    <div class="filter-bar__actions">
      <div v-if="showResultCount" class="filter-bar__count">
        共 <strong>{{ resultCount }}</strong> 条结果
      </div>
      <el-button
        v-if="hasActiveFilters"
        type="info"
        plain
        @click="handleClearAll"
      >
        <i class="fa-solid fa-rotate-left"></i>
        重置
      </el-button>
      <slot name="extra-actions"></slot>
    </div>
  </div>
</template>

<script setup>
/**
 * FilterBar - 统一筛选栏组件
 *
 * 功能特性：
 * - 响应式布局（移动端堆叠）
 * - 搜索框
 * - 下拉筛选器
 * - 日期选择器
 * - 清空筛选按钮
 * - 筛选结果统计
 */

import { computed, ref, watch } from 'vue'

const props = defineProps({
  // 筛选配置
  filters: {
    type: Array,
    default: () => []
  },
  // 搜索相关
  searchable: {
    type: Boolean,
    default: true
  },
  searchPlaceholder: {
    type: String,
    default: '搜索...'
  },
  searchValue: {
    type: String,
    default: ''
  },
  // 结果统计
  showResultCount: {
    type: Boolean,
    default: false
  },
  resultCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['search', 'filter-change', 'clear-all'])

// 筛选值存储
const filterValues = ref({})

// 初始化筛选值
watch(() => props.filters, (filters) => {
  filters.forEach(filter => {
    if (!(filter.key in filterValues.value)) {
      filterValues.value[filter.key] = filter.defaultValue || null
    }
  })
}, { immediate: true })

// 是否有激活的筛选
const hasActiveFilters = computed(() => {
  return Object.values(filterValues.value).some(value =>
    value !== null && value !== undefined && value !== ''
  )
})

// 处理搜索输入（防抖）
let searchDebounceTimer = null
const handleSearchInput = (value) => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    emit('search', value)
  }, 300)
}

// 处理搜索清空
const handleSearchClear = () => {
  emit('search', '')
}

// 处理筛选变化
const handleFilterChange = (key, value) => {
  filterValues.value[key] = value
  emit('filter-change', { key, value, allFilters: filterValues.value })
}

// 处理清空所有筛选
const handleClearAll = () => {
  Object.keys(filterValues.value).forEach(key => {
    filterValues.value[key] = null
  })
  emit('clear-all')
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--sp-4);
  flex-wrap: wrap;
}

.filter-bar__search {
  flex: 1;
  min-width: 200px;
}

.filter-bar__filters {
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
  flex: 2;
}

.filter-bar__filters > * {
  min-width: 150px;
}

.filter-bar__actions {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-shrink: 0;
}

.filter-bar__count {
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.filter-bar__count strong {
  color: var(--color-text-primary);
  font-weight: 600;
}

/* 响应式布局 */
@media (max-width: 767px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--sp-2);
  }

  .filter-bar__search {
    width: 100%;
    min-width: 100%;
  }

  .filter-bar__filters {
    width: 100%;
    flex-direction: column;
    gap: var(--sp-2);
  }

  .filter-bar__filters > * {
    width: 100%;
    min-width: 100%;
  }

  .filter-bar__actions {
    width: 100%;
    justify-content: space-between;
    margin-top: var(--sp-2);
  }
}

/* 确保触摸目标足够大 */
@media (max-width: 767px) {
  .filter-bar .el-input,
  .filter-bar .el-select,
  .filter-bar .el-date-picker,
  .filter-bar .el-button {
    min-height: 44px;
  }
}
</style>
