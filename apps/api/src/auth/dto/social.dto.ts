import { IsNotEmpty, IsString } from 'class-validator'

export class SocialLoginDto {
    @IsString()
    @IsNotEmpty()
    token: string
}
