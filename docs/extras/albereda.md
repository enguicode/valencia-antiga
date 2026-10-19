# Albereda i Pla del Real

Paseo de álamos en la orilla norte del Turia, delante del Palau del Real, y la plaza que lo arranca. Hacia 1700 ya estaba hecho. Las torres, la ermita y la columna son posteriores y no están.

## Qué es, y en qué estado hacia 1700

La Albereda era el acceso al Palau del Real desde la mar. Se abrió en 1677, al acabar los pretiles de la margen izquierda (hacia 1674), sobre el prado que también se llamaba Prat de València. Ese año se formó delante de la fachada del palacio una plaza ovalada, el Llano del Real, usada para festejos y corridas. Hacia 1692 el paseo ya era público y solo llegaba hasta el Pont de la Mar: la Fàbrica de Murs i Valls lo replantó y puso bolas y bancos de piedra en la plaza, como entrada formal.

El doble salón —dos calles para los coches y un paseo central— y las medidas de 825 m y de dos calles de 15 m son de la replantación de 1714 (intendente Rodrigo Caballero, Lorenzo Llop). El grabado de Fortea (1738) dibuja cuatro hileras. El Museu d'Història de València dice que en 1677 fueron tres. Aquí hay cuatro, que es el doble salón; la cuarta hilera es la dudosa.

No van, porque son posteriores a 1700:

- Torretes dels Guardes (sant Felip y sant Jaume), 1714.
- Ermita de la Soledad, de la misma obra.
- La columna del óvalo, de 1716 (Felipe V).

## Dónde está en la escena

Origen de la escena: Torres dels Serrans, lat 39.479273, lon −0.376003. X al este, Z al sur.

El modelo no usa la coordenada suelta de la Wikipedia. Va encajado con el río, el palacio y los dos puentes de `data/layout.json`: palacio en (725.9, 128.2), Pont del Real en (617.5, 324), Pont de la Mar en (1059.4, 1002.8).

| | x, z | lat, lon |
| --- | --- | --- |
| Punto medio del paseo (origen del modelo) | 940.4, 618.5 | 39.47372, −0.36506 |
| Arranque de las hileras, pasada la cabeza norte del Pont del Real | 712.5, 269.7 | 39.47685, −0.36771 |
| Final de las hileras, antes de la cabeza norte del Pont de la Mar | 1154.8, 952.4 | 39.47072, −0.36256 |
| Centro del Pla del Real | 671.7, 172.9 | 39.47772, −0.36819 |

El eje del modelo en el punto medio es (0.539, 0.843), aguas abajo. El paseo sigue la curva del río, no una recta: la primera hilera queda a unos 12 m por dentro del pretil (lateral −88 m) y la última a unos 53 m (lateral −128 m). No entra en el agua, ni en los tableros, ni en la fachada del palacio. El Llano está en el marco del palacio, delante de la fachada (+Z, hacia el río), entre la galería y el pretil, al oeste del desembarco del Pont del Real. Los jardines del palacio (norte, oeste y este) no son de este modelo.

El punto 39.47419, −0.36464 que da la ficha cae en este mismo tramo. El desvío de unas decenas de metros es el de la escena respecto de OpenStreetMap.

## Cómo está hecho

- Cuatro hileras de álamo blanco. Tronco claro y copa ovalada, de unos 9 a 11 m, que es altura de árbol joven a los veinte o treinta años de la plantación de 1677. Estimado.
- Calles de 14 m, 12 m y 14 m entre hileras. Los 15 m son de 1714; estos huecos son una estimación para el paseo anterior. La separación a lo largo de la hilera es de 12 m, también estimada: no hay un intereje documentado, y más juntos no cabían en el cupo de piezas.
- Unos 800 m de hileras, de un poco más abajo del Pont del Real a un poco antes del Pont de la Mar. Los 825 m son la cifra de 1714.
- Pla del Real: óvalo de bolas de piedra sobre peana (92 × 68 m) y bancos en la mitad que mira al río. El suelo pisado es un rectángulo inscrito en ese óvalo, porque las piezas no tienen una losa oval. Tierra apisonada, no un enlosado que nadie dibujó. El tamaño de bolas y bancos es estimado.
- Dos bolas más grandes en la boca de las hileras, por la entrada formal de 1692, sin la columna de 1716.

## Fuentes

- [Alameda de Valencia](https://es.wikipedia.org/wiki/Alameda_de_Valencia) (consultada en octubre de 2026): 1677, plaza ovalada, bolas y bancos hacia 1692, límite en el Pont de la Mar, y la reforma de 1714 (825 m, dos calles de 15 m, torres y ermita).
- [Albereda de València](https://ca.wikipedia.org/wiki/Albereda_de_Val%C3%A8ncia): el mismo relato y las torretes de 1714.
- [Infociudad, La Alameda](https://www.valencia.es/-/infociudad-la-alameda): acceso desde la mar, dos salones, torres de 1714.
- [Museu d'Història de València, L'Albereda](https://mhv.valencia.es/va/l-albereda): tres hileras de álamos en 1677.
- [Del prado de palacio a la Alameda](https://www.levante-emv.com/valencia/2007/11/04/prado-palacio-alameda-13516572.html) (*Levante-EMV*, 4 de noviembre de 2007): el óvalo como enlace entre el palacio y el arbolado, y las columnas de 1716.
- Grabado de Josep Fortea (1738) del plano de Tosca, lámina en el repositorio de trabajo (`assets-test/tosca/`). Norte hacia abajo. Se ven el Llano abierto delante del palacio, el óvalo plantado con columna al arranque del paseo, cuatro hileras hasta el Pont de la Mar, la ermita y las dos torres. Esas tres últimas cosas no se han modelado.

## Qué está inventado o estimado

- Que en 1700 hubiera ya cuatro hileras y no tres. Tres es lo que dice el museo para 1677; cuatro es lo que dibuja Fortea en 1738 y lo que pide el doble salón.
- Los 14 m y 12 m entre hileras, y los 12 m entre árboles. Los 15 m son de 1714.
- A qué distancia del pretil empieza la primera hilera (unos 12 m) y la altura y la copa de los álamos.
- El tamaño del óvalo, el número de bolas y de bancos, y que el suelo sea un rectángulo de tierra dentro del óvalo.
- La acequia de Mestalla (brazo de los Molinos), que las fichas ponen por dentro del paseo, no está: no hay un trazado seguro para 1700 en este tramo.
- Las copas salen con el color de hoja sobre la textura de sillería compartida. No hay una textura de follaje para estos extras.
