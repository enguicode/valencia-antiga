# Fuentes y grado de fiabilidad

> Actualizado el 6 de octubre de 2026. Los títulos de sección conservan la versión en que se introdujo cada cosa; el contenido describe el estado actual.

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

Los textos están en `data/points.json`, en castellano, valenciano e inglés; cada ficha enlaza su fuente. Cada ficha sale al entrar con la barca en el aro claro que flota en el río junto a su sitio, y encontrar las trece es el juego. Todos los datos se han contrastado con el artículo de Wikipedia en español que se indica (consultados el 6 de octubre de 2026). Wikipedia es una fuente secundaria: sirve para descartar errores de memoria, no como referencia definitiva.

| Ficha | Datos que afirma | Artículo |
| --- | --- | --- |
| Pretiles | Fàbrica Nova del Riu desde 1590, contra las riadas | Puente del Real (Valencia) |
| Pont de Sant Josep | De piedra entre 1604 y 1607, el último de los cinco | Puente de Serranos |
| Torres dels Serrans | 1392-1398, Pere Balaguer, entrada principal, prisión de nobles desde 1586 | Torres de Serranos |
| Portal Nou | Primero un hueco en el muro; portal nuevo autorizado hacia 1419 y acabado en la década de 1470; dos torres redondas parecidas a las de Quart | Blog «Passejant València amb ulls curiosos» y castillosricsol.es (no Wikipedia) |
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
- El Portal Nou tiene ficha desde la revisión de monumentos. Sus dos fuentes son blogs y no coinciden del todo: una da el final de la obra en 1471 y la otra en 1474, y el derribo en 1864 o 1868; la ficha dice «década de 1470» y «siglo XIX».
- El Portal de la Trinitat y el del Real siguen sin ficha: lo poco que se sabe de ellos viene de una sola fuente cada uno.

El minimapa se dibuja con el mismo trazado que la escena; no reproduce el plano de Tosca.

Las versiones en valenciano y en inglés de las fichas y de la interfaz son traducciones del texto castellano hechas sin revisión de un hablante nativo. Los nombres de puentes, puertas y edificios se dejan en valenciano en los tres idiomas. El enlace de cada ficha lleva siempre al artículo en castellano, que es el que se contrastó.

## Ambiente (v0.5)

Todo lo de esta versión es decorado, sin fuente histórica detrás:

- **Hora del día:** se elige con el botón del sol (día, atardecer, noche) o en los ajustes, y no avanza sola. Colores, niebla y posición del sol elegidos a ojo. El sol sale por el este y se pone por el oeste, algo al norte en los extremos, como en verano; de noche la misma luz hace de luna.
- **Reflejos del agua:** no son reflejos reales de la escena. El agua toma un tinte del cielo y brilla con el sol.
- **Otras barcas, lavanderas, humo y pájaros:** colocados al azar. Las barcas de decorado van siempre a vela. Las lavanderas están junto a las escaleras inventadas de la v0.3.
- **Luces de noche:** ventanas encendidas, faroles en puentes, pretiles y barcas, antorchas en las puertas, luna y luciérnagas. Son adorno: hacia 1700 la ciudad no tenía alumbrado público.
- **Sonido:** sintetizado en el navegador (ruido filtrado para el agua y una campana aditiva). La campana da tres toques cada minuto y medio; no reproduce ninguna campana real.

## Aspecto (texturas, barca y luz)

- **Texturas:** pintadas por código en el navegador (sillares, tejas, enlucido con ventanas, tablas, lona). No salen de fotografías ni de ningún edificio real: el despiece de la piedra, el número de plantas y la forma de las ventanas son inventados.
- **Barcas:** dos tipos, a elegir en los ajustes. La «de la Albufera» imita de memoria las barcas tradicionales del lago (fondo plano, casco bajo y embreado, dos puntas, vela latina grande y barquero empujando con la percha); no se ha contrastado con ninguna fuente ni con planos, y no consta que navegaran por el Turia. La «de río» es una barca de vela latina genérica.
- **Sombras y reflejos:** las sombras son las del sol de la escena; el agua refleja el cielo, no la ciudad.

## Detalle añadido y paso bajo los puentes

- **Detalle de los edificios:** ventanas, puertas, contrafuertes, impostas, huecos de campanas y cornisas añadidos a ojo para que los sitios aguanten un plano cercano. No siguen ningún alzado. Lo mismo la galería volada, las aspilleras y las pilastras de las puertas de la muralla.
- **Puentes:** tajamares en todos los pilares y bolas sobre el pretil, genéricos. Los casalicios del Pont de la Mar constan en Wikipedia; los del Pont del Real se han puesto de memoria. En ambos casos la forma es un esbozo.
- **Barquero y vela:** en la barca de la Albufera el barquero mueve la percha y la vela va arriada cuando se navega despacio, y se iza al coger velocidad. Es una animación inventada.
- **Paso bajo los arcos:** las barcas se encauzan solas hacia el arco más cercano y abaten el palo y la vela. Es un recurso del juego para que nada atraviese la piedra; no consta que se hiciera así.

## Revisión de monumentos (6 de octubre de 2026)

Se documentó cada monumento por separado y se rehicieron las maquetas con lo encontrado. En cada caso se distingue lo que dice una fuente de lo que es estimación.

### Torres dels Serrans y de Quart

- **Con fuente:** Serrans, 1392-1398, de Pere Balaguer; cuerpo central entre dos torres poligonales por fuera y rectas hacia la ciudad; arco de 5 × 6,5 m; galería volada sobre ménsulas en el tercio superior; tracería gótica ciega entre la galería y una imposta a un tercio de la altura; escudo real; trasera abierta en arcos y gran escalera; prisión de nobles de 1586 a 1887. Quart, 34 m de alto, torres semicilíndricas con base en talud, muros de mampostería enlucida con sillería solo en esquinas y remates. ([Wikipedia: Serranos](https://es.wikipedia.org/wiki/Torres_de_Serranos), [Quart](https://es.wikipedia.org/wiki/Torres_de_Quart), fichas del catálogo municipal en valencia.es)
- **Estimado:** el ancho y el fondo de ambas puertas, la altura de Serrans (unos 33 m, de fuentes no leídas directamente) y cuánto más bajo es el cuerpo central.
- **Dudoso para 1700:** si la galería almenada de Serrans seguía en pie; se ha dejado.

### Muralla y puertas desaparecidas

- **Con fuente:** muralla de 1356-1370, unos 4 km, lienzo de unos 10 m de alto y 2,5 m de grueso, de tapial; el frente del río, reforzado con mortero y sillería. El plano de Tosca muestra torres semicirculares solo en el frente del río. Portal Nou: dos torres de frente redondo «parecidas a Quart» pero menores, acabado en 1471-74. Portal de la Trinitat: dos torres cuadradas almenadas (una sola fuente). Portal del Real: desde 1599, un hueco sencillo con arco algo apuntado. Portal de la Mar: abierto en 1356, «una puerta abierta en una torre»; a su lado, la Casa de les Armes (1574). Portal de Sant Vicent: antes de 1830, un torreón con arco y las estatuas de los dos Vicentes (1677 y 1681). ([Viquipèdia: Muralla cristiana](https://ca.wikipedia.org/wiki/Muralla_cristiana_de_València), [Wikipedia: Muralla medieval](https://es.wikipedia.org/wiki/Muralla_medieval_de_Valencia), [Ciudadela](https://es.wikipedia.org/wiki/Ciudadela_de_Valencia) y varios blogs de historia local)
- **Estimado:** todas las medidas de estas cinco puertas y la forma de la Casa de les Armes. Las fuentes son textos; no se han visto el plano de Tosca ni los grabados.
- **Cambiado en la escena:** la muralla sube a 10 m; solo hay torres, redondas, en el frente del río; cada puerta tiene ahora su forma.

### Puentes

Casi todo sale de las monografías de Víctor Yepes (Universitat Politècnica de València), una por puente, en victoryepes.blogs.upv.es.

| Puente | Arcos hacia 1700 | Forma del arco | Ancho | Lo que lo distingue |
| --- | --- | --- | --- | --- |
| Sant Josep | 13 | Escarzano, pequeño y alto | Casi 6 m | Dos estatuas de mármol (1694) sobre pedestales, sin casalicio |
| Serrans | 9 | Escarzano | 10,9 m | Tajamares hasta el pretil, como apartaderos; dos casalicios junto a la ciudad |
| Trinitat | 10 | Algo apuntado | 10,4 m (sin contrastar) | Tajamares con sombreretes escalonados; dos escaleras aguas abajo; sin casalicios en 1700 |
| Real | 9 (hoy 10) | Escarzano | 10,5 m | Casalicios de los dos Vicentes (1682-83), bolas en el pretil, una escalera |
| Mar | 10 | Apuntado muy rebajado | 8,35 m | Tablero alomado, bolas, casalicios de la Cruz y de Sant Pasqual |

- **Corregido:** el Pont del Real tenía nueve arcos en 1700, no diez.
- **Estimado:** la forma de los casalicios (planta triangular y columnas constan; la cubierta en pirámide es lectura propia), el sitio exacto de las escaleras y de las bolas. Todos los puentes miden lo mismo en la escena; los reales iban de 148 a 171 m.

### Micalet y Seu

- **Con fuente:** Micalet, prisma octogonal de 50,85 m hasta la terraza, igual que su perímetro, con contrafuertes en las ocho aristas y cuatro cuerpos (macizo, «presó», casa del campanero y sala de campanas con ocho ventanales); la crestería gótica calada no se derribó hasta el XVIII; la espadaña de piedra es de 1660-1736. Seu, 94 m de largo y 53,65 m en el crucero; cimborrio octogonal de dos cuerpos con ocho ventanas de alabastro cada uno; Obra Nova de tres pisos de arcos (1566); puerta de los Apóstoles con rosetón de 6,45 m; Aula Capitular de 13 m de lado y 16 de alto. ([Wikipedia: El Miguelete](https://es.wikipedia.org/wiki/El_Miguelete), [Catedral](https://es.wikipedia.org/wiki/Catedral_de_Santa_María_de_Valencia))
- **Estimado:** la altura de cada cuerpo del Micalet, la altura de la nave (23 m), las cubiertas en terraza y la orientación (eje norte-sur con el ábside al norte, deducida de hacia dónde miran las puertas).
- **Decisión para 1700:** crestería en pie y, en lugar de la espadaña acabada, un armazón sencillo con la campana de las horas.

### Palau del Real

- **Con fuente:** dos cuerpos, el Real Vell (la almunia reformada, con un patio y cuatro torres en las esquinas, una con chapitel) y el Real Nou, mayor; puerta principal entre dos torres fuertes, halladas en la excavación de 2009; pórtico de pilares y arcos de medio punto con galería de balcones encima; foso de 1356. ([Wikipedia](https://es.wikipedia.org/wiki/Palacio_del_Real_de_Valencia), [cultural.valencia.es](https://cultural.valencia.es/en/arqueologia-centro/royal-palace/))
- **Estimado:** todas las medidas. Varias fuentes repiten que la fachada «llegó a alcanzar los 200 metros»; aquí mide unos 120. Alturas, cubiertas y color son suposición.

### Trinitat y Sant Pius V

- **Trinitat, con fuente:** iglesia de una nave con cinco tramos y ábside poligonal, paralela al claustro; se entra por una puerta lateral desde un patio del lado del río, con arquivoltas bajo arco conopial entre pináculos; claustro de dos pisos; fábrica de sillería y tapial. No hay fuente para el campanario ni para ninguna medida: son estimación. ([Viquipèdia](https://ca.wikipedia.org/wiki/Monestir_de_la_Trinitat))
- **Sant Pius V, con fuente:** proyecto de Pérez Castiel hacia 1683; las obras se pararon en 1699; el plano de Tosca (1704) muestra el claustro a medias y la iglesia sin empezar; se acabó entre 1728 y 1744. Fachada al río de tres pisos con dos torres en las esquinas, de ladrillo sobre zócalo de sillería. ([Viquipèdia](https://ca.wikipedia.org/wiki/Col·legi_de_Sant_Pius_V))
- **Cambiado en la escena:** Sant Pius V aparece a medio hacer, sin iglesia ni cúpula; la cúpula azul sería un anacronismo.

### Barcas

- **Con fuente:** las barcas de la Albufera eran de fondo plano, sin quilla, de dos puntas y antiguamente embreadas; el barquet medía de 4,6 a 5 m y el barquetot de 7 a 11; la entena podía ser bastante más larga que la barca; la percha pasa de 3 m. ([maritima-et-mechanika.org](https://maritima-et-mechanika.org/maritime/albufera/Boats-of-the-Albufera.html))
- **Importante:** no hay constancia de barcas de la Albufera, ni de navegación, en el Turia a su paso por València hacia 1700. El río no era navegable; la madera bajaba suelta, guiada por gancheros. **El paseo en barca es, por tanto, una licencia de este proyecto.**

## Pendiente

- Cotejar muralla, puertas y puentes con el plano de Tomás Vicente Tosca (1704). Todavía no se ha usado: el trazado actual sale solo del callejero moderno.
- Ver el plano de Tosca y los grabados: toda la revisión de monumentos se hizo sobre textos.
- Sustituir Wikipedia por fuentes primarias o bibliografía donde importe.
- Revisar las traducciones al valenciano y al inglés con hablantes nativos.
- Contrastar la forma de la barca de la Albufera y si tiene sentido en el Turia.
