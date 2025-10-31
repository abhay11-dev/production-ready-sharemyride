// services/commissionService.js

/**
 * Calculate commission breakdown for a transaction
 * @param {Number} totalFare - Total fare amount passenger pays
 * @param {Number} commissionPercent - Platform commission percentage (default 15%)
 * @param {Number} gstPercent - GST percentage (default 18%)
 * @returns {Object} Commission breakdown
 */
const calculateCommissionBreakdown = (
  totalFare, 
  commissionPercent = process.env.PLATFORM_COMMISSION_PERCENT || 10,
  gstPercent = process.env.GST_PERCENT || 18
) => {
  // Input validation
  if (!totalFare || totalFare <= 0) {
    throw new Error('Invalid total fare amount');
  }
  
  // Convert to numbers
  const fare = parseFloat(totalFare);
  const commRate = parseFloat(commissionPercent);
  const gstRate = parseFloat(gstPercent);
  
  // Step 1: Calculate base commission
  const baseCommissionAmount = (fare * commRate) / 100;
  
  // Step 2: Calculate GST on commission
  const gstAmount = (baseCommissionAmount * gstRate) / 100;
  
  // Step 3: Calculate platform total
  const platformTotalAmount = baseCommissionAmount + gstAmount;
  
  // Step 4: Calculate driver net amount
  const driverNetAmount = fare - platformTotalAmount;
  
  // Round to 2 decimal places
  const roundTo2 = (num) => Math.round(num * 100) / 100;
  
  return {
    totalAmount: roundTo2(fare),
    baseCommissionAmount: roundTo2(baseCommissionAmount),
    baseCommissionPercent: roundTo2(commRate),
    gstAmount: roundTo2(gstAmount),
    gstPercent: roundTo2(gstRate),
    platformTotalAmount: roundTo2(platformTotalAmount),
    driverNetAmount: roundTo2(driverNetAmount),
    breakdown: {
      passengerPays: roundTo2(fare),
      platformCommission: roundTo2(baseCommissionAmount),
      gstOnCommission: roundTo2(gstAmount),
      platformKeeps: roundTo2(platformTotalAmount),
      driverReceives: roundTo2(driverNetAmount)
    }
  };
};

/**
 * Calculate gateway fees (optional - can be absorbed by platform)
 */
const calculateGatewayFees = (amount) => {
  const razorpayFeePercent = 1.99; // Razorpay charges 1.99%
  const gstOnFees = 18;
  
  const gatewayFee = (amount * razorpayFeePercent) / 100;
  const gatewayGst = (gatewayFee * gstOnFees) / 100;
  const totalGatewayFee = gatewayFee + gatewayGst;
  
  return {
    gatewayFee: Math.round(gatewayFee * 100) / 100,
    gatewayGst: Math.round(gatewayGst * 100) / 100,
    totalGatewayFee: Math.round(totalGatewayFee * 100) / 100
  };
};

module.exports = {
  calculateCommissionBreakdown,
  calculateGatewayFees
};