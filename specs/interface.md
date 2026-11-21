# Interfaz

`index.html`, `minimap.js`, `i18n.js`.

## Hoy

- **Portada** con el momento del día, idioma, Créditos y Donar (el importe lo elige quien paga; también en Ayuda y Créditos). Cinzel y Cormorant Garamond; si no cargan, la serifa del sistema.
- **Pantalla casi libre**: arriba, una tira fina con el avance, una marca por puente y los metros. A la izquierda, el menú (ajustes, controles, créditos, reiniciar puntos) y la cuenta. A la derecha, el mapa, que se amplía al tocarlo. Abajo, recorrido guiado, hora y sonido.
- Al conseguir un punto, todo eso desaparece hasta «Continuar».
- Castellano, valenciano o inglés, en la portada y en los ajustes. El texto que se lee está también en el HTML (para buscadores); al compartir, `og.jpg`.
- Desarrollo: `?debug` (fps, triángulos, calidad, `window.__valencia`), `?touch` y `?drone`.

## Criterios

- [x] Todo texto visible sale de `src/i18n.js` o `data/points.json` en los tres idiomas.
- [ ] Captura como móvil tras tocar la interfaz.
