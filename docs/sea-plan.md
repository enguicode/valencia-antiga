# Plan: seguir río abajo hasta el mar

> **Estado:** apuntado el 7 de octubre de 2026 y hecho el mismo día.

## Qué se quiere

Que quien llegue al final del paseo pueda seguir navegando: el río entre la huerta, la desembocadura, el Grau y la playa.

Dos condiciones puestas por el autor:

- **No entra en el mapa.** Era la primera decisión: el mapa se quedaba en la ciudad. El 8 de octubre de 2026 se cambió. Al cruzar una línea clara en el agua, donde acaba el paseo, el mapa y los puntos pasan al río hasta la playa, y vuelven si se regresa. Los dieciocho y el recorrido guiado siguen siendo los de la ciudad.
- **Es para quien quiera seguir.** El paseo, sus dieciocho puntos y el recorrido guiado se quedan como están. El tramo del mar es una continuación al final, no una parte del recorrido. La cuenta de metros, pasada la línea, empieza otra vez desde ahí hasta la niebla.

## Lo que hay ahora

Esto era el punto de partida, el 7 de octubre por la mañana, antes de hacerlo.

- Desde el 7 de octubre de 2026 el final del tramo es un banco de niebla que devuelve al principio del paseo. Cuando exista el tramo del mar, esa niebla tendrá que irse al nuevo final, mar adentro, o quitarse.

- El tramo navegable acaba 450 m después del Pont de la Mar (`RIVER.downstreamRun` en `src/config.js`); la barca se para ahí en seco (`path.end`, en `src/boat.js`).
- El curso del río sale de los puentes actuales sobre el viejo cauce (`RIVER_BRIDGES` en `scripts/build-layout.py`) y termina en el Pont del Regne de València: unos 800 m más allá del final navegable. De ahí al mar no hay datos.
- El mar no existe en la escena. El suelo llega a 1.100 m del río (`BANK.extent`) y la niebla tapa el resto.

## Lo que hay que averiguar antes de dibujar nada

Esto se preguntaba antes de dibujar. Lo que se ha podido contestar está en `docs/sources.md`, y solo hasta donde llega: el curso después del Assut y la orilla del mar siguen en estimación.

1. **Por dónde iba el río.** El viejo cauce es hoy el Jardí del Túria hasta la Ciutat de les Arts; el último trecho hasta el puerto está en OpenStreetMap como cauce antiguo. Hay que ver si el trazado actual vale para 1700 o si el río divagaba. Del Pont del Regne al Assut de l'Or, sí: el curso pasa por el centro de los puentes actuales de Montolivet y del Assut de l'Or, como el resto del cauce, y es el jardín de hoy, que ocupa el viejo cauce. Del Assut a la costa, no: sigue en estimación. Ese tramo está enterrado, la línea va hacia el este y sale al mar al sur del Grau, y no se ha cotejado con un plano de 1700.
2. **Dónde estaba la orilla del mar.** La costa ha avanzado con las obras del puerto; la playa de 1700 quedaba más adentro que la de hoy. Sin un plano de la época, la línea de costa será una estimación y habrá que decirlo. Sigue en estimación: unos 70 m al este de las Drassanes, muy al oeste de la playa de ahora. Los grabados de finales del XVIII aún las ponen junto al mar, y la playa actual queda cerca de 1 km más afuera. El texto de la ficha lo dice.
3. **Cómo era el Grau.** Un pueblo aparte, con su iglesia de Santa Maria del Mar, las atarazanas, alguna defensa y un embarcadero de madera en playa abierta, sin puerto de obra hasta finales del XVIII. Todo esto es de memoria: hay que contrastar qué había en pie hacia 1700 y qué forma tenía. Contrastado en lo que había en pie; la forma es un esbozo. La iglesia está donde está hoy: la torre, acabada hacia 1689, obras desde 1683, y el templo sin terminar hasta 1736. En la escena se ve entero, con cúpula. Las atarazanas, cinco naves de unos 10 por 48 m del siglo XIV, seguían en pie junto a la playa como almacén (provisiones en 1707, sal en 1715). El embarcadero es de madera, en playa abierta. Hubo obras de Tomás Güelda a finales del XVII, pero no un puerto de obra, y no se ha dibujado un muelle de piedra. De alguna defensa, las fuentes usadas no dicen nada.
4. **Qué había entre la ciudad y el mar.** Huerta, alquerías, acequias, el camino del Grau, algún molino. Y qué había en la otra orilla. Huerta, cañas, acequias, alquerías y barras: es lo que las fuentes dicen que había, sin plano de cada pieza, y el detalle está inventado. El camino y el molino no salen pieza por pieza: en la escena hay un camino de tierra en la orilla norte, que no pretende ser el trazado medido, y un molino junto a la acequia, sin nombre. En la otra orilla, Natzaret ya existía al sur; en la escena solo hay huerta y tres barracas, no el pueblo, a propósito.

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

- El mapa: en la ciudad sigue el tramo de ahora, con la marca de la barca parada en el borde si se sale un momento. Pasada la línea, cambia a la hoja del río y la playa, y la marca se mueve. (La decisión de dejarlo siempre en la ciudad se cambió el 8 de octubre de 2026.)
- La cuenta «X m de 3014» y los dieciocho puntos, mientras se está en la ciudad. Pasada la línea, la cuenta y el cuaderno son los de ese tramo.
- El recorrido guiado, que sigue acabando donde acaba hoy.

### 4. Comprobaciones

- Que el paseo de ahora queda idéntico: los dieciocho puntos, el recorrido guiado completo con cada barca y el mapa.
- Rendimiento: el río pasa de 3 km a unos 6. Las cintas de agua y orilla ya se dibujan por ventanas; hay que mirar el suelo, los árboles y la niebla.
- A velocidad de barca son unos diez minutos más de huerta. Con la lancha o el hidroplano, uno o dos.

## Decisiones pendientes del autor

Eran estas, y se cerraron el mismo día.

1. **La marca de la barca en el mapa** cuando se sale del tramo: que se quede parada en el borde, que desaparezca, o que una flecha indique que se ha seguido río abajo.
2. **Aviso al pasar el final:** nada, o un cartel breve («Aquí acaba el paseo; el río sigue hasta el mar»).
3. **Fichas en el tramo nuevo:** ninguna, o alguna que no cuente para el total (el Grau, la playa), como la de la luna.
4. **Cuánto detalle para el Grau:** depende de lo que den las fuentes; si dan poco, un esbozo honesto antes que inventar.

## Qué se decidió

1. En el mapa, la marca de la barca se queda en el borde de aguas abajo. No desaparece y no hay flecha.
2. Un aviso breve, y una sola vez, al pasar el final: «Aquí acaba el paseo. El río sigue hasta el mar.»
3. Una ficha, la del Grau, que no cuenta, como la de la luna salvo que no cambia la hora. No está en el cuaderno hasta que se encuentra, y la flecha no lleva hasta ella.
4. El Grau es un esbozo honesto a partir de las fuentes de más arriba. La orilla del mar es una estimación, y el texto lo dice.

## Orden propuesto

Ese era el orden, y es el orden en que se hizo. Ya está: primero las fuentes (trazado, costa y Grau), luego el trazado y los dos finales, la huerta y las orillas, la desembocadura con el mar y la playa, el Grau, y al final el mapa, el aviso y la ficha.
