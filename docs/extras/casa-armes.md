# Casa de les Armes i duana vella

Placeta cerrada delante del Portal de la Mar, hacia 1700: la Casa de les Armes a la derecha según se entra, la aduana vieja a la izquierda, y un segundo portal, con la imagen de la Mare de Déu de la Bona Guia, antes de la puerta de la ciudad. Es el origen de la Ciutadella. La ciudadela con baluartes es de después de 1707 y no está modelada.

## Fecha y estado hacia 1700

La Casa de Armas ya estaba junto a la puerta mucho antes de 1574, cuando se rehizo el lienzo (el baluarte de la Torre de l’Esperó). La Fàbrica de Murs i Valls la restauró en 1643. El plano de Tosca (1704) y el grabado de 1738 dibujan, intramuros y al norte de la puerta, un recinto largo con patio y una torre redonda almenada en el extremo norte, y un muro grueso hacia el río.

Extramuros, en la franja de tierra entre la muralla y el río, la placeta, la aduana y el portal de la imagen. Las administraciones borbónicas derribaron la aduana y ese portal después de 1707; el año exacto no consta. La Aduana Real (1758–1802, hoy Palacio de Justicia) es otro edificio y no va aquí. La parroquia de la Buena Guía del Cabanyal es del siglo XX.

## Dónde está en la escena

El origen del modelo es el centro del patio, en el suelo. El eje local +X corre hacia el norte a lo largo de la cortina, desde el Portal de la Mar.

| Pieza | x (este) | z (sur) | lat | lon |
| --- | ---: | ---: | ---: | ---: |
| Patio (origen) | 785,9 | 779,8 | 39,472268 | −0,366856 |
| Placeta | 824,7 | 817,3 | 39,471931 | −0,366405 |
| Aduana vieja | 817,5 | 825,9 | 39,471854 | −0,366489 |
| Cuerpo exterior de la Casa de Armas | 826,0 | 808,4 | 39,472011 | −0,366390 |
| Portal de la Bona Guia | 832,4 | 821,0 | 39,471898 | −0,366315 |

El Portal de la Mar de la escena está en el vértice 4 de la muralla (808,9, 808,8; 39,472007, −0,366589). El portal exterior cae sobre el camino de tierra que el Pont de la Mar (1059,4, 1002,8) dibuja hasta esa puerta: la calzada llega a la muralla por la normal exterior del lienzo, no por el eje del puente. Sant Doménec (602, 564) queda a unos 280 m. El patio y la torre están intramuros, sin cruzar el lienzo. La aduana, la placeta y el portal están fuera, en tierra: el portal queda a unos 19 m por dentro del pretil (la lateral al eje del río es 94 m y el pretil está a 75).

`length` 46 m, `width` 38 m, eje `[-0,2015, -0,9795]`. Hay cinco claros para que las casas de relleno no entren en el patio, la placeta, la aduana, el cuerpo exterior ni el portal.

## Qué se ha construido

- Sala de armas intramuros, 40 × 11,5 m, muro de 10,5 m y cubierta a dos aguas. El cuerpo del este, contra la cortina y a 2 m de su cara interior, sube a 11,5 m: las ventanas altas asoman sobre el lienzo de 10 m.
- Torre del extremo norte, 13 m de diámetro y 14 m hasta el adarve, con almenas. El kit no tiene cilindro; es un octógono.
- Cuerpo exterior rectangular, terraza plana a 9 m, con cuatro cañones. No es un baluarte.
- Aduana de dos plantas (piedra abajo, encalado arriba) y tejado de teja, 13 × 10,5 m.
- Placeta empedrada entre las dos, cerrada hacia el río por el portal (18 m de frente, 12,6 m hasta el parapeto, arco de 5,4 × 9 m) y por dos alas bajas a los lados de la calzada, que mide 8,35 m.

## Fuentes

- [Ciudadela de Valencia](https://es.wikipedia.org/wiki/Ciudadela_de_Valencia) y [Ciutadella de València](https://ca.wikipedia.org/wiki/Ciutadella_de_Val%C3%A8ncia): casa de armas, restauración de 1643, aduana a la izquierda y casa de armas a la derecha, portal de la imagen, derribo después de 1707.
- [Plaza de la Puerta del Mar](https://es.wikipedia.org/wiki/Plaza_de_la_Puerta_del_Mar_(Valencia)): la puerta y la plaza.
- Plano de Tosca, fotografía del original de 1704 y grabado de 1738 (norte hacia abajo), publicados en [puentesvalencia.com](https://puentesvalencia.com/plano-cartografico-valencia-en-1704-del-padre-tosca/). El grabado da el patio largo y la torre redonda; en las notas del proyecto el radio de 6,5 m y los 14 m de altura están leídos de esa lámina (`docs/sources.md`).
- Des Essarts (siglo XVII): dos salas de 80 por 20 pasos. Tomado el paso francés a 0,65 m, unos 52 × 13 m.
- Gauna, 1599: plaza ancha, salas de armas, polvorín abovedado y plataforma con más de veinticinco piezas de bronce.

## Inventado o estimado

- La sala se acorta a 40 × 11,5 m para caber en el tramo recto de cortina (57 m hasta el vértice siguiente, donde el muro tuerce) y no montar el lienzo.
- Medidas y fachadas lisas de la aduana, la placeta, las alas y el portal: no hay plano acotado. El arco se ha abierto a 5,4 m para que se lea sobre la calzada de 8,35 m.
- La torre es un octógono en lugar de un cilindro. El diámetro y la altura salen de la lectura del grabado, no de un levantamiento.
- Cuatro cajas oscuras sustituyen la batería de Gauna. Un bloque de alabastro sustituye la imagen, en la cara exterior del portal.
- Se deja fuera el revellín en punta de flecha de 1574 (entraría en el río) y el baluarte de flor de lis de 1707 hacia la huerta de Sant Doménec.
- La nave y la torre redonda que `src/walls.js` dibujaba antes junto a esta puerta se han quitado: este modelo las sustituye.
- En el vértice 3 de la muralla la escena pone su torreon redondo genérico (diámetro 4,2 m). Queda a unos 3 m de la torre de la Casa de Armas, sin cruzarla.

## Dudas

- La planta exacta de la aduana y del portal exterior no está medida; solo el emplazamiento relativo (izquierda / derecha, fuera de la puerta) y la masa del recinto en Tosca.
- El paso de Des Essarts se ha tomado a 0,65 m, y aun así la sala no usa ese largo.
- No consta en qué cara del portal iba la imagen; aquí está en la cara de río.
- El año del derribo borbónico, pasado 1707, no consta.

## Revisión del 19 de octubre de 2026

- Quitado el «cuerpo exterior con cuatro cañones»: ninguna fuente le da esa forma y, con la aduana y el portal, tapaba el Portal de la Mar desde fuera.
- El portal de la Bona Guia se rebaja a un muro de 12 × 6,5 m con un arco y la hornacina de la imagen encima, sin almenas. Su tamaño real no consta; se deja bajo para que la puerta de la ciudad se siga viendo detrás.
- Las alas que cierran la placeta pasan a tapias de 3,2 m, seguidas desde la torre de la puerta hasta el portal, y el portal se ensancha a 16,6 m para tocarlas: la placeta queda cerrada, como dicen las fuentes, sin huecos a los lados.
- La torre redonda sube de 14 a 19 m hasta el adarve, con una corona volada. Los 14 m leídos del grabado la dejaban a la altura de los tejados de las salas; la nueva altura es una estimación.
