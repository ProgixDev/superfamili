"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const supabase_service_1 = require("../supabase/supabase.service");
let OtpService = class OtpService {
    static { OtpService_1 = this; }
    supabaseService;
    logger = new common_1.Logger(OtpService_1.name);
    static EXPIRY_MINUTES = 10;
    static MAX_ATTEMPTS = 5;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async issue(params) {
        const supabase = this.supabaseService.getServiceClient();
        const code = this.generateCode();
        const codeHash = this.hash(code);
        const expiresAt = new Date(Date.now() + OtpService_1.EXPIRY_MINUTES * 60 * 1000);
        await supabase
            .from('email_otps')
            .update({ consumed_at: new Date().toISOString() })
            .eq('email', params.email.toLowerCase())
            .eq('purpose', params.purpose)
            .is('consumed_at', null);
        const { error } = await supabase.from('email_otps').insert({
            email: params.email.toLowerCase(),
            purpose: params.purpose,
            user_id: params.userId ?? null,
            code_hash: codeHash,
            expires_at: expiresAt.toISOString(),
            metadata: params.metadata ?? {},
        });
        if (error) {
            this.logger.error(`Failed to insert OTP row (purpose=${params.purpose}): ${error.message}`);
            throw new common_1.InternalServerErrorException("Impossible d'émettre le code pour le moment");
        }
        return { code, expiresInMinutes: OtpService_1.EXPIRY_MINUTES };
    }
    async verify(params) {
        const supabase = this.supabaseService.getServiceClient();
        const { data: row, error } = await supabase
            .from('email_otps')
            .select('id, user_id, email, code_hash, expires_at, attempts, consumed_at, metadata')
            .eq('email', params.email.toLowerCase())
            .eq('purpose', params.purpose)
            .is('consumed_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) {
            this.logger.error(`OTP lookup failed: ${error.message}`);
            throw new common_1.InternalServerErrorException('Impossible de vérifier le code pour le moment');
        }
        if (!row) {
            throw new common_1.BadRequestException('Code invalide ou expiré');
        }
        const now = new Date();
        if (new Date(row.expires_at) < now) {
            throw new common_1.BadRequestException('Code invalide ou expiré');
        }
        if (row.attempts >= OtpService_1.MAX_ATTEMPTS) {
            await supabase
                .from('email_otps')
                .update({ consumed_at: now.toISOString() })
                .eq('id', row.id);
            throw new common_1.BadRequestException('Trop de tentatives. Demandez un nouveau code.');
        }
        if (!this.constantTimeEqual(this.hash(params.code), row.code_hash)) {
            await supabase
                .from('email_otps')
                .update({ attempts: row.attempts + 1 })
                .eq('id', row.id);
            throw new common_1.BadRequestException('Code invalide ou expiré');
        }
        const { error: consumeErr } = await supabase
            .from('email_otps')
            .update({ consumed_at: now.toISOString() })
            .eq('id', row.id);
        if (consumeErr) {
            this.logger.error(`Failed to mark OTP consumed: ${consumeErr.message}`);
            throw new common_1.InternalServerErrorException('Impossible de valider le code pour le moment');
        }
        return {
            id: row.id,
            userId: row.user_id,
            email: row.email,
            metadata: (row.metadata || {}),
        };
    }
    generateCode() {
        const n = crypto.randomInt(0, 1_000_000);
        return n.toString().padStart(6, '0');
    }
    hash(code) {
        return crypto.createHash('sha256').update(code).digest('hex');
    }
    constantTimeEqual(a, b) {
        if (a.length !== b.length)
            return false;
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], OtpService);
//# sourceMappingURL=otp.service.js.map