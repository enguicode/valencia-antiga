# València Antiga

Paseo interactivo en 3D por el Turia y la València amurallada de hacia 1700, hecho para el navegador.

**Publicado en <https://valencia-antiga.pages.dev/>**

El visitante baja en barca por el viejo cauce del río, que entonces hacía de foso natural, y ve la ciudad desde el agua: la muralla y sus puertas, los cinco puentes de piedra y el perfil de torres y campanarios. Por el camino hay quince puntos de interés que descubrir, cada uno con su ficha de historia.

Es una reconstrucción aproximada: los sitios están donde estaban, las formas son un esbozo. El detalle de qué es fiable y qué no está en [docs/sources.md](docs/sources.md).

## Qué se puede hacer

| | |
| --- | --- |
| **Navegar** | 2,4 km de río, desde antes del Pont de Sant Josep hasta pasado el de la Mar. La barca frena contra las orillas y se encauza sola por los arcos de los puentes, abatiendo la vela. |
| **Encontrar los puntos de interés** | Junto a cada sitio con historia flota un aro claro sobre el agua. Al entrar en él sale la ficha, la cámara enfoca el sitio (o vuela hasta él si está lejos) y la barca va despacio mientras tanto. Son quince; una flecha en el borde de la pantalla lleva al más cercano que falte. De noche aparece uno más, sobre el dicho de «quedarse a la luna de València». |
| **Repasar lo encontrado** | Tocar la cuenta de arriba a la izquierda abre un cuaderno con los quince puntos; los no descubiertos aparecen en blanco, y los encontrados llevan un ojo que te lleva volando a verlos de cerca. |
| **Recorrido guiado** | La barca baja sola por el centro del río y pasa por los quince aros. Arrastrar solo mueve la cámara. |
| **Cambiar la hora** | Día, atardecer o noche desde la portada o el botón del sol; más horas en los ajustes. De noche se encienden ventanas, faroles y luciérnagas. |
| **Elegir barca** | De la Albufera, con el barquero a la percha, o de río, con timonel sentado. |
| **Elegir idioma** | Castellano, valenciano o inglés, en la portada y en los ajustes. |

## Controles

| Dispositivo | Barca | Cámara |
| --- | --- | --- |
| Teclado | `W` `S` o flechas arriba y abajo para avanzar y ciar; `A` `D` o izquierda y derecha para el timón | — |
| Ratón | Arrastrar con el botón izquierdo | Arrastrar con el botón derecho |
| Pantalla táctil | Mando de abajo a la izquierda | Mando de abajo a la derecha, el del ojo |

En pantalla táctil también vale arrastrar en cualquier parte: el primer dedo lleva la barca y el segundo gira la cámara.

La interfaz deja la pantalla casi libre: arriba a la izquierda, la cuenta de puntos y los metros recorridos; arriba a la derecha, un minimapa que se amplía al tocarlo y, debajo, el botón «Menú», que despliega el reinicio de los puntos, los ajustes y la ayuda. Abajo quedan tres botones redondos sin texto: el momento del día y el sonido en el centro (entre los dos mandos en el móvil) y el recorrido guiado a la izquierda, junto al mando de la barca.

## Qué hay en la escena

- **El río:** el curso real del viejo cauce, con agua animada, pretiles de piedra con bolas, escaleras y un azud que cierra el extremo de aguas arriba.
- **La muralla:** el perímetro completo, unos 4,7 km, de 10 m de alto, con torres redondas solo en el frente del río y siete puertas, cada una con su forma: Portal Nou, Serrans, Trinitat, Real y de la Mar en el lado del río, más Quart y Sant Vicent.
- **Los cinco puentes históricos:** Sant Josep, Serrans, Trinitat, Real y de la Mar, cada uno con su número y forma de arcos, su ancho, sus tajamares y sus casalicios o estatuas.
- **Edificios singulares:** el Micalet, la Seu, la Lonja, el Palau del Real, los conventos de la Trinitat, Sant Pius V, Sant Doménec y la Saïdia, y quince iglesias.
- **Relleno y vida:** 2.600 casas, árboles, siete barcas más, lavanderas, humo de chimeneas y pájaros.
- **Luz y sonido:** hora del día a elegir, sombras, reflejo del cielo en el agua, luces nocturnas, y agua y campana sintetizadas.

## Cómo está hecho

Una página estática con [three.js](https://threejs.org/), cargado desde una CDN. No hay backend ni paso de compilación, ni ficheros de imagen o de sonido: las texturas se pintan por código al arrancar y el sonido se sintetiza en el navegador.

```
valencia-antiga/
├── index.html      # página, estilos e interfaz
├── src/            # módulos de la escena
├── data/           # layout.json (trazado) y points.json (fichas, en tres idiomas)
├── scripts/        # build-layout.py y deploy.sh
└── docs/           # fuentes y planes
```

| Módulo | Qué hace |
| --- | --- |
| `main.js` | Arranque, bucle, cámara (seguimiento, enfoque, vuelo, paso bajo puentes) y cableado de la interfaz |
| `config.js` | Medidas, colores y utilidades comunes |
| `path.js` | Línea central del río y geometría que se barre a lo largo de ella |
| `water.js`, `environment.js`, `riverside.js` | Agua; cielo, luces, orillas y árboles; pretiles, escaleras y azud |
| `walls.js`, `bridges.js`, `city.js`, `landmarks.js` | Muralla y puertas; puentes y paso por los arcos; casas; edificios singulares |
| `materials.js` | Texturas pintadas por código y su proyección por posición |
| `boat.js` | Los dos tipos de barca, su manejo y su animación |
| `guide.js` | Puntos de interés (aros, fichas, cuenta) y piloto del recorrido guiado |
| `atmosphere.js`, `lights.js`, `life.js`, `sound.js` | Hora del día; luces nocturnas; barcas, lavanderas, humo y pájaros; sonido |
| `input.js`, `minimap.js`, `quality.js`, `i18n.js` | Controles; minimapa; calidad gráfica; idiomas |
| `instancing.js` | Agrupa piezas repetidas por celdas para no dibujar lo que tapa la niebla |

Convenciones: código y comentarios en inglés; los textos visibles salen de `src/i18n.js` y de `data/points.json`.

### El trazado

`data/layout.json` se genera con `scripts/build-layout.py` a partir de OpenStreetMap: el río sale de la posición de los puentes actuales sobre el viejo cauce, y la muralla, de las calles de ronda que la sustituyeron tras el derribo. Las coordenadas están en metros desde las Torres dels Serrans, con x hacia el este y z hacia el sur.

```bash
python3 scripts/build-layout.py
```

### Calidad gráfica

En automático parte de una estimación según el dispositivo y baja un nivel si los fps se mantienen bajos; no vuelve a subir sola. También se puede fijar a mano en los ajustes. Las sombras solo se activan en calidad alta.

## Desarrollo

Basta con servir la carpeta:

```bash
python3 -m http.server 8080
```

y abrir `http://localhost:8080`. Dos parámetros ayudan a probar:

- `?debug` muestra fps, draw calls, triángulos y nivel de calidad.
- `?touch` fuerza los mandos táctiles en un ordenador.

Al cambiar código conviene recargar sin caché: el servidor de Python no la invalida.

## Publicación

La página está en Cloudflare Pages:

```bash
bash scripts/deploy.sh
```

El script sube solo `index.html`, `src/` y `data/`. El proyecto de Pages se creó con `wrangler pages project create valencia-antiga --force`; sin `--force`, wrangler crea un Worker en vez de un proyecto de Pages.

## Rigor histórico

Lo que más cuesta de este proyecto no es el 3D sino colocar cada cosa donde estaba. Reglas:

- Todo dato histórico que aparezca en la escena o en las fichas lleva fuente, anotada en [docs/sources.md](docs/sources.md).
- Donde no hay documentación se inventa con criterio y se marca como reconstrucción libre.
- La época elegida, hacia 1700, es la mejor documentada de la ciudad amurallada gracias al plano de Tomás Vicente Tosca, *Valentia Edetanorum* (1704). **Ese plano todavía no se ha usado:** el trazado actual sale solo del callejero moderno.

Estado de los datos:

| Qué | Estado |
| --- | --- |
| Posición de puentes, puertas y edificios | De OpenStreetMap: fiable |
| Curso del río y perímetro de la muralla | Aproximados y suavizados |
| Datos de las quince fichas | Contrastados con Wikipedia en español, una fuente secundaria; los de los portales Nou, de la Trinitat y del Real, con blogs de historia local |
| Muralla cristiana: levantada en 1356, derribo iniciado en 1865 | De memoria; solo consta en Wikipedia que la Puerta del Mar cayó en 1868 |
| Forma de puertas, puentes, Micalet, Seu, Palau del Real, Trinitat y Sant Pius V | Rehecha con lo que dicen las fuentes; las medidas que faltan, estimadas |
| Navegar en barca por el Turia | Licencia: el río no era navegable hacia 1700 |
| Texturas, casas, iglesias menores, luces | Esbozo o invención |
| Traducciones al valenciano y al inglés | Hechas sin revisión de un hablante nativo |

## Historia del proyecto

Se hizo por versiones, cada una navegable:

| Versión | Qué añadió |
| --- | --- |
| v0.1 | Río recto de prueba, barca y muralla genérica |
| v0.2 | Trazado real del río y de la muralla, puertas y los cinco puentes |
| v0.3 | Edificios singulares, pretiles, escaleras y azud |
| v0.4 | Fichas de historia, minimapa y recorrido guiado |
| v0.5 | Día y noche, otras barcas, lavanderas, humo, pájaros y sonido |
| v1.0 | Portada, ayuda, créditos y calidad gráfica |

Después de la v1.0:

- Barca detallada, texturas, sombras y reflejo del cielo.
- Hora fija a elegir, botón del sol y luces de noche.
- Barca tipo Albufera, con barquero que mueve la percha y arría la vela.
- Puntos de interés como aros a los que hay que acercarse, con cámara que enfoca o vuela al sitio y cuaderno de recapitulación.
- Paso real bajo los puentes y más detalle en edificios, puertas y puentes.
- Interfaz nueva: mandos táctiles, menú desplegable bajo el mapa, mapa ampliable.
- Revisión documentada de cada monumento, con las maquetas rehechas.
- Tres idiomas.

## Pendiente

- **Probar en móviles reales.** Casi todo se ha comprobado en un navegador automatizado, lento y sin sonido: faltan la fluidez, los mandos táctiles y cómo suena.
- **Medir el coste gráfico.** Las texturas, las sombras y el detalle han subido mucho la carga; lo primero a recortar serían los árboles.
- **Cotejar con el plano de Tosca** el trazado, las puertas y los puentes.
- **Mejores fuentes** que Wikipedia para las fichas.
- **Revisar las traducciones** con alguien que hable valenciano e inglés.

## Ideas para después

- Un barco por cada persona conectada: plan en [docs/multiplayer-plan.md](docs/multiplayer-plan.md), sin empezar.
- Bajar de la barca y entrar andando por una puerta.
- Comparar épocas: València musulmana, la de 1700 y la actual.
- La riada de 1957 y el desvío del río.
