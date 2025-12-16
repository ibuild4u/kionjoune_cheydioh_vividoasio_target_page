# VividOasis Dynamic Pricing System

## 📚 Documentation Index

This folder contains comprehensive documentation for the VividOasis booking platform and its dynamic pricing engine.

### Files

| File | Description |
|------|-------------|
| `pricing_philosophy.md` | The WHY - Philosophy and approach to pricing |
| `pricing_math.md` | The HOW - Mathematical formulas and calculations |
| `pricing_flowchart.mmd` | Visual flowchart (Mermaid diagram) |
| `comparison_airdna_pricelabs.md` | How we compare to industry leaders |
| `app_architecture.md` | System overview and data flow |

---

## Quick Overview

### What This App Does

VividOasis is a **property management platform** for short-term rentals with:

1. **Guest Intake** - Multi-step booking flow
2. **Admin Dashboard** - Portfolio overview with calendar
3. **Dynamic Pricing** - Automated rate optimization
4. **Event Integration** - Local events affect pricing

### The Three Players

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   PROVIDER              PLATFORM              USER          │
│   (You)          →      (VividOasis)    →    (Guest)        │
│                                                             │
│   Sets:                 Applies:              Sees:         │
│   • Base rates          • 6 pricing factors  • Final price  │
│   • Min/max limits      • Platform fees      • Breakdown    │
│   • Preferences         • Tax calculation    • Why it costs │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Dynamic Pricing Formula

```
Final Rate = Base Rate × Σ(Factor Weight × Factor Multiplier)
```

**Factors & Weights:**
- Events: 30%
- Seasonality: 25%
- Day of Week: 15%
- Lead Time: 10%
- Occupancy: 10%
- Competition: 10%

---

*Last Updated: December 16, 2025*
