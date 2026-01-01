import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  body!: string

  @IsOptional()
  @IsString()
  channel?: string
}
