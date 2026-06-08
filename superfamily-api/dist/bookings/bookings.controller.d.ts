import { BookingsService } from './bookings.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
    create(user: AuthUser, dto: CreateBookingDto): Promise<any>;
    findAll(user: AuthUser, page?: number, limit?: number, status?: string): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(user: AuthUser, id: string): Promise<any>;
    cancel(user: AuthUser, id: string, dto: CancelBookingDto): Promise<any>;
    complete(user: AuthUser, id: string): Promise<any>;
}
