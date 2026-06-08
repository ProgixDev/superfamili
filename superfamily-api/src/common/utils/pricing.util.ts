export interface BookingPricingInput {
  hourlyRateCents: number;
  durationHours: number;
  distanceKm: number;
  platformCommissionPercent: number;
  freeMileageKm: number;
  mileageFeePerKmCents: number;
}

export interface BookingPricingResult {
  subtotalCents: number;
  mileageFeeCents: number;
  platformCommissionCents: number;
  educatorEarningsCents: number;
  totalAmountCents: number;
}

export function calculateBookingPricing(
  input: BookingPricingInput,
): BookingPricingResult {
  const subtotal = Math.round(input.hourlyRateCents * input.durationHours);
  const extraKm = Math.max(0, input.distanceKm - input.freeMileageKm);
  const mileageFee = Math.round(extraKm * input.mileageFeePerKmCents);
  const commission = Math.round(
    subtotal * (input.platformCommissionPercent / 100),
  );
  const earnings = subtotal - commission;
  const total = subtotal + mileageFee;

  return {
    subtotalCents: subtotal,
    mileageFeeCents: mileageFee,
    platformCommissionCents: commission,
    educatorEarningsCents: earnings,
    totalAmountCents: total,
  };
}
