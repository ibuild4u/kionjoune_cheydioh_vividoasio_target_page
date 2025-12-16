/**
 * VividOasis Database Layer
 * Uses IndexedDB for persistent, structured storage
 */

const DB_NAME = 'VividOasisDB';
const DB_VERSION = 1;

// Database instance
let db = null;

// ========== DATABASE INITIALIZATION ==========
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Properties store
      if (!database.objectStoreNames.contains('properties')) {
        const propStore = database.createObjectStore('properties', { keyPath: 'id' });
        propStore.createIndex('area', 'area', { unique: false });
        propStore.createIndex('bedrooms', 'bedrooms', { unique: false });
      }

      // Bookings store
      if (!database.objectStoreNames.contains('bookings')) {
        const bookStore = database.createObjectStore('bookings', { keyPath: 'id', autoIncrement: true });
        bookStore.createIndex('propertyId', 'propertyId', { unique: false });
        bookStore.createIndex('checkIn', 'checkIn', { unique: false });
        bookStore.createIndex('checkOut', 'checkOut', { unique: false });
        bookStore.createIndex('guestEmail', 'guestEmail', { unique: false });
      }

      // Events store (calendar events)
      if (!database.objectStoreNames.contains('events')) {
        const eventStore = database.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        eventStore.createIndex('dateStr', 'dateStr', { unique: false });
        eventStore.createIndex('type', 'type', { unique: false });
        eventStore.createIndex('venue', 'venue', { unique: false });
      }

      // Settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }

      console.log('Database schema created');
    };
  });
}

// ========== GENERIC CRUD OPERATIONS ==========
function dbAdd(storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbPut(storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function dbClear(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function dbGetByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========== PROPERTIES API ==========
const PropertiesDB = {
  async getAll() {
    await initDB();
    return dbGetAll('properties');
  },

  async get(id) {
    await initDB();
    return dbGet('properties', id);
  },

  async save(property) {
    await initDB();
    return dbPut('properties', property);
  },

  async delete(id) {
    await initDB();
    return dbDelete('properties', id);
  },

  async getByArea(area) {
    await initDB();
    return dbGetByIndex('properties', 'area', area);
  },

  async clear() {
    await initDB();
    return dbClear('properties');
  },

  async seedDefaults() {
    await initDB();
    const existing = await this.getAll();
    if (existing.length > 0) return existing;

    const defaults = [
      { id: 'river-vista-743', name: 'River Vista UNIT 743', address: '200 River Vista Dr', city: 'Sandy Springs', area: 'sandy-springs', lat: 33.9425, lng: -84.3785, totalPrice: 450000, monthlyRent: 2800, monthlyPayment: 3200, bedrooms: 2, rentableRooms: 2, nightlyFull: 185, nightlyRoom: 85, maxGuestsFull: 6, maxGuestsRoom: 2 },
      { id: 'roswell-510', name: 'Roswell Rd UNIT 510', address: '3820 Roswell Rd NE', city: 'Atlanta', area: 'buckhead', lat: 33.8551, lng: -84.3661, totalPrice: 525000, monthlyRent: 3200, monthlyPayment: 3700, bedrooms: 3, rentableRooms: 0, nightlyFull: 225, nightlyRoom: 0, maxGuestsFull: 8, maxGuestsRoom: 0 },
      { id: 'roswell-505', name: 'Roswell Rd UNIT 505', address: '3235 Roswell Rd NE', city: 'Atlanta', area: 'buckhead', lat: 33.8455, lng: -84.3645, totalPrice: 380000, monthlyRent: 2500, monthlyPayment: 2900, bedrooms: 2, rentableRooms: 2, nightlyFull: 165, nightlyRoom: 75, maxGuestsFull: 4, maxGuestsRoom: 2 },
      { id: 'peachtree-407', name: 'Peachtree UNIT 407', address: '2277 Peachtree Rd NE', city: 'Atlanta', area: 'buckhead', lat: 33.8145, lng: -84.3845, totalPrice: 650000, monthlyRent: 3800, monthlyPayment: 4500, bedrooms: 3, rentableRooms: 3, nightlyFull: 275, nightlyRoom: 95, maxGuestsFull: 8, maxGuestsRoom: 2 },
      { id: 'peachtree-608', name: 'Peachtree APT 608', address: '3334 Peachtree Rd NE', city: 'Atlanta', area: 'buckhead', lat: 33.8515, lng: -84.3645, totalPrice: 425000, monthlyRent: 2700, monthlyPayment: 3100, bedrooms: 2, rentableRooms: 0, nightlyFull: 195, nightlyRoom: 0, maxGuestsFull: 4, maxGuestsRoom: 0 },
      { id: 'peachtree-902', name: 'Peachtree UNIT 902', address: '3324 Peachtree Rd NE', city: 'Atlanta', area: 'buckhead', lat: 33.8505, lng: -84.3640, totalPrice: 580000, monthlyRent: 3400, monthlyPayment: 4000, bedrooms: 2, rentableRooms: 2, nightlyFull: 245, nightlyRoom: 110, maxGuestsFull: 6, maxGuestsRoom: 2 },
      { id: 'piedmont-2h', name: 'Piedmont APT 2H', address: '3530 Piedmont Rd NE', city: 'Atlanta', area: 'midtown', lat: 33.8375, lng: -84.3545, totalPrice: 395000, monthlyRent: 2600, monthlyPayment: 3000, bedrooms: 2, rentableRooms: 0, nightlyFull: 175, nightlyRoom: 0, maxGuestsFull: 4, maxGuestsRoom: 0 },
      { id: 'pharr-2505', name: 'Pharr Court 2505', address: '2870 Pharr Court South NW', city: 'Atlanta', area: 'buckhead', lat: 33.8325, lng: -84.3785, totalPrice: 720000, monthlyRent: 4200, monthlyPayment: 5000, bedrooms: 4, rentableRooms: 4, nightlyFull: 325, nightlyRoom: 95, maxGuestsFull: 10, maxGuestsRoom: 2 },
      { id: 'piedmont-5a', name: 'Piedmont APT 5A', address: '3530 Piedmont Rd NE', city: 'Atlanta', area: 'midtown', lat: 33.8375, lng: -84.3545, totalPrice: 410000, monthlyRent: 2650, monthlyPayment: 3050, bedrooms: 1, rentableRooms: 0, nightlyFull: 155, nightlyRoom: 0, maxGuestsFull: 2, maxGuestsRoom: 0 },
      { id: 'paces-ferry-1411', name: 'Paces Ferry APT 1411', address: '325 E Paces Ferry Rd NE', city: 'Atlanta', area: 'buckhead', lat: 33.8395, lng: -84.3755, totalPrice: 890000, monthlyRent: 5000, monthlyPayment: 6200, bedrooms: 3, rentableRooms: 3, nightlyFull: 395, nightlyRoom: 145, maxGuestsFull: 8, maxGuestsRoom: 2 },
      { id: 'oak-valley-2350', name: 'Oak Valley APT 2350', address: '3475 Oak Valley Rd NE', city: 'Atlanta', area: 'buckhead', lat: 33.8425, lng: -84.3620, totalPrice: 465000, monthlyRent: 2900, monthlyPayment: 3350, bedrooms: 2, rentableRooms: 0, nightlyFull: 205, nightlyRoom: 0, maxGuestsFull: 4, maxGuestsRoom: 0 },
      { id: 'pharr-1608', name: 'Pharr Ct 1608', address: '2870 Pharr Ct S NW', city: 'Atlanta', area: 'buckhead', lat: 33.8325, lng: -84.3785, totalPrice: 550000, monthlyRent: 3300, monthlyPayment: 3850, bedrooms: 2, rentableRooms: 2, nightlyFull: 235, nightlyRoom: 105, maxGuestsFull: 6, maxGuestsRoom: 2 },
      { id: 'oak-valley-910', name: 'Oak Valley APT 910', address: '3475 Oak Valley Rd NE', city: 'Atlanta', area: 'buckhead', lat: 33.8425, lng: -84.3620, totalPrice: 435000, monthlyRent: 2750, monthlyPayment: 3150, bedrooms: 2, rentableRooms: 0, nightlyFull: 185, nightlyRoom: 0, maxGuestsFull: 4, maxGuestsRoom: 0 },
      { id: 'peachtree-2807', name: 'Peachtree UNIT 2807', address: '3324 Peachtree Rd NE', city: 'Atlanta', area: 'buckhead', lat: 33.8505, lng: -84.3640, totalPrice: 950000, monthlyRent: 5500, monthlyPayment: 6600, bedrooms: 4, rentableRooms: 4, nightlyFull: 425, nightlyRoom: 125, maxGuestsFull: 10, maxGuestsRoom: 2 }
    ];

    for (const prop of defaults) {
      await this.save(prop);
    }
    return defaults;
  }
};

// ========== BOOKINGS API ==========
const BookingsDB = {
  async getAll() {
    await initDB();
    return dbGetAll('bookings');
  },

  async get(id) {
    await initDB();
    return dbGet('bookings', id);
  },

  async save(booking) {
    await initDB();
    // Ensure ID exists for new bookings
    if (!booking.id) {
      booking.id = Date.now();
    }
    booking.updatedAt = new Date().toISOString();
    if (!booking.createdAt) {
      booking.createdAt = booking.updatedAt;
    }
    return dbPut('bookings', booking);
  },

  async delete(id) {
    await initDB();
    return dbDelete('bookings', id);
  },

  async getByProperty(propertyId) {
    await initDB();
    return dbGetByIndex('bookings', 'propertyId', propertyId);
  },

  async clear() {
    await initDB();
    return dbClear('bookings');
  },

  // Check for conflicts with existing bookings
  async checkAvailability(propertyId, checkIn, checkOut, excludeBookingId = null) {
    const allBookings = await this.getByProperty(propertyId);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    const conflicts = allBookings.filter(b => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      const bCheckIn = new Date(b.checkIn);
      const bCheckOut = new Date(b.checkOut);
      return bCheckIn < checkOutDate && bCheckOut > checkInDate;
    });

    const property = await PropertiesDB.get(propertyId);
    const result = {
      fullAvailable: true,
      roomsAvailable: [],
      conflicts
    };

    if (conflicts.length === 0) {
      result.fullAvailable = true;
      if (property && property.rentableRooms > 0) {
        result.roomsAvailable = Array.from({ length: property.rentableRooms }, (_, i) => i + 1);
      }
      return result;
    }

    // Check if any booking is for full unit
    const hasFullUnitBooking = conflicts.some(b => b.bookingType === 'full');
    if (hasFullUnitBooking) {
      result.fullAvailable = false;
      result.roomsAvailable = [];
      return result;
    }

    // All conflicts are room bookings
    result.fullAvailable = false;

    if (property && property.rentableRooms > 0) {
      const bookedRooms = new Set(conflicts.map(b => b.roomNumber).filter(Boolean));
      for (let i = 1; i <= property.rentableRooms; i++) {
        if (!bookedRooms.has(i)) result.roomsAvailable.push(i);
      }
    }

    return result;
  },

  async seedSample() {
    await initDB();
    await this.clear();

    // Sample bookings with DYNAMIC PRICING applied
    // Base rates from properties:
    //   peachtree-407: Full=$275, Room=$95
    //   pharr-2505: Full=$325, Room=$95  
    //   piedmont-5a: Full=$155, Room=N/A
    //   river-vista-743: Full=$185, Room=$85
    //
    // Dynamic pricing factors applied:
    //   - Holiday season (Dec 18-Jan 2): +25-35% seasonality
    //   - Weekend nights (Fri-Sun): +15-20% DOW premium
    //   - Christmas week (Dec 23-26): +40% peak demand
    //   - New Year's (Dec 30-Jan 1): +45% peak demand
    //   - Events boost: varies by event type/size

    const samples = [
      {
        id: 1,
        guestName: 'Sarah Johnson',
        guestEmail: 'sarah.j@email.com',
        propertyId: 'peachtree-407',
        checkIn: '2025-12-18',
        checkOut: '2025-12-22',
        nights: 4,
        reason: 'event',
        guests: 2,
        bookingType: 'room',
        roomNumber: 1,
        // Base: $95 | Holiday: +28% | Weekend: +12% | Events: +8%
        // $95 × 1.48 = $141 → rounded to $139/night
        nightlyRate: 139,
        totalPrice: 556,
        pricingFactors: { season: 1.28, dow: 1.12, events: 1.08, final: 1.46 }
      },
      {
        id: 2,
        guestName: 'Michael Chen',
        guestEmail: 'mchen@business.com',
        propertyId: 'peachtree-407',
        checkIn: '2025-12-20',
        checkOut: '2025-12-24',
        nights: 4,
        reason: 'business',
        guests: 1,
        bookingType: 'room',
        roomNumber: 2,
        // Base: $95 | Holiday: +30% | Weekend: +18% | Christmas lead-up: +15%
        // $95 × 1.63 = $155 → rounded to $155/night
        nightlyRate: 155,
        totalPrice: 620,
        pricingFactors: { season: 1.30, dow: 1.18, lead: 1.15, final: 1.63 }
      },
      {
        id: 3,
        guestName: 'The Williams Family',
        guestEmail: 'williams.fam@email.com',
        propertyId: 'pharr-2505',
        checkIn: '2025-12-21',
        checkOut: '2025-12-27',
        nights: 6,
        reason: 'family',
        guests: 4,
        bookingType: 'full',
        roomNumber: null,
        // Base: $325 | Holiday: +35% | Christmas week: +40% | Weekend: +15%
        // $325 × 1.90 = $617.50 → premium market caps at $549/night
        nightlyRate: 549,
        totalPrice: 3294,
        pricingFactors: { season: 1.35, peak: 1.40, dow: 1.15, final: 1.69 }
      },
      {
        id: 4,
        guestName: 'Emily Rodriguez',
        guestEmail: 'emily.r@email.com',
        propertyId: 'piedmont-5a',
        checkIn: '2025-12-26',
        checkOut: '2025-12-30',
        nights: 4,
        reason: 'vacation',
        guests: 2,
        bookingType: 'full',
        roomNumber: null,
        // Base: $155 | Holiday: +32% | Post-Christmas: +25% | Weekend: +10%
        // $155 × 1.67 = $258.85 → rounded to $259/night
        nightlyRate: 259,
        totalPrice: 1036,
        pricingFactors: { season: 1.32, peak: 1.25, dow: 1.10, final: 1.67 }
      },
      {
        id: 5,
        guestName: 'James & Lisa Park',
        guestEmail: 'jpark@email.com',
        propertyId: 'river-vista-743',
        checkIn: '2025-12-28',
        checkOut: '2026-01-02',
        nights: 5,
        reason: 'event',
        guests: 2,
        bookingType: 'full',
        roomNumber: null,
        // Base: $185 | New Year's: +45% | Weekend: +20% | High occupancy: +12%
        // $185 × 1.77 = $327.45 → rounded to $329/night
        nightlyRate: 329,
        totalPrice: 1645,
        pricingFactors: { season: 1.45, dow: 1.20, occupancy: 1.12, final: 1.78 }
      }
    ];

    for (const booking of samples) {
      await this.save(booking);
    }

    return samples;
  }
};

// ========== EVENTS API ==========
const EventsDB = {
  async getAll() {
    await initDB();
    return dbGetAll('events');
  },

  async getByDate(dateStr) {
    await initDB();
    return dbGetByIndex('events', 'dateStr', dateStr);
  },

  async save(event) {
    await initDB();
    return dbPut('events', event);
  },

  async clear() {
    await initDB();
    return dbClear('events');
  }
};

// ========== SETTINGS API ==========
const SettingsDB = {
  async get(key) {
    await initDB();
    const result = await dbGet('settings', key);
    return result ? result.value : null;
  },

  async set(key, value) {
    await initDB();
    return dbPut('settings', { key, value });
  }
};

// ========== DATABASE UTILITIES ==========
const DatabaseUtils = {
  async clearAll() {
    await initDB();
    await dbClear('properties');
    await dbClear('bookings');
    await dbClear('events');
    await dbClear('settings');
    // Also clear localStorage for backwards compatibility
    localStorage.clear();
    console.log('All data cleared');
  },

  async resetToDefaults() {
    await this.clearAll();
    await PropertiesDB.seedDefaults();
    console.log('Database reset to defaults');
  },

  async exportData() {
    const data = {
      properties: await PropertiesDB.getAll(),
      bookings: await BookingsDB.getAll(),
      events: await EventsDB.getAll(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  },

  async importData(jsonString) {
    const data = JSON.parse(jsonString);
    
    if (data.properties) {
      await dbClear('properties');
      for (const p of data.properties) {
        await PropertiesDB.save(p);
      }
    }
    
    if (data.bookings) {
      await dbClear('bookings');
      for (const b of data.bookings) {
        await BookingsDB.save(b);
      }
    }
    
    if (data.events) {
      await dbClear('events');
      for (const e of data.events) {
        await EventsDB.save(e);
      }
    }
    
    console.log('Data imported successfully');
  },

  // Migrate from localStorage to IndexedDB
  async migrateFromLocalStorage() {
    await initDB();
    
    // Migrate bookings
    const oldBookings = localStorage.getItem('allBookings');
    if (oldBookings) {
      try {
        const bookings = JSON.parse(oldBookings);
        for (const b of bookings) {
          await BookingsDB.save(b);
        }
        localStorage.removeItem('allBookings');
        localStorage.removeItem('pendingBooking');
        console.log('Migrated bookings from localStorage');
      } catch (e) {
        console.error('Failed to migrate bookings:', e);
      }
    }

    // Migrate custom properties
    const oldProps = localStorage.getItem('customProperties');
    if (oldProps) {
      try {
        const props = JSON.parse(oldProps);
        for (const [id, prop] of Object.entries(props)) {
          prop.id = id;
          await PropertiesDB.save(prop);
        }
        localStorage.removeItem('customProperties');
        console.log('Migrated properties from localStorage');
      } catch (e) {
        console.error('Failed to migrate properties:', e);
      }
    }
  }
};

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    try {
      await initDB();
      await DatabaseUtils.migrateFromLocalStorage();
      await PropertiesDB.seedDefaults();
      console.log('VividOasis DB ready');
    } catch (e) {
      console.error('DB initialization failed:', e);
    }
  });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PropertiesDB, BookingsDB, EventsDB, SettingsDB, DatabaseUtils, initDB };
}
