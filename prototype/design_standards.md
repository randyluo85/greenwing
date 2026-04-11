| 版本 | 创建时间 | 更新时间 | 文档主题 | 创建人 |
| :--- | :--- | :--- | :--- | :--- |
| v1.1 | 2026-04-11 | 2026-04-11 | Tehran (Emerald-Modern) 设计标准更新 | Antigravity |

# Tehran (Emerald-Modern) 设计系统标准 (Design Standards)

本文档总结了 `tehran` 系列界面的核心设计规范，旨在确保后续页面开发的一致性和高品质视觉效果。

## 1. 设计令牌 (Design Tokens)

### 颜色系统 (Colors)
| Token | Hex | 用途 |
| :--- | :--- | :--- |
| `primary` | `#14b8a6` | 主色调，Teal色，用于核心按钮、激活状态、重要标识 |
| `secondary` | `#2dd4bf` | 次要色，用于辅助图标装饰、背景色块 |
| `accent` | `#f59e0b` | 强调色，橘黄色，用于积分高亮、通知点、促销标识 |
| `bg` | `#f5f6f8` | 页面全局背景色 |
| `surface` | `#E0F2F1` | 浅色容器背景、轻微边框颜色 |
| `text-main` | `#1E293B` | 主要标题和正文文本 |
| `text-gray-500` | `#64748B` | 辅助文字、静止图标 |
| `text-gray-400` | `#94A3B8` | 次要说明文字、元数据 |

### 圆角与形状 (Radius & Shapes)
*   **全局圆角**: 严格遵循 **4px** 规范。
    *   `sm`: `2px` (用于书籍封面等极小元素)
    *   `DEFAULT / md / lg / xl / 2xl / 3xl`: 统一使用 `4px`。
    *   `full`: `9999px` (用于搜索框、胶囊按钮、圆形通知)

### 排版建议 (Typography)
*   **字体族**: `'PingFang SC'`, `'Inter'`, `system-ui`, `-apple-system`, `sans-serif`
*   **页面标题**: `text-base font-bold` (16px)
*   **板块标题**: `text-[17px] font-bold` (17px)
*   **列表标题**: `text-[17px] font-bold` (17px)
*   **正文/小字**: `text-xs` (12px), `text-[10px]`, `text-[11px]`

---

## 2. 核心组件规范 (Components)

### 页眉 (Universal Header)
*   **高度**: `h-12` (48px)
*   **样式**: `sticky top-0`, `bg-white`, `border-b border-gray-100`
*   **结构**: 左侧返回键(可选)，中间标题，右侧胶囊控制区 (包含徽标和更多操作)。

### 列表展示卡片 (Activity/Event Card)
*   **布局**: `flex space-x-3`
*   **容器**: `bg-white`, `p-2`, `rounded`, `border border-gray-50`, `shadow-sm`
*   **图片**: `w-24 h-24` (96x96), `rounded`, `object-cover`
*   **文字**: 标题 `text-[17px] font-bold`, 元数据 `text-[11px]` 或 `text-[10px]`。

### 快捷操作格 (Action Grid)
*   **布局**: `grid-cols-2`, `gap-3`
*   **单元**: `bg-white`, `border border-[#E0F2F1]`, `rounded`, `p-4`, `shadow-sm`

### 书籍推荐卡片 (Book Recommendation)
*   **尺寸**: `min-w-[110px]`
*   **封面**: `aspect-[3/4]`, `rounded-sm (2px)`, `shadow-md`, `border border-gray-100`

### 底部导航栏 (Bottom Navigation)
*   **高度**: `h-16` (64px)
*   **样式**: `fixed bottom-0`, `bg-white`, `border-t border-gray-100`, `px-6`
*   **交互**: 激活项显示 `primary` 色彩，下方带有 4px 装饰圆点。

---

## 3. 交互与动效 (Interactions & Motion)

*   **点击反馈**: 所有可点击按钮/卡片必须添加 `.btn-active`。
    ```css
    .btn-active:active { transform: scale(0.97); transition: transform 0.1s; }
    ```
*   **背景模糊**: 浮层元素使用 `backdrop-blur-md` 增加高级感。
*   **滚动**: 隐藏水平滚动的滚动条 (使用 `.no-scrollbar`)。

---

## 4. 设计原则 (Principles)

1.  **Strict 4px Radius**: 除极少数场景使用极细圆角外，容器如卡片等常规圆角使用 4px 到 10px。
2.  **Harmonious Teal**: 以 `#14b8a6` (Teal) 为核心的青水色系，配合 `#f5f6f8` 冷色调背景。
3.  **Visual Hierarchy**: 使用加粗字体 (`font-bold`) 区分信息层级，小字保持高对比度。
4.  **Premium Space**: 在弹窗顶部使用带有氛围感且和容器无缝贴合的精美插图，营造高级品牌调性。
