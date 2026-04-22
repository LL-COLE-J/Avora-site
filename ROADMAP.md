# AVORA BUILD ROADMAP

---

## PHASE 1 — FOUNDATION ✅

- [x] Event creation
- [x] Module selection
- [x] Dashboard
- [x] Guest CRUD
- [x] Check-in system

---

## PHASE 2 — PLANNER OS (CURRENT)

### Step 1 — Auth
- [ X] Fix login persistence
- [ X] Protect all pages (redirect if not logged in)
- [X ] Add logout
- [ X] Redirect login → events.html

---

### Step 2 — Event Ownership
- [X ] Add `ownerId` to events
- [ ] Attach event to logged-in user
- [ ] Restrict queries to ownerId
- [ ] Prevent cross-user access

---

### Step 3 — Planner Home (events.html)
- [ ] Build events page
- [ ] List all user events
- [ ] Open event → dashboard
- [ ] Add "Create Event" button

---

### Step 4 — Navigation Cleanup
- [ ] Replace index as entry point
- [ ] New flow: login → events → dashboard
- [ ] Standardize all routes (`./page.html`)

---

### Step 5 — Event Lifecycle (Light)
- [ ] Add event status (live/default)
- [ ] Optional: draft/completed (later)

---

## PHASE 3 — CHECK-IN SYSTEM (CORE)

### Step 6 — Modes
- [ ] Check-In Light (staff)
- [ ] Check-In Pro (multi-device)

---

### Step 7 — Performance
- [ ] Improve search responsiveness
- [ ] Limit results (already done)
- [ ] Highlight matches

---

### Step 8 — UX Improvements
- [ ] Larger touch targets
- [ ] Clear check-in state
- [ ] Add feedback animations

---

### Step 9 — Reliability
- [ ] Prevent double check-in issues
- [ ] Ensure real-time sync stability

---

## PHASE 4 — GUEST EXPERIENCE

### Step 10 — Guest Page (guest.html)
- [ ] Build guest self check-in page
- [ ] Search + confirm identity
- [ ] Minimal UI

---

### Step 11 — Entry Method
- [ ] Event link for guests
- [ ] QR code support

---

### Step 12 — Guest UX
- [ ] Clean interface
- [ ] Large buttons
- [ ] No admin controls

---

## PHASE 5 — REVENUE MODULES

### Step 13 — Donations
- [ ] Add donation tracking
- [ ] Update dashboard totals

---

### Step 14 — Auction (Later)
- [ ] Item list
- [ ] Bidding system
- [ ] Winner logic

---

## PHASE 6 — POLISH + CONTROL

### Step 15 — Dashboard
- [ ] Improve layout
- [ ] Standardize module cards
- [ ] Enhance live stats

---

### Step 16 — Guest Management
- [ ] CSV import
- [ ] Bulk add
- [ ] Improved editing

---

### Step 17 — Planner Tools
- [ ] Edit event
- [ ] Delete event
- [ ] Duplicate event (later)

---

## PHASE 7 — DEPLOYMENT

### Step 18 — Hosting
- [ ] Firebase Hosting
- [ ] Domain setup

---

### Step 19 — Security
- [ ] Firestore rules (owner-based)
- [ ] Guest access controls

---

### Step 20 — Testing
- [ ] Simulate full event
- [ ] Multi-device testing
- [ ] Stress testing

---

## PHASE 8 — V1 LAUNCH

### Step 21 — MVP Ready
- [ ] Planner can create + run event
- [ ] Guest can check in
- [ ] System stable under load

---
{
  "name": "event planner module",
  "status": "pending"
}
## CURRENT POSITION

👉 Phase 2 — Planner OS  
👉 Step 1 — Auth
V## CURRENT STATUS

Phase 2 — Planner OS

✅ Step 1 — Auth (working)
✅ Step 2 — Event Ownership (ownerId working)
⬜ Step 3 — Events Page (in progress)

## NEXT STEP
→ Finish events.html + redirect flow
---
