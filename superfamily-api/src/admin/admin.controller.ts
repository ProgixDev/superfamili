import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { AdminUsersService } from './admin-users.service';
import { AdminVerificationsService } from './admin-verifications.service';
import { AdminTransactionsService } from './admin-transactions.service';
import { AdminDisputesService } from './admin-disputes.service';
import { SupabaseService } from '../supabase/supabase.service';

@ApiTags('Admin')
@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(
    private readonly usersService: AdminUsersService,
    private readonly verificationsService: AdminVerificationsService,
    private readonly transactionsService: AdminTransactionsService,
    private readonly disputesService: AdminDisputesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Statistiques du tableau de bord' })
  async getDashboardStats() {
    const supabase = this.supabaseService.getServiceClient();

    const [profiles, bookings, payments, educators] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase
        .from('payments')
        .select('amount_cents')
        .eq('status', 'completed'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'educator')
        .eq('is_active', true),
    ]);

    const totalRevenue = (payments.data || []).reduce(
      (sum: number, p: any) => sum + p.amount_cents,
      0,
    );

    return {
      total_users: profiles.count || 0,
      total_bookings: bookings.count || 0,
      total_revenue_cents: totalRevenue,
      active_educators: educators.count || 0,
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Lister les utilisateurs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false })
  async listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
  ) {
    return this.usersService.listUsers(
      page || 1,
      limit || 20,
      role,
      search,
      isActive !== undefined ? isActive === 'true' : undefined,
    );
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activer/suspendre un utilisateur' })
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() body: { is_active: boolean },
  ) {
    return this.usersService.updateUserStatus(userId, body.is_active);
  }

  @Get('verifications/pending')
  @ApiOperation({ summary: 'Lister les vérifications en attente' })
  async listPendingVerifications(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.verificationsService.listPending(page || 1, limit || 20);
  }

  @Patch('verifications/:id')
  @ApiOperation({ summary: 'Approuver ou rejeter une vérification' })
  async updateVerification(
    @CurrentUser() user: AuthUser,
    @Param('id') verificationId: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
  ) {
    if (body.action === 'approve') {
      return this.verificationsService.approve(verificationId, user.profileId!);
    }
    return this.verificationsService.reject(
      verificationId,
      user.profileId!,
      body.reason || 'Non spécifié',
    );
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Lister les transactions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  async listTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.transactionsService.listTransactions(
      page || 1,
      limit || 20,
      status,
      dateFrom,
      dateTo,
    );
  }

  @Get('commissions/summary')
  @ApiOperation({ summary: 'Résumé des commissions' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'year'],
  })
  async getCommissionSummary(@Query('period') period?: string) {
    return this.transactionsService.getCommissionSummary(period);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Lister les litiges' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async listDisputes(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.disputesService.listDisputes(page || 1, limit || 20, status);
  }

  @Patch('disputes/:id/resolve')
  @ApiOperation({ summary: 'Résoudre un litige' })
  async resolveDispute(
    @CurrentUser() user: AuthUser,
    @Param('id') disputeId: string,
    @Body()
    body: { resolution_notes: string; resolution_type: string },
  ) {
    return this.disputesService.resolveDispute(
      disputeId,
      user.profileId!,
      body.resolution_notes,
      body.resolution_type,
    );
  }
}
