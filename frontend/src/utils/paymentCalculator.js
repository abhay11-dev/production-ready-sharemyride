// utils/paymentCalculator.js

/**
 * Payment Calculator for Rideshare Platform
 * 
 * REVENUE MODEL:
 * ===============
 * Driver Side:
 *   - Driver ask is the amount shown as their fare.
 *   - Platform fee: 3% of the driver-set fare.
 *   - GST on platform fee: 5% of the platform fee.
 *   - Driver net earning = driver-set fare.
 * 
 * Passenger Side:
 *   - Base Fare (what driver set)
 *   - Platform Fee: 3% of base fare
 *   - GST on Platform Fee: 5% of the platform fee
 *   - Total Passenger Pays = Base Fare + Platform Fee + GST
 */

class PaymentCalculator {
  // Constants
  static PLATFORM_FEE_PERCENTAGE = 0.03; // 3%
  static GST_PERCENTAGE = 0.05; // 5%
  static PASSENGER_SERVICE_FEE = 0;
  static PASSENGER_SERVICE_FEE_GST = 0;

  /**
   * Calculate driver earnings (what driver receives after deductions)
   * @param {number} baseFare - The fare driver set per seat
   * @param {number} seatsBooked - Number of seats booked (default 1)
   * @returns {object} Driver earnings breakdown
   */
  static calculateDriverEarnings(baseFare, seatsBooked = 1) {
    const fare = parseFloat(baseFare) || 0;
    const seats = parseInt(seatsBooked) || 1;

    const platformFee = fare * this.PLATFORM_FEE_PERCENTAGE;
    const gstOnPlatformFee = platformFee * this.GST_PERCENTAGE;
    const totalDeductions = platformFee + gstOnPlatformFee;

    // Driver receives exactly the amount they asked for; platform charges are added on the passenger side.
    const driverNetAmountPerSeat = fare;
    
    // Total for all seats
    const totalDriverEarnings = driverNetAmountPerSeat * seats;

    return {
      baseFare: fare,
      platformFee: platformFee,
      platformFeePercentage: this.PLATFORM_FEE_PERCENTAGE * 100, // 8
      gstOnPlatformFee: gstOnPlatformFee,
      gstPercentage: this.GST_PERCENTAGE * 100, // 18
      totalDeductions: totalDeductions,
      driverNetAmount: driverNetAmountPerSeat, // Per seat
      driverNetAmountPerSeat: driverNetAmountPerSeat,
      seatsBooked: seats,
      totalDriverEarnings: totalDriverEarnings,
      
      // Breakdown percentages
      platformFeeRate: (platformFee / fare * 100).toFixed(2) + '%',
      gstRate: (gstOnPlatformFee / fare * 100).toFixed(2) + '%',
      netEarningRate: (driverNetAmountPerSeat / fare * 100).toFixed(2) + '%'
    };
  }

  /**
   * Calculate total amount passenger needs to pay
   * @param {number} baseFare - The fare driver set per seat
   * @param {number} seatsBooked - Number of seats passenger is booking
   * @returns {object} Passenger payment breakdown
   */
  static calculatePassengerTotal(baseFare, seatsBooked = 1) {
    const fare = parseFloat(baseFare) || 0;
    const seats = parseInt(seatsBooked) || 1;

    const serviceFeePerSeat = fare * this.PLATFORM_FEE_PERCENTAGE;
    const gstOnServiceFeePerSeat = serviceFeePerSeat * this.GST_PERCENTAGE;

    const totalServiceChargesPerSeat = serviceFeePerSeat + gstOnServiceFeePerSeat;
    const totalPerSeat = fare + totalServiceChargesPerSeat;
    
    // Total for all seats
    const totalForAllSeats = totalPerSeat * seats;

    return {
      baseFare: fare,
      baseFareTotal: fare * seats,
      
      serviceFee: serviceFeePerSeat,
      serviceFeeTotal: serviceFeePerSeat * seats,
      
      gstOnServiceFee: gstOnServiceFeePerSeat,
      gstOnServiceFeeTotal: gstOnServiceFeePerSeat * seats,
      
      totalServiceCharges: totalServiceChargesPerSeat,
      totalServiceChargesForAllSeats: totalServiceChargesPerSeat * seats,
      
      totalPassengerPays: totalPerSeat, // Per seat
      totalPassengerPaysPerSeat: totalPerSeat,
      seatsBooked: seats,
      totalForAllSeats: totalForAllSeats,
      
      // Breakdown
      serviceFeeBreakdown: `₹${serviceFeePerSeat.toFixed(2)} + ₹${gstOnServiceFeePerSeat.toFixed(2)} GST`,
      totalBreakdown: `₹${fare.toFixed(2)} (fare) + ₹${totalServiceChargesPerSeat.toFixed(2)} (service) = ₹${totalPerSeat.toFixed(2)}`
    };
  }

  /**
   * Calculate platform revenue from a booking
   * @param {number} baseFare - The fare driver set per seat
   * @param {number} seatsBooked - Number of seats booked
   * @returns {object} Platform revenue breakdown
   */
  static calculatePlatformRevenue(baseFare, seatsBooked = 1) {
    const driverCalc = this.calculateDriverEarnings(baseFare, seatsBooked);
    const passengerCalc = this.calculatePassengerTotal(baseFare, seatsBooked);

    const fromDriver = 0;
    const fromPassenger = passengerCalc.totalServiceChargesForAllSeats;
    const totalPlatformRevenue = fromPassenger;

    return {
      fromDriver: fromDriver,
      fromDriverBreakdown: 'No direct deduction from driver ask',
      
      fromPassenger: fromPassenger,
      fromPassengerBreakdown: `3% platform fee + 5% GST`,
      
      totalRevenue: totalPlatformRevenue,
      
      driverContribution: fromDriver,
      passengerContribution: fromPassenger,
      
      revenuePerSeat: totalPlatformRevenue / seatsBooked
    };
  }

  /**
   * Complete transaction breakdown
   * @param {number} baseFare - The fare driver set per seat
   * @param {number} seatsBooked - Number of seats booked
   * @returns {object} Complete breakdown
   */
  static getCompleteBreakdown(baseFare, seatsBooked = 1) {
    const driverCalc = this.calculateDriverEarnings(baseFare, seatsBooked);
    const passengerCalc = this.calculatePassengerTotal(baseFare, seatsBooked);
    const platformCalc = this.calculatePlatformRevenue(baseFare, seatsBooked);

    return {
      driver: driverCalc,
      passenger: passengerCalc,
      platform: platformCalc,
      
      // Summary
      summary: {
        baseFarePerSeat: baseFare,
        seatsBooked: seatsBooked,
        
        driverReceives: driverCalc.totalDriverEarnings,
        passengerPays: passengerCalc.totalForAllSeats,
        platformEarns: platformCalc.totalRevenue,
        
        // Verification
        isBalanced: Math.abs(
          passengerCalc.totalForAllSeats - 
          driverCalc.totalDriverEarnings - 
          platformCalc.totalRevenue
        ) < 0.01 // Allow for floating point rounding
      }
    };
  }

  /**
   * Format currency in Indian Rupees
   * @param {number} amount 
   * @returns {string}
   */
  static formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
  }

  /**
   * Get passenger service charges (for displaying to users)
   * @returns {object}
   */
  static getPassengerServiceCharges() {
    return {
      serviceFee: this.PASSENGER_SERVICE_FEE,
      gst: this.PASSENGER_SERVICE_FEE_GST,
      total: this.PASSENGER_SERVICE_FEE + this.PASSENGER_SERVICE_FEE_GST,
      formatted: this.formatCurrency(this.PASSENGER_SERVICE_FEE + this.PASSENGER_SERVICE_FEE_GST)
    };
  }

  /**
   * Get platform fee info (for displaying to drivers)
   * @returns {object}
   */
  static getPlatformFeeInfo() {
    return {
      percentage: this.PLATFORM_FEE_PERCENTAGE * 100,
      gstPercentage: this.GST_PERCENTAGE * 100,
      description: `${this.PLATFORM_FEE_PERCENTAGE * 100}% platform fee + ${this.GST_PERCENTAGE * 100}% GST on that fee`
    };
  }
}

// Export for use in both frontend and backend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentCalculator;
} else {
  window.PaymentCalculator = PaymentCalculator;
}

export default PaymentCalculator;