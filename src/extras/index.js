// Monuments that stood near the river around 1700 and were added after the
// first set, one module each. A module exports `landmark`, an entry shaped
// like those in data/layout.json (scene metres, `kind` equal to its `id`),
// or null while it is not ready, and `build(add, landmark, kit)`, which
// places unit solids exactly as the models in landmarks.js do.
import * as realet from './realet.js';
import * as jardinsReal from './jardins-real.js';
import * as albereda from './albereda.js';
import * as casaRoques from './casa-roques.js';
import * as temple from './temple.js';
import * as santaUrsula from './santa-ursula.js';
import * as santJosep from './sant-josep.js';
import * as santBartomeu from './sant-bartomeu.js';
import * as santFrancesc from './sant-francesc.js';
import * as casaArmes from './casa-armes.js';

export const EXTRAS = [realet, jardinsReal, albereda, casaRoques, temple, santaUrsula, santJosep, santBartomeu, santFrancesc, casaArmes].filter((extra) => extra.landmark);
