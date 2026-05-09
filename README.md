<div align="center">

  <h1>X-Family Grid</h1>
  <p>🚀 基于 Electron、Vue 3 和 TypeScript 开发的 X (Twitter) 用户关系网络可视化图谱工具。</p>
</div>

---

## ✨ 核心特性 (Features)



- 🌌 **沉浸式关系网可视化**：基于 `@vue-flow/core` 构建的高性能节点拓扑图，支持平移、缩放和动态的节点高亮交互。
- ⚡ **无缝的数据获取层**：内置并行的请求队列 (`fetch-queue.ts`) 和基于自动抓取的底层接口，高效、稳定地获取关系网络数据。
- 🎨 **现代化动态 UI 设计**：精美的深色模式 (Dark Mode)，结合 `tailwindcss` 与 `GSAP` 打造流畅细腻的 UI 微动画体验。
- 🔐 **本地安全会话管理**：内建基于本地的 Session 管理 (`session-manager.ts`)，所有数据和认证状态仅在你的设备本地存储，最大限度保护隐私安全。
- 💾 **灵活的数据管理与导出**：通过 `export-manager.ts` 和 `file-manager.ts` 支持图谱数据以及图片的快速保存与导出。

## 🛠️ 技术栈 (Tech Stack)

- **桌面端框架**: Electron
- **前端框架**: Vue 3 (Composition API) + Vite
- **开发语言**: TypeScript
- **样式与UI**: Tailwind CSS, Radix Vue, Lucide Icons
- **动画引擎**: GSAP (GreenSock)
- **图表与可视化**: Vue Flow
- **状态管理**: Pinia

## 🚀 快速开始 (Quick Start)

### 推荐的 IDE 配置

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

### 1. 安装依赖

请确保你的开发环境中已经安装了 `Node.js` (建议 v18 及以上)。

```bash
# 在项目根目录下运行
$ npm install
```

### 2. 本地开发调试

启动本地的热更新开发服务器：

```bash
$ npm run dev
```

## 📦 打包构建 (Build)

完成开发后，你可以为不同的操作系统平台打包独立的应用程序：

```bash
# 为 Windows 打包
$ npm run build:win

# 为 macOS 打包
$ npm run build:mac

# 为 Linux 打包
$ npm run build:linux
```

> **提示:** 如果你只需要在本地解包验证打包后的文件结构，可以运行 `$ npm run build:unpack`。

## 🤝 代码规范与贡献 (Contributing)

我们非常欢迎对该项目的反馈和贡献。在提交代码前，请确保遵循以下代码检查与格式化流程：

```bash
# 格式化代码
$ npm run format

# 运行 ESLint 检查
$ npm run lint

# 运行 TypeScript 类型检查
$ npm run typecheck
```

---

<div align="center">
  <p>Made with ❤️ for elegant web & desktop experiences.</p>
</div>
