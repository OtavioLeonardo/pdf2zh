# PDF2ZH

`PDF2ZH` 是一个基于 `Tauri v2 + React + Mantine` 的桌面应用，用来把英文论文 `PDF` 一键转成中文 `Markdown + PDF`。

应用内现在提供独立的“使用教程”窗口，主页面只保留功能操作，不再承载说明文案。
你可以从这些入口打开教程：

- 主页面右上角的帮助按钮
- 主页面侧栏里的“使用教程”
- macOS 应用菜单里的“使用教程”

当前 MVP 已实现这条主链路：

- 选择单个英文论文 PDF
- 调用 `MinerU API` 提取 `Markdown + assets`
- 保护图片、表格、公式、代码和参考文献结构
- 自动预处理术语表，优先抽取标题、摘要和前文里的高价值学术术语
- 按章节/段落分段翻译
- 维护术语表并回填结构
- 用 `Pandoc + Tectonic` 生成统一模板的中文 PDF
- 导出：
  - `translated.md`
  - `translated.pdf`
  - `assets/`
  - `glossary.tsv`
  - `translation_report.json`

## 开发启动

```bash
npm install
cd src-tauri && cargo check
cd ..
npm run tauri dev
```

## 内置依赖打包

应用现在支持把运行时资源一起打进安装包，并在运行时优先使用这些内置依赖。

支持的内置依赖：

- `pandoc`
- `tectonic`
- `tectonic` 离线缓存种子（用于 PDF 首次渲染时不联网）
- `python` 运行时目录或 Python 可执行文件
- `site-packages` 里的可选 Python 依赖，例如 `keybert`、`pyate`、`spacy`

准备方式：

```bash
export PDF2ZH_BUNDLE_PANDOC=/absolute/path/to/pandoc
export PDF2ZH_BUNDLE_TECTONIC=/absolute/path/to/tectonic
export PDF2ZH_BUNDLE_TECTONIC_CACHE=/absolute/path/to/tectonic-cache
export PDF2ZH_BUNDLE_PYTHON_HOME=/absolute/path/to/python/home
# 或者只提供 Python 可执行文件
export PDF2ZH_BUNDLE_PYTHON_BIN=/absolute/path/to/python3

npm run runtime:prepare-tectonic-cache
npm run runtime:prepare
```

如果你希望把可选术语增强依赖也一起装进运行时目录，再执行：

```bash
npm run runtime:python-deps
```

脚本会把这些文件复制到 `backend/runtime/`，Tauri 打包时会自动带上。

运行时解析策略：

1. 开发环境优先看显式环境变量，例如 `PDF2ZH_PYTHON`
2. 然后尝试 `backend/runtime`
3. 只有开发环境才会再回退系统 PATH

Release 安装包不会再回退系统 PATH；如果内置 runtime 不完整，会直接报错。

## 必需环境

- 可访问的 `MinerU API`
- `OpenAI`、`Anthropic Claude` 或 `DeepSeek` API Key

如果你不走内置依赖打包，开发阶段仍然可以继续使用系统里的 `python3`；如果你想手动指定解释器，可以设置：

```bash
export PDF2ZH_PYTHON=/path/to/python3
```

## MinerU API 配置

桌面 UI 现在会直接收集：

- `MinerU API URL`
- `MinerU API Key`（可选）

支持两类接口形态：

- 同步解析接口，例如 `POST /file_parse`
- 异步任务接口，例如 `POST /tasks`，随后轮询任务状态和结果

当前适配逻辑会自动识别：

- 直接返回 `markdown / md / content`
- 返回 `task_id / taskId / id`，随后进入轮询
- 结果里的 `assets / images`

`OpenAI / Claude / DeepSeek` 的 API Key 同样由桌面 UI 输入，不通过环境变量传。

## 当前实现说明

- UI 是单页工作流，围绕“一键翻译”设计。
- 前端只负责表单和进度，实际流程由本地 `Python` sidecar 编排。
- 后端现在支持 `MinerU` 同步接口和异步任务接口两种模式。
- 术语表有三层来源：用户导入术语表、AI 预处理术语表、翻译过程中的增量术语更新。
- 默认优先级是“用户术语优先，AI 自动补充，不覆盖已有术语”。
- 设置页支持切换术语预处理方案：`llm_only`、`hybrid`、`pyate_only`、`keybert_only`。
- 默认术语预处理方案是 `llm_only`：直接用 LLM 基于标题、摘要和前文抽取并清洗术语。
- 术语表阶段可以单独指定模型，不必和正文翻译模型完全一致；当前默认沿用同一提供方和 API Key。
- 官方安装包默认只内置主流程需要的运行时；如果你额外执行了 `npm run runtime:python-deps`，这些可选术语增强依赖也会一起打进安装包。高阶用户可以在设置页切换到 `hybrid`、`pyate_only` 或 `keybert_only`。
- 设置页提供“检测术语增强环境”按钮，可以检查当前运行时是否已经安装 `pyate / KeyBERT` 相关依赖。
- 如果 `MinerU API` 响应里包含 `assets` 或 `images` 字段，脚本会尝试把图片资源写到导出目录的 `assets/` 中。
- PDF 生成时会优先使用内置打包的 `pandoc / tectonic / python`，找不到才回退系统环境。
- Release 安装包会强制使用内置打包的 `pandoc / tectonic / python / tectonic cache`，不再回退系统 PATH。
- 只要安装包内置 runtime 完整，用户离线状态下也可以直接重排和导出 PDF。
- PDF 生成失败时，仍会保留 `translated.md` 和 `translation_report.json`。

## 术语表预处理策略

- 默认开启 LLM 术语预处理，不需要额外开关。
- 默认方案会基于论文标题、摘要和前几段正文，抽取最多 40 个高价值术语。
- 如果本地安装了 `pyate` 或 `KeyBERT`，高阶用户可以在设置页切换到增强方案，让它们先做候选术语抽取；如果缺依赖，会自动回退，不中断主流程。
- 重点保留这些类型：
  - 缩写
  - 方法名
  - 数据集名
  - 指标名
  - 关键概念
- 不会主动抽取过于泛化的学术套话，比如 `paper`、`result`、`experiment`。
- 如果术语提取失败，不会中断主流程，正文翻译会继续执行。
- 最终会导出合并后的 `glossary.tsv`，方便后续复用或人工修订。

## 当前限制

- 只支持单文件处理
- 只支持英文论文翻译到中文
- 默认不翻译参考文献正文
- 不做双语对照
- 不做 Zotero 直连
- 对扫描版 PDF 没有做专项优化
- `MinerU API` 的不同部署返回格式仍然可能存在差异；如果你的接口字段更特殊，`backend/translator_pipeline.py` 里可能还需要补充映射

## 已验证

- `npm run build`
- `python3 -m py_compile backend/translator_pipeline.py`
- `cargo check`
