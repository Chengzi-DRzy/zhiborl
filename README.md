# 小班长信息站（直播排班）—— 新手开发与上线指南

> 写给接手这个项目的同事：你不需要懂服务器，只要会用 AI 助手（WPS Comate、Codex、Claude 等），按本文的流程就能自己改功能、自己上线。
> **让 AI 干活前，先让它读一遍本文件和 `AGENTS.md`。**

## 1. 网址

| 用途 | 地址 |
|---|---|
| 正式网站（外网、手机都能开） | https://zhibo.shueho.com:8443 |
| 公司内网直连 | http://192.168.2.249:8850 |
| 排班同步状态 | `网址/api/sync/status` |
| 上线（部署）状态 | `网址/api/deploy/status` |
| 代码仓库 | https://github.com/Chengzi-DRzy/zhiborl （`main` 分支） |

网页最底下会显示「排班更新于 几点几分 · 版本 xxxxxxx」。**版本号就是线上正在跑的代码提交号**，用它确认你的修改是否已经上线。

## 2. 数据怎么走（只有这一条路）

```
WPS 多维表「排班表」（大家平时在 WPS 里改排班）
   │  每 5 分钟自动读取一次（只读，绝不写回 WPS）
   ▼
服务器 192.168.2.249 上的同步程序（server/sync.mjs）
   │  按月整份保存
   ▼
MongoDB 数据库（同一台服务器，库名 zhiborl，表 schedule_months）
   │  /api/schedule 接口
   ▼
网页（calendar.js 显示月历、直播场次）
```

- **改排班 = 去 WPS 表里改**，最多 5 分钟后网页自动更新。不需要改代码、不需要上传文件。
- 读取的工作表：名字是「N月排班表」的表（1月排班表…12月排班表）。表名格式不能改，否则读不到。
- 读取的字段：`日期`、`抖音主号-早`、`抖音主号-午`、`抖音主号-晚`、`抖音上新`（旧表叫 `抖音上新产品名`/`上新产品名称`）、`抖音活动`。字段名不能改，改了就读不到。
- 场次格子里写「主播,助播」：第一个名字是主播，后面的都是助播（逗号、顿号都可以）。
- 某个月读取出错（比如日期重复）时，这个月保留上一次的数据，其他月份照常更新。
- **项目里不再有任何排班 JSON 文件**，也不要再加回来。

## 3. 改功能的标准流程（每次都照做）

1. **先拿最新代码**：开始之前先从 GitHub 拉取（pull）最新的 `main`。别人或服务器上的版本可能比你电脑上的新。
2. **用大白话告诉 AI 你要什么**，例如：
   - 「月历上把活动的颜色改成蓝色」
   - 「直播场次页每张卡片显示当天是星期几」
   - 「排班表新增了『快手-晚』字段，网页上把快手晚场也显示出来」（见第 5 节）
3. **本地预览**：让 AI 运行 `npm install`（第一次）和 `npm run dev`，浏览器打开它给的地址（http://localhost:61004）。本地预览会读取线上的真实排班，用手机尺寸也看一下（小班长基本都用手机）。
4. **让 AI 运行检查**：`npm test` 和 `npm run build`，两个都必须成功。
5. **提交并推送到 GitHub 的 `main` 分支**（commit + push）。提交说明写清楚改了什么。
6. **等 5～10 分钟自动上线**：服务器每 5 分钟检查一次 GitHub，发现新提交就自动构建、测试、上线。
7. **确认上线**：打开网站，看页面底部的版本号是不是你刚才那次提交的前 7 位；或者打开 `网址/api/deploy/status`，看 `lastAttempt.result` 是不是 `deployed`。

> 不要用 WPS Comate 自带的「发布/部署」按钮，也不要再开 GitHub Pages。**唯一的上线方式就是推送到 GitHub `main`。**

## 4. 上线失败 / 改坏了怎么办

- 打开 `网址/api/deploy/status`：
  - `lastAttempt.result` 是 `failed` → 看 `reason`（原因）和 `logTail`（最后几十行日志），**整段复制给 AI**，让它修好后再提交一次。
  - 构建或测试没过时，**线上会继续跑旧版本**，网站不会挂。
  - 新版本启动后自检失败，服务器会**自动退回上一版**。
- 上线成功但效果不对：让 AI 帮你「revert（撤销）这次提交并推送」，5～10 分钟后自动回到之前的样子。
- 同一个提交失败后不会反复重试；修好再推一个新提交即可。

## 5. 常见改动怎么跟 AI 说

| 想做的事 | 要改的地方（告诉 AI 这些文件） |
|---|---|
| 改样式、文字、布局 | `index.html`（样式和页面结构）、`calendar.js`（月历/直播场次的显示逻辑） |
| 显示 WPS 表里的新字段 | `server/parse.mjs`（加字段名和解析规则）→ `test/parse.test.mjs`（加测试）→ `calendar.js`（显示）。新字段要先在 WPS 每个月的表里都建好。 |
| 内购功能 | 先读 `PURCHASE-IMPLEMENTATION.md`，涉及登录和收货信息，**需要找管理员**（见第 7 节）。 |

可以直接这样说：「请先读 README.md 和 AGENTS.md，然后帮我在直播场次里显示 WPS 表的『XX』字段，记得加测试、本地预览给我看，确认后再提交推送。」

## 6. 授权：同步为什么会停、怎么恢复

WPS 不允许程序自己读这份排班表，所以同步用的是「某位同事授权过的身份」（目前是黄浩航），网关会自动续期，平时不用管。

**网页底部出现「⚠ 排班同步已暂停」** 或 `/api/sync/status` 里 `status` 是 `auth_required`，说明授权失效了（授权人退出了 WPS 登录、离职、或被移出了排班表权限）。恢复方法：

1. 找一位**对排班表有查看权限**的同事（建议就是你自己，以后由你负责），用他的电脑，连着公司网络（要能打开 http://192.168.2.249:8850）。
2. 准备好「管理密钥」ADMIN_TOKEN（向管理员要，**不要发到群里、不要写进代码**）。
3. 在项目文件夹里打开终端（Windows 用 PowerShell），运行：
   ```powershell
   npm install
   $env:ZHIBORL_ADMIN_TOKEN="管理密钥"; npm run authorize
   ```
4. 浏览器会打开 WPS 登录，登录并同意后页面显示「授权完成」，终端会列出同步到的月份。

`status` 是 `partial` 表示有个别月份没读成功，`issues` 里会写哪张表、什么原因（例如 `DUPLICATE_DATE` 日期重复、`MISSING_DATE_FIELD` 没有日期字段），去 WPS 表里改正即可，5 分钟后自动恢复。

## 7. 这些事需要有服务器权限的人（新手不要自己动）

- 改服务器上的 `compose.yml`、`.env`（密码、密钥、端口）、自动上线脚本。
- 改公司网关（sso.shueho.com）的登记、域名转发（zhibo.shueho.com）。
- 直接查看或修改 MongoDB 数据。
- 做内购功能所需的登录（WPS 单点登录要在网关登记回调地址）。

## 8. 服务器备忘（给有权限的管理员）

- 机器：Windows 192.168.2.249，WSL 发行版 `SHUEHO-PROD`，目录 `D:\shueho\zhiborl`（WSL 里是 `/mnt/d/shueho/zhiborl`）。
- 容器：`shueho-zhiborl-app`（端口 8850）、`shueho-zhiborl-mongo`（MongoDB 8.0，不对外开放端口，数据卷 `shueho-zhiborl_mongo-data`）。
- 文件：`compose.yml`、`.env`（全部密钥，权限已收紧）、`mongo-init.js`、`auto-deploy.sh`、`releases/`（最近 5 个版本）、`source`（指向当前版本）、`status/`（上线状态和构建日志）。
- 计划任务：`SHUEHO-Zhiborl-Production`（开机恢复端口转发并启动容器）、`SHUEHO-Zhiborl-AutoDeploy`（每 5 分钟检查 GitHub 并自动上线）。防火墙规则 `SHUEHO Zhiborl HTTP`。
- 外网入口：Mac Studio（192.168.3.30）上的 `shueho-edge` nginx，配置 `zhibo.shueho.com.conf`，转发到 192.168.2.249:8850，并屏蔽 `/api/admin/`。
- WPS 读取：网关 https://sso.shueho.com:8443 的 client `shueho-zhiborl`（只读 `kso.file.read`、`kso.dbsheet.read`，回调 `http://127.0.0.1:4931/wps/callback` 仅供授权脚本）。排班表 fileId `r8T2ifj8N1MRx9gPKdHmxx7Nv8C3NhNvY`。
- 管理接口（只能内网直连调用）：`POST /api/admin/sync` 立即同步、`POST /api/admin/wps-authorization` 保存授权，都需要 `Authorization: Bearer <ADMIN_TOKEN>`。
- 代码仓库换地址时，改 `.env` 里的 `GITHUB_REPO`（默认 `Chengzi-DRzy/zhiborl`），自动上线就会跟着新仓库走。
- 数据都来自 WPS，MongoDB 丢了也能重新同步回来；只有授权需要重新做一次。
