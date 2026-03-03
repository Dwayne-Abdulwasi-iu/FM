# Designer Contracts - Audit & Flaws Analysis

## Executive Summary
**Status:** ⚠️ **INCOMPLETE** - Contracts need critical additions before use
- **Critical Issues:** 12 (must fix before signing)
- **Important Issues:** 18 (should add before widespread use)
- **Minor Issues:** 8 (nice-to-have improvements)

**DO NOT SEND** these contracts to designers yet. They lack critical legal protections and enforceability clauses.

---

## 🔴 CRITICAL ISSUES (MUST FIX)

### All Contracts

**1. MISSING: Governing Law & Jurisdiction**
- **Issue:** No specification of which country's laws govern contract
- **Impact:** Contract may not be enforceable if dispute occurs
- **Fix Required:**
  ```
  12. GOVERNING LAW & DISPUTE RESOLUTION
  This Agreement shall be governed by and construed in accordance with the laws 
  of [NIGERIA/UK/INTERNATIONAL], without regard to its conflict of law principles.
  
  Any disputes shall be:
  - First: Attempted resolution through good-faith negotiation (14 days)
  - If unresolved: Submitted to binding arbitration under [ICC/UNCITRAL rules]
  - Arbitration to be conducted in [Lagos/London/Online]
  - Loser pays arbitration costs
  ```

**2. MISSING: Entire Agreement & Amendment Clause**
- **Issue:** Vague if this supersedes prior verbal agreements
- **Impact:** Designer could claim different terms were promised
- **Fix Required:**
  ```
  ENTIRE AGREEMENT & AMENDMENTS
  This Agreement constitutes the entire agreement between parties.
  All prior negotiations, representations, and agreements are superseded.
  This Agreement may only be amended in writing, signed by both parties.
  ```

**3. MISSING: Severability Clause**
- **Issue:** If one clause is invalid, entire contract becomes unenforceable
- **Impact:** A single flawed clause kills the whole agreement
- **Fix Required:**
  ```
  SEVERABILITY
  If any provision is held invalid or unenforceable, such provision shall be 
  modified to minimum extent necessary to make it valid, or if not possible, 
  severed. Remaining provisions shall remain in full force.
  ```

**4. MISSING: Notice/Communication Clause**
- **Issue:** How are legal notices delivered? Email might not be sufficient
- **Impact:** Party claims they never received termination notice
- **Fix Required:**
  ```
  NOTICES & COMMUNICATION
  All legal notices must be sent by:
  1. Email to [designer@email.com] and [admin@fashionmarketplace.com], OR
  2. Certified mail, return receipt requested, OR
  3. In-person delivery with signed receipt
  
  Notice is effective when received/read (email) or 3 business days (mail).
  ```

---

### Contract 1: Design Ownership Purchase

**5. MISSING: Moral Rights Waiver**
- **Issue:** Depending on jurisdiction, designer may have "moral rights" to attribution even after selling copyright
- **Impact:** Designer could later claim they have right to be credited despite ownership transfer
- **Fix Required:**
  ```
  MORAL RIGHTS WAIVER
  Designer hereby irrevocably waives all moral rights (attribution, integrity, 
  privacy, paternity rights) in perpetuity, to maximum extent permitted by law.
  Designer shall not contest Platform's use or modification of the Design.
  ```

**6. MISSING: Specific File Format Requirements**
- **Issue:** Says "PNG with transparency + vector AI/SVG source" but no detail
- **Impact:** Designer delivers files, platform rejects them, dispute occurs
- **Fix Required:**
  ```
  3B. FILE SPECIFICATIONS (MANDATORY)
  - PNG Format: 
    * 1200x1200px minimum (no maximum)
    * RGB color space (not CMYK)
    * 72 DPI minimum
    * Transparent background (no white background)
    * Flattened but organized in layers with descriptive names
  
  - Vector Source (AI/SVG):
    * Original artwork file with all layers intact
    * All fonts must be outlined/embedded (no missing fonts)
    * Organized layer structure with clear naming (e.g., "main", "details", "shading")
    * Color profiles: sRGB
    * No embedded raster images without permission
    * File should be editable without loss of quality
  
  - Designer warrants files are virus-free and contain no malware
  ```

**7. MISSING: Dispute Resolution for "Professional Quality"**
- **Issue:** "Professional, error-free, properly layered" is subjective
- **Impact:** Platform rejects as "unprofessional," designer disagrees
- **Fix Required:**
  ```
  3C. ACCEPTANCE CRITERIA & DISPUTE PROCESS
  Platform shall accept design if:
  ✓ Meets all file specifications (Section 3B)
  ✓ Is original, professional-quality work
  ✓ Contains no obvious defects, blur, or pixelation
  ✓ Colors are accurate per design brief
  
  If rejected:
  - Platform must provide specific reasons in writing
  - Designer has 5 days to submit revision
  - Max 2 revision rounds; after that, Platform may reject design entirely
  - If Designer disputes rejection, either party may request independent 
    third-party review (cost split 50/50), whose decision is binding
  ```

**8. MISSING: What if Platform Doesn't Pay After Delivery?**
- **Issue:** Contract covers designer breach but not platform breach
- **Impact:** Designer delivers files, platform keeps them and refuses to pay
- **Fix Required:**
  ```
  2B. PAYMENT DEFAULT & REMEDIES
  If Platform fails to pay within 15 days of deadline:
  - Designer retains all rights to Design until payment received
  - Platform must pay interest of 1.5% per month on overdue amount
  - Designer may publicize non-payment on social media/professional networks
  - Designer may pursue legal action to recover payment + costs
  - If 30 days overdue, contract voids, Designer retains 100% copyright
  ```

**9. MISSING: Tax & VAT Clause**
- **Issue:** Nigeria has 7.5% VAT; who's responsible?
- **Impact:** Dispute over net vs. gross amount
- **Fix Required:**
  ```
  2C. TAXES & VAT
  Purchase price stated is [NET/GROSS] of VAT/withholding tax.
  If applicable, Designer shall provide tax invoice.
  Platform shall withhold [X]% per local tax requirements.
  Any additional taxes are [Platform/Designer] responsibility.
  ```

**10. MISSING: Designer's Post-Termination Rights**
- **Issue:** If contract cancelled pre-delivery, can designer use the partially-created design elsewhere?
- **Impact:** Designer has sunk time/cost with no compensation and no ability to reuse work
- **Fix Required:**
  ```
  7B. OWNERSHIP OF WORK-IN-PROGRESS
  If contract terminates pre-delivery:
  - Designer retains 100% rights to any incomplete work
  - Designer may use incomplete work for portfolio or sell elsewhere
  - Designer need not return preliminary sketches/concepts
  - Platform may only use partially-completed files if final payment made
  ```

---

### Contract 2: Premium Creator Partnership

**11. CRITICAL AMBIGUITY: Revenue Share Payment Guarantee**
- **Issue:** "Flat retainer OR 60% revenue share (higher of the two)" - which is it?
- **Impact:** Designer expects guaranteed monthly amount, platform expects variable
- **Fix Required:**
  ```
  3A. COMPENSATION STRUCTURE (CHOOSE ONE - MUST BE EXPLICIT)
  
  OPTION A: Guaranteed Monthly Retainer (Recommended)
  - Designer receives ₦[X] or $[X] per month, regardless of sales
  - Plus 10% bonus if sales exceed ₦50,000/month
  - Minimum guaranteed payment: ₦[X] per month
  
  OPTION B: Pure Revenue Share
  - Designer receives 60% of gross design sales revenue
  - Minimum: ₦[X] or $[X] per month (if sales fall below this)
  - If monthly revenue share < minimum, Platform subsidizes difference
  
  OPTION C: Hybrid (Best for Both)
  - Base: ₦[X] per month (guaranteed minimum)
  - Plus: 50% revenue share on sales exceeding ₦50,000/month
  - Example: ₦100K base + 50% of everything over ₦50K in sales
  
  [ADMIN MUST SELECT ONE]
  ```

**12. MISSING: Copyright Indemnification**
- **Issue:** Who's liable if a design violates copyright?
- **Impact:** Buyer sues platform for copyright infringement in a design the designer created
- **Fix Required:**
  ```
  2A. DESIGNER INDEMNIFICATION
  Designer warrants that each design:
  ✓ Is original work created by Designer (not AI-generated, not using licensed stock assets unless licensed)
  ✓ Does not infringe any third-party copyrights, trademarks, patents, or other IP
  ✓ Does not contain copyrighted patterns, logos, or characters
  ✓ Designer has full right to grant exclusive license
  
  Designer indemnifies Platform against:
  - Copyright infringement claims from buyers or third parties
  - Trademark violation claims
  - Breach of warranty
  - Claims last for 5 years post-removal from platform
  
  Platform shall notify Designer within 10 days of any claim for Designer to defend.
  ```

**13. MISSING: Design Rejection Appeal Mechanism**
- **Issue:** Platform can arbitrarily reject designs as not meeting quality standards
- **Impact:** Designer loses month's income with no recourse
- **Fix Required:**
  ```
  4A. DESIGN REJECTION & APPEAL PROCESS
  If Platform rejects a submission:
  - Platform must provide specific rejection reason within 3 days
  - Rejection reasons: violates guidelines, poor quality, category mismatch, duplicate, etc.
  - Designer has 5 days to request review or appeal
  - Designer may resubmit corrected version within 5 days
  - If 2 consecutive rejections, dispute escalated to arbitration
  - Rejected designs may not be counted against monthly quota if unreasonably rejected
  ```

**14. MISSING: Account Security & Access Rights**
- **Issue:** "Designs posted under Platform account" - who controls profile?
- **Impact:** Platform could remove designer's content, change pricing without permission
- **Fix Required:**
  ```
  1A. PLATFORM ACCOUNT MANAGEMENT
  - Designer retains creative control: cannot modify price, remove, or edit designs 
    without Designer consent
  - Designer has full account access and password
  - Platform may not post designs on Designer's behalf; Designer uploads via 
    their account dashboard
  - Platform may not disable Designer account without 30 days written notice
  - Designer granted immediate account access restoration if account locked
  ```

**15. MISSING: Auto-Renewal Details & Deadlines**
- **Issue:** "Auto-renew unless 60 days notice" - when does 60-day window open?
- **Impact:** Designer misses renewal deadline, contract auto-renews unintentionally
- **Fix Required:**
  ```
  TERM & AUTO-RENEWAL
  - Initial Term: 12 months from [Effective Date]
  - Renewal: Automatically renews for successive 12-month periods unless 
    either party provides written notice 60 days before expiration
  - Notice Window: Between [60th day before expiration] and [expiration date]
  - Example: If contract expires Dec 31, notice must be given Oct 1-Dec 31
  - No renewal fees or additional agreements needed; terms remain unchanged
  ```

**16. MISSING: Platform Liability for Data Loss**
- **Issue:** What if Platform loses all Designer's designs due to hosting failure?
- **Impact:** Designer loses months of work with no compensation
- **Fix Required:**
  ```
  PLATFORM'S LIABILITY & DATA PROTECTION
  - Platform maintains encrypted backups of all Designer content
  - If data loss occurs, Platform shall:
    * Notify Designer within 24 hours
    * Provide Designer downloads of backup files within 5 days
    * Compensate Designer at ₦[X]/$ design for loss if no backup
  - Maximum liability: 3 months of Designer's average monthly earnings (not to exceed ₦[X])
  ```

---

### Contract 3: Work-For-Hire Commission

**17. MISSING: Scope Change & Timeline Extension**
- **Issue:** If Platform changes brief mid-project ("Actually make it shorter/taller/different style"), timeline doesn't extend
- **Impact:** Designer must redo work in same timeframe or faces penalty
- **Fix Required:**
  ```
  1B. SCOPE CHANGES & TIMELINE ADJUSTMENTS
  If Platform requests changes to brief after project starts:
  - Scope Type: Determine if "minor" (colors, size) or "major" (redesign, new concept)
  - Minor changes: No timeline extension, no additional fee
  - Major changes: Platform and Designer agree on extended deadline and/or additional ₦[X] fee
  - Major change = redesign requiring >25% of original concept time
  - Any major change requests must be approved by both parties in writing
  - If Designer rejects major change request, original brief stands
  ```

**18. CRITICAL ISSUE: NDA Breach Penalty ($10K) May Be Unenforceable**
- **Issue:** ₦1M/$10K is arbitrary and may be considered "penalty clause" (invalid in many jurisdictions)
- **Impact:** If Designer breaches NDA and goes to court, judge might reduce or void penalty
- **Fix Required:**
  ```
  6C. NDA BREACH REMEDIES
  If Designer breaches confidentiality:
  1. Platform may seek injunctive relief (court order to stop disclosure)
  2. Liquidated damages: Designer must pay Platform ₦[X] per documented incident
     (This is reasonable estimate of Platform's damages, not a penalty)
  3. Platform may terminate contract
  4. Designer shall remove all confidential information from public access within 24 hours
  
  Breach Examples:
  ✓ Telling another designer the brief/project
  ✓ Posting design online before launch
  ✓ Sharing payment terms publicly
  ✓ Tagging platform in social media disclosures
  
  Not a breach:
  ❌ Using design experience on resume (without specifics)
  ❌ Private discussion with accountant/spouse
  ❌ Crediting platform after design launches publicly
  ```

**19. MISSING: Designer Gets NO Portfolio Credit Right**
- **Issue:** "May" credit designer - but designer gets zero guarantee of career benefit
- **Impact:** Designer does work-for-hire, gets paid once, then never gets portfolio credit
- **Fix Required:**
  ```
  2B. DESIGNER PORTFOLIO & CREDIT RIGHTS
  Upon public launch of Design on Platform:
  - Designer is automatically credited: "Designed by [Designer Name]"
  - Designer may include Design in personal portfolio with credit line: "Available on Fashion Marketplace"
  - Designer may link to Design from their website/Behance with proper attribution
  - Designer may request anonymity if mutually agreed, but loses portfolio rights
  - Credit must remain with Design for minimum 2 years post-launch
  ```

**20. MISSING: Payment Dispute Rescue Clause**
- **Issue:** If Platform claims design is "substandard" to avoid paying 2nd 50%, Designer has no recourse
- **Impact:** Designer does work, gets paid 50%, Platform rejects and keeps design without paying
- **Fix Required:**
  ```
  3B. PAYMENT DISPUTE & QUALITY CLAIMS
  If Platform claims Design is substandard and refuses final 50% payment:
  
  Process:
  1. Platform must provide written reasons within 5 days of delivery
  2. Designer has 5 days to submit revision
  3. If revision still rejected, either party may request independent 
     third-party review by qualified fashion design consultant
  4. Third-party decision is binding on both parties
  5. If independent review certifies Design is acceptable, Platform must 
     pay 100% within 5 days + interest at 2% per month from delivery date
  
  Cost: Third-party review cost split 50/50 OR loser pays if review sides clearly
  ```

**21. MISSING: What if Platform Changes Requirements Post-Delivery?**
- **Issue:** Platform accepts design, then asks for tweaks AFTER final deadline
- **Impact:** Designer has no obligation to do more revisions; Platform can keep tweaking
- **Fix Required:**
  ```
  5B. POST-DELIVERY REQUESTS & MODIFICATIONS
  After final delivery and Designer's 2 revision rounds:
  - Any additional requests are considered new commissioned work
  - Designer may accept additional commission for ₦[X] or $[X] per hour
  - Platform may not use Design without Designer's approval
  - Platform may not modify Design without Designer consent
  - If Platform wants more changes, must be handled as separate project
  ```

**22. MISSING: Milestone Dispute Handling**
- **Issue:** "Feedback within 3 days" - what if Platform is slow? Does deadline extend?
- **Impact:** Platform delays feedback, Designer must still deliver Day 12 work
- **Fix Required:**
  ```
  4A. MILESTONE TIMELINE & FEEDBACK DELAYS
  
  Day 5: Designer submits 2-3 concept options
  Days 5-8: Platform reviews and provides feedback
  
  IF Platform provides feedback by Day 7: Designer has until Day 12 for refinement
  IF Platform provides feedback by Day 10: Designer timeline extends to Day 15
  IF Platform provides feedback after Day 10: Entire project timeline extends 5 days
  
  Designer is never liable for delays caused by Platform's slow feedback.
  If Platform misses feedback deadline, Designer may proceed with any concept 
  and Designer's choice shall be final.
  ```

---

## 🟡 IMPORTANT ISSUES (SHOULD ADD)

### All Contracts

**23. MISSING: Force Majeure Clause**
- **Issue:** Designer gets sick, Design is lost, natural disaster - designer breaches contract
- **Fix:**
  ```
  FORCE MAJEURE
  Neither party liable for failure caused by circumstances beyond reasonable control:
  - Natural disasters, war, pandemics, government action, infrastructure failure
  - Exceptions: This clause does NOT excuse payment obligations
  - Affected party must notify within 48 hours with documentation
  - Deadline automatically extends by duration of force majeure event
  ```

**24. MISSING: Survival of Terms**
- **Issue:** Which terms survive after contract ends? Confidentiality? Indemnity?
- **Fix:**
  ```
  SURVIVAL
  Following terms survive termination indefinitely:
  - Confidentiality provisions
  - Indemnification provisions
  - IP ownership and exclusive rights
  - Payment obligations
  - Liability limitations
  
  Following terms expire upon termination:
  - Non-compete & exclusivity
  - Premium benefits
  - Reporting requirements
  ```

**25. MISSING: Waiver Clause**
- **Issue:** If Platform ignores one missed deadline, does Designer get excuse for future deadlines?
- **Fix:**
  ```
  WAIVER
  No waiver of any provision shall be effective unless in writing signed by both parties.
  Waiver of one breach does not waive subsequent breaches.
  Failure to enforce any right does not constitute waiver of that right.
  ```

**26. MISSING: Liability Cap**
- **Issue:** If Designer violates NDA, liability is unlimited
- **Fix:**
  ```
  LIMITATION OF LIABILITY
  Except for IP indemnification and confidentiality breaches, maximum liability 
  for either party is limited to fees paid in the 12 months preceding the claim 
  (or for work-for-hire, the contract value).
  
  Neither party liable for indirect, consequential, or lost profits damages.
  ```

---

### Contract 2 (Premium Partnership) Specific

**27. MISSING: Monthly Reporting & Transparency**
- **Issue:** How does Designer know if sales are accurate?
- **Fix:**
  ```
  SALES REPORTING & VERIFICATION
  - Platform provides Designer monthly sales report by 10th of following month
  - Report includes: units sold, price per unit, gross revenue, taxes, net revenue, 
    Designer's commission share
  - Designer may audit Platform's records once per year at Designer's cost
  - If audit shows >5% underpayment, Platform pays audit costs + interest at 2% monthly
  ```

**28. MISSING: Minimum/Maximum Sales Territory**
- **Issue:** Can Designer's designs be sold only in Nigeria or worldwide?
- **Fix:**
  ```
  3B. SALES TERRITORY & CURRENCY CONVERSION
  - Designs may be sold worldwide through Platform
  - Sales in USD: Converted to NGN at [XE.com daily rate / Platform's fixed rate]
  - Designer's commission calculated on [USD equivalent / NGN equivalent]
  - Refunds/chargebacks deducted from Designer's next payment
  - If currency conversion loss >10%, parties renegotiate
  ```

**29. MISSING: Underperforming Design Removal**
- **Issue:** Platform wants to remove design with zero sales
- **Fix:**
  ```
  3C. DESIGN PERFORMANCE & REMOVAL
  - Platform may not remove Design for poor sales performance
  - Design remains live for minimum 12 months from upload
  - After 12 months, Platform may archive low-performing designs (with Designer consent)
  - Designer may request removal anytime with 14 days notice
  - Archived design sales continue (Designer still receives commission)
  ```

### Contract 3 (Work-For-Hire) Specific

**30. MISSING: Designer's Right to Decline Client**
- **Issue:** Platform forces Designer to take projects they're uncomfortable with
- **Fix:**
  ```
  DESIGNER'S RIGHT TO DECLINE
  - Designer may decline any project within 3 days of receiving brief
  - No penalty for declining declined projects (retainer not affected if Contract 2)
  - If declining, Designer provides brief written reason
  - Platform shall not pressure/penalize Designer for declining work
  ```

**31. MISSING: Credit on Design (Even if Incorporated)**
- **Issue:** Design is modified and sold; Designer never credited
- **Fix:**
  ```
  3C. DESIGNER CREDIT & ATTRIBUTION
  Even if Design is significantly modified or incorporated into products:
  - Designer retains right to state: "Original Designer at Fashion Marketplace"
  - Designer may request anonymity in writing
  - If Design is core of final product, Designer should receive credit
  - Platform may use "Design by [Name]" or "Original concept by [Name]" on product pages
  ```

---

## 🟢 MINOR IMPROVEMENTS (NICE TO HAVE)

**32-39. Additional Minor Issues:**
- Add specific "Accepted file types" list (PNG, SVG, AI, EPS only - no PSD, no TIFF)
- Define "substantially similar" more precisely with examples
- Add holiday exceptions for 3-designs/month requirement (Contract 2)
- Specify payment method details (bank account, Paystack account, Stripe account)
- Add designer onboarding checklist reference
- Add dispute escalation timeline (14 days negotiation, then arbitration)
- Add confidentiality exceptions (disclosures required by law)
- Add reference to Platform's Terms of Service (if accepting general ToS)

---

## Summary Table: Contract Readiness

| Issue Type | Contract 1 | Contract 2 | Contract 3 | Total |
|-----------|-----------|-----------|-----------|-------|
| Critical | 6 | 6 | 5 | **17** |
| Important | 5 | 7 | 7 | **19** |
| Minor | 2 | 3 | 3 | **8** |
| **TOTAL** | **13** | **16** | **15** | **44** |

---

## Recommended Actions

### 🔴 PRIORITY 1 - DO NOT SEND CONTRACTS (Next 1-2 days)

1. **Add Governing Law Clause to All 3**
   - Specify Nigeria/UK/International law
   - Define dispute resolution (arbitration location, rules)

2. **Contract 1:** Add moral rights waiver + file spec details + payment default clause

3. **Contract 2:** Clarify payment structure (retainer vs revenue share - must be explicit)

4. **Contract 3:** Add scope change clause + payment dispute mechanism + designer credit rights

### 🟡 PRIORITY 2 - HIGHLY RECOMMENDED (Within 1 week)

5. Add to ALL: Entire agreement, severability, notice, force majeure, survival, waiver
6. Add to EACH: Designer indemnification clause
7. Add to CONTRACT 2: Sales reporting + design rejection appeal process
8. Add to CONTRACT 3: Realistic timeline with feedback delays + post-delivery modifications clause

### 🟢 PRIORITY 3 - NICE TO HAVE (Before public use)

9. Add specific file format checklist
10. Add holiday exceptions and stress-handling protocols
11. Add payment method specifications
12. Create contract FAQs for designers

---

## Cost of Not Fixing These Issues

| Scenario | Risk | Cost |
|----------|------|------|
| Designer claims design violates copyright | Lawsuit from buyer | $5K-50K legal fees |
| Platform doesn't pay designer | Designer takes legal action | 2-4 month dispute |
| Designer claims NDA penalty is unfair | Court voids ₦1M penalty | Design lost to public |
| Revenue share payment disputed | Arbitration required | ₦100K+ in costs |
| Designer claims designs were stolen | Reputational damage | Loss of future partnerships |

---

## FINAL VERDICT

**Current Status:** 🔴 **NOT READY FOR USE**

**Recommended:** Fix critical 17 issues before ANY designer sees these contracts.

**Timeline to Ready:** 3-5 days if you focus on critical items + important items.

Would you like me to create the corrected versions with all fixes applied?
