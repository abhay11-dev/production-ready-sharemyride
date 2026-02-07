// src/utils/paymentCalculator.test.js
import { PaymentCalculator } from './paymentCalculator';

describe('PaymentCalculator with 8% Platform Fee', () => {
  const baseFare = 100; // ₹100 base fare for testing

  describe('calculateDriverEarnings', () => {
    test('should calculate correct driver earnings with 8% platform fee', () => {
      const result = PaymentCalculator.calculateDriverEarnings(baseFare);
      
      expect(result.baseFare).toBe(100);
      expect(result.platformFee).toBe(8); // 8% of 100
      expect(result.gstOnPlatformFee).toBe(1.44); // 18% of 8
      expect(result.totalDeduction).toBe(9.44); // 8 + 1.44
      expect(result.driverNetAmount).toBe(90.56); // 100 - 9.44
    });

    test('should handle decimal base fares correctly', () => {
      const result = PaymentCalculator.calculateDriverEarnings(150.50);
      
      expect(result.baseFare).toBe(150.50);
      expect(result.platformFee).toBe(12.04); // 8% of 150.50
      expect(result.gstOnPlatformFee).toBe(2.1672); // 18% of 12.04
      expect(result.driverNetAmount).toBe(136.2928); // 150.50 - 14.2072
    });
  });

  describe('calculatePassengerTotal', () => {
    test('should calculate correct passenger total with 8% service fee', () => {
      const result = PaymentCalculator.calculatePassengerTotal(baseFare);
      
      expect(result.baseFare).toBe(100);
      expect(result.passengerServiceFee).toBe(8); // 8% of 100
      expect(result.gstOnServiceFee).toBe(1.44); // 18% of 8
      expect(result.totalPassengerPays).toBe(109.44); // 100 + 8 + 1.44
    });

    test('should handle multiple seats calculation', () => {
      const seatsBooked = 3;
      const result = PaymentCalculator.calculatePassengerTotal(baseFare);
      
      // For multiple seats, multiply the total by seats
      const totalForMultipleSeats = result.totalPassengerPays * seatsBooked;
      expect(totalForMultipleSeats).toBe(328.32); // 109.44 * 3
    });
  });

  describe('calculatePlatformRevenue', () => {
    test('should calculate correct platform revenue', () => {
      const result = PaymentCalculator.calculatePlatformRevenue(baseFare);
      
      expect(result.platformFeeFromDriver).toBe(8); // 8% from driver
      expect(result.gstOnPlatformFee).toBe(1.44); // 18% GST on platform fee
      expect(result.passengerServiceFee).toBe(8); // 8% from passenger
      expect(result.gstOnServiceFee).toBe(1.44); // 18% GST on service fee
      expect(result.totalServiceRevenue).toBe(16); // 8 + 8
      expect(result.totalGstCollected).toBe(2.88); // 1.44 + 1.44
      expect(result.totalPlatformRevenue).toBe(18.88); // 16 + 2.88
    });
  });

  describe('Real-world scenarios', () => {
    test('should handle typical ride fare of ₹250', () => {
      const rideFare = 250;
      const driverCalc = PaymentCalculator.calculateDriverEarnings(rideFare);
      const passengerCalc = PaymentCalculator.calculatePassengerTotal(rideFare);
      
      // Driver side
      expect(driverCalc.platformFee).toBe(20); // 8% of 250
      expect(driverCalc.gstOnPlatformFee).toBe(3.6); // 18% of 20
      expect(driverCalc.driverNetAmount).toBe(226.4); // 250 - 23.6
      
      // Passenger side
      expect(passengerCalc.passengerServiceFee).toBe(20); // 8% of 250
      expect(passengerCalc.gstOnServiceFee).toBe(3.6); // 18% of 20
      expect(passengerCalc.totalPassengerPays).toBe(273.6); // 250 + 23.6
    });

    test('should handle ride with 2 seats', () => {
      const rideFare = 200;
      const seatsBooked = 2;
      
      const driverCalc = PaymentCalculator.calculateDriverEarnings(rideFare);
      const passengerCalc = PaymentCalculator.calculatePassengerTotal(rideFare);
      
      // Total calculations for 2 seats
      const totalDriverEarnings = driverCalc.driverNetAmount * seatsBooked;
      const totalPassengerPayment = passengerCalc.totalPassengerPays * seatsBooked;
      
      expect(totalDriverEarnings).toBe(361.12); // 180.56 * 2
      expect(totalPassengerPayment).toBe(437.76); // 218.88 * 2
    });

    test('should maintain consistency between old 15% and new 8% calculations', () => {
      const rideFare = 300;
      
      // New 8% calculation
      const newCalc = PaymentCalculator.calculateDriverEarnings(rideFare);
      
      // Driver should earn more with 8% vs 15%
      const old15PercentDeduction = rideFare * 0.15 * 1.18; // 15% + 18% GST
      const new8PercentDeduction = newCalc.totalDeduction;
      
      expect(new8PercentDeduction).toBeLessThan(old15PercentDeduction);
      expect(newCalc.driverNetAmount).toBeGreaterThan(rideFare - old15PercentDeduction);
    });
  });

  describe('Edge cases', () => {
    test('should handle zero fare', () => {
      const result = PaymentCalculator.calculateDriverEarnings(0);
      
      expect(result.baseFare).toBe(0);
      expect(result.platformFee).toBe(0);
      expect(result.gstOnPlatformFee).toBe(0);
      expect(result.driverNetAmount).toBe(0);
    });

    test('should handle string input', () => {
      const result = PaymentCalculator.calculateDriverEarnings('100');
      
      expect(result.baseFare).toBe(100);
      expect(result.platformFee).toBe(8);
      expect(result.driverNetAmount).toBe(90.56);
    });

    test('should handle very small amounts', () => {
      const result = PaymentCalculator.calculateDriverEarnings(1);
      
      expect(result.baseFare).toBe(1);
      expect(result.platformFee).toBe(0.08); // 8% of 1
      expect(result.gstOnPlatformFee).toBe(0.0144); // 18% of 0.08
      expect(result.driverNetAmount).toBe(0.9056); // 1 - 0.0944
    });
  });

  describe('Industry standard validations', () => {
    test('should ensure platform fee is exactly 8%', () => {
      const testFares = [50, 100, 150, 200, 500, 1000];
      
      testFares.forEach(fare => {
        const result = PaymentCalculator.calculateDriverEarnings(fare);
        const expectedPlatformFee = fare * 0.08;
        expect(result.platformFee).toBeCloseTo(expectedPlatformFee, 2);
      });
    });

    test('should ensure GST is exactly 18% on platform fee', () => {
      const testFares = [100, 250, 500];
      
      testFares.forEach(fare => {
        const result = PaymentCalculator.calculateDriverEarnings(fare);
        const expectedGST = result.platformFee * 0.18;
        expect(result.gstOnPlatformFee).toBeCloseTo(expectedGST, 4);
      });
    });

    test('should ensure total deduction is platform fee + GST', () => {
      const result = PaymentCalculator.calculateDriverEarnings(200);
      const expectedTotal = result.platformFee + result.gstOnPlatformFee;
      expect(result.totalDeduction).toBeCloseTo(expectedTotal, 4);
    });
  });
});