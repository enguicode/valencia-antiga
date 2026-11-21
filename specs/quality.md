# Calidad y coste

`quality.js`, `instancing.js`.

## Hoy

- En automático se estima según el aparato y baja un nivel si los fotogramas se quedan cortos; no vuelve a subir sola. En los ajustes se puede fijar.
- Sombras solo en calidad alta.
- Lo repetido (casas, árboles) va por instancias, que se recortan con la niebla siguiendo a la cámara.
- Página estática: sin build, sin bundler, three.js 0.170.0 desde CDN.

## Pendiente

1. (pendiente) Medir el coste de texturas, sombras y detalle; lo primero que se recortaría son los árboles.

## Criterios

- [x] Ningún mesh suelto por casa o árbol: todo por `instancing.js`.
- [ ] Con `?debug`, anotar fps, llamadas de dibujo y triángulos antes y después de cada cambio de geometría.
