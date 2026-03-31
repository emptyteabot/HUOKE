# LeadPulse 免费公网发布

这是当前不依赖第三方账号登录、直接在本机拉出公网地址的方案。

## 启动

```bash
python ops/public_deploy/start_public_site.py
```

脚本会自动：

1. 启动 `frontend-b2b`
2. 拉起 Cloudflare Quick Tunnel
3. 写入当前公网 URL
4. 如果配置了飞书 webhook，就把新的公网地址推送到飞书

## 停止

```bash
python ops/public_deploy/stop_public_site.py
```

## 当前公网地址文件

- `frontend-b2b/runtime-logs/current_public_url.txt`
- `frontend-b2b/runtime-logs/public_runtime.json`

## 限制

这是免费临时公网隧道：

- URL 不是固定域名
- 重启后 URL 可能变化
- 适合先开卖、先收申请、先验证

如果后面要长期稳定域名，再切到正式托管平台。

## 固定域名服务器发布

如果 `leadpulse.cc.cd` 已经在 Linux 服务器上通过 Nginx 反代到本机 `3005` 端口，优先用下面这组脚本：

```bash
bash ops/public_deploy/deploy_fixed_domain.sh
```

它会自动：

1. 拉取 `origin/main`
2. 在 `frontend-b2b` 执行 `npm ci`
3. 重新 `build`
4. 杀掉旧的 `next start --hostname 127.0.0.1 --port 3005`
5. 重启固定域名站点
6. 写运行信息到 `frontend-b2b/runtime-logs/fixed_domain_runtime.json`

查看状态：

```bash
bash ops/public_deploy/status_fixed_domain.sh
```

这套脚本默认：

- 仓库目录：`$HOME/LeadPulse`
- 分支：`main`
- 端口：`3005`
- Host：`127.0.0.1`

如果服务器上的仓库目录不同，可临时覆盖：

```bash
REPO_ROOT=/var/www/LeadPulse bash ops/public_deploy/deploy_fixed_domain.sh
```
