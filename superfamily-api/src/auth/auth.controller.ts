import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SendVerificationOtpDto } from './dto/send-verification-otp.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { SignupInitDto } from './dto/signup-init.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AllowNoProfile } from '../common/decorators/allow-no-profile.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @AllowNoProfile()
  @ApiOperation({ summary: "Créer un profil pour l'utilisateur authentifié" })
  async signup(@CurrentUser() user: AuthUser, @Body() dto: SignupDto) {
    return this.authService.signup(user.userId, user.email, dto);
  }

  @Get('me')
  @ApiOperation({ summary: "Obtenir le profil de l'utilisateur connecté" })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.userId);
  }

  // ───────────────── Signup init (public) ──────────────────────────────────

  @Public()
  @Post('signup-init')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Créer un compte Supabase non confirmé et envoyer un code de vérification',
  })
  async signupInit(@Body() dto: SignupInitDto) {
    return this.authService.signupInit({
      email: dto.email,
      password: dto.password,
      first_name: dto.first_name,
      last_name: dto.last_name,
    });
  }

  // ───────────────── Signup OTP email verification (public) ─────────────────

  @Public()
  @Post('send-verification-otp')
  @HttpCode(200)
  @ApiOperation({
    summary: "Envoyer un code de vérification à l'adresse courriel",
  })
  async sendVerificationOtp(@Body() dto: SendVerificationOtpDto) {
    return this.authService.sendSignupVerification(dto.email, dto.first_name);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({
    summary: "Vérifier le code et confirmer l'adresse courriel",
  })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  // ───────────────── Password reset (public, forgot-password flow) ──────────

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Demander la réinitialisation du mot de passe' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec un code OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.email,
      dto.code,
      dto.new_password,
    );
  }

  // ───────────────── Email change (authenticated) ───────────────────────────

  @Post('request-email-change')
  @HttpCode(200)
  @ApiOperation({ summary: "Demander le changement d'adresse courriel" })
  async requestEmailChange(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestEmailChangeDto,
  ) {
    return this.authService.requestEmailChange(
      user.userId,
      user.email,
      dto.new_email,
    );
  }

  @Post('confirm-email-change')
  @HttpCode(200)
  @ApiOperation({ summary: "Confirmer le changement d'adresse courriel" })
  async confirmEmailChange(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmEmailChangeDto,
  ) {
    return this.authService.confirmEmailChange(
      user.userId,
      dto.new_email,
      dto.code,
    );
  }
}
