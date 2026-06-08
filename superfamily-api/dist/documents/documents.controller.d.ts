import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';
export declare class DocumentsController {
    private readonly documentsService;
    constructor(documentsService: DocumentsService);
    upload(user: AuthUser, file: Express.Multer.File, body: UploadDocumentDto): Promise<import("./documents.service").DocumentRow>;
    listMine(user: AuthUser): Promise<import("./documents.service").DocumentRow[]>;
    deleteMine(user: AuthUser, id: string): Promise<void>;
}
