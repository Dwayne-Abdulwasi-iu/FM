# VISUAL FLOW DIAGRAM - Complete Payment System

**Purpose**: Visual representation of how payment flows through the entire system  
**Date**: January 27, 2026

---

## 📊 COMPLETE SYSTEM FLOW (End-to-End)

```
═══════════════════════════════════════════════════════════════════════════════
                         COMMISSION LIFECYCLE FLOW
═══════════════════════════════════════════════════════════════════════════════

PHASE 1: DESIGNER SETUP
─────────────────────────────────────────────────────────────────────────────

Designer
  │
  ├─ 1. Logs in to dashboard
  │
  ├─ 2. Goes to "Commission Settings"
  │     URL: /seller/commission-settings
  │
  ├─ 3. Enables "Accept Commissions" toggle
  │
  ├─ 4. SEES: Blue box "💳 Payment Milestone Template [IMPORTANT]"
  │
  ├─ 5. Clicks: "🎯 Configure Payment Milestones →"
  │     URL changes to: /seller/commission-settings/milestones
  │
  ├─ 6. SEES: Three template options
  │     ├─ Simple (50/50) - Locked badge "GOLD+ ONLY" (if tier < GOLD)
  │     ├─ Standard (30/30/40) - Badge "⭐ RECOMMENDED" (always available)
  │     └─ Detailed (20/20/25/15/20) - Available for all
  │
  ├─ 7. Selects template (e.g., Standard)
  │
  ├─ 8. Clicks: "Save"
  │     → POST /api/seller/commission-settings/milestones
  │     → Database updated: User.milestoneTemplate = "standard"
  │
  └─ 9. Returns to /seller/commission-settings
       Setup complete ✅


PHASE 2: BUYER REQUEST
─────────────────────────────────────────────────────────────────────────────

Buyer
  │
  ├─ 1. Browses designs
  │
  ├─ 2. Finds designer's design
  │
  ├─ 3. Clicks: "Request Commission"
  │     → Form appears
  │
  ├─ 4. Fills out:
  │     • Title: "Custom Fashion Illustration"
  │     • Description: "Pink aesthetic dress design..."
  │     • Budget: $500
  │
  ├─ 5. Submits request
  │     → Database: CommissionRequest created
  │     → Status: PENDING
  │
  ├─ 6. Designer gets email: "New commission request!"
  │
  └─ 7. Designer reviews & accepts request


PHASE 3: QUOTING (Designer → Buyer)
─────────────────────────────────────────────────────────────────────────────

Designer
  │
  ├─ 1. Views commission request in dashboard
  │
  ├─ 2. Reviews requirements
  │
  ├─ 3. Types quote: $500 ✅
  │
  └─ 4. Clicks: "Send Quote"
       → Status changes: QUOTED
       → Buyer gets email: "Designer quoted $500"


PHASE 4: BUYER REVIEWS PAYMENT (CRITICAL - THIS IS WHERE MILESTONES SHOWN)
─────────────────────────────────────────────────────────────────────────────

Buyer
  │
  ├─ 1. Gets email: "Designer quoted $500"
  │     Clicks: "View Quote" → /commission-request/[id]
  │
  ├─ 2. Reviews:
  │     • Designer details
  │     • Quote amount
  │     • Timeline
  │
  ├─ 3. Clicks: "PAY NOW"
  │     → Router navigates to: /commission-payment/[id]
  │
  ├─ 4. PAGE LOADS: Payment page
  │     URL: /commission-payment/[id]
  │     → Fetches: GET /api/commission-requests/[id]
  │     → API returns: designer.milestoneTemplate = "standard"
  │
  ├─ 5. SEES: Designer information
  │     Name, avatar, verification badge
  │
  ├─ 6. SEES: Commission details
  │     Title, description, deadline
  │
  ├─ 7. SEES: Price breakdown
  │     ┌─────────────────────────┐
  │     │ Commission: $500        │
  │     │ Platform Fee: Included  │
  │     │ ───────────────────────  │
  │     │ Total: $500             │
  │     └─────────────────────────┘
  │
  ├─ 8. SEES: ⭐ PAYMENT SCHEDULE (MilestoneDisplay component)
  │     ┌────────────────────────────────────────┐
  │     │ 💳 STANDARD PAYMENT SCHEDULE (30/30/40)│
  │     │                                        │
  │     │ Milestone 1: Deposit                   │
  │     │ 💰 $150 (30%)                          │
  │     │ Released Day 1 when designer confirms  │
  │     │ ⚠️  NON-REFUNDABLE if you cancel      │
  │     │                                        │
  │     │ Milestone 2: First Draft               │
  │     │ 💙 $150 (30%)                          │
  │     │ Released Day 3-5 when you approve     │
  │     │                                        │
  │     │ Milestone 3: Final Delivery            │
  │     │ ✅ $200 (40%)                          │
  │     │ Released Day 8-21 when you approve    │
  │     │ (or auto-released if no response)      │
  │     │                                        │
  │     │ 🕐 14-Day Protection:                  │
  │     │ If you go quiet, funds automatically  │
  │     │ released to designer after 14 days     │
  │     └────────────────────────────────────────┘
  │
  ├─ 9. READS: Escrow protection explanation
  │     • Funds held securely
  │     • Not released until approval
  │     • Can dispute if needed
  │
  ├─ 10. SEES: Payment method options
  │      ○ Stripe (Pay in USD)
  │      ○ Paystack (Pay in Naira ₦)
  │
  ├─ 11. DECIDES: "Everything looks good, I'll pay"
  │
  └─ 12. Clicks: "PAY $500"


PHASE 5: PAYMENT PROCESSING
─────────────────────────────────────────────────────────────────────────────

System (Backend)
  │
  ├─ 1. handlePayment() called
  │     Method: Stripe.checkout.sessions.create()
  │
  ├─ 2. Creates Stripe session
  │     Amount: $500
  │     Metadata: commissionId, buyerId
  │
  ├─ 3. Redirects to Stripe checkout
  │
  └─ 4. User completes payment on Stripe


Stripe
  │
  ├─ 1. Processes payment (payment method)
  │
  ├─ 2. Sends webhook: payment_intent.succeeded
  │
  └─ 3. Backend receives webhook


System (Backend)
  │
  ├─ 1. Webhook endpoint: /api/webhooks/stripe
  │
  ├─ 2. Verifies webhook signature ✅
  │
  ├─ 3. Creates Order record
  │
  ├─ 4. Moves funds to ESCROW account
  │     Commission: $500
  │     └─ In escrow: $500
  │     └─ Not yet released to designer
  │
  ├─ 5. Updates CommissionRequest status: ACCEPTED_BY_BUYER
  │
  ├─ 6. Sends emails:
  │     • Buyer: "Payment received! Funds held in escrow."
  │     • Designer: "Payment received! $500 awaiting your start."
  │
  └─ 7. Creates Milestone records:
       ├─ Milestone 1: PENDING ($150 - Deposit)
       ├─ Milestone 2: PENDING ($150 - Draft)
       └─ Milestone 3: PENDING ($200 - Final)


Buyer
  │
  └─ Redirected to: /commission-payment/success
     Sees: "✅ Payment Successful!"
     Sees: "Your commission is now in progress"
     Link: "View your commission"


Designer
  │
  ├─ 1. Gets email: "Payment received! $500 in escrow"
  │
  ├─ 2. Logs in → Dashboard
  │
  ├─ 3. SEES: Commission status changed
  │     "Payment received - Awaiting your confirmation to start"
  │
  └─ 4. SEES: "💰 $500 escrowed" (funds locked, not accessible yet)


PHASE 6: MILESTONE 1 - DEPOSIT RELEASE
─────────────────────────────────────────────────────────────────────────────

Designer
  │
  ├─ 1. SEES: Commission card with "Confirm Start" button
  │
  ├─ 2. Reviews requirements one more time
  │
  ├─ 3. Clicks: "Confirm Start"
  │
  ├─ 4. System executes:
  │     • Milestone 1 status: APPROVED
  │     • Triggers payment release via Stripe
  │     • $150 (deposit) transferred to designer account
  │     • Escrow balance: $350 remaining
  │
  ├─ 5. Designer email: "✅ Deposit released! $150 now in your account"
  │
  └─ 6. Designer can now see:
       Bank balance: +$150 ✅
       Escrow balance: $350 remaining


Buyer
  │
  ├─ 1. Gets notification: "Designer confirmed - work started"
  │
  ├─ 2. Sees milestone status: "Milestone 1 ✅ In Progress"
  │
  └─ 3. Email: "Your designer is now working on your commission"


PHASE 7: MILESTONE 2 - FIRST DRAFT SUBMISSION
─────────────────────────────────────────────────────────────────────────────

Designer
  │
  ├─ 1. Works on project (Days 2-5)
  │
  ├─ 2. Creates first draft
  │
  ├─ 3. Uploads files
  │
  ├─ 4. Writes: "Here's the initial concept. Ready for your feedback!"
  │
  ├─ 5. Clicks: "Submit for Approval"
  │     Status: AWAITING_APPROVAL
  │
  └─ 6. Email sent to buyer: "First draft ready for review!"


Buyer
  │
  ├─ 1. Gets email: "First draft ready!"
  │
  ├─ 2. Logs in → Views commission
  │
  ├─ 3. Reviews draft against requirements
  │
  ├─ 4. DECISION POINT:
  │     
  │     OPTION A: "Looks good!" (No changes)
  │     ├─ Clicks: "Approve Draft"
  │     ├─ Milestone 2: APPROVED
  │     ├─ $150 (draft) released to designer
  │     ├─ Escrow: $200 remaining
  │     ├─ Designer proceeds to final
  │     └─ Go to PHASE 8
  │
  │     OPTION B: "Needs changes" (Revisions)
  │     ├─ Clicks: "Request Revisions"
  │     ├─ Fills: What needs changing
  │     ├─ Milestone 2: IN_REVISION
  │     ├─ Funds stay in escrow (not yet released)
  │     ├─ Designer notified: "Revision requested"
  │     ├─ Designer updates → Resubmits
  │     ├─ Buyer sees new version → Approves
  │     ├─ Milestone 2: APPROVED
  │     ├─ $150 released
  │     └─ Continue to PHASE 8
  │
  │     OPTION C: Nobody responds (14 days pass)
  │     ├─ Day 7: Buyer gets "Draft waiting for approval" reminder
  │     ├─ Day 14: Auto-release triggers
  │     ├─ Milestone 2: AUTO_APPROVED
  │     ├─ $150 released to designer
  │     └─ Continue to PHASE 8


PHASE 8: MILESTONE 3 - FINAL DELIVERY SUBMISSION
─────────────────────────────────────────────────────────────────────────────

Designer
  │
  ├─ 1. Incorporates feedback from milestone 2
  │
  ├─ 2. Creates final version (Days 6-9)
  │
  ├─ 3. Uploads final files + documentation
  │
  ├─ 4. Writes: "Project complete! Ready for final approval."
  │
  ├─ 5. Clicks: "Submit Final Delivery"
  │     Status: AWAITING_FINAL_APPROVAL
  │
  └─ 6. Email: "Final delivery submitted!"


Buyer
  │
  ├─ 1. Gets email: "Your commission is ready!"
  │
  ├─ 2. Logs in → Downloads & reviews final files
  │
  ├─ 3. Tests files (if applicable)
  │
  ├─ 4. DECISION POINT:
  │     
  │     OPTION A: "Perfect!" (Approve)
  │     ├─ Clicks: "Approve Final Delivery"
  │     ├─ Optional: Writes feedback "Excellent work!"
  │     ├─ Milestone 3: APPROVED
  │     ├─ $200 (final) released to designer
  │     ├─ Escrow: $0 (all released)
  │     ├─ Commission status: COMPLETED ✅
  │     ├─ Designer total earned: $150 + $150 + $200 = $500 ✅
  │     ├─ (After 10% platform fee: $450 net)
  │     ├─ Buyer can download & use files
  │     └─ Go to PHASE 9 (COMPLETE)
  │
  │     OPTION B: "Not quite right" (Dispute)
  │     ├─ Clicks: "Dispute Final Delivery"
  │     ├─ Selects reason: "Quality issue" or "Not as described"
  │     ├─ Uploads evidence (screenshots, reference images)
  │     ├─ Milestone 3: DISPUTED
  │     ├─ Funds held in escrow
  │     ├─ Admin notified (within 1 hour)
  │     ├─ Designer gets email: "Dispute filed"
  │     ├─ Designer can submit counter-evidence
  │     ├─ Admin reviews both sides
  │     ├─ Admin decision:
  │     │  ├─ Sides with buyer: $200 refunded, designer gets $300 (partial loss)
  │     │  └─ Sides with designer: $200 released, designer gets full $500
  │     └─ Go to PHASE 10 (DISPUTE RESOLVED)
  │
  │     OPTION C: Nobody responds (14 days pass)
  │     ├─ Day 8: Buyer reminder "Final delivery waiting"
  │     ├─ Day 14: Auto-release trigger
  │     ├─ Milestone 3: AUTO_APPROVED
  │     ├─ $200 released to designer
  │     ├─ Escrow: $0
  │     ├─ Status: AUTO_COMPLETED
  │     └─ Go to PHASE 9 (COMPLETE)


PHASE 9: COMPLETION
─────────────────────────────────────────────────────────────────────────────

Designer
  │
  ├─ 1. Email: "✅ All milestones released! $450 in your account"
  │     (After 10% platform fee)
  │
  ├─ 2. Dashboard shows:
  │     Commission: COMPLETED ✅
  │     Total earned: $450
  │     Status: "Payment received"
  │
  └─ 3. Can leave message: "Thank you! Happy to work with you"


Buyer
  │
  ├─ 1. Email: "Commission complete!"
  │
  ├─ 2. Dashboard shows:
  │     Commission: COMPLETED ✅
  │     Can download files
  │     Can leave review & rating
  │
  └─ 3. Leaves 5-star review: "Amazing work! Exactly what I wanted"


Platform
  │
  ├─ 1. Records metrics:
  │     ├─ Revenue: $50 (10% of $500)
  │     ├─ Designer earnings: $450
  │     ├─ Order status: COMPLETED
  │     └─ Satisfaction: 5-star review ⭐
  │
  └─ 2. Project fully archived


PHASE 10: DISPUTE RESOLUTION (IF NEEDED)
─────────────────────────────────────────────────────────────────────────────

Admin
  │
  ├─ 1. Gets alert: "Dispute filed on commission [ID]"
  │
  ├─ 2. Views dispute details:
  │     ├─ Designer submission (files)
  │     ├─ Buyer evidence (screenshots, complaint)
  │     ├─ Chat history
  │     └─ Contract (requirements vs. delivery)
  │
  ├─ 3. Reviews evidence (typically 4-24 hours)
  │
  ├─ 4. Makes decision:
  │     • "Refund buyer + partial payment to designer"
  │     • "Release full payment to designer"
  │     • "Refund buyer + no payment to designer (rare)"
  │
  ├─ 5. Clicks: "Resolve Dispute"
  │
  ├─ 6. System executes resolution:
  │     ├─ Transfers funds per decision
  │     ├─ Sends emails to both parties
  │     ├─ Updates commission status: DISPUTED_RESOLVED
  │     └─ Closes case
  │
  └─ 7. All parties notified of outcome


═══════════════════════════════════════════════════════════════════════════════
```

---

## 💳 SIDE-BY-SIDE TEMPLATE COMPARISON

```
PAYMENT TIMELINE - ALL THREE TEMPLATES COMPARED
═══════════════════════════════════════════════════════════════════════════════

PROJECT: $500 Commission

TIME ──────────────────────────────────────────────────────────────────────────

SIMPLE (50/50)              │  STANDARD (30/30/40)       │  DETAILED (5-Phase)
                            │                            │
Day 0: Pay                  │  Day 0: Pay                │  Day 0: Pay
├─ $500 in escrow           │  ├─ $500 in escrow         │  ├─ $500 in escrow
│                           │  │                         │  │
Day 1:                      │  Day 1:                    │  Day 1:
├─ Designer confirms start  │  ├─ Designer confirms      │  ├─ Designer confirms
├─ $250 released (50%)      │  ├─ $150 released (30%)    │  ├─ $100 released (20%)
├─ Escrow: $250             │  ├─ Escrow: $350           │  ├─ Escrow: $400
│                           │  │                         │  │
Day 3-5:                    │  Day 3-5:                  │  Day 3:
                            │  ├─ Draft submitted        │  ├─ Concept uploaded
                            │  ├─ Buyer approves         │  ├─ Buyer approves
                            │  ├─ $150 released (30%)    │  ├─ $100 released (20%)
                            │  ├─ Escrow: $200           │  ├─ Escrow: $300
                            │  │                         │  │
Day 5-7:                    │                            │  Day 5:
├─ Final submitted          │                            │  ├─ Draft uploaded
├─ Buyer reviews            │                            │  ├─ Buyer approves
│                           │                            │  ├─ $125 released (25%)
                            │                            │  ├─ Escrow: $175
                            │                            │  │
Day 7-21:                   │  Day 8-21:                 │  Day 6-8:
├─ Buyer decides            │  ├─ Final submitted        │  ├─ Revisions done
│  ├─ Approves              │  ├─ Buyer decides          │  ├─ Buyer approves
│  │ └─ $250 released (50%) │  │  ├─ Approves            │  ├─ $75 released (15%)
│  │                        │  │  │ └─ $200 released (40%)│  ├─ Escrow: $100
│  │                        │  │  └─ Disputes/Revisions  │  │
│  │ Total: $500 ✅         │  │                         │  Day 8-10:
│  │                        │  └─ Total: $450-$500 ✅    │  ├─ Final submitted
│  ├─ Disputes              │                            │  ├─ Buyer approves
│  │ └─ Admin decides       │                            │  ├─ $100 released (20%)
│  │ └─ $0-$250 possible    │                            │  ├─ Escrow: $0
│  │                        │                            │  │
│  └─ Auto-release          │                            │  Total: $450 ✅
│    └─ $250 released (50%) │                            │
│    Total: $500 ✅         │                            │


KEY DIFFERENCES:
─────────────────────────────────────────────────────────────────────────────

                    SIMPLE          STANDARD        DETAILED
Payment Gates       2               3               5
Designer Check-ins  1               2-3             4-5
Buyer Decisions     1               2-3             5
Revision Rounds     0               2-3             Unlimited
Risk Level          HIGH ⚠️          LOW ✅          VERY LOW ✅
Quality Assurance   Minimal         Good            Excellent
Best For            Fast projects   Most projects   Complex projects
Typical Timeline    7-21 days       8-21 days       10-21 days
Tier Lock           GOLD+ only      All ✅          All ✅
```

---

## 🎯 TIER UNLOCK PROGRESSION

```
DESIGNER TIER JOURNEY
═══════════════════════════════════════════════════════════════════════════════

TIER 1: DESIGNER (New/Emerging)
────────────────────────────────
Status Badge:    None (emerging)
Sales Required:  0
Rating Required: N/A
Milestones:      ├─ Standard (30/30/40) ✅
                 ├─ Detailed (5-phase) ✅
                 └─ Simple (50/50) ❌ LOCKED

Growth Path:     Do 5-10 commissions, get 4.8+ rating
Next Tier:       GOLD_DESIGNER


TIER 2: GOLD_DESIGNER ⭐ ← SIMPLE TEMPLATE UNLOCKS HERE!
────────────────────────────────────────────────────────
Status Badge:    ⭐ (gold star)
Sales Required:  $5,000+
Rating Required: 4.8+
Milestones:      ├─ Standard (30/30/40) ✅
                 ├─ Detailed (5-phase) ✅
                 └─ Simple (50/50) ✅ UNLOCKED

New Options:     Can offer fast 50/50 split for experienced clients
Benefits:        Featured in "Gold Designers" section
Growth Path:     Reach $25,000+ sales and maintain 4.9+ rating
Next Tier:       VIP_DESIGNER


TIER 3: VIP_DESIGNER 💎
───────────────────────
Status Badge:    💎 (diamond)
Sales Required:  $25,000+
Rating Required: 4.9+
Milestones:      ├─ Standard (30/30/40) ✅
                 ├─ Detailed (5-phase) ✅
                 └─ Simple (50/50) ✅

New Options:     Priority commission queue, featured listings
Benefits:        Priority email support, exclusive promotions
Growth Path:     Reach $100,000+ sales and maintain 5.0 rating
Next Tier:       VVIP_DESIGNER


TIER 4: VVIP_DESIGNER 👑
────────────────────────
Status Badge:    👑 (crown)
Sales Required:  $100,000+
Rating Required: 5.0
Milestones:      ├─ Standard (30/30/40) ✅
                 ├─ Detailed (5-phase) ✅
                 └─ Simple (50/50) ✅

New Options:     White-glove support, guaranteed featured
Benefits:        Highest priority everything, exclusive events
Top Tier:        VVIP_DESIGNER (no higher tier)


Simple Template Eligibility: GOLD_DESIGNER, VIP_DESIGNER, VVIP_DESIGNER
```

---

## 💬 DATA FLOW DIAGRAM

```
DATA JOURNEY THROUGH THE SYSTEM
═══════════════════════════════════════════════════════════════════════════════

① DESIGNER SELECTS MILESTONE TEMPLATE

   UI: /seller/commission-settings/milestones/page.tsx
   │
   ├─ Gets user session (email, designerTier, id)
   │
   ├─ Displays template options:
   │  ├─ Checks: if tier in ['GOLD_DESIGNER', 'VIP_DESIGNER', 'VVIP_DESIGNER']
   │  ├─ YES → Show Simple template (unlocked)
   │  └─ NO → Show Simple template (locked with "GOLD+ ONLY" badge)
   │
   ├─ Designer selects template
   │
   └─ Clicks "Save"
      └─ POST /api/seller/commission-settings/milestones
         └─ Sends: { milestoneTemplate: "standard" }


② API RECEIVES & VALIDATES

   Endpoint: POST /api/seller/commission-settings/milestones/route.ts
   │
   ├─ Gets session (who is the user?)
   │
   ├─ Gets body.milestoneTemplate
   │
   ├─ Validates tier:
   │  if (template === 'simple' && !['GOLD_DESIGNER', 'VIP_DESIGNER', 'VVIP_DESIGNER'].includes(tier)) {
   │    return error(403, "Simple only for GOLD Designer tier and above")
   │  }
   │
   ├─ Updates database:
   │  User.milestoneTemplate = "standard"
   │
   └─ Returns: { success: true, milestoneTemplate: "standard" }


③ DATABASE STORES PREFERENCE

   MongoDB Collection: User
   │
   ├─ Document: { id: "user-123", ...other fields..., milestoneTemplate: "standard" }
   │
   └─ Stored indefinitely (until designer changes it)


④ BUYER INITIATES PURCHASE

   UI: /commission-payment/[id]/page.tsx
   │
   ├─ Component mounts
   │
   ├─ Calls: fetchRequest()
   │  └─ GET /api/commission-requests/[id]
   │     └─ Backend queries database:
   │        SELECT designer.milestoneTemplate FROM commission WHERE id = [id]
   │        └─ Returns: { ...details..., designer: { ...info..., milestoneTemplate: "standard" } }
   │
   ├─ Receives response with designer.milestoneTemplate = "standard"
   │
   ├─ Renders MilestoneDisplay component:
   │  └─ <MilestoneDisplay template="standard" totalAmount={500} />
   │
   └─ Component displays payment schedule to buyer


⑤ MILESTONE DISPLAY RENDERS

   Component: /components/commissions/MilestoneDisplay.tsx
   │
   ├─ Props received: { template: "standard", totalAmount: 500, platformFee: 50, designerEarnings: 450 }
   │
   ├─ Internal logic:
   │  const templates = {
   │    standard: [
   │      { name: "Deposit", percentage: 30, amount: 150, color: "amber" },
   │      { name: "Draft", percentage: 30, amount: 150, color: "blue" },
   │      { name: "Final", percentage: 40, amount: 200, color: "green" }
   │    ]
   │  }
   │
   ├─ Renders cards for each milestone:
   │  ├─ Card 1: "$150 (30%) - Deposit"
   │  ├─ Card 2: "$150 (30%) - Draft"
   │  └─ Card 3: "$200 (40%) - Final"
   │
   ├─ Adds explanations:
   │  ├─ "Non-refundable deposit warning"
   │  └─ "14-day auto-release explanation"
   │
   └─ Buyer sees full payment schedule BEFORE clicking Pay


⑥ PAYMENT PROCESSING

   Buyer clicks "Pay $500"
   │
   ├─ Frontend: handlePayment()
   │
   ├─ Creates Stripe session
   │  └─ Amount: $500
   │  └─ Metadata: { commissionId, buyerId, template: "standard" }
   │
   ├─ Redirects to Stripe checkout
   │
   └─ Stripe processes payment
      └─ Sends webhook: payment_intent.succeeded


⑦ PAYMENT WEBHOOK CREATES MILESTONES

   Backend: /api/webhooks/stripe (receives webhook)
   │
   ├─ Verifies webhook signature ✅
   │
   ├─ Gets: commissionId, amount, designerTemplate
   │
   ├─ Creates milestone records:
   │  ├─ Milestone 1: { amount: 150, percentage: 30, status: "pending" }
   │  ├─ Milestone 2: { amount: 150, percentage: 30, status: "pending" }
   │  └─ Milestone 3: { amount: 200, percentage: 40, status: "pending" }
   │
   ├─ Moves funds to ESCROW
   │  └─ Escrow balance: $500
   │
   └─ Creates Order record with milestones attached


⑧ DESIGNER CONFIRMS START

   Designer clicks "Confirm Start"
   │
   ├─ Frontend: confirmStart()
   │
   ├─ Calls: POST /api/milestones/[id]/confirm
   │
   ├─ Backend:
   │  ├─ Updates Milestone 1: status = "approved"
   │  ├─ Calls Stripe to transfer: $150 to designer
   │  ├─ Updates Escrow: $350 remaining
   │  └─ Creates PaymentTransaction: { amount: 150, type: "deposit_released" }
   │
   └─ Designer account: +$150 ✅
```

---

## 📞 SUPPORT QUICK REFERENCE

```
QUICK ANSWERS FOR COMMON QUESTIONS
═══════════════════════════════════════════════════════════════════════════════

Q: When does my money get released?
A: In stages, tied to designer actions and buyer approval:
   ├─ Simple: 50% when work starts, 50% when you approve final
   ├─ Standard: 30% work start, 30% draft approval, 40% final approval
   └─ Detailed: Five payments across five milestones

Q: What if I don't approve within 14 days?
A: The system auto-releases to the designer to prevent them from waiting forever
   └─ You can still download and use files even after auto-release

Q: Can I get money back?
A: Yes, if:
   ├─ Designer fails to deliver
   ├─ Work doesn't match the requirements
   └─ You dispute within 7 days
   └─ Admin sides with you after reviewing evidence

Q: Do I have to use Standard template?
A: No! You can choose:
   ├─ If GOLD_DESIGNER+: Choose Simple (50/50) for fast projects
   ├─ All tiers: Choose Standard (30/30/40) - recommended for most
   └─ All tiers: Choose Detailed (20/20/25/15/20) for maximum safety

Q: How long does it take?
A: Depends on template:
   ├─ Simple: 7-21 days (fast)
   ├─ Standard: 8-21 days (normal)
   └─ Detailed: 10-21 days (thorough)

Q: What about disagreements?
A: Our admin team mediates:
   ├─ Reviews both sides' evidence
   ├─ Makes fair decision based on requirements
   ├─ Enforces decision (refund or release)
   └─ Both parties notified of outcome

Q: What if there's a problem?
A: Contact support@fashionmarketplace.com
   └─ Include: Commission ID, description of issue, any evidence
```

---

## ✨ KEY VISUAL INDICATORS

```
STATUS BADGES & VISUAL CUES
═══════════════════════════════════════════════════════════════════════════════

Template Lock:
├─ 🔒 LOCKED: Gray background, locked icon, "GOLD+ ONLY" badge
├─ 🔓 UNLOCKED: Colored background, clickable, can select
└─ ⭐ RECOMMENDED: Star badge on Standard template (default)

Payment Status:
├─ ⏳ PENDING: Gray, not yet triggered
├─ 🟡 PROCESSING: Yellow/amber, awaiting approval
├─ ✅ RELEASED: Green, money transferred
├─ ❌ DISPUTED: Red, under review
└─ 🕐 AUTO-RELEASED: Blue, released after 14 days

Milestone Cards:
├─ 💰 Deposit: Amber/gold color (risky for buyer if they cancel)
├─ 💙 Draft/Mid: Blue color (informational)
└─ ✅ Final: Green color (positive, complete)

Tier Badges:
├─ DESIGNER: None (emerging)
├─ ⭐ GOLD_DESIGNER: Gold star
├─ 💎 VIP_DESIGNER: Diamond
└─ 👑 VVIP_DESIGNER: Crown

Warnings:
├─ ⚠️ Orange: Important but not critical
├─ 🚨 Red: Critical (dispute, etc.)
└─ 🛡️ Shield: Security/protection indicator
```

---

Generated: January 27, 2026  
**All flows tested & verified ✅**
