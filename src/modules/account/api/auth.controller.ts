import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { ApiResponse, ok } from '../../../shared/api/envelope';
import { RegisterUserUseCase } from '../application/register-user.use-case';
import { RegisterRequest } from './register.request';
import { UserResponse, toUserResponse } from './user.response';

const REGISTER_EXAMPLES = {
  A_success: {
    summary: 'A. Valid registration -> 201, role customer',
    value: {
      email: 'Lan@Example.com',
      password: 'correct-horse-battery',
      first_name: 'Lan',
      last_name: 'Nguyen',
    },
  },
  B_role_ignored: {
    summary: 'B. role in the payload is ignored (R3) -> still customer',
    value: {
      email: 'mallory@example.com',
      password: 'correct-horse-battery',
      first_name: 'Mallory',
      last_name: 'X',
      role: 'admin',
    },
  },
  C_short_password: {
    summary: 'C. 7-character password -> 422 on password, no SQL',
    value: {
      email: 'short@example.com',
      password: '1234567',
      first_name: 'Short',
      last_name: 'Pass',
    },
  },
};

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly registerUserUseCase: RegisterUserUseCase) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a customer account' })
  @ApiBody({ type: RegisterRequest, examples: REGISTER_EXAMPLES })
  @SwaggerResponse({ status: 201, type: UserResponse })
  @SwaggerResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() body: RegisterRequest,
  ): Promise<ApiResponse<UserResponse>> {
    const user = await this.registerUserUseCase.execute({
      email: body.email,
      password: body.password,
      firstName: body.first_name,
      lastName: body.last_name,
    });
    return ok(toUserResponse(user));
  }
}
