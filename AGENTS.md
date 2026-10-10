# Instrucciones para agentes — València Antiga

Paseo 3D en three.js (0.170.0, import map desde CDN) por el Turia y la València de hacia 1700. Publicado en https://valencia-antiga.pages.dev/. Lee antes `README.md` (módulos, controles) y `docs/sources.md` (fiabilidad de cada dato). Referencia de la API de three.js: `.claude/skills/threejs-*` (geometry, materials, lighting, textures, shaders); si chocan con lo de aquí, manda este fichero.

## Reglas

- Página estática: **sin build, sin bundler, sin imágenes ni audio dentro de la escena**. Texturas pintadas por código (`src/materials.js`), sonido sintetizado (`src/sound.js`).
- Código e identificadores en **inglés**; lo que lee el usuario, en `src/i18n.js` y `data/points.json` (castellano, valenciano, inglés). El texto visible debe estar también en el HTML.
- Todo lo que la escena o una ficha afirma necesita fuente en `docs/sources.md`. Donde no hay documentación se inventa con criterio **y se dice**.
- Lo repetido va por instancias (`src/instancing.js`): no crear un mesh por casa o árbol. Vigila triángulos y llamadas de dibujo.
- La calidad se estima sola y baja si caen los fps (no sube sola); las sombras solo en calidad alta.
- `data/layout.json` se regenera con `python3 scripts/build-layout.py`; no editarlo a mano. Origen en las Torres dels Serrans: x al este, z al sur.
- El tramo del mar (huerta, Grau, playa; ver `docs/sea-plan.md`) no entra en el minimapa, ni en los 18 puntos, ni en los metros, ni en el recorrido guiado.

## Probar en local

```bash
python3 -m http.server <puerto>
```

- **Usa un puerto nuevo tras cada edición**: el navegador cachea módulos y JSON.
- `?debug` muestra fps/triángulos/calidad y expone `window.__valencia` (boat, guide, path, layout, focus, camera). `?touch` activa los mandos táctiles.
- Para fotografiar algo lejos del río, usa un vuelo (`focus.subject`, `focus.flight`), no muevas la cámara a mano: lo lejano está oculto por el recorte de instancias.
- Si el navegador automatizado va a 2-3 fps, comprueba que el renderer WebGL no sea «SwiftShader».

## Publicar (en cada cambio, salvo que se pida lo contrario)

1. Commit semántico y push.
2. Etiqueta anotada `vX.Y.Z` (`feat` sube el menor y pone parche a 0; `fix`/`style`/`docs`/`chore` suben el parche; parte de `git describe --tags`) y `git push origin --tags`.
3. `bash scripts/deploy.sh`.
4. Comprueba la URL pública.

**Trampa de wrangler:** `wrangler pages project create` crea un Worker; para un proyecto de Pages hay que pasar `--force`. Ejecuta wrangler siempre desde este repo con `--project-name` explícito.

## Qué NO hacer

- No añadir dependencias, build ni assets externos sin pedirlo.
