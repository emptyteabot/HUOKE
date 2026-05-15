# LeadPulse Domain Migration

Canonical domain: `https://leadpulseagi.com`

Legacy domain: `https://leadpulse.cc.cd` should redirect to the canonical domain.

## Spaceship DNS

In Spaceship, remove the default parking records:

- `A @ 34.216.117.25`
- `A @ 54.149.79.189`

Add these records:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | @ | 43.135.51.214 | 300 |
| A | www | 43.135.51.214 | 300 |

Do not CNAME `leadpulseagi.com` to `leadpulse.cc.cd`; the old domain is Cloudflare-fronted and will not make the new hostname valid on the origin by itself.

## Server Steps

On the Tencent Cloud server:

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d leadpulseagi.com -d www.leadpulseagi.com
sudo cp frontend-b2b/leadpulse-domain.conf /etc/nginx/sites-available/leadpulse
sudo ln -sf /etc/nginx/sites-available/leadpulse /etc/nginx/sites-enabled/leadpulse
sudo nginx -t
sudo systemctl reload nginx
LEADPULSE_SITE_URL=https://leadpulseagi.com bash ops/public_deploy/deploy_fixed_domain.sh
```

After DNS propagates, verify:

```bash
curl -I https://leadpulseagi.com
curl https://leadpulseagi.com/.well-known/mcp.json
curl -I https://leadpulse.cc.cd
```

Expected:

- `leadpulseagi.com` returns the app.
- `leadpulseagi.com/.well-known/mcp.json` returns the MCP discovery document.
- `leadpulse.cc.cd` returns a permanent redirect to `https://leadpulseagi.com`.
