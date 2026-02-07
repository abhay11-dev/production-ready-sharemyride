// utils/paymentCalculator.js

/**
 * Payment Calculator for Rideshare Platform
 * 
 * REVENUE MODEL:
 * ===============
 * Driver Side:
 *   - Platform Fee: 8% of base fare
 *   - GST on Platform Fee: 18% of platform fee
 *   - Driver Net Earning = Base Fare - Platform Fee - GST on Platform Fee
 * 
 * Passenger Side:
 *   - Base Fare (what driver set)
 *   - Passenger Service Fee: ₹10 fixed per seat
 *   - GST on Service Fee: 18% of ₹10 = ₹1.80
 *   - Total Passenger Pays = Base Fare + ₹10 + ₹1.80 = Base Fare + ₹11.80
 * 
 * Platform Revenue:
 *   - From Driver: Platform Fee + GST = 8% + (18% of 8%) = ~9.44% of base fare
 *   - From Passenger: ₹11.80 per seat
 */

class PaymentCalculator {
  // Constants
  static PLATFORM_FEE_PERCENTAGE = 0.08; // 8%
  static GST_PERCENTAGE = 0.18; // 18%
  static PASSENGER_SERVICE_FEE = 10; // ₹10 fixed per seat
  static PASSENGER_SERVICE_FEE_GST = 10 * 0.18; // ₹1.80

  /**
   * Calculate driver earnings (what driver receives after deductions)
   * @param {number} baseFare - The fare driver set per seat
   * @param {number} seatsBooked - Number of seats booked (default 1)
   * @returns {object} Driver earnings breakdown
   */
  static calculateDriverEarnings(baseFare, seatsBooked = 1) {
    const fare = parseFloat(baseFare) || 0;
    const seats = parseInt(seatsBooked) || 1;

    // Platform fee: 8% of base fare
    const platformFee = fare * this.PLATFORM_FEE_PERCENTAGE;
    
    // GST on platform fee: 18% of platform fee
    const gstOnPlatformFee = platformFee * this.GST_PERCENTAGE;
    
    // Total deductions
    const totalDeductions = platformFee + gstOnPlatformFee;
    
    // Net amount driver receives per seat
    const driverNetAmountPerSeat = fare - totalDeductions;
    
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

    // Fixed service fee per seat
    const serviceFeePerSeat = this.PASSENGER_SERVICE_FEE;
    const gstOnServiceFeePerSeat = this.PASSENGER_SERVICE_FEE_GST;
    
    // Total service charges per seat
    const totalServiceChargesPerSeat = serviceFeePerSeat + gstOnServiceFeePerSeat;
    
    // Total passenger pays per seat
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

    // Platform earns from driver
    const fromDriver = (driverCalc.platformFee + driverCalc.gstOnPlatformFee) * seatsBooked;
    
    // Platform earns from passenger
    const fromPassenger = passengerCalc.totalServiceChargesForAllSeats;
    
    // Total platform revenue
    const totalPlatformRevenue = fromDriver + fromPassenger;

    return {
      fromDriver: fromDriver,
      fromDriverBreakdown: `Platform Fee (${driverCalc.platformFeePercentage}%) + GST`,
      
      fromPassenger: fromPassenger,
      fromPassengerBreakdown: `Service Fee + GST`,
      
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
      description: `${this.PLATFORM_FEE_PERCENTAGE * 100}% platform fee + ${this.GST_PERCENTAGE * 100}% GST on platform fee`
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