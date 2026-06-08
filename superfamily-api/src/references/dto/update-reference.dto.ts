import { PartialType } from '@nestjs/swagger';
import { CreateReferenceDto } from './create-reference.dto';

/**
 * `PATCH` body for updating an unverified reference. All fields are
 * optional — the service only updates what's provided. Validation rules
 * from `CreateReferenceDto` still apply to any field that IS sent.
 */
export class UpdateReferenceDto extends PartialType(CreateReferenceDto) {}
