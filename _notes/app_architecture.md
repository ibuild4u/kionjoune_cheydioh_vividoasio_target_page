# 🏗️ VividOasis App Architecture

## System Overview

VividOasis is a **client-side web application** for property management with dynamic pricing. No backend server required—all data stored in browser's IndexedDB.

---

## File Structure

```
build_001/
├── index.html              # Entry point → redirects to auth
├── auth.html               # Password gate (client-side)
├── events_calendar_admin.html  # Admin dashboard (main app)
├── guest_intake.html       # Guest booking form
├── pricing-engine.js       # Dynamic pricing calculations
├── db.js                   # IndexedDB database layer
├── green.css               # Shared styles
├── link_fetcher.html       # Property import tool
└── _notes/                 # Documentation (you are here)
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘

        ┌───────────────────┐
        │    index.html     │
        │   (Auto-redirect) │
        └─────────┬─────────┘
                  ↓
        ┌───────────────────┐         ┌─────────────────┐
        │    auth.html      │   No    │    Blocked      │
        │  Enter Password   │───────→ │   Try Again     │
        └─────────┬─────────┘         └─────────────────┘
                  │ Yes
                  ↓
        ┌───────────────────┐
        │     ADMIN VIEW    │
        │events_calendar_   │
        │    admin.html     │
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┬───────────────────┐
        ↓                   ↓                   ↓
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Portfolio   │   │   Calendar    │   │   Bookings    │
│   Overview    │   │     View      │   │     List      │
└───────────────┘   └───────────────┘   └───────────────┘


        ┌───────────────────┐
        │    GUEST VIEW     │
        │guest_intake.html  │
        │  (Public access)  │
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┬───────────────────┐
        ↓                   ↓                   ↓
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Step 1:      │   │  Step 2:      │   │  Step 3:      │
│  Guest Info   │──→│  Select       │──→│  Review &     │
│  & Dates      │   │  Property     │   │  Confirm      │
└───────────────┘   └───────────────┘   └───────────────┘
```

---

## Component Architecture

### 1. Database Layer (`db.js`)

```javascript
// IndexedDB wrapper with typed stores

const DB_CONFIG = {
  name: 'VividOasisDB',
  version: 1,
  stores: {
    properties: { keyPath: 'id' },
    bookings: { keyPath: 'id', indexes: ['propertyId'] },
    events: { keyPath: 'id', indexes: ['dateStr'] },
    settings: { keyPath: 'key' }
  }
};

// API Pattern:
PropertiesDB.getAll()     // → Promise<Property[]>
BookingsDB.save(booking)  // → Promise<id>
EventsDB.clear()          // → Promise<void>
```

### 2. Pricing Engine (`pricing-engine.js`)

```javascript
// Stateless calculation module

const PricingEngine = {
  config: {
    weights: { events: 0.30, season: 0.25, ... },
    fees: { serviceFee: 0.12, cleaningFull: 75, ... },
    constraints: { min: 0.70, max: 2.00 }
  },
  
  calculatePrice(params) {
    // Returns complete breakdown
    return {
      nights,
      subtotal,
      fees: { cleaning, service, taxes },
      total,
      breakdown: [ /* per-night details */ ]
    };
  },
  
  _calculateNightRate(params) { /* single night */ },
  _calculateEventFactor(date, events) { /* factor calc */ },
  // ... other factor methods
};
```

### 3. Admin Dashboard (`events_calendar_admin.html`)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│ • Logo, navigation                                          │
│ • DB controls (Export, Import, Clear, Load Sample)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PORTFOLIO OVERVIEW                                          │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │Property │ │Property │ │Property │ │   +     │            │
│ │ Card 1  │ │ Card 2  │ │ Card 3  │ │   Add   │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                             │
│ Summary: Total Income | Goal Progress | Properties Booked   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SINGLE PROPERTY VIEW (when property selected)               │
│                                                             │
│ ┌────────────────────────────┐  ┌──────────────────────────┐│
│ │       CALENDAR             │  │      EVENTS LIST         ││
│ │  ┌──┬──┬──┬──┬──┬──┬──┐   │  │  • Hawks vs Heat        ││
│ │  │Mo│Tu│We│Th│Fr│Sa│Su│   │  │  • Concert @ Tabernacle ││
│ │  ├──┼──┼──┼──┼──┼──┼──┤   │  │  • Food Festival        ││
│ │  │  │  │  │██│██│██│  │   │  └──────────────────────────┘│
│ │  └──┴──┴──┴──┴──┴──┴──┘   │                              │
│ └────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ALL BOOKINGS LIST                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Sarah Johnson | Peachtree 407 | Dec 18-22 | 🧾 Receipt │ │
│ │ Michael Chen  | Peachtree 407 | Dec 20-24 | 🧾 Receipt │ │
│ │ Williams Fam  | Pharr 2505    | Dec 21-27 | 🧾 Receipt │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4. Guest Intake (`guest_intake.html`)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Trip Details                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Name: [________________]                                │ │
│ │ Email: [_______________]                                │ │
│ │ Check-in: [📅 Dec 25]   Check-out: [📅 Dec 30]         │ │
│ │ Guests: [2 ▼]           Reason: [Vacation ▼]           │ │
│ │ Accommodation: ○ Full Unit  ○ Private Room  ○ Either   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                              [Next Step →]  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Select Property                                     │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ 🏠 River    │  │ 🏢 Peachtree│  │ 🏢 Pharr    │          │
│ │    Vista    │  │    407      │  │    2505     │          │
│ │             │  │             │  │             │          │
│ │ $185/night  │  │ $275/night  │  │ $325/night  │          │
│ │ [Book Full] │  │ [Book Full] │  │ [Book Full] │          │
│ │ [Book Room] │  │ [Book Room] │  │ [Book Room] │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Review & Confirm                                    │
│                                                             │
│ ┌──────────────────┐  ┌────────────────────────────────────┐│
│ │  EVENTS NEARBY   │  │  PRICE BREAKDOWN                   ││
│ │                  │  │                                    ││
│ │  📅 Dec 26       │  │  $259 × 5 nights    = $1,295      ││
│ │  🏀 Hawks Game   │  │  📊 Dynamic Pricing  +67%         ││
│ │                  │  │  Cleaning fee        $75          ││
│ │  📅 Dec 28       │  │  Service fee         $155         ││
│ │  🎵 Concert      │  │  Taxes               $104         ││
│ │                  │  │  ─────────────────────            ││
│ └──────────────────┘  │  TOTAL              $1,629        ││
│                       └────────────────────────────────────┘│
│                                         [Confirm Booking]   │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Property

```typescript
interface Property {
  id: string;              // 'peachtree-407'
  name: string;            // 'Peachtree UNIT 407'
  address: string;         // '2277 Peachtree Rd NE'
  city: string;            // 'Atlanta'
  area: string;            // 'buckhead'
  
  // Financials
  totalPrice: number;      // Purchase price
  monthlyRent: number;     // If rented monthly
  monthlyPayment: number;  // Mortgage + fees
  
  // Capacity
  bedrooms: number;
  rentableRooms: number;   // 0 = full unit only
  maxGuestsFull: number;
  maxGuestsRoom: number;
  
  // Pricing
  nightlyFull: number;     // Base rate: full unit
  nightlyRoom: number;     // Base rate: per room
}
```

### Booking

```typescript
interface Booking {
  id: number;              // Timestamp-based
  guestName: string;
  guestEmail: string;
  propertyId: string;
  
  // Stay details
  checkIn: string;         // 'YYYY-MM-DD'
  checkOut: string;
  nights: number;
  guests: number;
  reason: string;          // 'vacation', 'business', 'event'
  
  // Accommodation
  bookingType: 'full' | 'room';
  roomNumber: number | null;
  
  // Pricing (calculated at booking time)
  nightlyRate: number;     // Final dynamic rate
  totalPrice: number;      // nightlyRate × nights
  
  // Pricing breakdown (for receipts)
  pricing: {
    basePrice: number;
    adjustedPrice: number;
    multiplier: number;
    factors: PricingFactor[];
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

### Event

```typescript
interface Event {
  id: number;
  name: string;            // 'Atlanta Hawks vs Heat'
  venue: string;           // 'State Farm Arena'
  dateStr: string;         // 'YYYY-MM-DD'
  time: string;            // '7:30 PM'
  type: string;            // 'sports', 'music', 'food'
  impact: 'high' | 'medium' | 'low';
  distance?: number;       // Miles from property
}
```

---

## Key Functions

### Pricing Calculation Flow

```javascript
// 1. Guest selects dates and property
const checkIn = '2025-12-25';
const checkOut = '2025-12-30';
const property = PROPERTIES['peachtree-407'];
const bookingType = 'full';

// 2. Fetch events for date range
const events = await EventsDB.getByDateRange(checkIn, checkOut);

// 3. Calculate dynamic price
const priceResult = PricingEngine.calculatePrice({
  property,
  checkIn,
  checkOut,
  bookingType,
  events,
  occupancyRate: 0.75  // From portfolio metrics
});

// 4. Display breakdown
console.log(priceResult);
// {
//   nights: 5,
//   baseRate: 275,
//   averageNightly: 329,
//   subtotal: 1645,
//   fees: { cleaning: 75, service: 197, taxes: 132 },
//   total: 2049,
//   breakdown: [ /* per-night details */ ]
// }

// 5. Save booking
await BookingsDB.save({
  ...guestData,
  nightlyRate: priceResult.averageNightly,
  totalPrice: priceResult.subtotal,
  pricing: {
    basePrice: priceResult.baseRate,
    adjustedPrice: priceResult.averageNightly,
    multiplier: priceResult.analysis.averageMultiplier
  }
});
```

### Availability Check Flow

```javascript
// Before showing property, check availability

function checkPropertyAvailability(propertyId, checkIn, checkOut) {
  const existingBookings = await BookingsDB.getByProperty(propertyId);
  
  const overlapping = existingBookings.filter(b => 
    datesOverlap(checkIn, checkOut, b.checkIn, b.checkOut)
  );
  
  if (overlapping.length === 0) {
    return { fullAvailable: true, roomsAvailable: [1, 2, 3] };
  }
  
  if (overlapping.some(b => b.bookingType === 'full')) {
    return { fullAvailable: false, roomsAvailable: [] };
  }
  
  // Some rooms booked, check which are free
  const bookedRooms = overlapping.map(b => b.roomNumber);
  const allRooms = [1, 2, 3];
  const freeRooms = allRooms.filter(r => !bookedRooms.includes(r));
  
  return { fullAvailable: false, roomsAvailable: freeRooms };
}
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **UI** | Vanilla HTML/CSS/JS | No framework dependencies |
| **State** | Local variables | Simple page state |
| **Storage** | IndexedDB | Persistent local database |
| **Auth** | SessionStorage | Client-side password gate |
| **Styling** | CSS Variables | Theming support |
| **Charts** | Native HTML | No charting library |

---

## Security Notes

⚠️ **This is a client-side app with no backend:**

1. **Password** is stored in JS (not secure for production)
2. **Data** lives in browser only (no cloud sync)
3. **Pricing** is calculated client-side (can be inspected)

For production, you would need:
- Server-side authentication
- Database (PostgreSQL, Firebase, etc.)
- API for pricing calculations
- Payment integration

---

*Architecture last updated: December 16, 2025*
