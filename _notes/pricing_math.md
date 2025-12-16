# 📐 Dynamic Pricing Mathematics

## Core Formula

The final nightly rate is calculated using a **weighted factor model**:

```
Final_Rate = Base_Rate × (1 + Σ(wᵢ × (fᵢ - 1)))
```

Where:
- `Base_Rate` = Provider's standard nightly rate
- `wᵢ` = Weight of factor i (0 to 1, all weights sum to 1.0)
- `fᵢ` = Multiplier for factor i (0.7 to 2.0 typically)

---

## Factor Weights

Our algorithm uses **6 pricing factors** with the following weights:

| Factor | Weight | Symbol | Description |
|--------|--------|--------|-------------|
| Events | 30% | w₁ | Local events impact |
| Seasonality | 25% | w₂ | Holiday/season pricing |
| Day of Week | 15% | w₃ | Weekend premium |
| Lead Time | 10% | w₄ | Booking window |
| Occupancy | 10% | w₅ | Current demand |
| Competition | 10% | w₆ | Market rates |

**Constraint:** w₁ + w₂ + w₃ + w₄ + w₅ + w₆ = 1.0

---

## Detailed Factor Calculations

### Factor 1: Events (w₁ = 0.30)

```javascript
function calculateEventFactor(date, events) {
  const dayEvents = events.filter(e => e.date === date);
  
  if (dayEvents.length === 0) return 1.00;
  
  // Major event nearby
  if (hasMajorEvent(dayEvents) && distance < 5mi) return 1.50;
  
  // Multiple events
  if (dayEvents.length >= 3) return 1.30;
  
  // High-impact event
  if (dayEvents.some(e => e.impact === 'high')) return 1.25;
  
  // Close proximity event
  if (dayEvents.some(e => e.distance < 3mi)) return 1.15;
  
  // Any event
  return 1.10;
}
```

**Event Multiplier Ranges:**
- No events: 1.00 (no change)
- Local event: 1.10 (+10%)
- Close event: 1.15 (+15%)
- High-impact: 1.25 (+25%)
- Multiple events: 1.30 (+30%)
- Major nearby: 1.50 (+50%)

---

### Factor 2: Seasonality (w₂ = 0.25)

```javascript
function calculateSeasonFactor(date) {
  const month = date.getMonth();
  const day = date.getDate();
  
  // Peak holidays
  if (isChristmas || isNewYears) return 1.40;
  if (isThanksgiving || isJuly4th) return 1.30;
  if (isMemorialDay || isLaborDay) return 1.20;
  
  // Seasonal adjustments
  if (isSummer) return 1.15;  // June-Aug
  if (isWinter) return 0.90;  // Jan-Feb
  
  return 1.00;
}
```

**Seasonal Calendar:**

```
Month       Multiplier    Reason
────────────────────────────────────────
January     0.90          Off-season
February    0.90          Off-season
March       1.00          Regular
April       1.00          Regular
May (late)  1.20          Memorial Day
June        1.15          Summer
July        1.15-1.30     Summer + July 4th
August      1.15          Summer
September   1.00-1.20     Labor Day
October     1.00          Regular
November    1.00-1.30     Thanksgiving
December    1.00-1.40     Christmas/NYE
```

---

### Factor 3: Day of Week (w₃ = 0.15)

```javascript
function calculateDayOfWeekFactor(date) {
  const dow = date.getDay();
  
  switch(dow) {
    case 5: return 1.20;  // Friday
    case 6: return 1.20;  // Saturday
    case 0: return 1.05;  // Sunday
    case 4: return 1.05;  // Thursday
    case 2: return 0.95;  // Tuesday
    case 3: return 0.95;  // Wednesday
    default: return 1.00; // Monday
  }
}
```

**Weekly Pattern:**

```
      Multiplier
1.20 ─┼─────────────────────────●───●─────────
      │                        Fri  Sat
1.05 ─┼───────────────────●─────────────●─────
      │                  Thu          Sun
1.00 ─┼───●───────────────────────────────────
      │  Mon
0.95 ─┼───────●───●───────────────────────────
      │      Tue Wed
      └────────────────────────────────────────
        Mon Tue Wed Thu Fri Sat Sun
```

---

### Factor 4: Lead Time (w₄ = 0.10)

```javascript
function calculateLeadTimeFactor(checkIn) {
  const daysOut = daysBetween(today, checkIn);
  
  if (daysOut <= 2) return 1.15;   // Last-minute
  if (daysOut <= 7) return 1.05;   // Short notice
  if (daysOut > 90) return 0.95;   // Early bird
  if (daysOut > 60) return 0.98;   // Advance
  
  return 1.00;
}
```

**Lead Time Curve:**

```
Multiplier
    │
1.15├──●
    │   ╲
1.05├────●
    │     ╲
1.00├──────────────────────────●
    │                           ╲
0.98├─────────────────────────────●
    │                               ╲
0.95├───────────────────────────────────●
    │
    └──┬───┬───────────────────┬───┬───────→
       2   7                  60  90    Days Out
    Last  Short              Advance  Early
    Min   Notice                      Bird
```

---

### Factor 5: Occupancy (w₅ = 0.10)

```javascript
function calculateOccupancyFactor(occupancyRate) {
  if (occupancyRate >= 0.90) return 1.25;  // 90%+ booked
  if (occupancyRate >= 0.75) return 1.15;  // 75-89%
  if (occupancyRate <= 0.30) return 0.90;  // 0-30%
  if (occupancyRate <= 0.50) return 0.95;  // 31-50%
  
  return 1.00;  // 51-74%
}
```

**Occupancy Response:**

```
Multiplier
    │
1.25├─────────────────────────────────────●
    │                                    ╱
1.15├───────────────────────────────●───╱
    │                              ╱
1.00├───────────────────●─────────╱
    │                  ╱
0.95├─────────●───────╱
    │        ╱
0.90├───●───╱
    │
    └───┬───┬───┬───┬───┬───┬───┬───┬───→
       10  20  30  40  50  60  70  80  90  Occupancy %
```

---

### Factor 6: Competition (w₆ = 0.10)

```javascript
function calculateCompetitionFactor(baseRate, competitorAvg) {
  if (!competitorAvg) return 1.00;
  
  const ratio = baseRate / competitorAvg;
  
  if (ratio > 1.20) return 0.95;  // We're 20%+ above market
  if (ratio < 0.80) return 1.10;  // We're 20%+ below market
  
  return 1.00;  // Competitive
}
```

---

## Complete Calculation Example

**Scenario:** 
- Base rate: $185/night
- Date: Friday, December 27, 2025
- Events: Peach Bowl nearby (major sports event)
- Lead time: 11 days out
- Occupancy: 85%
- No competitor data

**Step 1: Calculate Each Factor**

| Factor | Multiplier | Reason |
|--------|------------|--------|
| Events | 1.50 | Major event nearby |
| Season | 1.40 | Christmas week |
| Day | 1.20 | Friday |
| Lead | 1.00 | Standard (11 days) |
| Occupancy | 1.15 | 85% booked |
| Competition | 1.00 | No data |

**Step 2: Apply Weighted Formula**

```
Adjustment = Σ(wᵢ × (fᵢ - 1))

= 0.30 × (1.50 - 1) + 0.25 × (1.40 - 1) + 0.15 × (1.20 - 1) 
  + 0.10 × (1.00 - 1) + 0.10 × (1.15 - 1) + 0.10 × (1.00 - 1)

= 0.30 × 0.50 + 0.25 × 0.40 + 0.15 × 0.20 + 0 + 0.10 × 0.15 + 0

= 0.15 + 0.10 + 0.03 + 0 + 0.015 + 0

= 0.295 (29.5% increase)
```

**Step 3: Calculate Final Rate**

```
Final_Rate = $185 × (1 + 0.295)
           = $185 × 1.295
           = $239.58
           ≈ $240/night
```

---

## Constraint Bounds

After calculating, we apply bounds:

```javascript
const constraints = {
  minMultiplier: 0.70,  // Never below 70% of base
  maxMultiplier: 2.00   // Never above 200% of base
};

finalMultiplier = Math.max(0.70, Math.min(2.00, calculatedMultiplier));
finalRate = Math.round(baseRate * finalMultiplier);
```

**Example Bounds for $185 base:**
- Minimum: $185 × 0.70 = $130/night
- Maximum: $185 × 2.00 = $370/night

---

## Multi-Night Calculation

For stays spanning multiple nights, we calculate **each night independently**:

```javascript
totalCharges = 0;
for (night in stay) {
  nightRate = calculateNightRate(night);
  totalCharges += nightRate;
}
averageNightly = totalCharges / nights;
```

This means a 5-night stay crossing a weekend will have:
- Tue: $176 (-5%)
- Wed: $176 (-5%)
- Thu: $194 (+5%)
- Fri: $222 (+20%)
- Sat: $222 (+20%)
- **Average: $198/night**

---

## Fee Layer (On Top of Nightly)

```
Subtotal     = Sum of nightly rates
Cleaning Fee = $75 (full) or $35 (room)
Service Fee  = Subtotal × 12%
Taxes        = Subtotal × 8%
────────────────────────────────────────
Total        = Subtotal + Cleaning + Service + Taxes
```

**Example:**
```
5 nights @ $198 avg     = $990.00
Cleaning fee            = $ 75.00
Service fee (12%)       = $118.80
Taxes (8%)              = $ 79.20
─────────────────────────────────
TOTAL                   = $1,263.00
```

---

## Summary Table

| Component | Formula | Range |
|-----------|---------|-------|
| Events | Discrete levels | 1.00 - 1.50 |
| Season | Calendar-based | 0.90 - 1.40 |
| Day of Week | Fixed by day | 0.95 - 1.20 |
| Lead Time | Days until check-in | 0.95 - 1.15 |
| Occupancy | Portfolio % booked | 0.90 - 1.25 |
| Competition | Ratio to market | 0.95 - 1.10 |
| **Combined** | Weighted sum | **0.70 - 2.00** |

---

*"In God we trust; all others bring data." — W. Edwards Deming*
