import { NotificationsService } from './notifications.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(user: AuthUser, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    markAsRead(user: AuthUser, id: string): Promise<any>;
    markAllAsRead(user: AuthUser): Promise<{
        message: string;
    }>;
}
