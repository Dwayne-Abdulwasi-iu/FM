# MILESTONE CONFIGURATION - VISUAL GUIDE

## 🎯 What Designers See

### Page: `/seller/commission-settings`

```
┌─────────────────────────────────────────────────┐
│ ⚙️ Commission Settings                          │
│ Configure how customers can request...          │
└─────────────────────────────────────────────────┘

[Earlier sections: Accept, Status, Budget, Types...]

┌─────────────────────────────────────────────────┐
│ 💳 Payment Milestone Template    [⚠️ IMPORTANT] │
├─────────────────────────────────────────────────┤
│ Choose how your commission payments are divided │
│ across milestones. Funds released per approval. │
│                                                  │
│ [🎯 Configure Payment Milestones →]             │
└─────────────────────────────────────────────────┘

[Later sections: Terms, Save Button...]
```

---

## 🎯 Designer Config Page: `/seller/commission-settings/milestones`

```
🎯 Payment Milestone Templates          [← Back to Settings]

Choose how your commission payments are divided across 
milestones. This applies to all new commissions.

┌─ 💡 How it works ─────────────────────────────────┐
│ Your chosen template will be used for all new      │
│ commissions. Funds are released as each milestone  │
│ is approved by the buyer. 14-day auto-release     │
│ safety net applies if buyer doesn't respond.      │
└──────────────────────────────────────────────────┘

═══ TEMPLATE CARDS (3 columns) ═══

┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ ⚡ Simple (50/50)     │  │ ⚖️ Standard (30/30/40)│  │ 🔐 Detailed (multi-m)│
│ Best for smaller...  │  │ Balanced payment...  │  │ Maximum protection...│
│ [GOLD ONLY 🔒]       │  │ [✨ RECOMMENDED]      │  │                      │
│                      │  │                      │  │                      │
│ Milestone 1:         │  │ Milestone 1:         │  │ Milestone 1: 20%     │
│ Deposit: 50%         │  │ Deposit: 30%         │  │ Milestone 2: 20%     │
│ Milestone 2:         │  │ Milestone 2:         │  │ Milestone 3: 25%     │
│ Final: 50%           │  │ Draft: 30%           │  │ Milestone 4: 15%     │
│                      │  │ Milestone 3:         │  │ Milestone 5: 20%     │
│ Risk: ⚠️ HIGH        │  │ Final: 40%           │  │                      │
│                      │  │ Risk: ✅ LOW         │  │ Risk: ✅ LOW         │
│ Best for...          │  │ Best for...          │  │ Best for...          │
│ Experienced only     │  │ Most commissions     │  │ Complex projects     │
│                      │  │                      │  │                      │
│ [SELECT]             │  │ [✓ SELECTED]         │  │ [SELECT]             │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘

═══ PAYMENT TIMELINE - Standard (Currently Selected) ═══

┌─ Milestone 1: Deposit ──────────────────────────┐
│ 💰 $150                                          │
│ Released immediately when you confirm start     │
│ ⚠️ Non-refundable if buyer cancels after this   │
└────────────────────────────────────────────────┘

┌─ Milestone 2: First Draft ──────────────────────┐
│ 💰 $125                                          │
│ Released when buyer approves this milestone     │
└────────────────────────────────────────────────┘

┌─ Milestone 3: Final Delivery ──────────────────┐
│ ✅ $175                                          │
│ Released when buyer approves final delivery     │
└────────────────────────────────────────────────┘

┌─ BREAKDOWN FOR $500 COMMISSION ────────────────┐
│ Your Earnings (after 10% fee):  $450            │
│ Breakdown:                                       │
│  • Deposit (30%): $150                          │
│  • First Draft (30%): $125                      │
│  • Final Delivery (40%): $175                   │
│                                                 │
│ Platform Fee (10%): $50                         │
└────────────────────────────────────────────────┘

┌─ 14-DAY AUTO-RELEASE SAFETY NET ──────────────┐
│ 🕐 If the buyer doesn't respond to your        │
│    milestone approval for 14 days, funds are   │
│    automatically released. You're protected!   │
└────────────────────────────────────────────────┘

┌─ GOLD TIER LOCK INFO (if selecting Simple) ───┐
│ 🔒 Simple Template (50/50) - GOLD Tier Only    │
│                                                 │
│ This template is only for GOLD tier designers. │
│ Your tier is: USER                              │
│ The 50/50 split requires waiting until final   │
│ approval (higher risk).                         │
│ Upgrade your tier or choose Standard/Detailed. │
└────────────────────────────────────────────────┘

        [Save as My Default Template]  [Cancel]
```

---

## 💳 Buyer Payment Page: `/commission-payment/[id]`

```
[← Back to Commissions]

┌────────────────────────────────────────────────┐
│ 💳 PAY FOR COMMISSION                          │
│ Complete payment to start your custom project  │
└────────────────────────────────────────────────┘

Commission: Custom Illustration
Description: A beautiful watercolor portrait...
Designer: Sarah Chen ✓ Verified
Estimated delivery: 3 weeks

┌─ PRICE BREAKDOWN ──────────────────────────────┐
│ Commission Price:           $500.00             │
│ Platform Fee (10%):         Included            │
│                                                 │
│ TOTAL:                      $500.00             │
└────────────────────────────────────────────────┘

┌─ 💳 PAYMENT SCHEDULE (Standard 30/30/40) ────┐
│                                               │
│ ┌─ Milestone 1: Deposit ───────────────────┐ │
│ │ 💰 $150                                  │ │
│ │ Released when designer confirms start    │ │
│ │ ⚠️ Non-refundable if you cancel          │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ ┌─ Milestone 2: First Draft ──────────────┐ │
│ │ 💙 $125                                  │ │
│ │ Released when you approve initial draft │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ ┌─ Milestone 3: Final Delivery ──────────┐ │
│ │ ✅ $175                                  │ │
│ │ Released when you approve final work    │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ Designer Receives: $450 (after 10% fee)      │
│ • Deposit (30%): $150                        │
│ • First Draft (30%): $125                    │
│ • Final Delivery (40%): $175                 │
│                                               │
│ 🕐 14-Day Auto-Release                       │
│ If you don't approve a milestone for 14 days,│
│ funds auto-release to designer. You're fully │
│ protected!                                    │
└───────────────────────────────────────────────┘

[Payment Method: Choose Stripe or Paystack]

        [Pay $500.00]

┌─ 🛡️ ESCROW PAYMENT PROTECTION ──────────────┐
│ Your payment is held securely until you       │
│ confirm the work is complete. The designer   │
│ will NOT receive payment until you approve   │
│ delivery for each milestone.                 │
└─────────────────────────────────────────────┘
```

---

## 🔐 Simple Template Lock (Non-GOLD Designer)

```
When designer tries to select Simple:

┌──────────────────────┐
│ ⚡ Simple (50/50)     │
│ [🔒 GOLD ONLY] ◄─── Lock badge
│ [Cannot select]
│ 
│ Milestone 1: 50%
│ Milestone 2: 50%
│ Risk: ⚠️ HIGH
└──────────────────────┘

When hovering/trying to save:

┌─ TIER RESTRICTION ────────────────────────────┐
│ 🔒 Simple Template (50/50) - GOLD Tier Only  │
│                                               │
│ This template is only available for GOLD     │
│ tier designers. Your current tier is USER.   │
│                                               │
│ The 50/50 split requires you to wait until   │
│ final approval to get your second payment,   │
│ which is higher risk.                        │
│                                               │
│ Upgrade your tier or choose Standard or      │
│ Detailed instead.                            │
└───────────────────────────────────────────────┘
```

---

## 📊 Tier Requirements

```
TEMPLATE ACCESS BY TIER:

USER (Emerging)
├─ ✅ Standard (30/30/40) - DEFAULT
├─ ✅ Detailed (20/20/25/15/20)
└─ ❌ Simple (50/50) [LOCKED]

GOLD Designer
├─ ✅ Standard (30/30/40)
├─ ✅ Detailed (20/20/25/15/20)
└─ ✅ Simple (50/50) [UNLOCKED]

VVIP Designer
├─ ✅ Standard
├─ ✅ Detailed
└─ ✅ Simple
```

---

## 🎨 Color Scheme

```
Deposit (First milestone):
├─ Background: Amber/Gold (#FBBF24)
├─ Icon: AlertCircle
└─ Warning: Non-refundable callout

Intermediate Milestones:
├─ Background: Blue (#3B82F6)
├─ Icon: Clock
└─ Info: Regular approval

Final Delivery:
├─ Background: Green (#10B981)
├─ Icon: CheckCircle
└─ Status: Final payment

UI Elements:
├─ Recommended Badge: Amber (#FCD34D)
├─ Lock Badge: Gray (#9CA3AF)
├─ Template Cards: White with borders
└─ Info Boxes: Light blue tint
```

---

## 📱 Mobile View

```
Same layout but:
- Single column (stack vertically)
- Larger touch targets
- Simplified tables
- Full-width buttons
- Compact mode for MilestoneDisplay component

[Template card 1]
[Template card 2]
[Template card 3]

[Milestone Timeline]

[Payment Breakdown]

[Save Button]
```

---

## ✅ What Works End-to-End

1. **Designer**: Goes to settings → Sees milestone config link
2. **Designer**: Clicks link → Sees three templates
3. **Designer**: Standard is recommended + default
4. **Designer**: Simple is locked (unless GOLD)
5. **Designer**: Chooses template → Saves
6. **System**: Stores preference in DB
7. **Buyer**: Requests commission → Designer accepts
8. **Buyer**: Goes to pay page
9. **Buyer**: Sees exact milestone schedule
10. **Buyer**: Knows when designer gets paid
11. **Buyer**: Sees 14-day auto-release safety
12. **Buyer**: Clicks pay with full understanding

---

Generated: January 27, 2026
