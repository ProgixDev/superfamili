"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUsersService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let AdminUsersService = class AdminUsersService {
    supabaseService;
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
    }
    async listUsers(page = 1, limit = 20, role, search, isActive) {
        const supabase = this.supabaseService.getServiceClient();
        const offset = (page - 1) * limit;
        let query = supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (role)
            query = query.eq('role', role);
        if (isActive !== undefined)
            query = query.eq('is_active', isActive);
        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        const { data, error, count } = await query;
        if (error) {
            throw new common_1.BadRequestException('Erreur lors de la récupération des utilisateurs');
        }
        return {
            data,
            meta: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        };
    }
    async updateUserStatus(userId, isActive) {
        const supabase = this.supabaseService.getServiceClient();
        const { data, error } = await supabase
            .from('profiles')
            .update({ is_active: isActive })
            .eq('id', userId)
            .select()
            .single();
        if (error) {
            throw new common_1.BadRequestException("Erreur lors de la mise à jour du statut de l'utilisateur");
        }
        return data;
    }
};
exports.AdminUsersService = AdminUsersService;
exports.AdminUsersService = AdminUsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], AdminUsersService);
//# sourceMappingURL=admin-users.service.js.map