# València Antiga

Paseo interactivo en 3D por el Turia y la València amurallada de hacia 1700, hecho para el navegador.

El visitante navega en barca por el río, que entonces hacía de foso natural, y ve la ciudad desde fuera: la muralla, sus puertas, los puentes y el perfil de torres y campanarios.

> **Estado:** v0.1 hecha (río navegable con muralla de prueba), pendiente de probar en un móvil real. La muralla aún no sigue el trazado histórico.

## Enfoque

- **Época:** hacia 1700. Es la fecha mejor documentada de la ciudad amurallada gracias al plano del Padre Tosca (1704), que la dibuja edificio a edificio.
- **Aspecto:** estilizado, tipo low-poly. Toda la geometría se genera con código; no hay modelos 3D hechos a mano.
- **Tecnología:** una página estática con [three.js](https://threejs.org/). Sin backend ni paso de compilación en las primeras versiones.
- **Idioma:** código y comentarios en inglés; textos visibles en español (con topónimos en valenciano donde sea lo natural).

## Plan por versiones

Cada versión deja algo que se puede abrir y recorrer. No se empieza una hasta dar por buena la anterior.

### v0.1 — El río navegable

Lo mínimo para comprobar que la idea funciona.

- Tramo de río con agua sencilla, orillas y cielo.
- Barca con control por teclado (y táctil en móvil).
- Una muralla recta de prueba con unas pocas torres repetidas.
- Cámara en tercera persona siguiendo la barca.

**Se da por buena si:** se puede recorrer el tramo de punta a punta con fluidez en un móvil de gama media.

### v0.2 — El trazado real

La ciudad pasa de decorado genérico a tener la forma de València.

- Curso del Turia y perímetro de la muralla cristiana (1356) según el plano de Tosca.
- Las puertas que dan al río en su sitio, con las Torres de Serranos reconocibles.
- Los cinco puentes históricos: Sant Josep, Serrans, Trinitat, Real y del Mar.
- Relleno de casas genéricas dentro de la muralla para dar volumen.

**Se da por buena si:** alguien que conoce València reconoce dónde está sin leer ningún cartel.

### v0.3 — Los edificios que se reconocen

- Siluetas propias para el Micalet y la Seu, la Lonja, el Palacio del Real y los conventos de la orilla izquierda.
- Torres de Quart y resto de puertas grandes (Sant Vicent, la del Mar).
- Pretiles del río, escaleras y azudes.

### v0.4 — La historia

- Puntos de interés: al acercarse a un puente, puerta o edificio aparece una ficha breve con su historia.
- Minimapa basado en el plano de Tosca con la posición de la barca.
- Recorrido guiado opcional, además de la navegación libre.

### v0.5 — Ambiente

- Ciclo de día y noche, niebla de río y reflejos en el agua.
- Vida en la escena: otras barcas, lavanderas, humo de chimeneas, pájaros.
- Sonido ambiente (agua, campanas).

### v1.0 — Publicación

- Pantalla de inicio, ayuda de controles y créditos con las fuentes.
- Ajuste de rendimiento y de calidad gráfica según el dispositivo.
- Despliegue como página pública.

### Ideas para después

- Bajar de la barca y entrar andando por una puerta.
- Comparar épocas: València musulmana, la de 1700 y la actual.
- La riada de 1957 y el desvío del río.

## Rigor histórico

Lo que más cuesta de este proyecto no es el 3D sino colocar cada cosa donde estaba. Reglas:

- Todo dato histórico que aparezca en la escena o en las fichas lleva fuente, anotada en `docs/sources.md` (por crear).
- Donde no haya documentación se inventa con criterio y se marca como reconstrucción libre.
- Fuente principal: plano de Tomás Vicente Tosca, *Valentia Edetanorum* (1704).

Datos de partida, pendientes de contrastar antes de modelarlos:

| Dato | Valor |
| --- | --- |
| Muralla cristiana | Levantada en 1356, derribada en 1865 |
| Puertas | 12 en total; 4 grandes: Serrans, Quart, Sant Vicent y la del Mar |
| Restos en pie | Torres de Serranos y Torres de Quart |
| Puentes históricos | Sant Josep, Serrans, Trinitat, Real y del Mar |

## Estructura prevista

```
valencia-antiga/
├── index.html      # página y arranque de la escena
├── src/            # módulos de la escena (river, walls, bridges, boat…)
├── data/           # trazados y puntos de interés
└── docs/           # fuentes y notas históricas
```

## Desarrollo

Al ser una página estática basta con servir la carpeta:

```bash
python3 -m http.server 8080
```

y abrir `http://localhost:8080`. Con `?debug` al final de la URL se muestran los fps, las draw calls y los triángulos.

Controles: `W`/`S` o flechas para avanzar y ciar, `A`/`D` para el timón; en pantalla táctil, arrastrar el dedo.

## Publicación

La página está en Cloudflare Pages: <https://valencia-antiga.pages.dev/>

```bash
bash scripts/deploy.sh
```

El script sube solo `index.html` y `src/`.
