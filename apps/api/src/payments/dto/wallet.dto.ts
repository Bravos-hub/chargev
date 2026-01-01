import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator'

export class TopUpWalletDto {
    @IsNumber()
    @Min(1)
    amount: number

    @IsString()
    @IsNotEmpty()
    currency: string

    @IsString()
    source: string // 'card', 'bank', 'mobile_money'
}
