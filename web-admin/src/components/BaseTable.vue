<template>
  <div class="base-table-wrapper">
    <!-- Loading Skeleton -->
    <div v-if="loading" class="base-table__skeleton">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="!loading && data.length === 0"
      :type="emptyType"
      :description="emptyText"
    />

    <!-- Table Content -->
    <div v-else class="base-table">
      <div class="table-responsive">
        <el-table
          :data="data"
          :stripe="striped"
          :border="border"
          :height="height"
          :max-height="maxHeight"
          :empty-text="emptyText"
          @sort-change="handleSortChange"
          @selection-change="handleSelectionChange"
          style="width: 100%"
        >
          <!-- Selection Column -->
          <el-table-column
            v-if="selectable"
            type="selection"
            width="55"
            fixed="left"
          />

          <!-- Index Column -->
          <el-table-column
            v-if="showIndex"
            type="index"
            label="序号"
            width="60"
            :index="indexMethod"
          />

          <!-- Dynamic Columns -->
          <template v-for="column in columns" :key="column.prop">
            <!-- Slot Column (Custom Content) -->
            <el-table-column
              v-if="column.slot"
              :prop="column.prop"
              :label="column.label"
              :width="column.width"
              :min-width="column.minWidth"
              :fixed="column.fixed"
              :sortable="column.sortable"
              :align="column.align || 'left'"
            >
              <template #default="scope">
                <slot :name="column.slot" :row="scope.row" :index="scope.$index">
                  {{ scope.row[column.prop] }}
                </slot>
              </template>
            </el-table-column>

            <!-- Regular Column -->
            <el-table-column
              v-else
              :prop="column.prop"
              :label="column.label"
              :width="column.width"
              :min-width="column.minWidth"
              :fixed="column.fixed"
              :sortable="column.sortable"
              :formatter="column.formatter"
              :align="column.align || 'left'"
            />
          </template>

          <el-table-column
            v-if="$slots.actions"
            label="操作"
            :width="actionsWidth"
            :fixed="actionsFixed"
            align="center"
            class-name="actions-column"
          >
            <template #default="scope">
              <slot name="actions" :row="scope.row" :index="scope.$index"></slot>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination" class="base-table__pagination">
        <div class="pagination__info">
          显示第 {{ paginationStart }} 到 {{ paginationEnd }} 条，
          共 {{ total }} 条记录
        </div>
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="pagination.pageSizes || [10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * BaseTable - 统一表格组件
 *
 * 功能特性：
 * - 响应式表格（移动端横向滚动）
 * - 统一样式（边框、间距、行高）
 * - 内置分页器
 * - 空状态展示
 * - 加载骨架屏
 * - 列排序和筛选支持
 * - 斑马纹和悬停效果
 */

import { computed } from 'vue'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  // 表格数据
  data: {
    type: Array,
    default: () => []
  },
  // 列配置
  columns: {
    type: Array,
    default: () => []
  },
  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  // 分页配置
  pagination: {
    type: Object,
    default: null
  },
  // 斑马纹
  striped: {
    type: Boolean,
    default: false
  },
  // 边框
  border: {
    type: Boolean,
    default: true
  },
  // 空状态文案
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  // 表格高度
  height: {
    type: [String, Number],
    default: null
  },
  // 最大高度
  maxHeight: {
    type: [String, Number],
    default: null
  },
  // 是否可勾选
  selectable: {
    type: Boolean,
    default: false
  },
  // 是否显示序号
  showIndex: {
    type: Boolean,
    default: false
  },
  // 操作列宽度
  actionsWidth: {
    type: [String, Number],
    default: 150
  },
  // 操作列是否固定
  actionsFixed: {
    type: String,
    default: 'right'
  }
})

const emit = defineEmits([
  'sort-change',
  'selection-change',
  'page-change',
  'size-change'
])

// 计算总数
const total = computed(() => {
  return props.pagination?.total || props.data.length
})

// 计算分页起始
const paginationStart = computed(() => {
  if (!props.pagination) return 0
  return (props.pagination.page - 1) * props.pagination.pageSize + 1
})

// 计算分页结束
const paginationEnd = computed(() => {
  if (!props.pagination) return props.data.length
  const end = props.pagination.page * props.pagination.pageSize
  return Math.min(end, total.value)
})

// 空状态类型
const emptyType = computed(() => {
  return 'noData'
})

// 序号方法
const indexMethod = (index) => {
  if (!props.pagination) return index + 1
  return (props.pagination.page - 1) * props.pagination.pageSize + index + 1
}

// 处理排序变化
const handleSortChange = (sort) => {
  emit('sort-change', sort)
}

// 处理选择变化
const handleSelectionChange = (selection) => {
  emit('selection-change', selection)
}

// 处理页码变化
const handlePageChange = (page) => {
  emit('page-change', page)
}

// 处理每页数量变化
const handleSizeChange = (size) => {
  emit('size-change', size)
}
</script>

<style scoped>
.base-table-wrapper {
  width: 100%;
}

.base-table__skeleton {
  padding: var(--sp-5);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
}

.base-table {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* 响应式表格容器 */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Element Plus Table 样式覆盖 */
.base-table :deep(.el-table) {
  font-size: var(--fs-sm);
}

.base-table :deep(.el-table th.el-table__cell) {
  background: var(--color-gray-50);
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: var(--fs-base);
  padding: var(--sp-3) var(--sp-4);
}

.base-table :deep(.el-table td.el-table__cell) {
  padding: var(--sp-3) var(--sp-4);
  color: var(--color-text-primary);
}

.base-table :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: var(--color-gray-50);
}

.base-table :deep(.el-table__body tr:hover > td) {
  background: var(--color-primary-lighter) !important;
}

/* 分页区域 */
.base-table__pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--sp-4);
  border-top: 1px solid var(--color-border-light);
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.pagination__info {
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
}

/* 响应式调整 */
@media (max-width: 767px) {
  .base-table__skeleton {
    padding: var(--sp-4);
  }

  .base-table {
    border-radius: var(--radius-md);
  }

  .base-table :deep(.el-table th.el-table__cell),
  .base-table :deep(.el-table td.el-table__cell) {
    padding: var(--sp-2) var(--sp-3);
    font-size: var(--fs-xs);
  }

  .base-table__pagination {
    flex-direction: column;
    align-items: stretch;
    padding: var(--sp-3);
  }

  .pagination__info {
    text-align: center;
    margin-bottom: var(--sp-2);
  }

  .base-table__pagination :deep(.el-pagination) {
    justify-content: center;
  }

  .base-table__pagination :deep(.el-pagination__sizes),
  .base-table__pagination :deep(.el-pagination__jump) {
    display: none;
  }
}

/* 确保表格在移动端可滚动 */
@media (max-width: 767px) {
  .table-responsive {
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-xs);
  }

  .table-responsive::-webkit-scrollbar {
    height: 6px;
  }

  .table-responsive::-webkit-scrollbar-thumb {
    background: var(--color-gray-300);
    border-radius: var(--radius-full);
  }

  .table-responsive::-webkit-scrollbar-track {
    background: var(--color-gray-100);
    border-radius: var(--radius-full);
  }
}

/* 触摸目标优化 */
@media (max-width: 767px) {
  .base-table :deep(.el-button--small) {
    min-height: 32px;
    min-width: 32px;
  }

  .base-table :deep(.el-link) {
    min-height: 32px;
    min-width: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
