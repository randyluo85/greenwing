# QA Report - web-admin (localhost:5182)

**Date:** 2026-04-11
**URL:** http://localhost:5182
**Framework:** Vue3 + Element Plus
**Pages Tested:** 6
**Screenshots:** 9
**Tool:** chrome-devtools-axi

---

## Health Score: 78/100

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Console | 60 | 15% | 9.0 |
| Links | 100 | 10% | 10.0 |
| Visual | 90 | 10% | 9.0 |
| Functional | 75 | 20% | 15.0 |
| UX | 80 | 15% | 12.0 |
| Performance | 100 | 10% | 10.0 |
| Content | 95 | 5% | 4.75 |
| Accessibility | 85 | 15% | 12.75 |

**Final Score: 78** (rounded from 82.5, penalized for functional issues)

---

## Issues Found

### ISSUE-001: Dialog "取消" 按钮无法关闭弹窗
- **Severity:** Medium
- **Category:** Functional
- **Pages:** Users (调整积分), Events (创建活动)
- **Repro:**
  1. Navigate to /users
  2. Click "调整积分" on any user
  3. Click "取消" button in dialog
  4. Dialog remains open
- **Note:** X 关闭按钮和 ESC 键可以正常关闭弹窗。仅"取消"按钮无效。
- **Screenshot:** users-points-dialog.png

### ISSUE-002: el-pagination `small` 属性即将废弃
- **Severity:** Low
- **Category:** Console
- **Pages:** Users, Orders
- **Console Warning:** `[el-pagination] [API] small is about to be deprecated in version 3.0.0, please use size instead.`
- **Fix:** 将 `small` 属性替换为 `size="small"`

### ISSUE-003: 表单字段缺少 id/name 属性
- **Severity:** Low
- **Category:** Accessibility
- **Pages:** Users, Orders, Settings
- **Console Warning:** `A form field element should have an id or name attribute (count: 1)`
- **Note:** Settings 页面更严重 - 3 个表单字段缺少 label 关联

### ISSUE-004: 活动管理"封面图"显示为占位文字
- **Severity:** Low
- **Category:** Visual
- **Pages:** Events
- **Detail:** 所有 4 个活动卡片的封面图区域显示为文字"封面图"而非实际图片。属于 mock 数据原型阶段的预期行为。

---

## Page-by-Page Results

### 1. Dashboard (/dashboard)
- **Console:** No errors
- **Navigation:** All 6 menu items work
- **Interactions:** Tab switches (月/年/全部, 周/月) respond to clicks
- **Data:** Mock data displays correctly - stats cards, chart labels, activity progress, recent activity feed, member distribution
- **Screenshot:** dashboard.png
- **Status:** PASS

### 2. Users (/users)
- **Console:** 2 warnings (pagination deprecation + form field id)
- **Search:** Works correctly - typing "张三" filters to 1 result, reset restores 5
- **Filters:** Level dropdown, role dropdown, date range pickers all present
- **Table:** 5 users with correct data (会员号, 昵称, 手机号, 等级, 积分, 角色, 注册时间)
- **Actions:** "调整积分" opens dialog correctly. "编辑" button present.
- **Dialog:** Shows current points (1520), increase/decrease radio, amount spinner, reason textarea
- **Bug:** "取消" button does not close dialog
- **Screenshots:** users-page.png, users-points-dialog.png
- **Status:** PASS WITH ISSUES (ISSUE-001, ISSUE-002, ISSUE-003)

### 3. Events (/events)
- **Console:** No errors
- **Tabs:** 全部(4), 已发布(3), 草稿(1), 已结束(0) - counts correct
- **Cards:** 4 events with cover placeholder, title, status badge, type (免费/积分/付费), time, location, speaker, signup progress
- **Create Dialog:** Complete form with title, category, capacity, datetime, location, speaker, cover upload, description, registration mode (免费/积分/付费), reward points, initial status
- **Bug:** Same "取消" issue as Users page
- **Screenshots:** events-page.png, events-create-dialog.png
- **Status:** PASS WITH ISSUES (ISSUE-001)

### 4. Orders (/orders)
- **Console:** 2 warnings (same as Users)
- **Tabs:** 全部(4), 已支付(1), 待退款(2) with badge, 已退款(1), 已关闭(0)
- **Table:** 4 orders with order number, user, event, amount, status, payment time
- **Search/Filter:** Order search, event dropdown, date range
- **Refund Dialog:** Complete - shows order details, refund amount, payment method, user reason, refund policy, approval notes textarea, reject/approve buttons
- **Export button:** Present
- **Screenshots:** orders-page.png, orders-refund-dialog.png
- **Status:** PASS WITH ISSUES (ISSUE-002, ISSUE-003)

### 5. Content (/content)
- **Console:** No errors
- **Tabs:** 轮播管理 / 推荐图书 - both work
- **轮播管理:** 3 items (2 online, 1 offline) with sort/move, edit, online/offline toggle, delete (for offline only)
- **推荐图书:** 3 books (活着, 三体, 小王子) with cover, title, author, description, edit/delete
- **Screenshot:** content-page.png
- **Status:** PASS

### 6. Settings (/settings)
- **Console:** 1 warning (3 form fields missing label association)
- **签到积分规则:** Daily base (10), consecutive bonus (5), reset button
- **会员等级:** 青铜(0-499), 白银(500-999), 黄金(1000+), editable thresholds
- **订单设置:** Payment timeout (15 minutes)
- **Save button:** Present
- **Screenshot:** settings-page.png
- **Status:** PASS WITH ISSUES (ISSUE-003)

---

## Top 3 Things to Fix

1. **ISSUE-001** - Dialog "取消"按钮无效（影响 Users 和 Events 两个页面）
2. **ISSUE-002** - el-pagination `small` 属性废弃警告（影响 Users 和 Orders）
3. **ISSUE-003** - 表单字段可访问性问题（影响 Users, Orders, Settings）

---

## Summary

- **Total issues found:** 4
- **Critical:** 0
- **High:** 0
- **Medium:** 1 (dialog cancel button)
- **Low:** 3 (deprecation warning, form accessibility, placeholder images)

作为 mock 数据原型，整体功能完整度很高。6 个页面全部可正常加载和导航，核心交互流程（搜索、筛选、弹窗表单、Tab 切换）均工作正常。主要问题是弹窗取消按钮的交互 bug 和 Element Plus 版本兼容性警告。
