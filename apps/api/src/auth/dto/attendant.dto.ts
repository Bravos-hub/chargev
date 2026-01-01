import { IsNotEmpty, IsString } from 'class-validator'

export class AttendantLoginDto {
    @IsString()
    @IsNotEmpty()
    stationCode: string

    @IsString()
    @IsNotEmpty()
    passcode: string
}
