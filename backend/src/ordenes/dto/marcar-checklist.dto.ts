import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/** Marcado de una comprobacion de la lista de una orden. */
export class MarcarChecklistDto {
  @IsBoolean()
  hecho!: boolean;

  /** Observacion de quien la marca: "se cambio el fusible". */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  nota?: string;
}
