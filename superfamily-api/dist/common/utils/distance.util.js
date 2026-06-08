"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDistanceBetweenPostalCodes = getDistanceBetweenPostalCodes;
exports.haversineDistance = haversineDistance;
async function getDistanceBetweenPostalCodes(supabase, postalCode1, postalCode2) {
    const { data, error } = await supabase.rpc('calculate_distance_km', {
        postal_code_1: postalCode1,
        postal_code_2: postalCode2,
    });
    if (error) {
        const { data: fallback } = await supabase
            .from('postal_codes')
            .select('latitude, longitude')
            .in('postal_code', [postalCode1, postalCode2]);
        if (fallback && fallback.length === 2) {
            return haversineDistance(fallback[0].latitude, fallback[0].longitude, fallback[1].latitude, fallback[1].longitude);
        }
        return 0;
    }
    return data ?? 0;
}
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function toRad(deg) {
    return deg * (Math.PI / 180);
}
//# sourceMappingURL=distance.util.js.map