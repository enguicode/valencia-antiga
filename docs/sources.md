# Fuentes y grado de fiabilidad

> Actualizado el 7 de octubre de 2026. Los títulos de sección conservan la versión en que se introdujo cada cosa; el contenido describe el estado actual.

Cada dato de la escena lleva aquí su origen y lo fiable que es. Lo que no tenga fuente contrastada se marca como tal.

## Trazado (v0.2)

Generado por `scripts/build-layout.py` a partir de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL) y guardado en `data/layout.json`.

| Elemento | De dónde sale | Fiabilidad |
| --- | --- | --- |
| Curso del río | Línea que une el centro de los puentes actuales sobre el viejo cauce | Aproximado: el cauce es el mismo, pero la línea es suavizada y el ancho del agua (108 m) es constante e inventado |
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
| Pretiles con bolas | A lo largo de las dos orillas, a 62 m del eje del río | Existieron, pero aquí son continuos y uniformes; en 1700 la obra no estaba completa |
| Escaleras al río | Una junto a cada puente, en el lado de la ciudad | Inventado: posición y forma |
| Azud | Cierra el extremo de aguas arriba del tramo navegable | Inventado: no corresponde a ningún azud real |
| Colores (cúpula azul, tejados) | Orientativos | Inventado |

## Fichas de historia (v0.4)

Los textos están en `data/points.json`, en castellano, valenciano e inglés; cada ficha enlaza su fuente. Cada ficha sale al entrar con la barca en el aro claro que flota en el río junto a su sitio, y encontrar las dieciocho es el juego. Todos los datos se han contrastado con el artículo de Wikipedia en español que se indica (consultados el 6 de octubre de 2026; las fichas de Quart y de la muralla, el 7). Wikipedia es una fuente secundaria: sirve para descartar errores de memoria, no como referencia definitiva.

| Ficha | Datos que afirma | Artículo |
| --- | --- | --- |
| Pretiles | Fàbrica Nova del Riu desde 1590, contra las riadas | Puente del Real (Valencia) |
| Pont de Sant Josep | De piedra entre 1604 y 1607, el último de los cinco | Puente de Serranos |
| Torres dels Serrans | 1392-1398, Pere Balaguer, entrada principal, prisión de nobles desde 1586 | Torres de Serranos |
| Torres de Quart | 1441-1460, camino de Castilla, torres de frente redondo con muro enlucido y piedra en las aristas, prisión de mujeres (la Galera) desde 1649 | Torres de Quart |
| Convent del Corpus Christi | Carmelitas descalzas; fundado en 1681 por Juan Bautista Fos; primero en Russafa y enseguida junto al Portal de la Corona; primera piedra del convento el 15 de octubre de 1687 | Ficha municipal «Corpus Christi Monastery» (cultural.valencia.es). La forma en la escena es la iglesia genérica, sin fuente. OpenStreetMap lo sitúa 45 m por fuera de la línea suavizada de la muralla; como estaba intramuros, en la escena se ha metido hacia dentro |
| La muralla | Levantada por orden de Pere el Cerimoniós entre 1356 y 1370, durante la guerra con Castilla; cuatro kilómetros; de tapial, reforzada después con piedra; torre de Santa Caterina en la esquina noroeste, empezada en 1390, polvorín hasta 1758 y derribada en 1772; derribo de la muralla desde 1865 | Muralla medieval de Valencia; Viquipèdia: Muralla cristiana de València; jdiezarnal.com para la torre |
| Portal Nou | Empezado en 1390 y acabado en la década de 1470; dos torres redondas parecidas a las de Quart | jdiezarnal.com, Viquipèdia (Muralla cristiana de València) y castillosricsol.es |
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
- El Portal Nou tiene ficha desde la revisión de monumentos. Tres fuentes (jdiezarnal.com, la Viquipèdia y castillosricsol.es) dan el inicio de la obra en 1390; el final, en 1471 o en 1474, y la ficha dice «década de 1470». Hasta el 7 de octubre de 2026 la ficha decía que el rey lo autorizó «hacia 1419»: ese dato solo lo da el blog «Passejant València amb ulls curiosos» y se ha retirado.
- **Punto extra de la noche, «la luna de València»:** el origen del dicho no está establecido. La ficha da la explicación más repetida (las puertas cerradas de noche) y avisa de que hay otras y de que ninguna es segura. La fuente es un artículo de divulgación (Billiken), no un estudio.
- El Portal de la Trinitat y el del Real tienen ficha desde la v1.18. La de la Trinitat describe dos torres gemelas almenadas unidas por un cuerpo central con el arco. Dos webs dan el mismo texto con siglos distintos (castillosricsol.es, «siglo XVI»; jdiezarnal.com, «siglo XVIII»), así que la ficha no da siglo y se apoya en los planos: tanto el de Mancelli (1608) como el de Tosca (1704), vistos en los recortes que reproduce jdiezarnal.com, dibujan la puerta con sus dos torres almenadas. Hacia 1700 las tenía. En la vista de Bergán de 1862 era ya un simple arco con frontón. La del Real coincide en dos blogs (traslado en 1599, puerta de tres vanos en 1801).

El minimapa se dibuja con el mismo trazado que la escena; no reproduce el plano de Tosca.

Las versiones en valenciano y en inglés de las fichas y de la interfaz son traducciones del texto castellano hechas sin revisión de un hablante nativo. Los nombres de puentes, puertas y edificios se dejan en valenciano en los tres idiomas. El enlace de cada ficha lleva siempre al artículo en castellano, que es el que se contrastó.

## Ambiente (v0.5)

Todo lo de esta versión es decorado, sin fuente histórica detrás:

- **Hora del día:** se elige con el botón de abajo (alba, mediodía, tarde y noche) o en los ajustes, y no avanza sola. Colores, niebla y posición del sol elegidos a ojo. El sol sale por el este y se pone por el oeste, algo al norte en los extremos, como en verano; de noche la misma luz hace de luna.
- **Reflejos del agua:** no son reflejos reales de la escena. El agua toma un tinte del cielo y brilla con el sol.
- **Otras barcas, lavanderas, humo y pájaros:** colocados al azar. Las barcas de decorado van siempre a vela. Las lavanderas están junto a las escaleras inventadas de la v0.3.
- **Luces de noche:** ventanas encendidas, faroles en puentes, pretiles y barcas, antorchas en las puertas, luna y luciérnagas. Son adorno: hacia 1700 la ciudad no tenía alumbrado público.
- **Sonido:** sintetizado en el navegador (ruido filtrado para el agua y una campana aditiva). La campana da tres toques cada minuto y medio; no reproduce ninguna campana real.

## Aspecto (texturas, barca y luz)

- **Texturas:** pintadas por código, sin fotografías. El lienzo lejos del río lleva tongadas de tapial; el frente del río, las puertas de piedra y los puentes siguen en sillería. Las cubiertas son teja curva, con los canales a favor de la pendiente. El despiece, el ancho de cada tongada, el número de plantas y las ventanas siguen siendo inventados.
- **Moto de agua, lancha motora, pontón, lancha offshore, hidroplano de carreras y Spirit of Australia:** opciones del selector anacrónicas a propósito y sin ninguna pretensión histórica. Van tres, cinco, seis, ocho, diez y dieciséis veces más rápido, en ese orden. El pontón es un esbozo, de memoria y sin planos, de los de recreo: el más rápido de ese tipo ronda los 183 km/h, y aquí va a unas seis veces la vela. La offshore, el hidroplano y el último se rehicieron el 10-oct-2026 mirando fotografías de Wikimedia Commons (un catamarán de la Clase 1 en Ostende, el Miss Budweiser y el Spirit of Australia colgado en el Australian National Maritime Museum); las proporciones salen de esas fotos, sin planos ni medidas, y en los tres el piloto va dentro, bajo una cúpula. El último es un esbozo del hidroplano de madera y reactor con el que Ken Warby dejó el récord del agua en 511 km/h el 8 de octubre de 1978. En el juego esa marcha son unos 520 km/h. El mismo día se rehízo la cubierta de la moto de agua (capó y sillín corridos) y el junco pasó a tres palos con la popa alta, las dos cosas de memoria. El 10-oct-2026 se afinó el casco de la moto (más bajo, cubierta tapándolo casi entero, reposapiés hundidos y plataforma de popa) y se rehízo la góndola (ferro con hacha, muesca y seis dientes, risso, fórcola, respaldos) a partir de fotos de Wikimedia Commons: «Jet ski in Tanjung Benoa Bali.jpg», «Gondola_Venice.jpeg», «Gondola_ferro_di_prua.jpg», «Ferro.gif» y «Forcola.png». Sin planos: el risso y los cavalli son esbozo.
- **Barcas:** cuatro de época, a elegir en los ajustes, y las seis rápidas de arriba. La «de la Albufera» sigue el artículo de Falck citado en [Barcas](#barcas): fondo plano, casco embreado, dos puntas, vela latina y barquero con percha. Las medidas del modelo que no da ese artículo están estimadas y se dicen allí. No consta que navegaran por el Turia. La «de río» es una barca de vela latina genérica, inventada. La góndola y el junco son barcas de su época, de Venecia y de China, dibujadas de memoria y sin fuente para el Turia; van a la misma velocidad que las otras dos. El junco abate la vela bajo los puentes; la góndola no lleva vela.
- **Sombras y reflejos:** las sombras son las del sol de la escena; el agua refleja el cielo, no la ciudad.

## Detalle añadido y paso bajo los puentes

- **Detalle de los edificios:** ventanas, puertas, contrafuertes, impostas, huecos de campanas y cornisas añadidos a ojo para que los sitios aguanten un plano cercano. No siguen ningún alzado. Lo mismo la galería volada, las aspilleras y las pilastras de las puertas de la muralla.
- **Caminos y Casa de les Armes:** del pie de cada puente a su puerta va un camino de tierra batida; el trazado es un esbozo, no sale de un plano. La Casa de les Armes (1574) se dibuja como una nave larga con tejado, adosada a la muralla por dentro junto al Portal de la Mar: consta que estaba allí, su forma es inventada.
- **Puentes y puertas:** los puentes de Sant Josep, Serrans, la Trinitat y el Real se han corrido río arriba entre 30 y 43 m respecto a su posición en OpenStreetMap, para que desemboquen frente a su puerta como en las vistas de Guesdon: al cruzar siempre en perpendicular a un río simplificado, quedaban desviados. El de la Mar no se ha tocado. Las rampas de los extremos se han acortado de 29 a 14 m.
- **Puentes:** tajamares en todos los pilares y bolas sobre el pretil, genéricos. Los casalicios del Pont de la Mar constan en Wikipedia; los del Pont del Real se han puesto de memoria. En ambos casos la forma es un esbozo.
- **Barquero y vela:** en la barca de la Albufera el barquero mueve la percha y la vela va arriada cuando se navega despacio, y se iza al coger velocidad. Es una animación inventada.
- **Paso bajo los arcos:** las barcas se encauzan solas hacia el arco más cercano y abaten el palo y la vela. Es un recurso del juego para que nada atraviese la piedra; no consta que se hiciera así.

## Revisión de monumentos (6 de octubre de 2026)

Se documentó cada monumento por separado y se rehicieron las maquetas con lo encontrado. En cada caso se distingue lo que dice una fuente de lo que es estimación.

### Torres dels Serrans y de Quart

- **Con fuente:** Serrans, 1392-1398, de Pere Balaguer; cuerpo central entre dos torres poligonales por fuera y rectas hacia la ciudad; arco de 5 × 6,5 m; galería volada sobre ménsulas en el tercio superior; tracería gótica ciega entre la galería y una imposta a un tercio de la altura; escudo real; trasera abierta en arcos y gran escalera; prisión de nobles de 1586 a 1887. Quart, 34 m de alto, torres semicilíndricas con base en talud, muros de mampostería enlucida con sillería solo en esquinas y remates. ([Wikipedia: Serranos](https://es.wikipedia.org/wiki/Torres_de_Serranos), [Quart](https://es.wikipedia.org/wiki/Torres_de_Quart), fichas del catálogo municipal en valencia.es)
- **Estimado:** el ancho y el fondo de ambas puertas, la altura de Serrans (unos 33 m, de fuentes no leídas directamente) y cuánto más bajo es el cuerpo central. En Serrans (12-oct-2026) las proporciones salen de una fotografía frontal ([Commons, CC0](https://commons.wikimedia.org/wiki/File:The_Torres_de_Serranos_Porta_dels_Serrans_Valencia,_Spanien_Mohammad_Nemat_Zadeh.jpg)) y de un modelo 3D generado a partir de ella con TRELLIS.2, usado solo para medir y no cargado en la escena: galería al 70 % de la altura sobre ménsulas de unos 2,3 m, torre un 6 % más estrecha por encima, torres de unos 13 m de ancho y cuerpo central de unos 10,6 m, con su adarve dos metros por debajo del de las torres. Son lecturas de una foto, no medidas.
- **Dudoso para 1700:** si la galería almenada de Serrans seguía en pie; se ha dejado.
- **Serrans como prisión (12-oct-2026):** mientras fue prisión (1586-1887) sus grandes arcadas abiertas a la ciudad estaban cegadas y el muro exterior perforado por ventanas con reja ([asturnatura](https://www.asturnatura.com/turismo/guia/torres-de-serranos-15033), [Hispanopedia](https://es.hispanopedia.com/wiki/Torres_de_Serranos)). La escena muestra los arcos traseros cegados con mampostería y una ventana pequeña en cada uno; el arco de paso sigue abierto. **Inventado:** el aspecto del relleno y el tamaño y número de las ventanas. **Sin hacer:** las ventanas enrejadas del frente. **Sigue siendo de hoy y no de 1700:** el trazado del foso, las proporciones y la terraza, leídos del edificio restaurado entre 1893 y 1914; y la trasera abierta de Quart, que también fue prisión y de la que no se ha comprobado cómo estaba.
- **Trasera de Quart (12-oct-2026):** según las vistas aéreas actuales, cada torre se abre a la ciudad en dos grandes arcos apuntados, uno sobre otro, y el cuerpo central en uno sobre el arco de paso, igual que en Serrans; se han usado las mismas proporciones que allí. Por el frente, el cuerpo central lleva dos órdenes de almenas: uno al 70 % de la altura de las torres y otro retranqueado por detrás, más alto; las alturas son lectura de la vista aérea, y no consta si las almenas son las de 1700 o de restauración. No se ha hecho su escalera ni la terraza trasera del cuerpo central, que en las vistas no se leen con claridad.
- **Plaza tras las puertas mayores (12-oct-2026):** las casas de relleno dejan un claro de 32 m de radio detrás de Serrans, Quart y Sant Vicent, porque las torres, sus salas y la escalinata entran en la ciudad más que la línea de la muralla. Tras Serrans existe hoy la plaça dels Furs; el tamaño del claro y que lo hubiera en las otras dos hacia 1700 es invención.
- **Foso de Serrans (12-oct-2026):** documentado; el Ayuntamiento lo cegó en 1871 y se reabrió en 1893, dentro de la restauración empezada en 1888 ([Wikipedia](https://en.wikipedia.org/wiki/Torres_de_Serranos), [Historia de las Torres de Serrano III](https://taxival.org/historia-de-las-torres-de-serrano-iii/)). Su trazado sale de una vista aérea actual (Google Maps): una zanja que sigue el polígono de cada torre por el frente y el costado exterior, con el paso de entrada entre las dos y hierba en el fondo. **Inventado:** el ancho (4,5 m), la profundidad (3,2 m), el pretil bajo y que estuviera seco hacia 1700, porque no se han encontrado medidas ni si llevaba agua. La leyenda de los cocodrilos no aparece ligada al foso en ninguna fuente consultada: la conocida es la del Drac del Patriarca, que sitúa al caimán en el Turia.

### Muralla y puertas desaparecidas

- **Con fuente:** muralla de 1356-1370, unos 4 km, lienzo de unos 10 m de alto y 2,5 m de grueso, de tapial; el frente del río, reforzado con mortero y sillería. El plano de Tosca muestra torres semicirculares solo en el frente del río. Portal Nou: dos torres de frente redondo «parecidas a Quart» pero menores, acabado en 1471-74. Portal de la Trinitat: dos torres cuadradas almenadas (una sola fuente). Portal del Real: desde 1599, un hueco sencillo con arco algo apuntado. Portal de la Mar: abierto en 1356, «una puerta abierta en una torre»; a su lado, la Casa de les Armes (1574). Portal de Sant Vicent: antes de 1830, un torreón con arco y las estatuas de los dos Vicentes (1677 y 1681). ([Viquipèdia: Muralla cristiana](https://ca.wikipedia.org/wiki/Muralla_cristiana_de_València), [Wikipedia: Muralla medieval](https://es.wikipedia.org/wiki/Muralla_medieval_de_Valencia), [Ciudadela](https://es.wikipedia.org/wiki/Ciudadela_de_Valencia) y varios blogs de historia local)
- **Torre de Santa Caterina:** cilíndrica, empezada el 12 de junio de 1390 según su lápida, con un bajorrelieve de la santa entre dos escudos de la ciudad; estaba en un quiebro muy pronunciado de la muralla, junto al pretil del río, y guardó la pólvora hasta 1758; derribada en 1772 ([jdiezarnal.com](https://www.jdiezarnal.com/valenciamurallasvalencia.html), que no cita bibliografía; la Viquipèdia coincide en las fechas y en que estaba en el extremo noroeste). En la escena va en el primer vértice donde la muralla que viene de Quart llega al río. El radio (5,6 m) y la altura (17 m) son estimación.
- **Puertas pequeñas del lado de tierra:** según jdiezarnal.com, que cita los planos de Mancelli y Tosca. Russafa, dos torres cuadradas unidas por un cuerpo central, cerrada desde 1707, así que abierta en 1700. Torrent o dels Innocents, un arco en una torre almenada. Jueus, una sola torre desde 1607 y tapiada hacia 1689: en la escena, la torre con el arco cegado. Coixo y Tints (o de la Corona, reabierta en 1658), simples huecos en el lienzo. Están en el vértice de la muralla más cercano al cruce de calles actual que da esa web (Corona, Carnissers y Hospital con Guillem de Castro; Xàtiva con el Passeig de Russafa; plaça dels Pinazo): posición aproximada, con hasta 35 m de error. Tamaños estimados. Una sola fuente, sin bibliografía.
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
- **Estimado:** la altura de cada cuerpo del Micalet, la altura de la nave (23 m) y las cubiertas en terraza.
- **Orientación y unión con la torre:** el eje de la Seu sigue la huella de OpenStreetMap, de los pies al ábside hacia el este-nordeste, en la misma retícula que la torre. El Micalet queda atravesado al pie de la nave y unido a ella: se construyó exento, pero quedó unido a finales del siglo XV al prolongarse la nave central ([Wikipedia: El Miguelete](https://es.wikipedia.org/wiki/El_Miguelete)). La puerta va entre la torre y el Aula Capitular. Hasta el 7 de octubre de 2026 la Seu estaba dibujada de norte a sur, por una deducción errónea, y la torre quedaba suelta.
- **Decisión para 1700:** crestería en pie y, en lugar de la espadaña acabada, un armazón sencillo con la campana de las horas.

### Palau del Real

Rehecho una segunda vez con los dos artículos de Luis Arciniega (Universitat de València, *Ars Longa* 14-15, 2005-2006), que estudian las cuentas de obra y los planos conservados: [bajo los Austrias](https://www.uv.es/arcinieg/pdfs/palacio_del_real_valencia_austrias.pdf) y [bajo los Borbones](https://www.uv.es/arcinieg/pdfs/palacio_del_real_valencia_borbones.pdf).

- **Con fuente:** la fachada principal, al sur, estaba formada de oeste a este por la torre Quemada, la galería principal, la torre de los Ángeles y la esquina con el Real Vell, donde había una pequeña espadaña sobre la iglesia baja. El Real Nou quedaba al oeste, en torno a dos patios (el grande y el chico); el Real Vell, al este. La galería de la fachada, de piedra y ladrillo, se hizo hacia 1640 en lugar de un corredor de madera que unía las dos torres, y tenía balcones de hierro. La torre de los Ángeles estaba junto al acceso principal y llevaba pintadas las armas reales. En 1540 se mandó recrecer las dos torres del acceso hasta cincuenta palmos y rematarlas con antepechos y merlones; las torres del norte se rebajaron. Los chapiteles son del XVIII: el de la torre de la Reina, de madera forrada de plomo, se hizo tras 1713. Una sala del lado sur medía 126 palmos de largo. Los jardines quedaban al norte y al oeste.
- **Corregido respecto a la primera versión:** el Real Vell estaba al este, no al oeste; las torres acababan en almenas, sin chapiteles ni tejados en pirámide; la galería va entre dos torres, no hay dos torres gemelas flanqueando una puerta central.
- **Sobre los planos de Manuel Cavallero (1802):** son ocho, hallados en París por Josep Vicent Boira y publicados por el Ayuntamiento (*El Palacio Real de Valencia. Los planos de Manuel Cavallero (1802)*, 2006). Ese libro no está en línea y no se ha podido consultar: lo que hay aquí sale de lo que Arciniega cuenta de ellos y del resto de la documentación, no de los planos mismos.
- **Estimado:** todas las longitudes y alturas (unos 110 m de fachada en total), la forma del pórtico y el número de arcos, y cuál era en 1700 la «torre de la Reina»: el nombre cambió de torre con el tiempo y aquí se da a la esquina más cercana al puente.

### Trinitat y Sant Pius V

- **Trinitat, con fuente:** iglesia de una nave con cinco tramos y ábside poligonal, paralela al claustro; se entra por una puerta lateral desde un patio del lado del río, con arquivoltas bajo arco conopial entre pináculos; claustro de dos pisos; fábrica de sillería y tapial. No hay fuente para el campanario ni para ninguna medida: son estimación. ([Viquipèdia](https://ca.wikipedia.org/wiki/Monestir_de_la_Trinitat))
- **Sant Pius V, con fuente:** proyecto de Pérez Castiel hacia 1683; las obras se pararon en 1699; el plano de Tosca (1704) muestra el claustro a medias y la iglesia sin empezar; se acabó entre 1728 y 1744. Fachada al río de tres pisos con dos torres en las esquinas, de ladrillo sobre zócalo de sillería. ([Viquipèdia](https://ca.wikipedia.org/wiki/Col·legi_de_Sant_Pius_V))
- **Cambiado en la escena:** Sant Pius V aparece a medio hacer, sin iglesia ni cúpula; la cúpula azul sería un anacronismo.

### Barcas

- **Con fuente:** las barcas de la Albufera eran de fondo plano, sin quilla, de dos puntas y antiguamente embreadas. El barquet medía de 4,6 a 5 m y el barquetot de 7 a 11 m. La entena (en dos piezas, *car* y *pena*, unidas) podía ser bastante más larga que la barca. La percha pasa de 3 m y lleva horquilla en el extremo que va al agua. El palo va inclinado a proa, sin obenques: lo sujetan la carlinga y el banco, y la driza de la entena hace de estay de popa. El tope lleva un engrosamiento (*galcer*) y una bola. La vela latina lleva relinga y fajas de rizos; la amura va a la roda con un aparejo (*davant*) y la escota al pozo. La cubierta queda unos 15 cm bajo la regala, con amurada baja y una brazola alrededor del pozo. Las cuadernas no son de una pieza: varenga y dos pies derechos. En el barquetot la roda cae a unos 45° y enrasa con la cubierta; el codaste pasó a ser recto cuando se le puso timón fijo. El *caperol* («cabeza de moro») es de la barca pescadora, no de este tipo, y no se ha puesto. ([maritima-et-mechanika.org](https://maritima-et-mechanika.org/maritime/albufera/Boats-of-the-Albufera.html), que resume a Rosaleny i Romero y a Lluesma Espanya)
- **Estimado en el modelo**, para que no se lea como dato del artículo: es un barquetot de 9,5 m con una manga de unos 2,1 m (el artículo dice que no hay una proporción fija, y da mangas de otros tipos, no de este). Arrufo, calado, sitio de los bancos, largo concreto de la entena y de la percha, forma de la horquilla, el dibujo de las costuras y el traje del barquero. Los imbornales no están modelados. La «de río» sigue siendo una latina genérica: casco, vela, timón y barquero sentado son invención para distinguirla de la de la Albufera.
- **Importante:** no hay constancia de barcas de la Albufera, ni de navegación, en el Turia a su paso por València hacia 1700. El río no era navegable; la madera bajaba suelta, guiada por gancheros. **El paseo en barca es, por tanto, una licencia de este proyecto.** Desde el 11-oct-2026 la portada lo dice, al pie, junto al aviso de que es una reconstrucción aproximada. Un resumen automático atribuye a Tosca y a Corachán, hacia 1700, un dictamen contra canalizar el río para hacer puerto en el Grau: no se ha encontrado en ninguna fuente y no se usa. Sí consta un canal navegable entre el Grau y el Turia propuesto por Joaquín de la Croix en 1787, que no se hizo ([Marítimo de Valencia](http://maritimodevalencia.blogspot.com/2015/10/1787-el-canal-navegable-grao-turia.html), blog de historia local).

## Río abajo, hasta el mar (7 de octubre de 2026)

El paseo sigue acabando donde acababa, pasado el Pont de la Mar. A partir de ahí el río continúa, y el banco de niebla se ha ido mar adentro.

| Elemento | De dónde sale | Fiabilidad |
| --- | --- | --- |
| Curso del Regne al Assut de l'Or | Centro de los puentes actuales de Montolivet y del Assut de l'Or en OpenStreetMap, como el resto del cauce | Aproximado: es el jardín de hoy, que ocupa el viejo cauce |
| Del Assut a la costa | Estimación. Ese tramo está enterrado. La línea va hacia el este y sale al mar al sur del Grau | Estimado. No se ha cotejado con un plano de 1700 |
| Orilla del mar | Unos 70 m al este de las Drassanes, muy al oeste de la playa actual. La costa avanzó con el puerto | Estimado. Los grabados de finales del XVIII aún las ponen junto al mar; la playa de ahora queda cerca de 1 km más afuera |
| Santa Maria del Mar | Posición actual del templo. Torre acabada hacia 1689; obras desde 1683; templo terminado en 1736. En la escena se ve entero, con cúpula | Posición fiable. La forma es un esbozo, y en 1700 la obra no estaba acabada |
| Drassanes del Grau | Cinco naves de unos 10 por 48 m, del siglo XIV, en la plaza de hoy. Hacia 1700 seguían en pie como almacén (provisiones en 1707, sal en 1715) | La planta, en lo grueso, es fiable. La forma es un esbozo |
| Embarcadero | De madera, en playa abierta. Hubo obras de Tomás Güelda a finales del XVII, pero no un puerto de obra | Esbozo. No se ha dibujado un muelle de piedra |
| Huerta, cañas, acequias, alquerías, barras | Lo que las fuentes dicen que había entre la ciudad y el mar, sin plano de cada pieza | Inventado en el detalle |
| Camí del Grau | Un camino de tierra en la orilla norte, desde donde acaba el pretil hasta acercarse al Grau. El camino real salía del Portal de la Mar; esta línea no está sacada de un plano | Esbozo. No es el trazado medido |
| Barracas y un molino | El tipo de casa baja de la huerta, con cubierta de barraca, y un molino junto a la acequia del norte. No es una alquería ni un molino con nombre | Inventado en el detalle |
| La otra orilla | Al sur de la desembocadura solo había unas barracas de pescadores (una fuente las remonta al siglo XVI). El poblado nace en 1720, cuando se traslada allí el lazareto desde Montolivet; la ermita es de 1796 | En la escena hay siete barracas de paja a dos aguas, una barca varada, redes, un cercado de cañas y un sendero. Sin casas de labor, sin lazareto y sin ermita. El número y el sitio son un esbozo |
| Aros de río abajo | Cuatro fichas que no cuentan para los dieciocho: la huerta, Natzaret, el Grau y la playa. El aro está en el agua; la ficha dice lo que es estimación | No forman parte del paseo. Al cruzar la línea del final, el mapa y el cuaderno pasan a estos cuatro; al volver, regresan los dieciocho |

Las atarazanas y la iglesia, en jdiezarnal.com: [atarazanas](https://www.jdiezarnal.com/valenciaatarazanas.html) y [Santa Maria del Mar](https://www.jdiezarnal.com/valenciaiglesiadesantamariadelmar.html). La ficha del Ayuntamiento: [Atarazanas del Grau](https://www.valencia.es/-/infociudad-atarazanas-del-grau). El río, el Riuet y el mar como límites del Grau los cuenta Boira Maiques, Josep Vicent: «El paisatge tradicional del Grau de València als gravats i plànols històrics (segles XVI-XIX)», Cuadernos de Geografía de la Universitat de València, 108-109, 2022, pp. 399-424 (<https://turia.uv.es/index.php/CGUV/article/view/23657>). No se ha usado para 1700 la idea de que la playa romana llegaba a la plaça d'Hondures: esa plaza está tierra adentro, en Algirós.

### Playa y Grau, segunda pasada (10 de octubre de 2026)

José Aledón, «La pesca en la playa de Valencia entre los siglos XV y XVIII», *El Periódico de Aquí*, 30 de mayo de 2023 (<https://www.elperiodicodeaqui.com/valencia/ciudad-de-valencia/la-pesca-en-la-playa-de-valencia-entre-los-siglos-xv-y-xviii_317108_102.html>). Cita a Escolano (1611), un protocolo notarial de 1486, las Ordinacions de 1673 y a Corones y Alberola. El baluarte, en la ficha de Vigías del Mediterráneo (<http://www.vigiasdelmediterraneo.com/vdm/torres/torre-baluarte-del-grau-de-valencia/>), que es una recopilación, no un plano. El GPS de esa ficha no se ha pasado a la orilla estimada de la escena.

| Elemento | De dónde sale | Fiabilidad |
| --- | --- | --- |
| Baluarte del Grau | Torre de Cebolla o del Puche. Siglo XVI, cadena de Felipe II, al norte de la desembocadura, sobre arena. Planta cuadrada con dos cubos redondos. En pie en 1700; vendido en 1850 y derribado en 1855. Aledón recuerda el artillado de finales del XVI: un cañón de batir, dos culebrinas grandes, una mediana y dos piezas viejas de hierro | La existencia y la planta, en lo grueso, con fuente. Qué dos esquinas llevaban los cubos no se dice: en la escena son las del lado del mar. Las medidas son un esbozo |
| Barracas del arenal | El protocolo de 1486 describe una barraca en el Cabañal para guardar aparejos, con la playa delante y el senillar detrás. Escolano (1611) cuenta más de cuarenta a un tiro de cañón del Grau. Las Ordinacions de 1673 las quieren en los trajos y al menos a trescientos pasos (unos 200 m) de las torres, y vedan el fuego visible de noche. Corones, citado por Aledón, recuerda la playa aún rala antes del bou: juncos, matorral y dunas, y ocho o diez familias en el recuerdo de los viejos. El pueblo del Cabanyal crece después de la paz con los corsarios, en la década de 1780. Del plano de Mansilla (1722), Aledón dice que las barracas del arenal van casi todas sin nombre, como almacén; ese plano no se ha visto | La hilera está en la orilla que la barca puede acercarse, playa delante, a oscuras de noche. La más próxima al baluarte queda a unos 280 m. Son nueve (cinco al norte, cuatro al sur), no las cuarenta de 1611 ni el pueblo posterior. El número y el sitio exacto son un esbozo |
| Pesca del bou y bueyes | Aledón, citando a Corones, sitúa la entrada del bou en Valencia hacia 1720. Antes, la playa era juncos y dunas móviles | Los bueyes que sacan la barca son de ese arte ya asentado, no de 1700 en concreto. Unas pocas yuntas: anacronismo leve, a propósito |
| Trajos y barcas varadas | Las Ordinacions de 1673 agrupan las barcas en los trajos, aseguradas y sin aparejos fuera de temporada | Que estén juntas en la arena, con fuente. Los cascos, los palos cortos y el número son un esbozo |
| Redes tendidas | No hay una cita usada que las describa pieza a pieza | Esbozo. Es lo que se hace con el aparejo al secar |
| Cobertizos junto a las atarazanas | Las Drassanes sí están documentadas como almacén (provisiones en 1707, sal en 1715). Los tres cobertizos de al lado no tienen nombre | Inventados |
| Cascos en la rada | No hay puerto de obra hasta finales del XVIII. La rada abierta es la consecuencia; los cinco cascos, con vela latina y luz en el palo, no salen de un inventario. Uno lleva un segundo palo y una carroza para que se lea desde la boca | Inventados. Están más cerca de la desembocadura que en el primer esbozo, fuera de la línea de salida |
| Dunas, cañas, gaviotas, rompiente | Corones habla de juncos, matorral y dunas móviles en el Canyamelar y el Cabanyal. El senillar detrás de la barraca está en el protocolo de 1486 | El tipo de terreno, con fuente. La rompiente, las gaviotas y cada mata son ambiente |
| Luces de noche | Las ordinaciones vedan el fuego visible en la playa. Por eso las barracas van a oscuras. Hay faroles en las torres y la puerta del baluarte, otro en la cabeza del embarcadero, algunos en el alero del caserío, una luz en los palos de la rada y otra en la barca que faena al sur de la boca | Esbozo de dónde se podía tener luz resguardada, no un censo de faroles |

### La orilla que la barca alcanza (10 de octubre de 2026)

El casco no se detiene en `waterHalf`. El tope está en `bankLimit` de `src/boat.js`: 340 m de semiancho en la boca y 480 m mar adentro. `src/sea.js` no puede cambiarlo. Lo que sí hace es no abrir la arena más allá de ese tope: la arena seca queda unos 22 m por fuera (el agua navegable llega a 15–25 m de la orilla frente al Grau, el embarcadero y la hilera). La malla de agua de `src/water.js` sigue siendo más ancha (480 m en la boca, 700 m al final). Desde el centro del cauce esa orilla sigue a unos 360 m y se lee como perfil; la playa se distingue al llegar al tope.

| Elemento | De dónde sale | Fiabilidad |
| --- | --- | --- |
| Orilla recortada al tope del casco | El cauce real no medía 700 m. El recorte es para que la barca no se quede a 130–200 m de una arena que no puede pisar | Decisión de escena. No es un plano de la costa |
| Embarcadero en esa orilla | Las fuentes lo ponen en playa abierta, junto a las atarazanas. Esas naves quedan casi 190 m tierra adentro del tope, así que el muelle se ha dibujado en la arena que la barca sí aborda, y queda fuera del agua navegable | Esbozo de sitio. Sigue siendo de madera, sin muelle de piedra |
| Vida en las dos orillas de la boca | Barcas varadas, redes, una barraca de pescadores, cañas, dunas, alguna figura y una yunta, en los primeros metros de arena a cada lado de la boca. Una barca pequeña faena al sur, a unos 60 m del centro, en el agua | El tipo, con las fuentes de arriba. Cada pieza es esbozo. No hay sólidos en el agua navegable: el casco los atravesaría, porque `boat.js` no choca con mallas |
| Barras y rompiente | El plan ya pedía barras en la desembocadura. Están aguas abajo de la boca, fuera del rumbo recto al Grau, con espuma en el labio y sobre la barra | Ambiente. La forma de cada bajo es un esbozo |

## Pendiente

- Cotejar muralla, puertas y puentes con el plano de Tomás Vicente Tosca (1704). Todavía no se ha usado: el trazado actual sale solo del callejero moderno.
- Ver el plano de Tosca y los grabados: toda la revisión de monumentos se hizo sobre textos.
- Sustituir Wikipedia por fuentes primarias o bibliografía donde importe.
- Revisar las traducciones al valenciano y al inglés con hablantes nativos.
- La forma de la barca de la Albufera ya se ha cotejado con el artículo de Falck; siguen siendo estimación la manga y el resto de medidas que ese texto no da. Sigue en pie que el paseo por el Turia es una licencia.

- **Tierra tras la costa (10-oct-2026):** el terreno detrás de la huerta y de la playa, la línea de árboles al fondo de la arena, las arboledas, las alquerías sueltas y el camino arbolado hacia el Grau son relleno puesto a ojo para que el Grau se vea asentado en la orilla. Que existía un Camí del Grau entre la ciudad y el Grau, al norte del río, es cierto; su trazado aquí no está tomado de ningún plano.

- **Detalle de cerca de los edificios singulares (10-oct-2026, revisado con capturas antes/después):** tracería y ventanas ojivales del Micalet, rosetón y puerta de los Apóstoles, cimborrio y girola de la Seu, galería del Real, portada y espadaña de la Trinitat, recercos y puerta de Sant Pius V, pantalla y cúpula de Corpus Christi, almenas y ventanales de la Lonja. Es un esbozo a partir de fotografías de Wikimedia Commons y del grabado de 1807 de Antonio y Pedro Vicente Rodríguez; huellas y alturas totales no cambian, salvo 0,45 m de cornisa en el ala de la Lonja. Sant Pius V no lleva la cúpula azul: Tosca (1704) da la iglesia por no empezada y la cúpula es de 1728–1744. Corpus Christi estaba en obras en 1704, así que su pantalla y su cúpula acabadas son un esbozo, y su torre es la del modelo genérico de iglesia. La torre del claustro de la Trinitat sigue siendo una suposición. Los arbotantes de la Seu no están.

- **Detalle de puertas y puentes (10-oct-2026, revisado con capturas antes/después):** esbozo. Los matacanes con arquillos bajo las almenas (Serrans, Quart, Portal Nou y torres cuadradas) resumen el cadalso; el número de ménsulas por cara no está medido. La tracería de Serrans es un panel con maineles y un friso de lancetas, bajo los tres arcos de los matacanes del cuerpo central; por la ciudad (rehecho el 12-oct-2026 sobre una fotografía actual de la trasera), cada torre se abre en grandes arcos apuntados, una sala sobre otra, y el cuerpo central en uno solo sobre el arco de paso, con la escalinata corriendo a lo largo de la trasera de la torre de poniente hacia la puerta, hasta el suelo de las salas medias (así en el modelo 3D de Google Maps y en la foto; su largo y ancho son estimados); las alturas de cada sala son lectura de la foto, y los arcos son huecos oscuros sin interior. Según las vistas aéreas actuales, el cuerpo central se queda por detrás en una terraza al nivel de las salas altas, con un tramo de escalera hasta el adarve del muro delantero, y el cuerpo alto de las torres va un 13 % más estrecho que el fuste; la escalera de la terraza está simplificada a un solo tramo. Quart no lleva los impactos de 1808. El Portal del Real pasa a arco de dos centros. En los puentes la arquivolta va por fuera del hueco: ni la luz ni la altura libre cambian. Las escaleras de bajada de Sant Josep, Serrans y la Mar son la inventada de «una por puente». En el de la Mar no consta en qué orilla estaba la cruz y en cuál Sant Pasqual. La cubierta en pirámide de los casalicios es lectura propia.

### Barracas de Natzaret y aparejo de la playa (11 de octubre de 2026)

La forma de la barraca sale de las que siguen en pie en el Palmar y en Alboraia (fotografías de Wikimedia Commons): planta rectangular, muro bajo encalado, paja a dos aguas muy pendiente, puerta y ventanuco en el hastial, cruz en la cumbrera. Las barcas con puntales y las yuntas de bueyes salen de Sorolla (*Barcas en la playa*, 1894, y *La vuelta de la pesca*), casi dos siglos después: valen como imagen, no como dato.

| Elemento | De dónde sale | Fiabilidad |
| --- | --- | --- |
| Aparejo de la playa del Grau | Barcas varadas con puntales, redes y velas a secar, cabrestantes, anclas, nasas, toneles, leña, sombrajos y algunas figuras | El tipo, con las fuentes de arriba; el número y el sitio de cada pieza, esbozo. Los bueyes son el anacronismo leve ya anotado |
| Arenal sur | La misma playa, más rala: dos barracas, dos barcas y matas en las dunas | Ambiente |
