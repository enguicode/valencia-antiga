// Languages: Spanish, Valencian and English. Static text in the page carries
// a data-i18n attribute naming its string; modules that build text themselves
// call t() and listen for a change of language.

const STORAGE_KEY = 'valencia-antiga.language';
const HTML_LANG = { es: 'es', ca: 'ca-valencia', en: 'en' };
const KBD = (key) => `<kbd>${key}</kbd>`;

const STRINGS = {
  es: {
    'count': '{found} de {total}',
    'status.points': 'puntos',
    'status.of': 'm de',
    'status.title': 'Ver los puntos de interés',
    'card.source': 'Fuente: Wikipedia',
    'card.sourceNamed': 'Fuente: {name}',
    'card.all': 'Has encontrado los {total} puntos.',
    'card.number': 'Punto {number} de {total}',
    'card.again': ' · ya lo tenías',
    'card.bonus': 'Punto extra de la noche',
    'hint.keys': `${KBD('W')} ${KBD('S')} avanzar y ciar · ${KBD('A')} ${KBD('D')} timón · también con las flechas o arrastrando · botón derecho: girar la cámara`,
    'hint.touch': 'Mando izquierdo: la barca. Mando derecho, el del ojo: la cámara',
    'menu': 'Menú',
    'menu.settings': 'Ajustes',
    'menu.help': 'Ayuda y créditos',
    'tour': 'Recorrido guiado',
    'tour.stop': 'Detener el recorrido guiado',
    'tour.notice': 'Recorrido guiado: arrastra para mirar alrededor. Para manejar la barca, toca otra vez el botón de la brújula.',
    'sky.day': 'Día',
    'sky.dusk': 'Atardecer',
    'sky.night': 'Noche',
    'sky.day.next': 'Es de día. Pasar al atardecer',
    'sky.dusk.next': 'Atardece. Pasar a la noche',
    'sky.night.next': 'Es de noche. Volver al día',
    'sound.on': 'Sonido activado',
    'sound.off': 'Sonido apagado',
    'sound.on.next': 'Sonido activado. Silenciar',
    'sound.off.next': 'Sonido apagado. Activar',
    'journal.title': 'Puntos de interés',
    'journal.close': 'Seguir navegando',
    'journal.all': 'Los has encontrado todos: {total} de {total}.',
    'journal.some': 'Llevas {found} de {total}. Los que faltan te esperan río abajo.',
    'journal.unknown': 'Aún por descubrir.',
    'journal.view': 'Ir a verlo de cerca',
    'journal.night': 'Un punto extra. Al llegar, se hace de noche.',
    'intro.eyebrow': 'El Turia hacia 1700',
    'intro.lead': 'Baja en barca por el viejo cauce del Turia y mira la ciudad amurallada desde el agua: la muralla y sus puertas, los cinco puentes de piedra y el perfil de torres y campanarios.',
    'intro.moment': 'Momento del día',
    'intro.language': 'Idioma',
    'intro.controls': 'Controles',
    'intro.credits': 'Créditos y fuentes',
    'intro.donate': 'Donar',
    'intro.note': 'Es una reconstrucción aproximada: los sitios están donde estaban, las formas son un esbozo.',
    'start.loading': 'Cargando…',
    'start.go': 'Navegar',
    'start.failed': 'No se ha podido cargar',
    'start.failed.note': 'Hace falta un navegador con gráficos 3D (WebGL) y conexión para descargar la escena.',
    'help.title': 'Controles',
    'help.keyboard': `<strong>Teclado:</strong> ${KBD('W')} ${KBD('S')} o las flechas arriba y abajo para avanzar y ciar; ${KBD('A')} ${KBD('D')} o izquierda y derecha para el timón.`,
    'help.mouse': '<strong>Ratón:</strong> arrastra con el botón izquierdo para llevar la barca y con el derecho para girar la cámara.',
    'help.touch': '<strong>Pantalla táctil:</strong> el mando de abajo a la izquierda lleva la barca (arriba para avanzar, a los lados para virar) y el de abajo a la derecha, el del ojo, gira la cámara. También puedes arrastrar en cualquier parte de la pantalla.',
    'help.points': '<strong>Puntos de interés:</strong> junto a cada sitio con historia hay un aro claro sobre el agua, con una señal encima. Entra en el aro con la barca para leer su ficha: la cámara se vuelve unos segundos hacia el sitio, o vuela hasta él si está lejos, y regresa sola (o antes, si mueves tú la cámara). Mientras tanto la barca va despacio. La flecha del borde de la pantalla lleva al más cercano que te falte. Hay quince; toca la cuenta de arriba a la izquierda para repasarlos y, con el ojo de cada ficha, volver a verlos de cerca. Hay uno más: al entrar en su aro anochece, y al alejarte vuelve la hora que había.',
    'help.bridges': '<strong>Puentes:</strong> al acercarte, la barca se encauza sola hacia el arco más cercano y abate la vela para pasar por debajo.',
    'help.menu': '<strong>Menú:</strong> el botón que hay bajo el mapa despliega el reinicio de los puntos, los ajustes y esta ayuda. El momento del día y el sonido tienen sus botones redondos abajo, en el centro.',
    'help.tour': '<strong>Recorrido guiado:</strong> la barca baja sola por el centro del río y arrastrar solo mueve la cámara. Para volver a manejarla, toca otra vez el botón de la brújula, abajo a la izquierda.',
    'help.donate': 'Si te apetece, <a href="https://www.paypal.me/ananen" target="_blank" rel="noopener">donar</a>. El importe lo eliges tú.',
    'settings.title': 'Ajustes',
    'settings.sun': 'Abajo, el botón del sol pasa de día a atardecer y a noche. Aquí hay más horas:',
    'settings.language': 'Idioma:',
    'settings.hour': 'Hora del día:',
    'hour.dawn': 'Alba',
    'hour.morning': 'Mañana',
    'hour.noon': 'Mediodía',
    'hour.afternoon': 'Tarde',
    'hour.sunset': 'Ocaso',
    'hour.night': 'Noche',
    'settings.boat': 'Barca:',
    'boat.albufera': 'De la Albufera, con percha',
    'boat.lateen': 'De río, con timonel sentado',
    'settings.reset': 'Volver a empezar los puntos de interés',
    'reset.short': 'Reiniciar puntos',
    'settings.quality': 'Calidad gráfica:',
    'quality.auto': 'Automática',
    'quality.high': 'Alta',
    'quality.medium': 'Media',
    'quality.low': 'Baja',
    'credits.title': 'Créditos y fuentes',
    'credits.layout': '<strong>Trazado:</strong> el curso del río, el perímetro de la muralla y la posición de puentes, puertas y edificios salen de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (© sus colaboradores, licencia ODbL).',
    'credits.cards': '<strong>Fichas de historia:</strong> sus datos están contrastados con Wikipedia en español (licencia CC BY-SA) y, las de tres puertas, con blogs de historia local; cada ficha enlaza su fuente.',
    'credits.engine': '<strong>Motor 3D:</strong> <a href="https://threejs.org/" target="_blank" rel="noopener">three.js</a> (licencia MIT).',
    'credits.sound': '<strong>Sonido:</strong> sintetizado en el navegador; no hay grabaciones.',
    'credits.code': '<strong>Código:</strong> <a href="https://github.com/enguicode/valencia-antiga" target="_blank" rel="noopener">github.com/enguicode/valencia-antiga</a>.',
    'credits.donate': '<strong>Donar:</strong> <a href="https://www.paypal.me/ananen" target="_blank" rel="noopener">PayPal</a>. El importe lo eliges tú.',
    'reliable.title': 'Qué es fiable y qué no',
    'reliable.yes': '<strong>Fiable:</strong> dónde está cada cosa. Puentes, puertas, iglesias y palacios ocupan el lugar que ocupan hoy, o sus restos.',
    'reliable.roughly': '<strong>Aproximado:</strong> la muralla sigue las calles de ronda que la sustituyeron, y el río, la línea de los puentes actuales.',
    'reliable.no': '<strong>Esbozado o inventado:</strong> la forma de los edificios y sus texturas, las barcas, el número y el sitio de las torres, las casas, las escaleras, el azud, y todo lo que se mueve.',
    'version': 'Versión 1.0.',
    'close': 'Cerrar',
    'stick.move': 'Mover la barca',
    'stick.look': 'Mirar alrededor',
  },

  ca: {
    'count': '{found} de {total}',
    'status.points': 'punts',
    'status.of': 'm de',
    'status.title': "Veure els punts d'interés",
    'card.source': 'Font: Viquipèdia (en castellà)',
    'card.sourceNamed': 'Font: {name}',
    'card.all': 'Has trobat els {total} punts.',
    'card.number': 'Punt {number} de {total}',
    'card.again': ' · ja el tenies',
    'card.bonus': 'Punt extra de la nit',
    'hint.keys': `${KBD('W')} ${KBD('S')} avançar i ciar · ${KBD('A')} ${KBD('D')} timó · també amb les fletxes o arrossegant · botó dret: girar la càmera`,
    'hint.touch': "Comandament esquerre: la barca. Comandament dret, el de l'ull: la càmera",
    'menu': 'Menú',
    'menu.settings': 'Ajustos',
    'menu.help': 'Ajuda i crèdits',
    'tour': 'Recorregut guiat',
    'tour.stop': 'Aturar el recorregut guiat',
    'tour.notice': 'Recorregut guiat: arrossega per a mirar al voltant. Per a portar la barca, toca una altra vegada el botó de la brúixola.',
    'sky.day': 'Dia',
    'sky.dusk': 'Capvespre',
    'sky.night': 'Nit',
    'sky.day.next': 'És de dia. Passar al capvespre',
    'sky.dusk.next': 'Es fa de vesprada. Passar a la nit',
    'sky.night.next': 'És de nit. Tornar al dia',
    'sound.on': 'So activat',
    'sound.off': 'So apagat',
    'sound.on.next': 'So activat. Silenciar',
    'sound.off.next': 'So apagat. Activar',
    'journal.title': "Punts d'interés",
    'journal.close': 'Continuar navegant',
    'journal.all': 'Els has trobat tots: {total} de {total}.',
    'journal.some': "Portes {found} de {total}. Els que falten t'esperen riu avall.",
    'journal.unknown': 'Encara per descobrir.',
    'journal.view': 'Anar a veure-ho de prop',
    'journal.night': "Un punt extra. En arribar, es fa de nit.",
    'intro.eyebrow': 'El Túria cap al 1700',
    'intro.lead': "Baixa en barca pel vell llit del Túria i mira la ciutat emmurallada des de l'aigua: la muralla i els seus portals, els cinc ponts de pedra i el perfil de torres i campanars.",
    'intro.moment': 'Moment del dia',
    'intro.language': 'Idioma',
    'intro.controls': 'Controls',
    'intro.credits': 'Crèdits i fonts',
    'intro.donate': 'Donar',
    'intro.note': 'És una reconstrucció aproximada: els llocs estan on estaven, les formes són un esbós.',
    'start.loading': 'Carregant…',
    'start.go': 'Navegar',
    'start.failed': "No s'ha pogut carregar",
    'start.failed.note': "Cal un navegador amb gràfics 3D (WebGL) i connexió per a descarregar l'escena.",
    'help.title': 'Controls',
    'help.keyboard': `<strong>Teclat:</strong> ${KBD('W')} ${KBD('S')} o les fletxes amunt i avall per a avançar i ciar; ${KBD('A')} ${KBD('D')} o esquerra i dreta per al timó.`,
    'help.mouse': '<strong>Ratolí:</strong> arrossega amb el botó esquerre per a portar la barca i amb el dret per a girar la càmera.',
    'help.touch': "<strong>Pantalla tàctil:</strong> el comandament de baix a l'esquerra porta la barca (amunt per a avançar, als costats per a virar) i el de baix a la dreta, el de l'ull, gira la càmera. També pots arrossegar en qualsevol part de la pantalla.",
    'help.points': "<strong>Punts d'interés:</strong> al costat de cada lloc amb història hi ha un cercle clar sobre l'aigua, amb un senyal damunt. Entra en el cercle amb la barca per a llegir-ne la fitxa: la càmera es gira uns segons cap al lloc, o hi vola si està lluny, i torna sola (o abans, si la mous tu). Mentrestant la barca va a espai. La fletxa de la vora de la pantalla porta al més pròxim que et falte. N'hi ha quinze; toca el compte de dalt a l'esquerra per a repassar-los i, amb l'ull de cada fitxa, tornar a veure'ls de prop. N'hi ha un més: en entrar en el seu cercle es fa de nit, i en allunyar-te torna l'hora que hi havia.",
    'help.bridges': "<strong>Ponts:</strong> en acostar-te, la barca s'encamina sola cap a l'arc més pròxim i abat la vela per a passar per davall.",
    'help.menu': "<strong>Menú:</strong> el botó que hi ha davall del mapa desplega el reinici dels punts, els ajustos i esta ajuda. El moment del dia i el so tenen els seus botons redons a baix, al centre.",
    'help.tour': "<strong>Recorregut guiat:</strong> la barca baixa sola pel centre del riu i arrossegar només mou la càmera. Per a tornar a portar-la, toca una altra vegada el botó de la brúixola, a baix a l'esquerra.",
    'help.donate': "Si et ve de gust, <a href=\"https://www.paypal.me/ananen\" target=\"_blank\" rel=\"noopener\">donar</a>. L'import l'elegeixes tu.",
    'settings.title': 'Ajustos',
    'settings.sun': 'A baix, el botó del sol passa de dia a capvespre i a nit. Ací hi ha més hores:',
    'settings.language': 'Idioma:',
    'settings.hour': 'Hora del dia:',
    'hour.dawn': 'Alba',
    'hour.morning': 'Matí',
    'hour.noon': 'Migdia',
    'hour.afternoon': 'Vesprada',
    'hour.sunset': 'Posta de sol',
    'hour.night': 'Nit',
    'settings.boat': 'Barca:',
    'boat.albufera': "De l'Albufera, amb perxa",
    'boat.lateen': 'De riu, amb timoner assegut',
    'settings.reset': "Tornar a començar els punts d'interés",
    'reset.short': 'Reiniciar punts',
    'settings.quality': 'Qualitat gràfica:',
    'quality.auto': 'Automàtica',
    'quality.high': 'Alta',
    'quality.medium': 'Mitjana',
    'quality.low': 'Baixa',
    'credits.title': 'Crèdits i fonts',
    'credits.layout': '<strong>Traçat:</strong> el curs del riu, el perímetre de la muralla i la posició de ponts, portals i edificis ixen d\'<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (© els seus col·laboradors, llicència ODbL).',
    'credits.cards': "<strong>Fitxes d'història:</strong> les dades estan contrastades amb la Viquipèdia en castellà (llicència CC BY-SA) i, les de tres portals, amb blogs d'història local; cada fitxa enllaça la seua font.",
    'credits.engine': '<strong>Motor 3D:</strong> <a href="https://threejs.org/" target="_blank" rel="noopener">three.js</a> (llicència MIT).',
    'credits.sound': '<strong>So:</strong> sintetitzat en el navegador; no hi ha gravacions.',
    'credits.code': '<strong>Codi:</strong> <a href="https://github.com/enguicode/valencia-antiga" target="_blank" rel="noopener">github.com/enguicode/valencia-antiga</a>.',
    'credits.donate': "<strong>Donar:</strong> <a href=\"https://www.paypal.me/ananen\" target=\"_blank\" rel=\"noopener\">PayPal</a>. L'import l'elegeixes tu.",
    'reliable.title': 'Què és fiable i què no',
    'reliable.yes': '<strong>Fiable:</strong> on està cada cosa. Ponts, portals, esglésies i palaus ocupen el lloc que ocupen hui, o les seues restes.',
    'reliable.roughly': '<strong>Aproximat:</strong> la muralla seguix els carrers de ronda que la van substituir, i el riu, la línia dels ponts actuals.',
    'reliable.no': "<strong>Esbossat o inventat:</strong> la forma dels edificis i les seues textures, les barques, el nombre i el lloc de les torres, les cases, les escales, l'assut, i tot el que es mou.",
    'version': 'Versió 1.0.',
    'close': 'Tancar',
    'stick.move': 'Moure la barca',
    'stick.look': 'Mirar al voltant',
  },

  en: {
    'count': '{found} of {total}',
    'status.points': 'points',
    'status.of': 'm of',
    'status.title': 'See the points of interest',
    'card.source': 'Source: Wikipedia (in Spanish)',
    'card.sourceNamed': 'Source: {name}',
    'card.all': 'You have found all {total} points.',
    'card.number': 'Point {number} of {total}',
    'card.again': ' · already found',
    'card.bonus': 'Extra point of the night',
    'hint.keys': `${KBD('W')} ${KBD('S')} ahead and astern · ${KBD('A')} ${KBD('D')} rudder · arrow keys or dragging work too · right button: turn the camera`,
    'hint.touch': 'Left stick: the boat. Right stick, the one with the eye: the camera',
    'menu': 'Menu',
    'menu.settings': 'Settings',
    'menu.help': 'Help and credits',
    'tour': 'Guided tour',
    'tour.stop': 'Stop the guided tour',
    'tour.notice': 'Guided tour: drag to look around. To steer the boat, tap the compass button again.',
    'sky.day': 'Day',
    'sky.dusk': 'Dusk',
    'sky.night': 'Night',
    'sky.day.next': 'It is day. Switch to dusk',
    'sky.dusk.next': 'It is dusk. Switch to night',
    'sky.night.next': 'It is night. Back to day',
    'sound.on': 'Sound on',
    'sound.off': 'Sound off',
    'sound.on.next': 'Sound on. Mute',
    'sound.off.next': 'Sound off. Turn on',
    'journal.title': 'Points of interest',
    'journal.close': 'Keep sailing',
    'journal.all': 'You have found them all: {total} of {total}.',
    'journal.some': 'You have {found} of {total}. The rest are waiting downstream.',
    'journal.unknown': 'Yet to be discovered.',
    'journal.view': 'Go and see it up close',
    'journal.night': 'An extra point. Night falls when you arrive.',
    'intro.eyebrow': 'The Turia around 1700',
    'intro.lead': 'Sail down the old bed of the Turia and see the walled city from the water: the wall and its gates, the five stone bridges and the skyline of towers and belfries.',
    'intro.moment': 'Time of day',
    'intro.language': 'Language',
    'intro.controls': 'Controls',
    'intro.credits': 'Credits and sources',
    'intro.donate': 'Donate',
    'intro.note': 'This is an approximate reconstruction: places are where they stood, shapes are a sketch.',
    'start.loading': 'Loading…',
    'start.go': 'Set sail',
    'start.failed': 'Could not load',
    'start.failed.note': 'You need a browser with 3D graphics (WebGL) and a connection to download the scene.',
    'help.title': 'Controls',
    'help.keyboard': `<strong>Keyboard:</strong> ${KBD('W')} ${KBD('S')} or the up and down arrows to go ahead and astern; ${KBD('A')} ${KBD('D')} or left and right for the rudder.`,
    'help.mouse': '<strong>Mouse:</strong> drag with the left button to steer the boat and with the right one to turn the camera.',
    'help.touch': '<strong>Touch screen:</strong> the stick at the bottom left steers the boat (up to go ahead, sideways to turn) and the one at the bottom right, with the eye, turns the camera. You can also drag anywhere on the screen.',
    'help.points': '<strong>Points of interest:</strong> beside every place with a story there is a pale ring on the water, with a marker above it. Sail into the ring to read its card: the camera turns to the place for a few seconds, or flies to it if it is far away, and comes back by itself (or sooner, if you move the camera). Meanwhile the boat goes slowly. The arrow at the edge of the screen leads to the nearest one you are missing. There are fifteen; tap the tally at the top left to go over them and, with the eye on each card, see them up close again. There is one more: night falls as you sail into its ring, and your time of day returns once you leave.',
    'help.bridges': '<strong>Bridges:</strong> as you approach, the boat lines itself up with the nearest arch and lowers its sail to pass underneath.',
    'help.menu': '<strong>Menu:</strong> the button under the map unfolds the points reset, the settings and this help. The time of day and the sound have their own round buttons at the bottom, in the middle.',
    'help.tour': '<strong>Guided tour:</strong> the boat goes down the middle of the river by itself and dragging only moves the camera. To steer again, tap the compass button, bottom left, once more.',
    'help.donate': 'If you feel like it, <a href="https://www.paypal.me/ananen" target="_blank" rel="noopener">donate</a>. You choose the amount.',
    'settings.title': 'Settings',
    'settings.sun': 'At the bottom, the sun button goes from day to dusk to night. More times of day here:',
    'settings.language': 'Language:',
    'settings.hour': 'Time of day:',
    'hour.dawn': 'Dawn',
    'hour.morning': 'Morning',
    'hour.noon': 'Midday',
    'hour.afternoon': 'Afternoon',
    'hour.sunset': 'Sunset',
    'hour.night': 'Night',
    'settings.boat': 'Boat:',
    'boat.albufera': 'Albufera boat, poled',
    'boat.lateen': 'River boat, helmsman seated',
    'settings.reset': 'Start the points of interest again',
    'reset.short': 'Reset points',
    'settings.quality': 'Graphics quality:',
    'quality.auto': 'Automatic',
    'quality.high': 'High',
    'quality.medium': 'Medium',
    'quality.low': 'Low',
    'credits.title': 'Credits and sources',
    'credits.layout': '<strong>Layout:</strong> the course of the river, the line of the wall and the position of bridges, gates and buildings come from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (© its contributors, ODbL licence).',
    'credits.cards': '<strong>History cards:</strong> their facts were checked against Spanish Wikipedia (CC BY-SA licence) and, for three of the gates, local history blogs; each card links to its source.',
    'credits.engine': '<strong>3D engine:</strong> <a href="https://threejs.org/" target="_blank" rel="noopener">three.js</a> (MIT licence).',
    'credits.sound': '<strong>Sound:</strong> synthesised in the browser; there are no recordings.',
    'credits.code': '<strong>Code:</strong> <a href="https://github.com/enguicode/valencia-antiga" target="_blank" rel="noopener">github.com/enguicode/valencia-antiga</a>.',
    'credits.donate': '<strong>Donate:</strong> <a href="https://www.paypal.me/ananen" target="_blank" rel="noopener">PayPal</a>. You choose the amount.',
    'reliable.title': 'What can be trusted and what cannot',
    'reliable.yes': '<strong>Reliable:</strong> where everything is. Bridges, gates, churches and palaces stand where they stand today, or where their remains are.',
    'reliable.roughly': '<strong>Approximate:</strong> the wall follows the ring streets that replaced it, and the river, the line of today’s bridges.',
    'reliable.no': '<strong>Sketched or made up:</strong> the shape of the buildings and their textures, the boats, the number and position of the towers, the houses, the stairs, the weir, and everything that moves.',
    'version': 'Version 1.0.',
    'close': 'Close',
    'stick.move': 'Steer the boat',
    'stick.look': 'Look around',
  },
};

export const LANGUAGES = Object.keys(STRINGS);

function initialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored in STRINGS) return stored;
  } catch {
    // Storage unavailable: fall through to the browser's languages.
  }
  for (const preferred of navigator.languages ?? [navigator.language ?? 'es']) {
    const code = preferred.toLowerCase().split('-')[0];
    if (code in STRINGS) return code;
    if (code === 'va') return 'ca';
  }
  return 'es';
}

let current = initialLanguage();

export const getLanguage = () => current;

// A string in the current language, with {name} placeholders filled in.
export function t(key, values = {}) {
  const text = STRINGS[current][key] ?? STRINGS.es[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

// Picks the current language out of a { es, ca, en } record, as used in the data files.
export const localized = (record) => (typeof record === 'string' ? record : record[current] ?? record.es);

function applyToPage() {
  document.documentElement.lang = HTML_LANG[current];
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll('[data-i18n-html]')) element.innerHTML = t(element.dataset.i18nHtml);
  for (const element of document.querySelectorAll('[data-i18n-label]')) {
    const label = t(element.dataset.i18nLabel);
    element.setAttribute('aria-label', label);
    if (element.hasAttribute('title')) element.title = label;
  }
}

const listeners = [];

// Modules that build text themselves ask to be called when the language changes.
export function onLanguageChange(listener) {
  listeners.push(listener);
}

export function setLanguage(language) {
  if (!(language in STRINGS)) return;
  current = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Private browsing: the choice simply lasts for this visit.
  }
  applyToPage();
  for (const listener of listeners) listener(language);
}

applyToPage();
