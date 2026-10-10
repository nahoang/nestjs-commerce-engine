import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiResponse, ok } from '../../../shared/api/envelope';
import { AuthenticateUserUseCase } from '../application/authenticate-user.use-case';
import { ChangePasswordUseCase } from '../application/change-password.use-case';
import { RegisterUserUseCase } from '../application/register-user.use-case';
import { User } from '../domain/user.entity';
import { Public } from './auth-metadata';
import { ChangePasswordRequest, LoginRequest } from './auth.requests';
import { CurrentUser } from './current-user.decorator';
import { RegisterRequest } from './register.request';
import { TokenResponse, toTokenResponse } from './token.response';
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

const LOGIN_EXAMPLES = {
  A_success: {
    summary: 'A. Registered user (Example A of register) -> 200 + token',
    value: { email: 'lan@example.com', password: 'correct-horse-battery' },
  },
  B_wrong_password: {
    summary: 'B. Wrong password -> 401 UNAUTHENTICATED',
    value: { email: 'lan@example.com', password: 'not-the-password' },
  },
  C_unknown_email: {
    summary: 'C. Unknown email -> the same 401 as B',
    value: { email: 'nobody@example.com', password: 'whatever-it-is' },
  },
};

const CHANGE_PASSWORD_EXAMPLES = {
  A_success: {
    summary: 'A. Correct current password -> 200 + a NEW token',
    value: {
      current_password: 'correct-horse-battery',
      new_password: 'a-brand-new-passphrase',
    },
  },
  B_wrong_current: {
    summary: 'B. Wrong current password -> 401',
    value: {
      current_password: 'not-the-password',
      new_password: 'a-brand-new-passphrase',
    },
  },
};

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly authenticateUserUseCase: AuthenticateUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  @Public()
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

  // R6: the throttler guard is attached to this route only
  @Public()
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password (JSON body)' })
  @ApiBody({ type: LoginRequest, examples: LOGIN_EXAMPLES })
  @SwaggerResponse({ status: 200, type: TokenResponse })
  @SwaggerResponse({ status: 401, description: 'Wrong email or password' })
  @SwaggerResponse({ status: 429, description: 'Too many attempts' })
  async login(@Body() body: LoginRequest): Promise<ApiResponse<TokenResponse>> {
    const token = await this.authenticateUserUseCase.execute({
      email: body.email,
      password: body.password,
    });
    return ok(toTokenResponse(token));
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'The authenticated user' })
  @SwaggerResponse({ status: 200, type: UserResponse })
  @SwaggerResponse({
    status: 401,
    description: 'Missing, invalid or revoked token',
  })
  me(@CurrentUser() user: User): ApiResponse<UserResponse> {
    return ok(toUserResponse(user));
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password; revokes every older token and returns a new one',
  })
  @ApiBody({
    type: ChangePasswordRequest,
    examples: CHANGE_PASSWORD_EXAMPLES,
  })
  @SwaggerResponse({ status: 200, type: TokenResponse })
  @SwaggerResponse({ status: 401, description: 'Wrong current password' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() body: ChangePasswordRequest,
  ): Promise<ApiResponse<TokenResponse>> {
    const token = await this.changePasswordUseCase.execute({
      user,
      currentPassword: body.current_password,
      newPassword: body.new_password,
    });
    return ok(toTokenResponse(token));
  }
}
