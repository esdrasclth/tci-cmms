import { ArrayMaxSize, IsArray, IsString, Length } from 'class-validator';

/**
 * La lista completa de comprobaciones de un tipo, en el orden en que van.
 *
 * Se manda entera y no item a item: la pantalla es una lista que se reordena y
 * se edita en bloque, y separarla en altas, bajas y movimientos obligaria a
 * reconciliar dos ordenes distintos por nada.
 */
export class GuardarChecklistDto {
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @Length(2, 200, { each: true })
  items!: string[];
}
