export declare class CreateBookingDto {
    educator_profile_id: string;
    service_id: string;
    child_id?: string;
    booking_date_start: string;
    booking_date_end: string;
    duration_hours: number;
    location_postal_code?: string;
    notes?: string;
    special_requests?: string;
}
