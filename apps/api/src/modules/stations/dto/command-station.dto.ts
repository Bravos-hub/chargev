import { IsNotEmpty, IsString } from 'class-validator'

export class CommandStationDto {
  @IsString()
  @IsNotEmpty()
  command!: string
}
