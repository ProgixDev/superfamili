"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBookingPricing = calculateBookingPricing;
function calculateBookingPricing(input) {
    const subtotal = Math.round(input.hourlyRateCents * input.durationHours);
    const extraKm = Math.max(0, input.distanceKm - input.freeMileageKm);
    const mileageFee = Math.round(extraKm * input.mileageFeePerKmCents);
    const commission = Math.round(subtotal * (input.platformCommissionPercent / 100));
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
//# sourceMappingURL=pricing.util.js.map