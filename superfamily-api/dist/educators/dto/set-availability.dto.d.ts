export declare class AvailabilitySlotDto {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available?: boolean;
}
export declare class SetAvailabilityDto {
    slots: AvailabilitySlotDto[];
}
export declare class CreateAvailabilityOverrideDto {
    date_start: string;
    date_end: string;
    is_available?: boolean;
    start_time?: string;
    end_time?: string;
    reason?: string;
}
