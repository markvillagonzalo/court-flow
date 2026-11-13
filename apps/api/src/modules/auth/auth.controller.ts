import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { timingSafeEqual } from 'node:crypto';
import type { StaffLoginRequest, StaffLoginResponse } from '@court-flow/contracts';
import { AuthService } from './auth.service';

class StaffLoginDto implements StaffLoginRequest {
  @IsString()
  @Matches(/^\d{8,12}$/)
  pin!: string;
}

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('auth/staff')
  staffLogin(@Body() body: StaffLoginDto): StaffLoginResponse {
    const configuredPin = process.env.STAFF_PIN;
    if (!configuredPin) throw new Error('STAFF_PIN must be configured before starting the API');
    const expected = Buffer.from(configuredPin.trim());
    const supplied = Buffer.from(body.pin);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      throw new UnauthorizedException('That staff PIN is not correct');
    }
    return { token: this.auth.issueStaffToken() };
  }
}
