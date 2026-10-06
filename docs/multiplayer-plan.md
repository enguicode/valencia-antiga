# Plan: un barco por cada persona conectada

> **Estado:** apuntado, sin empezar. Decidido el enfoque (Durable Object de Cloudflare en el plan gratuito); falta el visto bueno para montarlo.

## Qué se quiere

Que cada visitante vea en el río, además de su barca, una barca por cada otra persona que esté navegando en ese momento, moviéndose en tiempo real.

## Por qué hace falta un servidor

Cloudflare Pages solo sirve ficheros: no puede poner en contacto a dos visitantes. Dos navegadores pueden hablarse directamente (WebRTC), pero para encontrarse necesitan igualmente un servidor que los presente, así que no ahorra la pieza.

## Enfoque elegido

Un **Durable Object** de Cloudflare que hace de «sala»:

1. Cada visitante abre una conexión WebSocket con la sala al pulsar «Navegar».
2. Envía su posición, rumbo y velocidad unas 5–10 veces por segundo.
3. La sala reenvía a cada uno las posiciones de los demás.
4. La página pinta cada visitante ajeno con el mismo modelo de barca y suaviza el movimiento entre mensajes.

Es un Worker nuevo en la misma cuenta, con nombre propio (por ejemplo `valencia-antiga-sala`).

## Coste

Cabe en el plan gratuito de Workers. Datos de la documentación de Cloudflare, consultados el 6 de octubre de 2026:

| Límite gratuito | Qué significa aquí |
| --- | --- |
| 100.000 peticiones al día | Los mensajes entrantes de WebSocket cuentan 20 por 1: 2 millones de mensajes al día |
| 13.000 GB-s de cómputo al día | Unas 28 horas diarias de una sala activa, suponiendo 128 MB por sala (cifra supuesta, no sale de la página de precios) |
| Solo almacenamiento SQLite | No afecta: las posiciones no se guardan |

- A 10 envíos por segundo por barca salen unas 55 horas de navegación al día sumadas entre todos (por ejemplo, 10 personas a la vez durante 5 horas y media). A 5 envíos por segundo, el doble.
- Al superar un límite no se cobra nada: las operaciones fallan hasta las 00:00 UTC.
- El plan de pago cuesta 5 dólares al mes como mínimo y solo haría falta con mucho más público. Pasar a él es una decisión manual.

Fuentes: <https://developers.cloudflare.com/durable-objects/platform/pricing/> y <https://developers.cloudflare.com/workers/platform/pricing/>.

## Pasos

### 1. La sala (servidor)

- Carpeta nueva `room/` en este repo, con su propio `wrangler.jsonc` y un Durable Object con almacenamiento SQLite (el único permitido en el plan gratuito).
- Protocolo mínimo en JSON: `hola` (la sala asigna un identificador), `estado` (posición, rumbo, velocidad), `adiós` (alguien se va).
- Límites de protección: tope de personas por sala, tope de mensajes por segundo por conexión y expulsión de conexiones mudas.
- Solo acepta conexiones cuyo origen sea `valencia-antiga.pages.dev`.

### 2. La página (cliente)

- Módulo nuevo `src/crew.js`: abre la conexión, envía el estado propio y mantiene una barca por cada visitante ajeno, reutilizando `createBoatModel()`.
- Interpolación entre mensajes para que las barcas ajenas no vayan a saltos.
- Marcar las barcas de visitantes para distinguirlas de las siete de decorado (un gallardete de color, por ejemplo) y mostrar cuánta gente hay en el río.
- Reconexión automática y degradación limpia: si la sala falla o se agota el cupo, se navega solo, como ahora.

### 3. Despliegue

- `scripts/deploy.sh` sigue desplegando solo la página; la sala se despliega aparte con `wrangler deploy` desde `room/`.
- Ejecutar wrangler desde `room/` y con el nombre del Worker explícito.

### 4. Comprobación

- Dos navegadores a la vez contra la sala: cada uno ve la barca del otro moverse.
- Cerrar una pestaña: su barca desaparece en la otra.
- Apagar la sala: la página sigue funcionando en solitario y sin errores.

## Decisiones abiertas

- **Una sala o varias.** Una sola sala para todos es lo más simple; con mucha gente habría que repartir.
- **Nombres.** Si las barcas ajenas llevan nombre hay que moderar lo que la gente escribe; sin nombres no hay nada que moderar. Propuesta: sin nombres.
- **Aviso de privacidad.** No se guarda nada, pero cada visitante ve la posición de los demás en el río; convendría decirlo en los créditos.
- **Choques entre barcas.** Propuesta: no, se atraviesan, igual que hoy con las de decorado.
