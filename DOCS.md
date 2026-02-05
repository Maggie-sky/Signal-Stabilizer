
# 信号稳定器 (Signal Stabilizer) - 部署与开发文档

## 1. Vercel 部署指南 (重点)

通过 Vercel 部署本应用非常简单，只需遵循以下步骤：

### 第一步：准备 API Key
1. 访问 [Google AI Studio](https://aistudio.google.com/)。
2. 登录并点击 "Get API key"。
3. 创建或获取一个 API Key，并妥善保存。

### 第二步：将代码推送到 GitHub
1. 在 GitHub 上创建一个新的私有或公开仓库。
2. 将项目的所有文件（包括新生成的 `package.json` 和 `vite.config.ts`）上传到该仓库。

### 第三步：在 Vercel 中导入
1. 登录 [Vercel 官网](https://vercel.com/)。
2. 点击 **"Add New"** -> **"Project"**。
3. 选择你刚刚创建的 GitHub 仓库。
4. 在 **"Configure Project"** 界面：
   - **Framework Preset**: 自动识别为 `Vite`（如果没有，请手动选择 `Vite`）。
   - **Build and Output Settings**: 保持默认。
   - **Environment Variables (关键)**: 
     - 在 `Key` 处输入 `API_KEY`。
     - 在 `Value` 处输入你在第一步获取的 Google Gemini API Key。
     - 点击 **"Add"**。

### 第四步：部署
1. 点击 **"Deploy"**。
2. 等待一分钟左右，你的应用就会获得一个公网访问地址。

---

## 2. PWA 功能说明
- **添加到主屏**: 部署成功后，在手机浏览器（如 Safari 或 Chrome）中打开地址，点击“分享”并选择“添加到主屏幕”，即可像原生 App 一样使用。
- **离线访问**: 即使在没有网络的情况下，应用的基础 UI 仍可加载。

## 3. 技术细节
- **模型**: 使用 `gemini-3-flash-preview` 处理对话与逻辑，`gemini-2.5-flash-image` 生成治愈系插画。
- **存储**: 所有心情日记、对话历史和用户偏好均通过 `localStorage` 存储在用户本地设备，保护隐私。
- **设计**: 基于“温暖、可爱、治愈”理念，采用圆润大圆角、珊瑚粉配色及毛绒绒的视觉效果。

## 4. 常见问题 (FAQ)
- **语音识别不工作**: 语音功能要求必须在 `HTTPS` 环境下运行，Vercel 默认提供 HTTPS。
- **API 请求失败**: 请检查 Vercel 环境变量中的 `API_KEY` 是否配置正确，且没有多余的空格。
- **图片无法生成**: 生成图片可能需要 5-10 秒，请在点击后耐心等待加载动画结束。
