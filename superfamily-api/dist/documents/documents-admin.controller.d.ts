import { DocumentsService } from './documents.service';
import { RejectDocumentDto } from './dto/review-document.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
export declare class DocumentsAdminController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    list(status?: string, type?: string, page?: string, limit?: string): Promise<{
        data: import("./documents.service").DocumentRow[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    approve(user: AuthUser, id: string): Promise<import("./documents.service").DocumentRow>;
    reject(user: AuthUser, id: string, dto: RejectDocumentDto): Promise<import("./documents.service").DocumentRow>;
}
