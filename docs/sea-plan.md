# Plan: seguir río abajo hasta el mar

> **Estado:** apuntado el 7 de octubre de 2026, sin empezar. Previsto para la semana del 12 de octubre.

## Qué se quiere

Que quien llegue al final del paseo pueda seguir navegando: el río entre la huerta, la desembocadura, el Grau y la playa.

Dos condiciones puestas por el autor:

- **No entra en el mapa.** El mapa de arriba a la derecha sigue enseñando el tramo de ahora, de las Torres de Quart al Pont de la Mar, y nada más.
- **Es para quien quiera seguir.** El paseo, sus dieciocho puntos, la cuenta de metros y el recorrido guiado se quedan como están. El tramo del mar es un añadido al final, no una parte del recorrido.

## Lo que hay ahora

- Desde el 7 de octubre de 2026 el final del tramo es un banco de niebla que devuelve al principio del paseo. Cuando exista el tramo del mar, esa niebla tendrá que irse al nuevo final, mar adentro, o quitarse.

- El tramo navegable acaba 200 m después del Pont de la Mar (`RIVER.downstreamRun` en `src/config.js`); la barca se para ahí en seco (`path.end`, en `src/boat.js`).
- El curso del río sale de los puentes actuales sobre el viejo cauce (`RIVER_BRIDGES` en `scripts/build-layout.py`) y termina en el Pont del Regne de València: unos 800 m más allá del final navegable. De ahí al mar no hay datos.
- El mar no existe en la escena. El suelo llega a 1.100 m del río (`BANK.extent`) y la niebla tapa el resto.

## Lo que hay que averiguar antes de dibujar nada

Hoy no hay ninguna fuente contrastada para este tramo. Lo que sigue son cosas por comprobar, no datos:

1. **Por dónde iba el río.** El viejo cauce es hoy el Jardí del Túria hasta la Ciutat de les Arts; el último trecho hasta el puerto está en OpenStreetMap como cauce antiguo. Hay que ver si el trazado actual vale para 1700 o si el río divagaba.
2. **Dónde estaba la orilla del mar.** La costa ha avanzado con las obras del puerto; la playa de 1700 quedaba más adentro que la de hoy. Sin un plano de la época, la línea de costa será una estimación y habrá que decirlo.
3. **Cómo era el Grau.** Un pueblo aparte, con su iglesia de Santa Maria del Mar, las atarazanas, alguna defensa y un embarcadero de madera en playa abierta, sin puerto de obra hasta finales del XVIII. Todo esto es de memoria: hay que contrastar qué había en pie hacia 1700 y qué forma tenía.
4. **Qué había entre la ciudad y el mar.** Huerta, alquerías, acequias, el camino del Grau, algún molino. Y qué había en la otra orilla.

Dónde mirar: la web de jdiezarnal.com (tiene páginas del Grau y de las atarazanas), la Viquipèdia, y planos y vistas del Grau del XVIII. Como siempre, cada dato va a `docs/sources.md` con su grado de fiabilidad.

## Cómo se haría

### 1. El trazado

- Añadir al script los puntos que faltan del cauce hasta el mar y una línea de costa.
- El trazado tendrá dos finales: el del paseo, que es el de ahora, y el del mar. Todo lo que hoy usa `path.end` como «final del paseo» (cuenta de metros, mapa, recorrido guiado, reparto de barcas de adorno, faroles y bolas del pretil) sigue usando ese; solo el límite de la barca pasa al nuevo.

### 2. La escena

- **El río después del Pont de la Mar:** sin pretiles ni muralla, con orillas bajas de cañas y tierra, y huerta a los dos lados (campos, alguna alquería, acequias).
- **La desembocadura:** el cauce se abre, con barras de arena.
- **El mar:** una lámina de agua hasta el horizonte con un oleaje más largo que el del río, y la playa.
- **El Grau:** el caserío, la iglesia, las atarazanas y el embarcadero, con barcas varadas en la arena. Con el detalle que permitan las fuentes; lo demás, esbozo declarado.
- **El límite:** mar adentro la barca tiene que poder alejarse un trecho y encontrar un final con sentido, no una pared.

### 3. Lo que no cambia

- El mapa: se queda en el tramo de ahora. Falta decidir qué hace la marca de la barca cuando sale de él (ver abajo).
- La cuenta «X m de 2764», los puntos de interés y su total.
- El recorrido guiado, que sigue acabando donde acaba hoy.

### 4. Comprobaciones

- Que el paseo de ahora queda idéntico: los dieciocho puntos, el recorrido guiado completo con cada barca y el mapa.
- Rendimiento: el río pasa de 2,8 km a unos 6. Las cintas de agua y orilla ya se dibujan por ventanas; hay que mirar el suelo, los árboles y la niebla.
- A velocidad de barca son unos diez minutos más de huerta. Con la lancha o el hidroplano, uno o dos.

## Decisiones pendientes del autor

1. **La marca de la barca en el mapa** cuando se sale del tramo: que se quede parada en el borde, que desaparezca, o que una flecha indique que se ha seguido río abajo.
2. **Aviso al pasar el final:** nada, o un cartel breve («Aquí acaba el paseo; el río sigue hasta el mar»).
3. **Fichas en el tramo nuevo:** ninguna, o alguna que no cuente para el total (el Grau, la playa), como la de la luna.
4. **Cuánto detalle para el Grau:** depende de lo que den las fuentes; si dan poco, un esbozo honesto antes que inventar.

## Orden propuesto

1. Fuentes: trazado, costa y Grau. Sin esto no se dibuja.
2. Trazado y los dos finales, con el río vacío hasta el mar. Comprobar que el paseo de ahora no cambia.
3. Huerta y orillas.
4. Desembocadura, mar y playa.
5. El Grau.
6. Decisiones del mapa, el aviso y las fichas.
