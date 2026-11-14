---
summary: 能力运行时：授权、API 代理、组件渲染
when: 所有能力包的基础依赖，随能力包安装
not_when: 不作为业务能力直接选型
requires:
scopes:
---

# WPS 能力运行时（wps/core）

随能力包安装到 `.capabilities/wps/core`，不作为业务能力直接选型。提供：

- `bootstrapComateManifest()` — 应用启动时注入 `comate.json`
- `ensureAuthorized()` — gateway 授权
- `request.get/post` — 经 app-base 代理的 OpenAPI
- `CapabilityComponent` — 按 `comate.json` instances 渲染组件
- `getCapabilityInstance(id)` — 读取实例配置
