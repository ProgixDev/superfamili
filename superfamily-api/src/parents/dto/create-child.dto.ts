import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateChildDto {
  @ApiProperty({ example: 'Sophie' })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  first_name: string;

  @ApiProperty({
    enum: [
      'infant_0_12m',
      'toddler_1_3y',
      'preschool_3_5y',
      'kindergarten_5_6y',
      'school_6_12y',
      'teen_12_18y',
    ],
  })
  @IsEnum(
    [
      'infant_0_12m',
      'toddler_1_3y',
      'preschool_3_5y',
      'kindergarten_5_6y',
      'school_6_12y',
      'teen_12_18y',
    ],
    { message: "Groupe d'âge invalide" },
  )
  age_group: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Format de date invalide' })
  date_of_birth?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dietary_restrictions?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  special_needs?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  special_needs_description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  medical_conditions?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  preferred_activities?: string[];
}
