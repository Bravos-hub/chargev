import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class CreatePaymentIntentDto {
  @IsNumber()
  @Type(() => Number)
  amount!: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  provider?: string
}
