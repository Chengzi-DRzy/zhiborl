# wps/core 集成说明

安装能力包后，确认工作区中已存在 `.capabilities/wps/core`。业务代码与组件包**必须**使用 canonical import（与文件深度无关）：

```typescript
import {
  setComateManifest,
  ensureAuthorized,
  request,
  CapabilityComponent,
  getCapabilityInstance
} from '.capabilities/wps/core'
```

**禁止** `../../.capabilities/wps/core` 等按目录深度拼接的相对路径。

## 启动：注入 comate.json（必须）

`getCapabilityInstance`、`ensureAuthorized`、`CapabilityComponent` 依赖运行时 manifest。应用须在**最早入口**注入构建期打包的 `comate.json`：

```typescript
// client/src/bootstrap-comate.ts
import rawComate from '../../comate.json'
import { bootstrapComateManifest } from '.capabilities/wps/core'

bootstrapComateManifest({
  schema: rawComate.schema,
  scopes: rawComate.scopes ?? [],
  capabilities: rawComate.capabilities ?? {}
})
```

`ComateManifest` 接收 `schema`，不接收根目录 `comate.json` 的 `version`。保留原配置中的根 `version` 与 `capabilities.<id>.version`；不要为通过类型检查删除它们。

```typescript
// client/src/main.tsx — 第一行引入，早于业务组件
import '@/bootstrap-comate'
```

`bootstrapComateManifest` 等价于 `setComateManifest` + 同步 `window.__COMATE_MANIFEST__`。

## Bundler alias（必须）

配置 `.capabilities` 指向工作区根目录下的 `.capabilities` 目录，例如 Vite：

```typescript
resolve: {
  alias: {
    '.capabilities': path.resolve(workspaceRoot, '.capabilities')
  }
}
```

## 安装能力包（必须）

执行 `capa install <package-id> --workspace <app>` 后，工作区须存在 **`.capabilities/capa-registry.mjs`**。  
`CapabilityComponent` 通过 canonical import 引用 registry（`.capabilities/capa-registry.mjs`），registry 内用静态 `import()` 加载组件 `render.js`，**不**使用变量路径 dynamic import。

## 组件渲染

```tsx
<CapabilityComponent instanceId="my-chart" />

实例定义写在 `comate.json.capabilities[<package>].instances`。

### 运行时 props 覆盖

`CapabilityComponent` 支持通过 `props` 属性**覆盖/合并**实例在 `comate.json` 中定义的静态 props（卡片类组件需要动态数据时使用），适合把当前选中的用户/文件等运行期数据传进组件：

```tsx
<CapabilityComponent instanceId="my-user-card" props={{ user: currentUser }} />
```

覆盖规则：运行时 `props` 与实例静态 props **浅合并**，同名 key 以运行时 `props` 为准。组件以 props 的序列化结果作为依赖，内容不变不会重挂载。
```

实例定义写在 `comate.json.capabilities[<package>].instances`。

registry 未命中时错误示例：

```
Capability render not registered: wps/dbsheet:bar-chart.
Run: capa install wps/dbsheet --workspace <WORKSPACE>
```

## 禁止（应用侧 workaround）

- `capability-render-loader.ts` + `import.meta.glob` 注册 render
- patch `.capabilities/wps/core/dist/component.js`
- 创建 `.capabilities/core` junction / symlink
- `window.__CAPABILITY_LOAD_RENDER__` 等应用注入 loader
- 按页面深度使用 `../../.capabilities/...` 引用能力包

## 授权

`comate.json.scopes` 声明应用所需 Scope，首次业务请求前：

```typescript
await ensureAuthorized()
```

## API 代理

```typescript
const data = await request.get('/v7/users/current')
const result = await request.post('/v7/coop/dbsheet/{file_id}/sheets/{sheet_id}/records', body)
```

## 定制

- 配置：改 `comate.json` instances
- 代码覆盖：`capa override add <package> ...`（由 `capa install` 写入 registry）
