# La escena

`path.js`, `water.js`, `riverside.js`, `walls.js`, `bridges.js`, `city.js`, `landmarks.js`, `extras/`, `materials.js`; datos en `data/layout.json` (de `scripts/build-layout.py`, no se edita a mano).

## Hoy

- **Río**: el curso real del viejo cauce, agua animada, pretiles con bolas, escaleras y azud aguas arriba.
- **Muralla**: perímetro completo (~4,7 km, 10 m), torres redondas solo en el frente del río, Santa Caterina mayor en la esquina, y doce puertas con forma propia (Jueus tapiada).
- **Cinco puentes**: Sant Josep, Serrans, Trinitat, Real y de la Mar, con sus arcos, tajamares y casalicios o estatuas. Cuatro van unos metros río arriba para desembocar frente a su puerta (ajuste en el script).
- **Edificios**: Micalet, Seu, Lonja, Palau del Real, conventos y quince iglesias; monumentos añadidos después en `src/extras/` (un módulo por monumento, con su fuente en `docs/extras/`). ~2.600 casas y las manzanas calcadas del plano de Tosca (grabado de 1738).
- Origen en las Torres dels Serrans: x al este, z al sur.
- Sin imágenes dentro de la escena: texturas pintadas por código.

## Pendiente

1. (pendiente) Cotejar trazado, puertas y puentes con el plano de Tosca.
2. (pendiente) Fuentes de las fichas más allá de Wikipedia.

## Criterios

- [x] Todo lo que la escena afirma tiene su fila en `docs/sources.md`; lo inventado lo dice.
- [x] `python3 scripts/build-layout.py` regenera `data/layout.json` sin tocarlo a mano.
- [ ] Cada cambio de geometría se revisa con la vista cenital y las cuatro del dron.
