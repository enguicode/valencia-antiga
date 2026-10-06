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

## Pendiente

- Cotejar muralla, puertas y puentes con el plano de Tomás Vicente Tosca (1704). Todavía no se ha usado: el trazado actual sale solo del callejero moderno.
- Contrastar los datos históricos de la tabla del README y el número de arcos de los puentes.
