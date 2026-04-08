## ADDED Requirements

### Requirement: 通过 File System Access API 授权本地目录
系统 SHALL 在首次使用时通过 `window.showDirectoryPicker()` 弹出系统文件夹选择器，引导用户授权 Obsidian vault 目录，并将 `FileSystemDirectoryHandle` 持久化到 IndexedDB。

#### Scenario: 首次授权目录
- **WHEN** 用户首次点击「选择 Obsidian 目录」
- **THEN** 系统 SHALL 弹出系统文件夹选择对话框，用户选择文件夹后，系统 SHALL 将 handle 存入 IndexedDB，并在界面显示已授权路径名称

#### Scenario: 重新授权（浏览器重启后）
- **WHEN** 系统检测到 IndexedDB 中存有 handle 但权限已失效
- **THEN** 系统 SHALL 在 Popup 顶部显示「📁 需要重新授权目录」提示，用户点击后调用 `handle.requestPermission()` 恢复权限

### Requirement: 在目标目录下创建子目录并写入 Markdown 文件
系统 SHALL 在授权目录下自动创建 `Clippings` 子目录（如不存在），将生成的 .md 文件写入其中；文件名为 sanitize 后的页面标题（去除非法字符，截断至 100 字符），同名文件直接覆盖。

#### Scenario: 正常写入新文件
- **WHEN** 用户触发保存，目录已授权
- **THEN** 系统 SHALL 在 `<授权目录>/Clippings/<sanitized-title>.md` 路径创建/覆盖文件，并写入 Markdown 内容

#### Scenario: 子目录不存在时自动创建
- **WHEN** `Clippings` 子目录尚未存在
- **THEN** 系统 SHALL 通过 `getDirectoryHandle('Clippings', { create: true })` 自动创建

#### Scenario: 重复文件覆盖
- **WHEN** 同名文件已存在
- **THEN** 系统 SHALL 覆盖原文件内容，不创建副本，不提示用户

### Requirement: 文件名 sanitize
系统 SHALL 对页面标题做合法文件名处理：去除 `/ : * ? " < > | \` 等字符，将空白替换为空格，截断至 100 字符，确保文件名合法。

#### Scenario: 含非法字符的标题
- **WHEN** 页面标题包含 `:`、`/` 等文件名非法字符
- **THEN** 系统 SHALL 去除或替换这些字符后生成合法文件名，不报错

#### Scenario: 标题过长
- **WHEN** 页面标题超过 100 字符
- **THEN** 系统 SHALL 截断至 100 字符再加 `.md` 后缀
