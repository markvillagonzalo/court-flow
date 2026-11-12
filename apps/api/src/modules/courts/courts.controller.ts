import { Body, Controller, Delete, Headers, Param, Post } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { AuthService } from '../auth/auth.service';
import { CourtsService } from './courts.service';
import type { CreateCourtRequest } from '@court-flow/contracts';

class CreateCourtDto implements CreateCourtRequest {
  @IsString()
  @Length(1, 32)
  label!: string;
}

@Controller()
export class CourtsController {
  constructor(private readonly courts: CourtsService, private readonly auth: AuthService) {}

  @Post('staff/sessions/:sessionId/courts')
  createCourt(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') header: string | undefined,
    @Body() body: CreateCourtDto,
  ) {
    this.auth.requireStaff(header);
    return this.courts.addCourt(sessionId, body.label);
  }

  @Delete('staff/courts/:courtId')
  archiveCourt(@Param('courtId') courtId: string, @Headers('authorization') header?: string) {
    this.auth.requireStaff(header);
    return this.courts.archiveCourt(courtId);
  }
}
