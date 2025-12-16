/**
 * VividOasis Dynamic Pricing Engine
 * Inspired by PriceLabs/Wheelhouse/Beyond Pricing algorithms
 * 
 * FLOW:
 * 1. Provider sets: Base rate, min/max, preferences
 * 2. Platform applies: Algorithm adjustments, fees
 * 3. User sees: Final price only (or breakdown if enabled)
 */

const PricingEngine = {
  
  // ========== CONFIGURATION ==========
  config: {
    // Platform fees (what VividOasis charges)
    platformFees: {
      serviceFeePercent: 0.12,      // 12% service fee (like Airbnb)
      cleaningFeeFull: 75,          // Full unit cleaning
      cleaningFeeRoom: 35,          // Room cleaning
      taxRate: 0.08                 // 8% occupancy tax
    },
    
    // Algorithm weights (must sum to 1.0)
    weights: {
      events: 0.30,          // Local events impact
      seasonality: 0.25,     // Holiday/season pricing
      dayOfWeek: 0.15,       // Weekend premium
      leadTime: 0.10,        // Booking window
      occupancy: 0.10,       // Current occupancy rate
      competition: 0.10      // Market rates
    },
    
    // Provider constraints (can be customized per property)
    defaultConstraints: {
      minMultiplier: 0.70,   // Never go below 70% of base
      maxMultiplier: 2.00,   // Never exceed 200% of base
      weekendPremium: 1.15,  // Fri-Sat +15%
      lastMinuteDiscount: 0.90,  // <3 days out = -10%
      farOutDiscount: 0.95       // >60 days out = -5%
    }
  },
  
  // ========== MAIN PRICING FUNCTION ==========
  /**
   * Calculate dynamic price for a booking
   * @param {Object} params - Booking parameters
   * @returns {Object} Complete pricing breakdown
   */
  calculatePrice(params) {
    const {
      propertyId,
      property,          // Property object with rates
      checkIn,
      checkOut,
      bookingType = 'full',  // 'full' or 'room'
      roomNumber = null,
      events = [],       // Events during stay
      occupancyRate = 0.5,  // Current month occupancy (0-1)
      competitorAvg = null  // Average competitor rate
    } = params;
    
    const baseRate = bookingType === 'room' 
      ? property.nightlyRoom || property.roomPrice 
      : property.nightlyFull || property.basePrice;
    
    const nights = this._calculateNights(checkIn, checkOut);
    const breakdown = [];
    let totalNightlyCharges = 0;
    
    // Calculate each night's rate
    let currentDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    while (currentDate < checkOutDate) {
      const nightPricing = this._calculateNightRate({
        date: new Date(currentDate),
        baseRate,
        events,
        occupancyRate,
        competitorAvg,
        checkIn,
        property
      });
      
      breakdown.push(nightPricing);
      totalNightlyCharges += nightPricing.finalRate;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calculate fees
    const cleaningFee = bookingType === 'room' 
      ? this.config.platformFees.cleaningFeeRoom 
      : this.config.platformFees.cleaningFeeFull;
    
    const serviceFee = Math.round(totalNightlyCharges * this.config.platformFees.serviceFeePercent);
    const taxes = Math.round(totalNightlyCharges * this.config.platformFees.taxRate);
    
    // Final totals
    const subtotal = totalNightlyCharges;
    const total = subtotal + cleaningFee + serviceFee + taxes;
    const averageNightly = Math.round(subtotal / nights);
    const savingsFromBase = (baseRate * nights) - subtotal;
    
    return {
      // Summary
      nights,
      baseRate,
      averageNightly,
      subtotal,
      
      // Fees breakdown
      fees: {
        cleaning: cleaningFee,
        service: serviceFee,
        taxes
      },
      
      // Grand total
      total,
      
      // Detailed breakdown per night
      breakdown,
      
      // Analysis
      analysis: {
        totalMultiplier: subtotal / (baseRate * nights),
        averageMultiplier: breakdown.reduce((sum, n) => sum + n.multiplier, 0) / nights,
        peakNight: breakdown.reduce((max, n) => n.finalRate > max.finalRate ? n : max),
        lowestNight: breakdown.reduce((min, n) => n.finalRate < min.finalRate ? n : min),
        savingsFromBase: savingsFromBase > 0 ? savingsFromBase : 0,
        surchargeFromBase: savingsFromBase < 0 ? Math.abs(savingsFromBase) : 0
      },
      
      // For display
      display: {
        perNight: `$${averageNightly}`,
        total: `$${total.toLocaleString()}`,
        breakdown: `$${baseRate} base × ${nights} nights`
      }
    };
  },
  
  // ========== NIGHT RATE CALCULATION ==========
  _calculateNightRate(params) {
    const { date, baseRate, events, occupancyRate, competitorAvg, checkIn, property } = params;
    const dateStr = this._formatDate(date);
    
    let multiplier = 1.0;
    const factors = [];
    
    // 1. EVENT FACTOR (30% weight)
    const eventFactor = this._calculateEventFactor(date, events);
    if (eventFactor.multiplier !== 1) {
      multiplier += (eventFactor.multiplier - 1) * this.config.weights.events;
      factors.push(eventFactor);
    }
    
    // 2. SEASONALITY FACTOR (25% weight)
    const seasonFactor = this._calculateSeasonFactor(date);
    if (seasonFactor.multiplier !== 1) {
      multiplier += (seasonFactor.multiplier - 1) * this.config.weights.seasonality;
      factors.push(seasonFactor);
    }
    
    // 3. DAY OF WEEK FACTOR (15% weight)
    const dowFactor = this._calculateDayOfWeekFactor(date);
    if (dowFactor.multiplier !== 1) {
      multiplier += (dowFactor.multiplier - 1) * this.config.weights.dayOfWeek;
      factors.push(dowFactor);
    }
    
    // 4. LEAD TIME FACTOR (10% weight)
    const leadFactor = this._calculateLeadTimeFactor(checkIn);
    if (leadFactor.multiplier !== 1) {
      multiplier += (leadFactor.multiplier - 1) * this.config.weights.leadTime;
      factors.push(leadFactor);
    }
    
    // 5. OCCUPANCY FACTOR (10% weight)
    const occFactor = this._calculateOccupancyFactor(occupancyRate);
    if (occFactor.multiplier !== 1) {
      multiplier += (occFactor.multiplier - 1) * this.config.weights.occupancy;
      factors.push(occFactor);
    }
    
    // 6. COMPETITION FACTOR (10% weight)
    const compFactor = this._calculateCompetitionFactor(baseRate, competitorAvg);
    if (compFactor.multiplier !== 1) {
      multiplier += (compFactor.multiplier - 1) * this.config.weights.competition;
      factors.push(compFactor);
    }
    
    // Apply constraints
    const constraints = property.pricingConstraints || this.config.defaultConstraints;
    multiplier = Math.max(constraints.minMultiplier, Math.min(constraints.maxMultiplier, multiplier));
    
    const finalRate = Math.round(baseRate * multiplier);
    
    return {
      date: dateStr,
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      baseRate,
      multiplier: Math.round(multiplier * 100) / 100,
      finalRate,
      factors,
      adjustment: finalRate - baseRate,
      adjustmentPercent: Math.round((multiplier - 1) * 100)
    };
  },
  
  // ========== FACTOR CALCULATIONS ==========
  
  _calculateEventFactor(date, events) {
    const dateStr = this._formatDate(date);
    const dayEvents = events.filter(e => {
      const eventDate = e.dateStr || this._formatDate(new Date(e.date));
      return eventDate === dateStr;
    });
    
    if (dayEvents.length === 0) {
      return { type: 'events', multiplier: 1, reason: 'No events' };
    }
    
    let eventMultiplier = 1;
    let reason = '';
    
    // Major event (sports, concerts at major venues)
    const majorEvent = dayEvents.find(e => 
      (e.type === 'sports' || e.impact === 'high') && 
      (!e.distance || e.distance < 5)
    );
    
    if (majorEvent) {
      eventMultiplier = 1.50;  // +50% for major nearby events
      reason = `Major event: ${majorEvent.name}`;
    } else if (dayEvents.length >= 3) {
      eventMultiplier = 1.30;  // +30% for multiple events
      reason = `${dayEvents.length} events nearby`;
    } else if (dayEvents.some(e => e.impact === 'high')) {
      eventMultiplier = 1.25;  // +25% for high-impact event
      reason = `High-demand event`;
    } else if (dayEvents.some(e => !e.distance || e.distance < 3)) {
      eventMultiplier = 1.15;  // +15% for close proximity
      reason = `Event within 3 miles`;
    } else {
      eventMultiplier = 1.10;  // +10% for any events
      reason = `Local events`;
    }
    
    return { type: 'events', multiplier: eventMultiplier, reason, events: dayEvents };
  },
  
  _calculateSeasonFactor(date) {
    const month = date.getMonth();
    const day = date.getDate();
    
    // Holiday periods
    const isChristmas = month === 11 && day >= 20 && day <= 31;
    const isNewYears = month === 0 && day <= 3;
    const isThanksgiving = month === 10 && day >= 20 && day <= 30;
    const isMemorialDay = month === 4 && day >= 25 && day <= 31;
    const isLaborDay = month === 8 && day >= 1 && day <= 7;
    const isJuly4th = month === 6 && day >= 1 && day <= 7;
    
    if (isChristmas || isNewYears) {
      return { type: 'season', multiplier: 1.40, reason: 'Holiday peak season' };
    }
    if (isThanksgiving || isJuly4th) {
      return { type: 'season', multiplier: 1.30, reason: 'Holiday weekend' };
    }
    if (isMemorialDay || isLaborDay) {
      return { type: 'season', multiplier: 1.20, reason: 'Holiday weekend' };
    }
    
    // Summer premium (June-Aug)
    if (month >= 5 && month <= 7) {
      return { type: 'season', multiplier: 1.15, reason: 'Summer season' };
    }
    
    // Off-season discount (Jan-Feb)
    if (month === 0 || month === 1) {
      return { type: 'season', multiplier: 0.90, reason: 'Off-season' };
    }
    
    return { type: 'season', multiplier: 1, reason: 'Regular season' };
  },
  
  _calculateDayOfWeekFactor(date) {
    const dow = date.getDay();
    
    if (dow === 5 || dow === 6) {  // Fri, Sat
      return { type: 'dayOfWeek', multiplier: 1.20, reason: 'Weekend premium' };
    }
    if (dow === 0) {  // Sunday
      return { type: 'dayOfWeek', multiplier: 1.05, reason: 'Sunday' };
    }
    if (dow === 4) {  // Thursday
      return { type: 'dayOfWeek', multiplier: 1.05, reason: 'Thursday' };
    }
    
    // Midweek discount (Tue, Wed)
    if (dow === 2 || dow === 3) {
      return { type: 'dayOfWeek', multiplier: 0.95, reason: 'Midweek discount' };
    }
    
    return { type: 'dayOfWeek', multiplier: 1, reason: 'Regular day' };
  },
  
  _calculateLeadTimeFactor(checkIn) {
    const today = new Date();
    const checkInDate = new Date(checkIn);
    const daysOut = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysOut <= 2) {
      return { type: 'leadTime', multiplier: 1.15, reason: 'Last-minute booking' };
    }
    if (daysOut <= 7) {
      return { type: 'leadTime', multiplier: 1.05, reason: 'Short notice' };
    }
    if (daysOut > 90) {
      return { type: 'leadTime', multiplier: 0.95, reason: 'Early bird discount' };
    }
    if (daysOut > 60) {
      return { type: 'leadTime', multiplier: 0.98, reason: 'Advance booking' };
    }
    
    return { type: 'leadTime', multiplier: 1, reason: 'Standard booking window' };
  },
  
  _calculateOccupancyFactor(occupancyRate) {
    if (occupancyRate >= 0.9) {
      return { type: 'occupancy', multiplier: 1.25, reason: 'High demand (90%+ booked)' };
    }
    if (occupancyRate >= 0.75) {
      return { type: 'occupancy', multiplier: 1.15, reason: 'Strong demand (75%+ booked)' };
    }
    if (occupancyRate <= 0.3) {
      return { type: 'occupancy', multiplier: 0.90, reason: 'Low occupancy discount' };
    }
    if (occupancyRate <= 0.5) {
      return { type: 'occupancy', multiplier: 0.95, reason: 'Moderate occupancy' };
    }
    
    return { type: 'occupancy', multiplier: 1, reason: 'Normal occupancy' };
  },
  
  _calculateCompetitionFactor(baseRate, competitorAvg) {
    if (!competitorAvg) {
      return { type: 'competition', multiplier: 1, reason: 'No competitor data' };
    }
    
    const ratio = baseRate / competitorAvg;
    
    if (ratio > 1.2) {
      // We're 20%+ above market - slight discount to compete
      return { type: 'competition', multiplier: 0.95, reason: 'Market adjustment' };
    }
    if (ratio < 0.8) {
      // We're 20%+ below market - can charge more
      return { type: 'competition', multiplier: 1.10, reason: 'Below market rate' };
    }
    
    return { type: 'competition', multiplier: 1, reason: 'Competitive rate' };
  },
  
  // ========== UTILITIES ==========
  
  _calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  },
  
  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  // ========== PROVIDER TOOLS ==========
  
  /**
   * Preview pricing for a date range (for providers)
   */
  previewPricing(property, startDate, endDate, events = []) {
    const preview = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      const nightPricing = this._calculateNightRate({
        date: new Date(current),
        baseRate: property.nightlyFull || property.basePrice,
        events,
        occupancyRate: 0.5,
        competitorAvg: null,
        checkIn: startDate,
        property
      });
      preview.push(nightPricing);
      current.setDate(current.getDate() + 1);
    }
    
    return preview;
  },
  
  /**
   * Generate pricing report for a month
   */
  monthlyReport(property, year, month, events = [], bookings = []) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const report = {
      month: new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      days: [],
      summary: {
        avgRate: 0,
        peakRate: 0,
        lowestRate: Infinity,
        bookedNights: 0,
        revenue: 0,
        potentialRevenue: 0
      }
    };
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = this._formatDate(date);
      
      const pricing = this._calculateNightRate({
        date,
        baseRate: property.nightlyFull || property.basePrice,
        events,
        occupancyRate: 0.5,
        competitorAvg: null,
        checkIn: dateStr,
        property
      });
      
      // Check if booked
      const isBooked = bookings.some(b => {
        const ci = new Date(b.checkIn);
        const co = new Date(b.checkOut);
        return date >= ci && date < co && b.propertyId === property.id;
      });
      
      report.days.push({
        ...pricing,
        isBooked,
        booking: isBooked ? bookings.find(b => {
          const ci = new Date(b.checkIn);
          const co = new Date(b.checkOut);
          return date >= ci && date < co && b.propertyId === property.id;
        }) : null
      });
      
      report.summary.avgRate += pricing.finalRate;
      report.summary.peakRate = Math.max(report.summary.peakRate, pricing.finalRate);
      report.summary.lowestRate = Math.min(report.summary.lowestRate, pricing.finalRate);
      report.summary.potentialRevenue += pricing.finalRate;
      
      if (isBooked) {
        report.summary.bookedNights++;
        report.summary.revenue += pricing.finalRate;
      }
    }
    
    report.summary.avgRate = Math.round(report.summary.avgRate / daysInMonth);
    report.summary.occupancyRate = report.summary.bookedNights / daysInMonth;
    
    return report;
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PricingEngine;
}
