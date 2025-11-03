// src/utils/paymentCalculator.js
export const PaymentCalculator = {
  // Driver's perspective - what they'll receive after deductions
  calculateDriverEarnings: (baseFare) => {
    const base = parseFloat(baseFare);
    const platformFee = base * 0.08; // 8% platform fee
    const gstOnPlatformFee = platformFee * 0.18; // 18% GST on platform fee
    const totalDeduction = platformFee + gstOnPlatformFee;
    const driverNetAmount = base - totalDeduction;
    
    return {
      baseFare: base,
      platformFee: platformFee,
      gstOnPlatformFee: gstOnPlatformFee,
      totalDeduction: totalDeduction,
      driverNetAmount: driverNetAmount
    };
  },
  
  // Passenger's perspective - what they'll pay
  calculatePassengerTotal: (driverBaseFare) => {
    const base = parseFloat(driverBaseFare);
    const passengerServiceFee = 10; // Fixed ₹10
    const gstOnServiceFee = passengerServiceFee * 0.18; // 18% GST on service fee
    const totalPassengerPays = base + passengerServiceFee + gstOnServiceFee;
    
    return {
      baseFare: base,
      passengerServiceFee: passengerServiceFee,
      gstOnServiceFee: gstOnServiceFee,
      totalPassengerPays: totalPassengerPays
    };
  },
  
  // Platform's revenue calculation
  calculatePlatformRevenue: (driverBaseFare) => {
    const base = parseFloat(driverBaseFare);
    const platformFee = base * 0.08;
    const gstOnPlatformFee = platformFee * 0.18;
    const passengerServiceFee = 10;
    const gstOnServiceFee = passengerServiceFee * 0.18;
    
    const totalServiceRevenue = platformFee + passengerServiceFee;
    const totalGstCollected = gstOnPlatformFee + gstOnServiceFee;
    const totalPlatformRevenue = totalServiceRevenue + totalGstCollected;
    
    return {
      platformFeeFromDriver: platformFee,
      gstOnPlatformFee: gstOnPlatformFee,
      passengerServiceFee: passengerServiceFee,
      gstOnServiceFee: gstOnServiceFee,
      totalServiceRevenue: totalServiceRevenue,
      totalGstCollected: totalGstCollected,
      totalPlatformRevenue: totalPlatformRevenue
    };
  }
};