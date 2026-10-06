# Fuentes y grado de fiabilidad

Cada dato de la escena lleva aquí su origen y lo fiable que es. Lo que no tenga fuente contrastada se marca como tal.

## Trazado (v0.2)

Generado por `scripts/build-layout.py` a partir de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL) y guardado en `data/layout.json`.

| Elemento | De dónde sale | Fiabilidad |
| --- | --- | --- |
| Curso del río | Línea que une el centro de los puentes actuales sobre el viejo cauce | Aproximado: el cauce es el mismo, pero la línea es suavizada y el ancho del agua (96 m) es constante e inventado |
| Perímetro de la muralla | Calles de ronda que la sustituyeron tras el derribo de 1865: Guillem de Castro, Xàtiva, Colón, Blanqueria, Comte de Trénor, Pintor López y Passeig de la Ciutadella | Aproximado: la ronda sigue la muralla, pero el contorno se ha suavizado y los tramos sin calle se han interpolado |
| Torres de la muralla | Una cada 70 m sobre el perímetro | Inventado: ni el número ni la posición son los reales |
| Portal dels Serrans y Portal de Quart | Posición en OpenStreetMap de las torres que siguen en pie | Fiable en posición; la forma es esquemática |
| Portal Nou, de la Trinitat, del Real y de la Mar | Punto de la muralla más cercano al puente correspondiente | Aproximado |
| Puentes de Sant Josep, Serrans, Trinitat, Real y del Mar | Posición en OpenStreetMap | Fiable en posición; en la escena cruzan el río en perpendicular y todos miden lo mismo |
| Número de arcos de cada puente | Serrans (9) y Mar (10), contrastados con Wikipedia; Sant Josep (13), Trinitat (10) y Real (10), de memoria | Dos contrastados, tres sin contrastar |
| Casas | Repartidas al azar dentro de la muralla | Inventado: no hay callejero |

## Edificios y ribera (v0.3)

| Elemento | De dónde sale | Fiabilidad |
| --- | --- | --- |
| Posición de Micalet, Seu, Lonja, Palacio del Real, monasterio de la Trinitat, Sant Doménec y las iglesias | Edificio o yacimiento actual en OpenStreetMap | Fiable en posición |
| Forma de todos ellos | Maqueta esquemática hecha a ojo: torre octogonal de 51 m para el Micalet, nave con cimborrio para la Seu, sala con torre para la Lonja, bloque con cuatro torres para el Palacio del Real | Orientativa: proporciones de memoria, sin plano ni alzado |
| Orientación | Eje largo de la planta actual; la Seu, fijada de este a oeste; Palacio del Real, Sant Pius V y la Saïdia, paralelos al río | Aproximada |
| Qué iglesias existían hacia 1700 | Selección de memoria entre las iglesias actuales del centro (Santa Caterina, Sants Joans, Sant Nicolau, Sant Martí, Sant Esteve, Sant Llorenç, el Salvador, Sant Joan de l'Hospital, Sant Andreu, Sant Agustí, el Carme, la Companyia, Corpus Christi, Santa Mònica, Desemparats) | Sin contrastar; varias se han reformado o reconstruido después |
| Sant Pius V | Posición del actual Museu de Belles Arts | Dudoso para 1700: el colegio se empezó en 1683 y se terminó en el XVIII |
| Monasterio de la Saïdia | Posición de las ruinas del Portal de Saïdia | Aproximada; el edificio es genérico |
| Portal de Sant Vicent | Punto donde la actual calle de Sant Vicent Màrtir corta la ronda | Aproximado; la forma es inventada, igual que la del Portal de la Mar |
| Pretiles con bolas | A lo largo de las dos orillas, a 56 m del eje del río | Existieron, pero aquí son continuos y uniformes; en 1700 la obra no estaba completa |
| Escaleras al río | Una junto a cada puente, en el lado de la ciudad | Inventado: posición y forma |
| Azud | Cierra el extremo de aguas arriba del tramo navegable | Inventado: no corresponde a ningún azud real |
| Colores (cúpula azul, tejados) | Orientativos | Inventado |

## Fichas de historia (v0.4)

Los textos están en `data/points.json`; cada ficha enlaza su fuente. Cada ficha sale al entrar con la barca en el aro dorado que flota en el río junto a su sitio, y encontrar las doce es el juego. Todos los datos se han contrastado con el artículo de Wikipedia en español que se indica (consultados el 6 de octubre de 2026). Wikipedia es una fuente secundaria: sirve para descartar errores de memoria, no como referencia definitiva.

| Ficha | Datos que afirma | Artículo |
| --- | --- | --- |
| Pretiles | Fàbrica Nova del Riu desde 1590, contra las riadas | Puente del Real (Valencia) |
| Pont de Sant Josep | De piedra entre 1604 y 1607, el último de los cinco | Puente de Serranos |
| Torres dels Serrans | 1392-1398, Pere Balaguer, entrada principal, prisión de nobles desde 1586 | Torres de Serranos |
| Pont dels Serrans | Reedificado en 1518 tras la riada de 1517; nueve arcos; 159,7 m | Puente de Serranos |
| El Micalet y la Seu | 1381-1429; prisma octogonal; altura hasta la terraza igual al perímetro; cimborrio gótico | El Miguelete; Catedral de Santa María (Valencia) |
| Pont de la Trinitat | De piedra entre 1356 y 1402, el primero de los cinco | Puente de Serranos |
| Monestir de la Trinitat | Clarisas desde 1444 por la reina María, enterrada allí; Sor Isabel de Villena | Real monasterio de la Trinidad (Valencia) |
| Sant Pius V | Rocabertí; proyecto de Pérez Castiel en 1683; terminado en el XVIII | Museo de Bellas Artes de Valencia |
| Pont del Real | Reconstruido tras la riada de 1589; acabado en 1598 para la boda de Felipe III | Puente del Real (Valencia) |
| Palau del Real | Almunia del siglo XI; «300 llaves»; derribado en 1810 | Palacio del Real de Valencia |
| Portal de la Mar | Abierta en 1356; camino del Grau; derribada en 1868 | Plaza de la Puerta del Mar (Valencia) |
| Pont de la Mar | Riada de 1589; Francesc Figuerola; acabado en 1596; diez arcos | Puente de la Mar (Valencia) |

Discrepancias vistas y cómo se han resuelto:

- El artículo del puente de Serranos lo llama «el más antiguo de los existentes» y a la vez fecha el de la Trinitat en 1356-1402. Las fichas no dicen cuál es el más antiguo.
- El Portal Nou, el de la Trinitat y el del Real no tienen ficha: no se encontró fuente para sus datos.

El minimapa se dibuja con el mismo trazado que la escena; no reproduce el plano de Tosca.

## Ambiente (v0.5)

Todo lo de esta versión es decorado, sin fuente histórica detrás:

- **Hora del día:** se elige con el botón del sol (día, atardecer, noche) o en los ajustes, y no avanza sola. Colores, niebla y posición del sol elegidos a ojo. El sol sale por el este y se pone por el oeste, algo al norte en los extremos, como en verano; de noche la misma luz hace de luna.
- **Reflejos del agua:** no son reflejos reales de la escena. El agua toma un tinte del cielo y brilla con el sol.
- **Otras barcas, lavanderas, humo y pájaros:** colocados al azar. Las lavanderas están junto a las escaleras inventadas de la v0.3.
- **Luces de noche:** ventanas encendidas, faroles en puentes, pretiles y barcas, antorchas en las puertas, luna y luciérnagas. Son adorno: hacia 1700 la ciudad no tenía alumbrado público.
- **Sonido:** sintetizado en el navegador (ruido filtrado para el agua y una campana aditiva). La campana da tres toques cada minuto y medio; no reproduce ninguna campana real.

## Aspecto (texturas, barca y luz)

- **Texturas:** pintadas por código en el navegador (sillares, tejas, enlucido con ventanas, tablas, lona). No salen de fotografías ni de ningún edificio real: el despiece de la piedra, el número de plantas y la forma de las ventanas son inventados.
- **Barcas:** dos tipos, a elegir en los ajustes. La «de la Albufera» imita de memoria las barcas tradicionales del lago (fondo plano, casco bajo y embreado, dos puntas, vela latina grande y barquero empujando con la percha); no se ha contrastado con ninguna fuente ni con planos, y no consta que navegaran por el Turia. La «de río» es una barca de vela latina genérica.
- **Sombras y reflejos:** las sombras son las del sol de la escena; el agua refleja el cielo, no la ciudad.

## Pendiente

- Cotejar muralla, puertas y puentes con el plano de Tomás Vicente Tosca (1704). Todavía no se ha usado: el trazado actual sale solo del callejero moderno.
- Contrastar el número de arcos de Sant Josep, Trinitat y Real, y los datos de la muralla en la tabla del README (no se encontró artículo de la muralla cristiana).
- Sustituir Wikipedia por fuentes primarias o bibliografía donde importe.
