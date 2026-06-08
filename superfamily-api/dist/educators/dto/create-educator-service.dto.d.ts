export declare class CreateEducatorServiceDto {
    service_id: string;
    hourly_rate_cents: number;
    minimum_booking_hours?: number;
    can_provide_on_weekends?: boolean;
    can_provide_overnight?: boolean;
    requires_parent_presence?: boolean;
}
