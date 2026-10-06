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
| Número de arcos de cada puente | De memoria: 13, 9, 10, 10 y 10 | Sin contrastar |
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

## Pendiente

- Cotejar muralla, puertas y puentes con el plano de Tomás Vicente Tosca (1704). Todavía no se ha usado: el trazado actual sale solo del callejero moderno.
- Contrastar los datos históricos de la tabla del README y el número de arcos de los puentes.
