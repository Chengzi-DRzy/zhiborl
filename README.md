# 小班长信息站（直播排班）

部署在 `http://192.168.2.249:8850`，不需要登录即可查看上新月历、直播场次。

## 数据流

1. **来源**：WPS 多维表「排班表」（`r8T2ifj8N1MRx9gPKdHmxx7Nv8C3NhNvY`）里名为 `N月排班表` 的工作表，只读取 `日期`、`抖音主号-早/午/晚`、`抖音上新`（旧表的 `抖音上新产品名`/`上新产品名称`）、`抖音活动`。
2. **同步**：服务器每 5 分钟经 `shueho-sso-gateway`（client `shueho-zhiborl`，只读 scope）用授权人的身份读取，校验后按月整份写入 MongoDB `schedule_months`。某个月读取或校验失败时保留该月旧数据；记录在 `sync_runs`，状态见 `GET /api/sync/status`。
3. **展示**：网页读 `GET /api/schedule`。

WPS 不对应用开放这份文件（应用身份读取返回 403），所以需要一位**对排班表有查看权限**的同事授权一次；网关会自动续期。若状态变成 `auth_required`（授权人退出登录、离职或失去文件权限），重新授权即可：

```bash
ZHIBORL_ADMIN_TOKEN=<服务器 .env 里的 ADMIN_TOKEN> npm run authorize
```

脚本会打开浏览器走 WPS 登录，授权回传到本机 `127.0.0.1:4931` 后转交服务器（加密保存），并立即同步一次。手动立即同步：`POST /api/admin/sync`（Bearer ADMIN_TOKEN）。

## 部署（192.168.2.249 / WSL SHUEHO-PROD）

目录 `D:\shueho\zhiborl`：`compose.yml`（来自 `deploy/compose.yml`）、`.env`（参照 `deploy/.env.example`，权限已收紧）、`source/`（代码）。容器 `shueho-zhiborl-app`（8850）与 `shueho-zhiborl-mongo`（不开端口，数据卷 `shueho-zhiborl_mongo-data`）。开机任务 `SHUEHO-Zhiborl-Production` 运行 `start.ps1` 恢复端口转发并启动容器；防火墙规则 `SHUEHO Zhiborl HTTP`。

更新代码：上传新的 `source/`，在 WSL 里 `docker compose build app`，把 `.env` 的 `APP_VERSION` 改成新版本后 `docker compose up -d app`。

## 开发

```bash
npm ci
npm test        # 解析与同步逻辑
npm run build   # 前端
```
