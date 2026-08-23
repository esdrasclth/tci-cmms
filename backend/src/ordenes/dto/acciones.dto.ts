import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/** TCI-28 — asignar / reasignar. */
export class AsignarOrdenDto {
  @IsString()
  @IsNotEmpty()
  tecnicoId!: string;
}

/** Acciones que exigen motivo: pausar, cancelar, reabrir (TCI-78 regla 5). */
export class MotivoDto {
  @IsString()
  @MinLength(3)
  motivo!: string;
}

/** Acciones sin motivo obligatorio: iniciar, reanudar, desasignar. */
export class ComentarioOpcionalDto {
  @IsOptional()
  @IsString()
  comentario?: string;
}

/** TCI-27 — cierre de la orden. */
export class CompletarOrdenDto {
  @IsString()
  @MinLength(10)
  trabajoRealizado!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999)
  horasTrabajadas?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoManoObra?: number;
}
