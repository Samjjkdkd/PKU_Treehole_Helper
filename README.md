# PKU TreeHole Helper

## 介绍

PKU TreeHole Helper 是一个专为北大树洞用户设计的浏览器扩展，旨在提升树洞使用体验。该扩展提供了多种实用功能，帮助用户更高效地浏览、收集和分析树洞内容。

### 主要特性：

- 🔍 **树洞收藏统计**：快速统计和排序帖子的收藏数和评论数
- 💬 **评论收集整理**：一键收集树洞中的所有评论，支持自动滚动
- 📊 **数据筛选分析**：按发言人筛选评论，方便追踪对话
- 📤 **灵活数据导出**：支持文本和图片格式导出，可选择性复制到剪贴板

本扩展完全在本地运行，不会将您的数据发送到任何服务器，保护您的隐私安全。

---

## 安装与使用教程

### 安装方法

#### 方法一：从 Chrome 网上应用店安装（推荐）

1. 访问 Chrome 网上应用店中的 PKU TreeHole Helper 页面（待发布）
2. 点击"添加至 Chrome"按钮
3. 在弹出的确认窗口中点击"添加扩展程序"

#### 方法二：开发者模式安装 （目前唯一可行方案）

1. 下载本项目的 ZIP 压缩包并解压到本地文件夹
2. 打开 Chrome 浏览器，在地址栏输入：`chrome://extensions/`
3. 在右上角开启"开发者模式"
4. 点击左上角的"加载已解压的扩展程序"
5. 选择解压后的文件夹

### 基本使用

安装完成后，扩展会自动在北大树洞页面启用。您可以通过以下方式访问扩展功能：

- 在树洞主页，点击右下角的悬浮按钮使用收藏统计功能
- 在树洞详情页，点击标题旁的绿色小树图标使用评论收集功能
- 点击浏览器工具栏中的扩展图标，访问设置和使用教程

---

## 功能使用教程

### 1. 树洞收藏统计

此功能可以统计当前页面的树洞帖子的收藏数和评论数，便于发现热门内容。

**使用步骤：**

1. 在树洞首页，点击右下角的悬浮按钮
2. 在弹出的面板中，您可以：
   - 设置最大收集时间（默认 5 分钟）
   - 设置最大帖子数量（默认 3000 条）
   - 勾选"自动滚动"选项（推荐）
   - 可选择设置时间范围限制收集
3. 点击"开始收集数据"按钮
4. 系统会自动滚动页面并收集数据
5. 收集完成后，您可以：
   - 按收藏数排序查看最热门的帖子
   - 按评论数排序查看讨论最活跃的帖子
   - 按时间排序查看最新的帖子
   - 使用面板底部的按钮将数据导出为文本或图片格式

### 2. 树洞评论收集

此功能可以一键收集树洞详情页中的所有评论，便于整体阅读和保存。

**使用步骤：**

1. 在树洞详情页面，点击页面上方标题旁的绿色小树图标
2. 在弹出的对话框中：
   - 确认"自动滚动"选项已勾选（默认已勾选）
   - 点击"开始收集"按钮
3. 系统会自动滚动页面并收集所有评论
4. 收集完成后，您可以：
   - 使用"只看"下拉菜单按发言人筛选评论
   - 查看收集统计信息（评论数量、用时、最晚评论时间）
   - 点击"文本格式"或"图片格式"按钮导出评论

### 3. 数据导出功能

扩展提供了灵活的数据导出选项，支持文本和图片两种格式，并可配置导出行为。

**导出设置：**

1. 点击浏览器工具栏中的扩展图标
2. 切换到"设置"标签
3. 在"导出方式设置"下拉菜单中选择：
   - 仅保存到本地
   - 仅复制到剪贴板
   - 保存到本地并复制到剪贴板（默认）
4. 点击"保存设置"按钮

**文本格式导出：**
- 导出为纯文本文件，包含完整评论信息
- 适合需要进一步处理文本数据的场景
- 没有显示条数限制，包含全部数据

**图片格式导出：**
- 导出为 PNG 图片，保留格式和样式
- 适合直接分享和展示
- 为避免文件过大，图片格式默认限制显示前 50 条评论（树洞收藏统计则限制为 30 条）

### 4. 高级功能提示

- **自动停止收集**：当评论收集进度达到 100%时，系统会自动停止收集
- **手动模式智能停止**：在未开启自动滚动的情况下，如果评论数量在一定时间内没有变化，系统会自动停止收集
- **自定义复选框设置**：可随时启用或禁用自动滚动功能，适应不同场景需求

---

## 常见问题

**Q: 为什么有时候图片无法复制到剪贴板？**  
A: 复制图片到剪贴板需要浏览器支持 ClipboardItem API，部分旧版浏览器可能不支持此功能。

**Q: 为什么导出的图片只显示部分内容？**  
A: 为避免生成过大的图片文件，图片导出时会限制显示条数。如需完整数据，请使用文本格式导出。

**Q: 收集过程中浏览器变卡怎么办？**  
A: 如果遇到性能问题，建议设置较低的收集时间限制或数量限制，或取消自动滚动，改为手动滚动。

**Q: 被树洞封号怎么办？**  
A: 目前没有遇到过这个问题，不过还是请谨慎使用，只要不爬取太多的帖子数据应该不会被封。目前跑过5分钟，3000条帖子，往前一天的没有问题。

---

**如有问题或建议，请联系开发者：**  
- QQ：985991388
- 微信/电话：18610806076
