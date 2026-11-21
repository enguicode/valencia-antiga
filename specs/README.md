# Specs de València Antiga

El desarrollo va guiado por specs (SDD): **primero se cambia la spec, después el código que la cumple**.

## Principio rector

**Cada cosa donde estaba, y lo que se inventa se dice; y el paseo tiene que seguir yendo suave en un móvil.** La escena es una reconstrucción honrada: lo que afirma tiene fuente en [docs/sources.md](../docs/sources.md). Al revisar cualquier cambio, las preguntas son «¿de dónde sale esto?» y «¿cuánto cuesta dibujarlo?».

## Cómo se trabaja

1. Antes de tocar código, se escribe o se cambia la spec de la parte: qué hace, reglas y **criterios de aceptación** que se puedan comprobar (una vista de dron, `?debug` con fps y triángulos, una captura como móvil).
2. Lo que aún no está hecho lleva la marca **(pendiente)**. Al publicarlo, se quita la marca y el criterio pasa a `- [x]`.
3. El commit de código nombra la spec que cumple (por ejemplo `specs/points.md`).
4. Si al implementar algo la spec resulta equivocada, se corrige la spec en el mismo cambio.

Para revisar la geometría: primero la vista cenital, luego cuatro fotos cada 90° con el picado del dron y luego el detalle; nada está «revisado» sin mirarlas.

## Índice

| Spec | Qué cubre |
| --- | --- |
| [scene.md](scene.md) | Río, muralla, puentes, edificios, trazado y fuentes |
| [boat.md](boat.md) | Navegar, las diez embarcaciones y los controles |
| [points.md](points.md) | Aros, modo cine, la luna, el cuaderno y el recorrido guiado |
| [time-and-sound.md](time-and-sound.md) | La hora del día, luces de noche, vida y sonido |
| [walk.md](walk.md) | Bajar a tierra a caballo |
| [sea.md](sea.md) | El tramo hasta el mar (huerta, Natzaret, Grau, playa) |
| [interface.md](interface.md) | Portada, barra de avance, menú, mapa, idiomas y donar |
| [quality.md](quality.md) | Calidad gráfica, instancias y coste |
