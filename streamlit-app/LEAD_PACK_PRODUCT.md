# Lead Pack Product Flow

This is the "sell outcomes" mode for B2B lead-gen.

## Offer
- Package: `$50`
- Delivery: up to `500` filtered leads (CSV)
- Input: one simple request form (region, role, industry, requirement)

## Runtime Flow
1. Customer submits an order in `Home.py -> Lead Pack`.
2. Order is stored in `data/lead_packs/orders.json`.
3. Backend worker processes paid orders:
   - loads latest social lead artifacts
   - removes competitor-like rows
   - ranks by query match + intent score
   - exports CSV to `data/lead_packs/outputs/<order_id>.csv`
4. System tries to email CSV via SendGrid.

## Files
- `streamlit-app/services/lead_pack.py`: order queue + filtering + CSV + email delivery
- `streamlit-app/run_lead_pack_worker.py`: async worker entry

## Ops Commands
```bash
# Process one paid order
python streamlit-app/run_lead_pack_worker.py --order-id lp_xxx

# Process queued paid orders (one cycle)
python streamlit-app/run_lead_pack_worker.py --max-jobs 3

# Daemon mode
python streamlit-app/run_lead_pack_worker.py --loop --sleep 20 --max-jobs 3
```

## Required env for email delivery
- `SENDGRID_API_KEY`
- `FROM_EMAIL`
- `FROM_NAME` (optional)

If SendGrid is missing, CSV is still generated and order remains with `delivery_status=failed` and a local `csv_path`.
