import { ReviewsService } from './reviews.service';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    create(user: AuthUser, dto: CreateReviewDto): Promise<any>;
    findByEducator(id: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
}
