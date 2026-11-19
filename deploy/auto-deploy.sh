#!/usr/bin/env bash
# 自动上线：GitHub main 有新提交 → 下载 → 构建（含 npm test）→ 切换 → 健康检查；失败自动回到上一版。
# 由 Windows 计划任务 SHUEHO-Zhiborl-AutoDeploy 每 5 分钟以 root 在 WSL SHUEHO-PROD 里运行。
# 本脚本放在服务器 /mnt/d/shueho/zhiborl/auto-deploy.sh，不会被仓库自动覆盖（改它需要有服务器权限的人）。
set -uo pipefail
BASE=/mnt/d/shueho/zhiborl
STATUS_DIR=$BASE/status
STATUS=$STATUS_DIR/deploy-status.json
LOG=$STATUS_DIR/deploy.log
mkdir -p "$STATUS_DIR" "$BASE/releases"
exec 9>"$BASE/auto-deploy.lock"
flock -n 9 || exit 0
cd "$BASE"

envget() { grep -E "^$1=" .env | tail -1 | cut -d= -f2-; }
REPO=$(envget GITHUB_REPO); REPO=${REPO:-Chengzi-DRzy/zhiborl}
BRANCH=$(envget GITHUB_BRANCH); BRANCH=${BRANCH:-main}
now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "$(now) $*" >> "$LOG"; }
jget() { [ -f "$STATUS" ] && python3 -c "import json,sys;print(json.load(open('$STATUS')).get('$1') or '')" 2>/dev/null || true; }

write_status() { # $1=result $2=commit $3=reason $4=buildlog
  python3 - "$STATUS" "$1" "$2" "$3" "${4:-}" "$REPO" "$BRANCH" <<'PY'
import json, os, sys, datetime
path, result, commit, reason, buildlog, repo, branch = sys.argv[1:8]
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
try: s = json.load(open(path))
except Exception: s = {}
s.update(repo=repo, branch=branch, lastCheckAt=now)
if result != 'checked':
    tail = ''
    if buildlog and os.path.exists(buildlog):
        tail = ''.join(open(buildlog, errors='replace').readlines()[-60:])
    s['lastAttempt'] = {'commit': commit, 'result': result, 'reason': reason, 'at': now, 'logTail': tail}
    if result == 'deployed':
        s.update(deployedCommit=commit, deployedAt=now, failedCommit=None)
    else:
        s['failedCommit'] = commit
tmp = path + '.tmp'
json.dump(s, open(tmp, 'w'), ensure_ascii=False, indent=2)
os.replace(tmp, path)
PY
}

SHA=$(curl -fsS -m 20 -H 'Accept: application/vnd.github.sha' "https://api.github.com/repos/$REPO/commits/$BRANCH" 2>/dev/null) || { log "无法读取 GitHub（网络或限流），稍后再试"; exit 0; }
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { log "GitHub 返回的提交号异常"; exit 0; }
if [ "$SHA" = "$(jget deployedCommit)" ] || [ "$SHA" = "$(jget failedCommit)" ]; then write_status checked "$SHA" ""; exit 0; fi

TAG=${SHA:0:7}
REL=$BASE/releases/$TAG
BUILDLOG=$STATUS_DIR/build-$TAG.log
log "发现新提交 $SHA，开始上线"
fail() { log "上线失败 $TAG：$1"; write_status failed "$SHA" "$1" "$BUILDLOG"; exit 1; }

rm -rf "$REL.tmp" && mkdir -p "$REL.tmp"
curl -fsSL -m 300 "https://codeload.github.com/$REPO/tar.gz/$SHA" | tar -xz -C "$REL.tmp" --strip-components=1 || fail "下载代码失败"
for f in deploy/Dockerfile server/index.mjs package.json package-lock.json index.html; do
  [ -f "$REL.tmp/$f" ] || fail "提交里缺少 $f，这不是可部署的版本"
done
rm -rf "$REL" && mv "$REL.tmp" "$REL"

docker build -f "$REL/deploy/Dockerfile" -t "shueho-zhiborl:$TAG" "$REL" > "$BUILDLOG" 2>&1 || fail "构建或测试没通过（看 logTail）"

PREV_VERSION=$(envget APP_VERSION)
if [ -d source ] && [ ! -L source ]; then # 第一次：把手工部署的目录收进 releases
  mkdir -p "releases/$PREV_VERSION" && cp -a source/. "releases/$PREV_VERSION/" && rm -rf source && ln -sfn "releases/$PREV_VERSION" source
fi
PREV_SOURCE=$(readlink source || true)
switch_to() { # $1=version $2=source dir
  sed -i "s/^APP_VERSION=.*/APP_VERSION=$1/" .env
  if [ -n "$2" ]; then ln -sfn "$2" source; fi
  docker compose -f compose.yml up -d --no-build --pull never --wait --wait-timeout 180 app >> "$BUILDLOG" 2>&1
}
healthy() {
  for _ in $(seq 1 12); do
    if curl -fsS -m 5 http://127.0.0.1:8850/api/health >/dev/null && curl -fsS -m 10 http://127.0.0.1:8850/api/schedule >/dev/null && curl -fsS -m 5 http://127.0.0.1:8850/ | grep -q '<html'; then return 0; fi
    sleep 5
  done
  return 1
}

if switch_to "$TAG" "releases/$TAG" && healthy; then
  write_status deployed "$SHA" "" "$BUILDLOG"
  log "上线成功 $TAG（上一版 $PREV_VERSION）"
  # 只保留最近 5 个版本
  ls -1dt releases/*/ 2>/dev/null | tail -n +6 | while read -r old; do
    v=$(basename "$old"); [ "$v" = "$TAG" ] || [ "$v" = "$PREV_VERSION" ] && continue
    rm -rf "$old"; docker image rm "shueho-zhiborl:$v" >/dev/null 2>&1 || true
  done
  ls -1t "$STATUS_DIR"/build-*.log 2>/dev/null | tail -n +11 | xargs -r rm -f
  exit 0
fi

log "新版本 $TAG 启动或自检失败，回到 $PREV_VERSION"
switch_to "$PREV_VERSION" "$PREV_SOURCE" || log "回滚时 compose 报错，请人工检查"
healthy || log "回滚后仍不健康，请人工检查"
fail "新版本启动后自检失败，已自动回到上一版 $PREV_VERSION"
