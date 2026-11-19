# 给 AI 助手的规则（每次开始工作前必须遵守）

本项目的维护者是不写代码的新手，会用自然语言给你需求。请先完整阅读 `README.md`，并遵守以下规则：

## 架构（不要改变）
- 数据只有一条路：WPS 多维表「排班表」→ `server/sync.mjs` 每 5 分钟只读同步 → MongoDB → `GET /api/schedule` → 网页 `calendar.js`。
- 不要新增任何排班 JSON/CSV 数据文件，不要把数据写死在前端，不要在浏览器里直接调用 WPS。
- 绝不写回 WPS（同步网关 client 也只有只读权限）。
- 前端是 Vite 打包的原生 HTML/JS（`index.html`、`calendar.js`、`purchase.js`），不要引入 React/Vue 等框架或大型依赖，除非用户明确要求。
- 服务端是 Node 22 原生 http（`server/`），数据库驱动 `mongodb`。

## 上线
- 唯一的上线方式：推送到 GitHub `main`。服务器每 5 分钟自动拉取、构建（Docker 构建里会跑 `npm test`）、上线，失败自动回滚。
- 不要使用 WPS Comate 的发布/部署功能，不要重新启用 GitHub Pages，不要添加 GitHub Actions 部署。
- 推送前必须运行 `npm test` 和 `npm run build` 并确认通过；改了界面要用 `npm run dev` 让用户在手机尺寸（390px 宽）下确认。
- 推送后提醒用户：5～10 分钟后看页面底部版本号或 `/api/deploy/status`。

## 必须保持
- `deploy/Dockerfile`、`server/index.mjs`、`package.json`、`package-lock.json`、`index.html` 必须存在，否则服务器拒绝上线。
- 新增依赖要更新 `package-lock.json`（用 `npm install` 安装）。
- 新的源码文件放在仓库里即可被构建（Dockerfile 是 `COPY . .`）；新增 HTML 页面需要在 `vite.config.js` 里配置多页面入口。
- 修改 `server/parse.mjs`（字段与解析）时同步更新 `test/parse.test.mjs`；修改同步流程时更新 `test/sync.test.mjs`。
- 公开页面只放面向观众的排班信息（日期、场次、主播/助播、上新、活动），不要显示投放计划、出勤、助理排班、价格、成本等内部字段。

## 不能做（需要告诉用户找有服务器权限的管理员）
- 修改 `deploy/compose.yml`、`deploy/auto-deploy.sh`、`deploy/*.ps1`：服务器上的副本不会随 GitHub 自动更新，改了也不生效。
- 任何密钥、密码、token 都不能写进代码或提交到仓库（服务器 `.env` 管理）。
- 修改 SSO 网关登记、域名、防火墙、MongoDB 账号。

## 常用命令
- `npm install`：安装依赖（第一次或依赖变化后）
- `npm run dev`：本地预览，`/api` 自动转发到线上读取真实排班
- `npm test`：单元测试
- `npm run build`：打包前端
- `npm run authorize`：WPS 授权失效时重新授权（需要 `ZHIBORL_ADMIN_TOKEN`，见 README 第 6 节）
