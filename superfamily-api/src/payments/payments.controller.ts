import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  RawBody,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PayoutsService } from './payouts.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly payoutsService: PayoutsService,
  ) {}

  @Post('create-intent')
  @Roles('parent')
  @ApiOperation({ summary: 'Créer un PaymentIntent Stripe' })
  async createPaymentIntent(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(
      dto.booking_id,
      user.profileId!,
    );
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Webhook Stripe' })
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(rawBody, signature);
  }

  @Post('stripe/connect-account')
  @Roles('educator')
  @ApiOperation({ summary: 'Créer un compte Stripe Connect' })
  async createConnectAccount(@CurrentUser() user: AuthUser) {
    return this.paymentsService.createConnectAccount(user.profileId!);
  }

  @Get('stripe/connect-status')
  @Roles('educator')
  @ApiOperation({ summary: 'Vérifier le statut Stripe Connect' })
  async getConnectStatus(@CurrentUser() user: AuthUser) {
    return this.paymentsService.getConnectStatus(user.profileId!);
  }

  @Get('payouts')
  @Roles('educator')
  @ApiOperation({ summary: 'Lister mes paiements reçus' })
  async getPayouts(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.payoutsService.getEducatorPayouts(
      user.profileId!,
      page || 1,
      limit || 20,
    );
  }

  @Get('annual-report/:year')
  @Roles('educator')
  @ApiOperation({ summary: "Rapport annuel de revenus pour l'educateur" })
  async getAnnualReport(
    @CurrentUser() user: AuthUser,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.payoutsService.getAnnualReport(user.profileId!, year);
  }
}
