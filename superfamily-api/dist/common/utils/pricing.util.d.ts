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
export declare function calculateBookingPricing(input: BookingPricingInput): BookingPricingResult;
