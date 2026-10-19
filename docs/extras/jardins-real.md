# Jardins del Real

Huerta y jardines del Palau del Real, en la orilla norte del Turia. El origen es la almunia de la taifa del siglo XI. En 1560 Felipe II ordenó que el huerto sirviera de almáciga de naranjos y limoneros para Aranjuez. El nombre posterior, Viveros, sale de la horta del Viver: una laguna o alberca que regaba los cuadros. El palacio se derribó en 1810. Los montículos del parque son escombros amontonados por Elío en 1814. El terreno pasó al Ayuntamiento en 1869 y el parque municipal es de 1903. El modelo es el huerto real cercado de hacia 1700, no ese parque.

## Hacia 1700

El plano de Tosca (1704) y el grabado de Fortea (1738) cortan el palacio por el borde de la lámina, con el norte hacia abajo. Al oeste del palacio se leen dos bandas de parterres de broderie y una alberca redonda. Al este, una retícula de cuadros plantados. El norte se sale de la hoja. Arciniega sitúa los jardines al norte y al oeste, y el huerto del Real Vell al este. La fachada mira al sur, al río: delante queda el Llano del Real, y a continuación la Albereda (1677). Ese frente no forma parte de este modelo.

Henri Pérès, citado en la Viquipèdia, describe un jardín grande de frutales y flores, con agua que lo atraviesa y el palacio en medio. La acequia de Mestalla tenía un brazo (el de los Molinos) que nacía en estos jardines, pegado al río, y seguía hacia el mar por dentro de la Albereda. Aquí solo se dibuja el tramo que riega la huerta, al norte del palacio. El tramo que baja al río cruza el Llano y lo deja el modelo de la Albereda.

No se ponen la casa de fieras del siglo XV (no consta que siguiera en 1700), la ópera en los jardines (1721–1737), las muntanyetes de 1814 ni nada del parque de 1903.

## Ubicación en la escena

El marco es el del `palau-real`, para que los cuadros casen con las tapias que ese modelo ya dibuja (norte en z = −100, oeste en x = −90, este en x = 50). `alignToRiver` hace que el eje sea la tangente del río en ese punto. El `axis` guardado, `[0.699, 0.715]`, es la tangente con la que se calcularon los `clearings`.

| | lat | lon | x | z |
| --- | --- | --- | --- | --- |
| Centro del palacio (origen del modelo) | 39.47812 | −0.36755 | 725.9 | 128.2 |
| Centro de la huerta, local (−45, −79) | 39.47891 | −0.36726 | 750.9 | 40.8 |

El recinto, en metros del palacio (+X río abajo, +Z hacia el río): x de −228 a 138 (366 m) y z de −168 a 10 en el oeste (178 m hacia el interior). En el este la tapia sur está en z = −30, para no bajar del Real Vell hacia el Llano. El rectángulo que lo contiene mide unos 6,5 ha. El palacio ocupa el frente sur y el suelo plantado es menor. El parque actual (171 369 m², centro 39.48056, −0.36821) añade por el norte una mitad municipal: el borde norte de este modelo (latitud ≈ 39.48064) cae cerca de ese centro moderno.

La tapia oeste queda a unos 60 m al este del centro de Sant Pius V y mucho antes de la Trinitat. No toca el río, el Pont del Real ni el Llano.

## Qué se ha modelado

Tapia de unos 2,35 m. Al oeste, ocho cuadros de 26 × 26 m en dos bandas, con seto bajo, crucero de paseos y alberca octogonal (el plano la dibuja redonda; el juego de piezas no tiene un disco plano). Al este y en el patio de detrás del palacio, bancales y filas de naranjos pequeños. Al norte, la almáciga, la alberca del Viver (32 × 18 m) y la acequia que la alimenta. Cipreses en el borde sur, para que el huerto se lea desde la barca: el pretil tapa, a esa distancia, lo que no pasa de unos 6 m. Una puerta con dos pilares en la tapia sur oeste, del lado del paseo y no sobre el Llano.

## Estimado o inventado

- Cada medida de cuadro, paseo, seto y tapia. La lectura del grabado es a ojo, tomando la fachada del palacio en la escena (unos 110 m) como escala.
- El límite norte: la lámina se corta y no da el fondo de la huerta.
- El sitio de la alberca del Viver, al norte de la tapia norte del palacio, para que la acequia no cruce el Llano. El trazado histórico hasta el río no se dibuja.
- La puerta, su sitio y los pilares.
- La especie de los árboles del borde: el plano los planta, y aquí son cipreses. Los del sur miden 12,5 m para asomar sobre el pretil desde la barca; no es una altura documentada.
- La alberca redonda hecha octógono, y la taza del centro.
- La broderie reducida a cuadros de tierra y seto.
- Naranjos y limoneros con el mismo árbol.
- La altura de la tapia (2,35 m).

## Fuentes

- [Jardines del Real](https://es.wikipedia.org/wiki/Jardines_del_Real) (es). Almunia, almáciga de 1560, horta del Viver, derribo, Elío, parque de 1903 (171 369 m²).
- [Jardins del Real](https://ca.wikipedia.org/wiki/Jardins_del_Real) (ca). La descripción de Pérès.
- [Palacio del Real de Valencia](https://es.wikipedia.org/wiki/Palacio_del_Real_de_Valencia) (es).
- Luis Arciniega, los jardines al norte y al oeste: los dos artículos citados en `docs/sources.md` ([Austrias](https://www.uv.es/arcinieg/pdfs/palacio_del_real_valencia_austrias.pdf), [Borbones](https://www.uv.es/arcinieg/pdfs/palacio_del_real_valencia_borbones.pdf)).
- [Acequia de Mestalla](https://es.wikipedia.org/wiki/Acequia_de_Mestalla). Brazo de los Molinos.
- Plano del padre Tosca (1704) y grabado de Fortea (1738), leídos en las copias del proyecto (`assets-test/tosca/`). Norte hacia abajo. Parterres al oeste, cuadros al este, palacio cortado por el marco.

Comprobado en la escena con las capturas `v3` (n, e, s, w, top, river), sin errores de página.
