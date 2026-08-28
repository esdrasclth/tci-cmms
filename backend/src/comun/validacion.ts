import { applyDecorators } from '@nestjs/common';
import { IsOptional, IsString, Length, ValidateIf } from 'class-validator';

/**
 * Campo de texto opcional que ademas se puede **vaciar**.
 *
 * `@IsOptional()` solo salta la validacion cuando el valor es `undefined` o
 * `null`. Una cadena vacia si se valida, asi que un campo declarado
 * `@IsOptional() @Length(2, 160)` rechaza `''` con "must be longer than or
 * equal to 2 characters" — y eso es justo lo que manda un formulario de
 * edicion cuando alguien borra el contenido de un campo que si puede quedar
 * vacio.
 *
 * El sintoma es desconcertante porque el campo *es* opcional: se puede crear
 * el registro sin el, pero no se puede quitar despues.
 *
 * Aqui la cadena vacia significa "borra este campo" y se deja pasar; el
 * servicio la convierte en `null` antes de guardar. La longitud minima sigue
 * aplicando a cualquier texto que si tenga contenido, que es donde importa: lo
 * que no se quiere es una marca de un solo caracter, no que se pueda borrar.
 *
 * **Solo para campos nulables en el esquema.** En uno obligatorio —el nombre
 * de un equipo, el codigo de un repuesto— la cadena vacia debe seguir
 * rechazandose: ahi vaciar no es una operacion valida.
 */
export function TextoBorrable(minimo: number, maximo: number) {
  return applyDecorators(
    IsOptional(),
    // `ValidateIf` en falso salta TODOS los validadores de la propiedad, que es
    // exactamente lo que hace falta para dejar pasar la cadena vacia.
    ValidateIf((_objeto, valor) => valor !== ''),
    IsString(),
    Length(minimo, maximo),
  );
}
