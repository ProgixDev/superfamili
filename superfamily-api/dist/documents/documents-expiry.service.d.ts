import { DocumentsService } from './documents.service';
export declare class DocumentsExpiryService {
    private readonly documentsService;
    private readonly logger;
    constructor(documentsService: DocumentsService);
    handleExpirySweep(): Promise<void>;
    private label;
}
