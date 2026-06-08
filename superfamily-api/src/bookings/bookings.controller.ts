import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles('parent')
  @ApiOperation({ summary: 'Créer une réservation' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.profileId!, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister mes réservations' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.findAll(
      user.profileId!,
      user.role,
      page || 1,
      limit || 20,
      status,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: "Obtenir les détails d'une réservation" })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bookingsService.findOne(id, user.profileId!);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une réservation' })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingsService.cancel(id, user.profileId!, dto);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Marquer une réservation comme complétée' })
  async complete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bookingsService.complete(id, user.profileId!);
  }
}
