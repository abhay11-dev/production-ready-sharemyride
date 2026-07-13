/**
 * paymentCalculator.js — ShareMyRide payment model (definitive)
 *
 * DRIVER:
 *   - Receives exactly the base fare they set. Zero deductions.
 *
 * PASSENGER — normal booking:
 *   - Base fare          : B
 *   - Platform fee (3%)  : 0.03 × B
 *   - GST (5%)           : 0.05 × (B + 0.03 × B) = 0.0515 × B
 *   - TOTAL              : B × 1.0815
 *
 * PASSENGER — first booking ("First Ride Free" on platform fee):
 *   - Base fare          : B
 *   - Platform fee       : WAIVED — shown as crossed-out in UI, not added to total
 *   - GST (5%)           : 0.05 × B  (GST still applies, but only on base since fee is 0)
 *   - TOTAL              : B × 1.05
 */

class PaymentCalculator {
  static PLATFORM_FEE_RATE = 0.03;   // 3%
  static GST_RATE          = 0.05;   // 5%

  // Legacy aliases kept so old code that reads these doesn't break
  static PLATFORM_FEE_PERCENTAGE = 0.03;
  static GST_PERCENTAGE          = 0.05;
  static PASSENGER_SERVICE_FEE     = 0;
  static PASSENGER_SERVICE_FEE_GST = 0;

  /**
   * Core passenger calculation.
   *
   * @param {number} baseFarePerSeat   - Driver-set price per seat
   * @param {number} seatsBooked       - Number of seats
   * @param {object} [options]
   * @param {boolean} [options.waivePlatformCharges=false] - First-ride waiver
   * @returns {object}
   */
  static calculatePassengerTotal(baseFarePerSeat, seatsBooked = 1, options = {}) {
    const fare  = parseFloat(baseFarePerSeat) || 0;
    const seats = Math.max(1, parseInt(seatsBooked) || 1);
    const waive = options?.waivePlatformCharges === true;

    // Platform fee per seat (always computed for display; only added to total when not waived)
    const platformFeePerSeat = fare * this.PLATFORM_FEE_RATE;

    // GST base:
    //   • Normal  : base + platform fee
    //   • 1st ride: base only (fee is waived, so GST applies on base only)
    const gstBasePerSeat = waive ? fare : fare + platformFeePerSeat;
    const gstPerSeat     = gstBasePerSeat * this.GST_RATE;

    // What passenger actually pays per seat
    const chargedFeePerSeat = waive ? 0 : platformFeePerSeat;
    const totalPerSeat      = fare + chargedFeePerSeat + gstPerSeat;

    // Totals for all seats
    const baseFareTotal     = fare              * seats;
    const platformFeeTotal  = chargedFeePerSeat * seats;
    const gstTotal          = gstPerSeat        * seats;
    const totalForAllSeats  = totalPerSeat      * seats;

    // Amounts that would have been charged (for struck-through display)
    const standardPlatformFeePerSeat = platformFeePerSeat;           // 3% of base
    const standardGstPerSeat         = (fare + platformFeePerSeat) * this.GST_RATE; // 5% of (base+fee)
    const waivedPlatformFeePerSeat   = waive ? platformFeePerSeat : 0;

    return {
      // Per-seat
      baseFare:               fare,
      platformFeePerSeat:     chargedFeePerSeat,
      gstPerSeat,
      totalPerSeat,

      // For-all-seats
      baseFareTotal,
      serviceFeeTotal:         platformFeeTotal,   // legacy alias
      passengerServiceFeeTotal: platformFeeTotal,  // legacy alias
      gstOnServiceFeeTotal:    gstTotal,           // legacy alias
      passengerServiceFeeGSTTotal: gstTotal,       // legacy alias
      totalForAllSeats,

      // Waiver metadata (for UI display of crossed-out amounts)
      waivePlatformCharges:      waive,
      standardPlatformFeePerSeat,
      standardGstPerSeat,
      waivedPlatformFee:         waivedPlatformFeePerSeat,
      waivedPlatformFeeTotal:    waivedPlatformFeePerSeat * seats,

      // Legacy aliases
      serviceFee:               chargedFeePerSeat,
      passengerServiceFee:      chargedFeePerSeat,
      gstOnServiceFee:          gstPerSeat,
      passengerServiceFeeGST:   gstPerSeat,
      totalPassengerPays:       totalPerSeat,
      totalPassengerPaysPerSeat: totalPerSeat,
      seatsBooked:              seats,
    };
  }

  /**
   * Driver side: receives exactly the base fare, no deductions.
   */
  static calculateDriverEarnings(baseFarePerSeat, seatsBooked = 1) {
    const fare  = parseFloat(baseFarePerSeat) || 0;
    const seats = Math.max(1, parseInt(seatsBooked) || 1);
    return {
      baseFare:            fare,
      driverNetAmount:     fare,
      driverNetAmountPerSeat: fare,
      totalDriverEarnings: fare * seats,
      seatsBooked:         seats,
      platformFeeRate:     '0.00%',
      gstRate:             '0.00%',
      netEarningRate:      '100.00%',
    };
  }

  /**
   * Platform revenue = what passenger pays minus what driver receives.
   */
  static calculatePlatformRevenue(baseFarePerSeat, seatsBooked = 1) {
    const passengerCalc = this.calculatePassengerTotal(baseFarePerSeat, seatsBooked);
    const driverCalc    = this.calculateDriverEarnings(baseFarePerSeat, seatsBooked);
    const revenue       = passengerCalc.totalForAllSeats - driverCalc.totalDriverEarnings;
    return {
      fromDriver:    0,
      fromPassenger: revenue,
      totalRevenue:  revenue,
      revenuePerSeat: revenue / seatsBooked,
    };
  }

  /** Complete breakdown for display */
  static getCompleteBreakdown(baseFarePerSeat, seatsBooked = 1) {
    const driver    = this.calculateDriverEarnings(baseFarePerSeat, seatsBooked);
    const passenger = this.calculatePassengerTotal(baseFarePerSeat, seatsBooked);
    const platform  = this.calculatePlatformRevenue(baseFarePerSeat, seatsBooked);
    return {
      driver, passenger, platform,
      summary: {
        baseFarePerSeat,
        seatsBooked,
        driverReceives:  driver.totalDriverEarnings,
        passengerPays:   passenger.totalForAllSeats,
        platformEarns:   platform.totalRevenue,
        isBalanced: Math.abs(passenger.totalForAllSeats - driver.totalDriverEarnings - platform.totalRevenue) < 0.01,
      },
    };
  }

  static formatCurrency(amount) {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  }

  static getPassengerServiceCharges() {
    return { serviceFee: 0, gst: 0, total: 0, formatted: '₹0.00' };
  }

  static getPlatformFeeInfo() {
    return {
      percentage:    this.PLATFORM_FEE_RATE * 100,
      gstPercentage: this.GST_RATE * 100,
      description:   `${this.PLATFORM_FEE_RATE * 100}% platform fee + ${this.GST_RATE * 100}% GST`,
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentCalculator;
} else {
  window.PaymentCalculator = PaymentCalculator;
}

export default PaymentCalculator;
