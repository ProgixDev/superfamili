export declare class CreateNotificationDto {
    profile_id: string;
    notification_type: string;
    title: string;
    message?: string;
    related_booking_id?: string;
    related_conversation_id?: string;
    data?: Record<string, any>;
}
