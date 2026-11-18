# T7 HealthVault — PHC Admin Panel (Web Dashboard)

Modern web dashboard for Primary Health Centre (PHC) supervisors, medical officers, and administrators. Built with **React 19**, **Vite**, **TypeScript**, and **Tailwind CSS**, connected directly to **Supabase** with live real-time updates.

---

## 🌟 Features & Pages

### 1. 👥 Patient Records & Family Directory (`/patients`)
* **Family Group View:** Groups citizens into household units with expandable family cards, head of family details, and house numbers.
* **All Patients Table View:** Flat, sortable table showing patient demographics, ABHA IDs, mobile numbers, and clinical flags.
* **Multi-Tier Filtering & Search:**
  * Real-time search across patient name, ABHA ID, family head, or mobile.
  * Jurisdiction filter by Village / Ward.
  * Assigned ASHA worker filter.
  * Clinical condition filter: ⚠️ High Risk, 🤰 Pregnant Mothers (ANC), 💊 Chronic Conditions (NCDs), and With Vitals.
  * Entry source filter: 📷 Scanned Sheet (OCR), ✏️ Field Manual, ☁️ Cloud Synced.
* **🩺 Interactive Patient Health History Timeline Modal:**
  * Clicking **"History"** on any patient opens their complete chronological timeline of visits from Supabase `vitals`.
  * Visual timeline with visit timestamps and relative time.
  * Source badges differentiating paper OCR scans from manual entries.
  * Complete 8-point clinical vitals grid: BP (with hypertensive alert coloring), Pulse Rate, SpO₂ (hypoxia alert if <95%), Temperature, Respiratory Rate, Fasting Sugar, and Postprandial Sugar.
  * Doctor and ASHA worker clinical notes.

### 2. 🚨 Risk Alerts (`/alerts`)
* Auto-generated from the ASHA mobile app's **NEWS2 Engine** and **PhysioNet Sepsis ONNX Model**.
* Categorized by severity: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
* Shows predicted risk metrics: NEWS2 score (0–20) and Sepsis risk probability (0%–100%).
* Workflow actions for medical officers: **Acknowledge**, **Resolve**, or **Reopen**.

### 3. 👩‍⚕️ ASHA Workforce Management (`/workers`)
* Directory of registered ASHA workers, assigned jurisdictions, assigned households count, and last sync timestamps.
* Onboard new ASHA workers directly from the web panel (syncs to mobile apps on next cloud refresh).

### 4. 🏥 Emergency Referrals (`/referrals`) & 📋 Visit Tasks (`/tasks`)
* Track hospital referrals, facility assignments, and follow-up deadlines.
* Assign field follow-up tasks to specific ASHA workers.

---

## 🔄 Architecture & Data Flow

```
 ┌──────────────────────┐        push on sync            ┌───────────────────────┐        read / triage       ┌─────────────────────┐
 │  ASHA Flutter App    │ ─────────────────────────────▶ │                       │ ◀───────────────────────── │  PHC Admin Panel    │
 │  (offline-first,     │  households, members, vitals   │  Supabase             │   alerts, referrals,       │  (React + Vite)     │
 │   SQLite on device)  │  (with entry_source: 'scan')   │  Postgres + Auth +    │   households, patients     │                     │
 │                      │ ◀───────────────────────────── │  Row Level Security   │ ─────────────────────────▶ │                     │
 └──────────────────────┘   pull on sync (+ realtime):   │  + Realtime           │   writes: triage status,   └─────────────────────┘
                            profiles, tasks, updates     └───────────────────────┘   worker onboarding, tasks
```

- **Row Level Security (RLS):** Every query is scoped to the active PHC (`phc_id`).
- **Live Queries:** Built on `useLiveQuery` with Supabase Realtime WebSockets — changes from mobile field visits appear instantly without page reload.

---

## 🚀 Running Locally

```bash
cd phc_admin
npm install

# Run development server (http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build
```

### Environment Configuration (`.env.local`)

```env
# Switch between live Supabase or in-memory mock demo
VITE_BACKEND=supabase

# Your Supabase project credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Migration

Ensure migration `0007_add_entry_source_to_vitals.sql` is executed in your Supabase SQL Editor:

```sql
ALTER TABLE public.vitals
  ADD COLUMN IF NOT EXISTS entry_source text NOT NULL DEFAULT 'manual'
  CHECK (entry_source IN ('manual', 'scan', 'cloud_sync'));
```
