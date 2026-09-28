/* Halal Haram Detector – Update 2.0: „Ramadan & Mama Edition“
 * Erweitert HHD.DATA um Ramadan-/Iftar-Inhalte, Familien-NPCs, Power-ups, Missionen,
 * Erfolge, Ränge und Spielmodi.
 *
 * Humor-Regel bleibt: Der Witz liegt beim überforderten Detector, bei Mama, Tante, Onkel
 * und der selbsternannten Halal-Polizei – nie bei Allah, dem Propheten, dem Koran oder dem Gebet.
 */
(function () {
  'use strict';
  const D = window.HHD.DATA;
  const E = (e) => ({ t: 'emoji', e });
  const P = (t, o) => Object.assign({ t }, o);
  function I(id, name, ans, tier, places, art, extra) {
    D.ITEMS.push(Object.assign({ id, name, ans, tier, places, art }, extra || {}));
  }

  /* ---------- Orte ---------- */
  Object.assign(D.PLACES, { iftar: 'IFTAR-ZELT', basar: 'GEMEINDE-BASAR', zuhause: 'ZUHAUSE' });

  /* ---------- Familie & Co. ---------- */
  Object.assign(D.NPCS, {
    mama: { name: 'MAMA', face: '🧕🏽', lines: ['WIR HABEN ESSEN ZU HAUSE!', 'HAST DU DEINE JACKE?', 'WARUM KAUFST DU DAS? ZU HAUSE IST ESSEN!', 'ICH ZÄHLE BIS DREI!', 'RUF DEINE TANTE AN!', 'HAST DU WAS GEGESSEN?'] },
    tante: { name: 'TANTE', face: '🧕🏻', lines: ['WANN HEIRATEST DU?', 'NIMM MIT, IST HALAL!', 'DU BIST SO DÜNN GEWORDEN!', 'MEINE TOCHTER STUDIERT MEDIZIN.', 'ICH HAB EXTRA FÜR DICH GEKOCHT!'] },
    onkel: { name: 'ONKEL', face: '🧔🏽‍♂️', lines: ['MASHALLAH, GROSS GEWORDEN!', 'WAS MACHST DU JETZT BERUFLICH?', 'FRÜHER HABEN WIR DAS OHNE DETECTOR GEMACHT.', 'LASS, ICH ZAHL! NEIN, ICH ZAHL!', 'GRÜSS DEINEN VATER!'] },
    bruder: { name: 'KLEINER BRUDER', face: '👦🏽', lines: ['ABI, KAUF MIR DAS!', 'ICH SAG MAMA, DASS DU DAS GEKAUFT HAST!', 'DARF ICH AUCH MAL SCANNEN?', 'IST DAS HALAL? IST DAS HALAL? IST DAS…'] },
    polizei: { name: 'HALAL-POLIZEI', face: '🕵🏽‍♂️', lines: ['DAS IST HARAM!!', 'ALLES HARAM!', 'HAB ICH AUF TIKTOK GESEHEN: HARAM!', 'SOGAR DAS WASSER IST VERDÄCHTIG!'] },
  });
  D.NPCS.bro.lines.push('WALLAH, ES IST HALAL, AKHI.');
  D.NPCS.vendor.lines.push('BESTE QUALITÄT, WALLAH!');
  D.NPCS.meister.lines.push('YALLAH, NÄCHSTER!', 'MIT ALLES, HABIBI?');
  Object.assign(D.PLACE_NPCS, { iftar: ['mama', 'tante', 'onkel'], basar: ['tante', 'onkel'], zuhause: ['mama', 'bruder'] });
  D.PLACE_NPCS.supermarkt.push('mama', 'bruder');
  D.PLACE_NPCS.kiosk.push('bruder');
  D.PLACE_NPCS.doener.push('onkel');

  /* ---------- Neue Produkte ---------- */
  // Eindeutig halal
  I('mercimek', 'Linsensuppe (Mercimek)', 'halal', 2, ['iftar', 'doener', 'restaurant', 'zuhause'], E('🥣'), { cat: 'pflanzlich', why: 'Linsen, Zwiebeln, Karotten, Kreuzkümmel.', iftar: 1 });
  I('simit', 'Simit', 'halal', 2, ['baeckerei', 'iftar', 'strasse', 'basar'], E('🥯'), { cat: 'basis', why: 'Sesamkringel: Mehl, Wasser, Sesam, Traubensirup (kein Alkohol).', iftar: 1 });
  I('cay', 'Çay', 'halal', 2, ['iftar', 'doener', 'zuhause', 'basar', 'kiosk'], E('🫖'), { cat: 'getraenk', why: 'Schwarztee im Tulpenglas. Immer.', iftar: 1 });
  I('sutlac', 'Sütlaç (Milchreis)', 'halal', 2, ['iftar', 'zuhause', 'restaurant'], P('cup', { c: '#fff3d6', c2: '#c68642', brand: 'EV YAPIMI', label: 'SÜTLAÇ', e: '🍚' }), { cat: 'basis', why: 'Milch, Reis, Zucker. Im Ofen gebräunt.', iftar: 1 });
  I('sarma', 'Sarma (Weinblätter)', 'halal', 3, ['iftar', 'basar', 'zuhause'], P('tray', { c: '#6a994e', c2: '#fff', brand: 'TANTES', label: 'SARMA', e: '🍃' }), { cat: 'pflanzlich', twin: 'wein', why: 'Weinblätter = Traubenblätter mit Reis. Kein Wein drin, Akhi.', iftar: 1 });
  I('rosensirup', 'Rosensirup', 'halal', 3, ['iftar', 'supermarkt', 'basar'], P('bottle', { c: '#e5383b', c2: '#ffccd5', brand: 'GÜL', label: 'ROSENSIRUP', e: '🌹' }), { cat: 'getraenk', iftar: 1 });
  I('baklava', 'Baklava (HALAL ✓)', 'halal', 3, ['baeckerei', 'iftar', 'basar'], P('box', { c: '#d4a373', c2: '#588157', brand: 'PASTANE', label: 'BAKLAVA', e: '🥮', badge: 'HALAL ✓' }), { cat: 'zert', twin: 'baklavasuper', iftar: 1 });
  I('halalhack', 'Rinderhack (HALAL ✓)', 'halal', 2, ['supermarkt', 'markt'], P('tray', { c: '#ff8fa3', c2: '#fff', brand: 'METZGEREI', label: 'RINDERHACK', e: '🥩', badge: 'HALAL ✓' }), { cat: 'zert', twin: 'gemischteshack' });
  // Eindeutig haram
  I('gemischteshack', 'Gemischtes Hack', 'haram', 2, ['supermarkt', 'markt'], P('tray', { c: '#ff8fa3', c2: '#fff', brand: 'METZGEREI', label: 'HACK GEMISCHT (SCHWEIN/RIND)', e: '🥩', badge: 'SCHWEIN' }), { cat: 'schwein', twin: 'halalhack', why: 'Gemischtes Hack = Schwein + Rind. Steht sogar drauf.' });
  I('raki', 'Rakı', 'haram', 3, ['restaurant', 'airport', 'night'], P('bottle', { c: '#f1faee', c2: '#1d3557', brand: 'ANASON', label: 'RAKI 45%', e: '🍶', tall: 1 }), { cat: 'alkohol', why: 'Rakı = Anisschnaps. Alkohol, egal wie weiß er wird.' });
  // Zutaten checken
  I('samosa', 'Samosa', 'check', 3, ['iftar', 'foodtruck', 'night', 'basar'], P('tray', { c: '#e9c46a', c2: '#fff', brand: 'IMBISS', label: 'SAMOSA', e: '🥟' }), { fill: 'savory', iftar: 1, v: [
    ['halal', ['Teig (Weizenmehl)', 'Kartoffeln', 'Erbsen', 'Kreuzkümmel', 'Koriander']],
    ['halal', ['Teig (Weizenmehl)', 'Rinderhack (halal-zertifiziert)', 'Zwiebeln', 'Garam Masala']],
    ['haram', ['Teig (Weizenmehl)', '!Gemischtes Hack (Schwein/Rind)', 'Zwiebeln', 'Curry']],
  ] });
  I('boerek', 'Börek', 'check', 2, ['baeckerei', 'iftar', 'basar', 'zuhause'], P('paper', { c: '#e9c46a', c2: '#fff', brand: 'FIRIN', label: 'BÖREK', e: '🥐' }), { fill: 'bakery', iftar: 1, v: [
    ['halal', ['Yufka-Teig', 'Spinat', 'Zwiebeln', 'Butter', 'Ei']],
    ['halal', ['Yufka-Teig', 'Hackfleisch (halal-zertifiziert)', 'Zwiebeln', 'Petersilie']],
    ['haram', ['Yufka-Teig', '!Gemischtes Hack (Schwein/Rind)', 'Zwiebeln', 'Petersilie']],
  ] });
  I('lahmacun', 'Lahmacun', 'check', 2, ['doener', 'foodtruck', 'iftar'], E('🫓'), { fill: 'savory', v: [
    ['halal', ['Teig', 'Rinderhack (halal-zertifiziert)', 'Tomaten', 'Paprika', 'Petersilie']],
    ['haram', ['Teig', '!Gemischtes Hack (Schwein/Rind)', 'Tomaten', 'Zwiebeln']],
  ] });
  I('pide', 'Pide Spezial', 'check', 3, ['doener', 'restaurant', 'foodtruck'], P('tray', { c: '#f4a261', c2: '#fff', brand: 'PIDECI', label: 'PIDE SPEZIAL', e: '🫓' }), { fill: 'savory', v: [
    ['halal', ['Teig', 'Sucuk (halal-zertifiziert)', 'Ei', 'Paprika']],
    ['haram', ['Teig', '!Salami (Schwein)', 'Paprika', 'Oregano']],
    ['halal', ['Teig', 'Spinat', 'Ei', 'Petersilie']],
  ] });
  I('koefte', 'Köfte', 'check', 3, ['doener', 'restaurant', 'iftar', 'night'], P('tray', { c: '#bc6c25', c2: '#fff', brand: 'IZGARA', label: 'KÖFTE', e: '🍢' }), { fill: 'meat', iftar: 1, v: [
    ['halal', ['Rinderhack (halal-zertifiziert)', 'Zwiebeln', 'Petersilie', 'Kreuzkümmel']],
    ['haram', ['Rinderhack', '!Schweinefleisch-Anteil (30 %)', 'Zwiebeln', 'Paprika']],
  ] });
  I('manti', 'Mantı', 'check', 4, ['restaurant', 'zuhause', 'iftar'], E('🥟'), { fill: 'savory', v: [
    ['halal', ['Teig', 'Rinderhack (halal-zertifiziert)', 'Joghurt', 'Knoblauch', 'Paprikabutter']],
    ['haram', ['Teig', '!Gemischtes Hack (Schwein/Rind)', 'Joghurt', 'Knoblauch']],
  ] });
  I('goezleme', 'Gözleme', 'check', 3, ['night', 'basar', 'markt'], P('paper', { c: '#ffe8a3', c2: '#fff', brand: 'TEYZE', label: 'GÖZLEME', e: '🫓' }), { fill: 'bakery', v: [
    ['halal', ['Yufka', 'Kartoffeln', 'Petersilie', 'Butter']],
    ['halal', ['Yufka', 'Spinat', 'Zwiebeln']],
    ['haram', ['Yufka', '!Gemischtes Hack (Schwein/Rind)', 'Zwiebeln']],
  ] });
  I('lokum', 'Lokum', 'check', 3, ['basar', 'supermarkt', 'airport', 'iftar'], P('box', { c: '#ff99c8', c2: '#fff', brand: 'SARAY', label: 'LOKUM', e: '🍬' }), { fill: 'sweet', v: [
    ['halal', ['Zucker', 'Maisstärke', 'Rosenwasser', 'Pistazien', 'Puderzucker']],
    ['haram', ['Zucker', 'Glukosesirup', '!Gelatine (Schwein)', 'Aroma (alkoholfrei)']],
  ] });
  I('baklavasuper', 'Baklava-Dessert (Supermarkt)', 'check', 4, ['supermarkt', 'airport'], P('box', { c: '#d4a373', c2: '#588157', brand: 'DESSERTO', label: 'BAKLAVA-ART', e: '🥮' }), { fill: 'sweet', twin: 'baklava', why: 'Kein Siegel, Supermarkt-Dessert: Zutaten checken!', v: [
    ['halal', ['Blätterteig (Butter)', 'Walnüsse', 'Zuckersirup', 'Zitrone']],
    ['haram', ['Blätterteig', 'Walnüsse', '!Weinbrand-Sirup', 'Zucker']],
  ] });
  I('sucukohne', 'Sucuk (ohne Siegel)', 'check', 3, ['supermarkt', 'markt'], P('tray', { c: '#e76f51', c2: '#fff', brand: 'SUCUK-ART', label: 'SUCUK', e: '🌶️' }), { fill: 'meat', twin: 'halalsucuk', why: 'Sieht aus wie Sucuk, hat aber kein Siegel. Checken!', v: [
    ['halal', ['Rindfleisch (halal-zertifiziert)', 'Knoblauch', 'Kreuzkümmel', 'Paprika']],
    ['haram', ['Rindfleisch', '!Schweinespeck', 'Knoblauch', 'Paprika']],
  ] });
  I('iftarbuffet', 'Iftar-Buffet (Hotel)', 'check', 4, ['iftar', 'restaurant', 'airport'], P('tray', { c: '#ffd166', c2: '#fff', brand: 'GRAND HOTEL', label: 'IFTAR-BUFFET', e: '🍽️' }), { fill: 'savory', iftar: 1, v: [
    ['halal', ['Linsensuppe', 'Datteln', 'Reis', 'Lamm (halal-zertifiziert)', 'Salat', 'Baklava']],
    ['haram', ['Linsensuppe', 'Datteln', 'Reis', '!Rinderbraten in Rotweinsoße', 'Salat']],
  ] });

  // Weitere Iftar-taugliche Klassiker aus dem Grundspiel
  ['datteln', 'wasser', 'ayran', 'milch', 'falafel', 'wassermelone', 'trauben', 'osaft', 'halalsucuk', 'halalchicken', 'reis', 'brot', 'oliven', 'honig', 'kaffee', 'mango'].forEach((id) => {
    const it = D.ITEMS.find((x) => x.id === id);
    if (it) it.iftar = 1;
  });
  // Im Iftar Rush dürfen ein paar Fallen nicht fehlen
  D.RUSH_TRAPS = ['raki', 'gemischteshack', 'wein', 'baklavasuper', 'sucukohne'];

  /* ---------- Hausgemachtes: Oma, Mama oder Tante ---------- */
  D.EVENTS.grandma.cooks = [
    { npc: 'oma', name: 'OMAS KUCHEN', art: E('🥧'), line: 'ICH HABE DAS SELBST GEMACHT.' },
    { npc: 'mama', name: 'MAMAS TUPPERDOSE', art: P('box', { c: '#4cc9f0', c2: '#fff', brand: 'TUPPER', label: 'MAMAS ESSEN', e: '🍲' }), line: 'NIMM MIT! ZU HAUSE IST ESSEN, ABER NIMM TROTZDEM MIT!' },
    { npc: 'tante', name: 'TANTES BÖREK', art: P('paper', { c: '#e9c46a', c2: '#fff', brand: 'TANTE', label: 'BÖREK', e: '🥐' }), line: 'NIMM MIT, IST HALAL! GLAUB MIR!' },
  ];

  /* ---------- Sprüche ---------- */
  const L = D.LINES;
  L.correctHalal.push('MASHALLAH!', 'ALHAMDULILLAH, HALAL.', 'HALAL WIE MAMAS KÜCHE.');
  L.correctHaram.push('ASTAGHFIRULLAH – WEG DAMIT!', 'NICHT MIT UNS, HABIBI.', 'HARAM DETECTED. YALLAH, WEITER.');
  L.correctCheck.push('SUBHANALLAH, WAS FÜR EIN CHECK.', 'MASHALLAH, ZUTATEN-PROFI.');
  L.found.push('ERWISCHT, AKHI!');
  L.wrong.push('WALLAH KRISE.', 'BRUDER, NEIN.', 'MAMA WÄRE ENTTÄUSCHT.');
  L.haramAsHalal = ['ASTAGHFIRULLAH 😳', 'BRUDER?! DAS WAR HARAM!', 'SOFORT ZURÜCKLEGEN!'];
  L.guessed.push('INSHALLAH RICHTIG? NEIN. CHECKEN!');
  L.timeout.push('YALLAH, SCHNELLER!', 'HABIBI, DIE ZEIT!');
  L.instant.push('SUBHANALLAH, SO SCHNELL?!', 'MASHALLAH, BLITZ-SCAN!');
  L.gameover.push('INSHALLAH NÄCHSTES MAL.', 'MAMA SAGT: GENUG GESPIELT, ESSEN IST FERTIG.', 'DER DÖNER-MEISTER GLAUBT AN DICH.');
  L.terlikTaunt = ['WIR HABEN ESSEN ZU HAUSE!', 'ICH ZÄHLE BIS DREI!', 'BİR… İKİ…', 'WER HAT DAS GEKAUFT?!', 'DU BIST NICHT ZU ALT FÜR DEN TERLIK!', 'ZIMMER AUFRÄUMEN!'];
  L.terlikHurt = ['AUA… MEIN RÜCKEN!', 'NA GUT, DIESMAL…', 'MASHALLAH, DU BIST SCHNELL GEWORDEN.'];
  L.rush = ['ERST DIE DATTEL!', 'WASSER! WASSER!', 'NICHT SO SCHNELL ESSEN!', 'ÇAY IST FERTIG!', 'WER HAT DIE SUPPE?!'];
  L.mamaCall = ['WO BIST DU?! WIR HABEN ESSEN ZU HAUSE!', 'BRING BROT MIT. ABER DAS RICHTIGE!', 'HAST DU DIE ZUTATEN GELESEN?', 'DEINE TANTE KOMMT HEUTE. ZIEH WAS ORDENTLICHES AN.'];

  // Combo-Meilensteine (mit mehr Hype)
  D.COMBOS.length = 0;
  D.COMBOS.push(
    [5, 'HALAL STREAK 🔥', '5 IN A ROW'],
    [10, 'DETECTOR MODE ACTIVATED', '10 IN A ROW'],
    [15, 'MASHALLAH! 🌙', '15 OHNE FEHLER'],
    [20, 'BROTHER HAS ASCENDED', '20?!'],
    [25, 'YALLAH YALLAH YALLAH', 'DER DETECTOR RENNT'],
    [30, 'FINAL SCANNER FORM', 'DER DETECTOR IST AUSSER KONTROLLE.'],
    [40, 'SULTAN DES SCANNENS 👑', '40. EINFACH 40.'],
    [50, 'DETECTOR OVERCLOCKED', 'TEMPERATUR: JA'],
    [60, 'SUBHANALLAH', 'WIE IST DAS MÖGLICH?!'],
    [75, 'CITY SCAN ACTIVATED', 'DIE STADT WIRD GESCANNT'],
    [100, 'THE DETECTOR SEES EVERYTHING', 'BROTHER HAS BECOME THE DETECTOR.']
  );

  /* ---------- Skins ---------- */
  D.SKINS.splice(D.SKINS.length - 1, 0,
    { id: 'dattel', name: 'DATTEL EDITION', device: 'DATTEL-DETECTOR', price: 2000, laser: '#e0a458', desc: 'Süß, klebrig, zuverlässig. Wie eine Medjool.', pitch: 0.95 },
    { id: 'hilal', name: 'RAMADAN EDITION', device: 'HILAL SCANNER 🌙', price: 3000, laser: '#ffd166', desc: 'Nachtblau mit Laternenlicht. Ramadan Kareem!', pitch: 1.05 },
    { id: 'cay', name: 'ÇAY EDITION', device: 'ÇAY-O-MAT 3000', price: 3500, laser: '#ff6b6b', desc: 'Tulpenglas-Design. Riecht nach Samowar.', pitch: 1.18 },
    { id: 'terlik', name: 'TERLIK EDITION', device: 'MAMAS TERLIK', price: 5000, laser: '#ff4d8d', desc: 'Mamas Hausschuh. Trifft immer.', pitch: 0.85 }
  );
  D.SKINS.push({ id: 'sultan', name: 'SULTAN EDITION', device: 'SULTAN-SCANNER 👑', price: null, unlockEid: true, laser: '#ffd700', desc: 'Freischalten: Tag 30 im Ramadan-Modus erreichen (Eid!).', pitch: 0.9 });

  /* ---------- Power-ups ---------- */
  D.POWERUPS = {
    xray: { icon: '🔍', name: 'RÖNTGEN-BLICK', desc: 'Zeigt beim aktuellen Produkt die richtige Antwort – in der Zutatenliste das Problem.', price: 150, key: '1' },
    slowmo: { icon: '⏳', name: 'ZEITLUPE', desc: 'Die nächsten 6 Produkte haben fast doppelt so viel Zeit.', price: 200, key: '2' },
    dua: { icon: '🤲', name: 'MAMAS DUA', desc: 'Der nächste Fehler kostet kein Leben.', price: 250, key: '3' },
  };

  /* ---------- Spielmodi ---------- */
  D.MODES = {
    normal: { id: 'normal', name: 'NORMAL', icon: '🔎', desc: 'Das Original: immer schneller, 3 Leben.' },
    ramadan: { id: 'ramadan', name: 'RAMADAN', icon: '🌙', desc: 'Nachts unter Laternen. Iftar Rush nach jedem Level, 30 Tage bis Eid.' },
    hardcore: { id: 'hardcore', name: 'HARDCORE', icon: '💀', desc: 'Ein Leben. Doppelte Punkte. Kein Erbarmen.' },
    zen: { id: 'zen', name: 'ÜBEN', icon: '🧘', desc: 'Keine Zeit, keine Leben. Zum Lernen – ohne Rangliste.' },
  };

  /* ---------- Ränge (Spieler-Level) ---------- */
  D.TITLES = [
    [1, 'MINI-AKHI'], [3, 'AKHI'], [5, 'BIG AKHI'], [8, 'HABIBI'], [11, 'ONKEL VOM KIOSK'],
    [15, 'DÖNER-PASCHA'], [20, 'SCANNER-BEY'], [25, 'SULTAN DES SCANNENS'], [32, 'DETECTOR-SULTAN'],
  ];

  /* ---------- Tagesaufgaben ---------- */
  // stat = Zähler (pro Tag summiert) oder max:true (bester Wert einer Runde)
  D.MISSIONS = [
    { id: 'found5', text: 'Finde 5× das Problem direkt in der Zutatenliste', goal: 5, stat: 'found', reward: 150 },
    { id: 'combo15', text: 'Erreiche eine Combo von 15', goal: 15, stat: 'combo', max: true, reward: 150 },
    { id: 'boss1', text: 'Besiege einen Boss', goal: 1, stat: 'boss', reward: 250 },
    { id: 'rush', text: 'Schaffe einen Iftar Rush ohne Fehler', goal: 1, stat: 'rushPerfect', reward: 200 },
    { id: 'doener5', text: 'Scanne 5 Döner-Produkte richtig', goal: 5, stat: 'doenerOk', reward: 120 },
    { id: 'fast3', text: 'Schaffe 3 Scans unter 0,6 Sekunden', goal: 3, stat: 'fast', reward: 150 },
    { id: 'twins4', text: 'Erkenne 4 Doppelgänger-Produkte richtig', goal: 4, stat: 'twinOk', reward: 150 },
    { id: 'mama', text: 'Nimm einen Anruf von Mama an', goal: 1, stat: 'mamaOk', reward: 100 },
    { id: 'police', text: 'Lass dich nicht von der Halal-Polizei verwirren', goal: 1, stat: 'policeOk', reward: 120 },
    { id: 'ramadan', text: 'Spiele eine Runde im Ramadan-Modus', goal: 1, stat: 'ramadanRun', reward: 100 },
    { id: 'aura1000', text: 'Sammle 1.000 Aura in einer Runde', goal: 1000, stat: 'aura', max: true, reward: 150 },
    { id: 'level4', text: 'Erreiche Level 4', goal: 4, stat: 'level', max: true, reward: 150 },
    { id: 'checks10', text: 'Mach 10 richtige Zutaten-Checks', goal: 10, stat: 'checkOk', reward: 120 },
    { id: 'score10k', text: 'Schaffe 10.000 Punkte in einer Runde', goal: 10000, stat: 'score', max: true, reward: 200 },
  ];

  /* ---------- Erfolge ---------- */
  D.ACHIEVEMENTS = [
    { id: 'first', icon: '🌱', name: 'BISMILLAH', desc: 'Erste richtige Entscheidung', stat: 'correct', goal: 1, reward: 50 },
    { id: 'gelatine', icon: '🐷', name: 'GELATINE-JÄGER', desc: '10× Schweine-Gelatine in der Liste gefunden', stat: 'gelatineFound', goal: 10, reward: 200 },
    { id: 'checker', icon: '🔎', name: 'NICHT GERATEN', desc: '50 richtige Zutaten-Checks', stat: 'checkOk', goal: 50, reward: 250 },
    { id: 'blitz', icon: '⚡', name: 'BLITZ-AKHI', desc: 'Eine Reaktion unter 0,45 Sekunden', stat: 'blitz', goal: 1, reward: 100 },
    { id: 'combo50', icon: '👑', name: 'COMBO-SULTAN', desc: 'Combo 50 erreicht', stat: 'combo', max: true, goal: 50, reward: 300 },
    { id: 'combo100', icon: '👁️', name: 'THE DETECTOR SEES EVERYTHING', desc: 'Combo 100 erreicht', stat: 'combo', max: true, goal: 100, reward: 1000 },
    { id: 'bossmarket', icon: '🏪', name: 'SUPERMARKET CLEARED', desc: 'Den Supermarkt besiegt', stat: 'bossMarket', goal: 1, reward: 200 },
    { id: 'bossterlik', icon: '🩴', name: 'TERLIK-ÜBERLEBENDER', desc: 'Mamas Terlik besiegt', stat: 'bossTerlik', goal: 1, reward: 400 },
    { id: 'mama', icon: '📞', name: 'MAMA-LIEBLING', desc: '5 Anrufe von Mama angenommen', stat: 'mamaOk', goal: 5, reward: 200 },
    { id: 'police', icon: '🕵️', name: 'EIGENE MEINUNG', desc: '3× die Halal-Polizei widerlegt', stat: 'policeOk', goal: 3, reward: 200 },
    { id: 'iftar', icon: '🌙', name: 'IFTAR-PROFI', desc: '3 Iftar Rushes ohne Fehler', stat: 'rushPerfect', goal: 3, reward: 300 },
    { id: 'eid', icon: '🎉', name: 'EID MUBARAK', desc: 'Tag 30 im Ramadan-Modus erreicht', stat: 'eid', goal: 1, reward: 500 },
    { id: 'legend', icon: '✨', name: 'LEGENDARY', desc: 'Ein Legendary Item gescannt', stat: 'legend', goal: 1, reward: 150 },
    { id: 'sauce17', icon: '🥙', name: '17 SOSSEN ÜBERLEBT', desc: 'Döner mit 17 Soßen richtig bewertet', stat: 'sauce17', goal: 1, reward: 250 },
    { id: 'lex50', icon: '📖', name: 'SAMMLER', desc: '50 % des Lexikons entdeckt', stat: 'lexPct', max: true, goal: 50, reward: 200 },
    { id: 'lex100', icon: '📚', name: 'WANDELNDES LEXIKON', desc: '100 % des Lexikons entdeckt', stat: 'lexPct', max: true, goal: 100, reward: 1000 },
    { id: 'hardcore', icon: '💀', name: 'HARDCORE-AKHI', desc: 'Level 4 im Hardcore-Modus erreicht', stat: 'hardcoreLevel', max: true, goal: 4, reward: 400 },
    { id: 'games25', icon: '🎮', name: 'STAMMKUNDE', desc: '25 Runden gespielt', stat: 'games', goal: 25, reward: 250 },
    { id: 'skins5', icon: '🎨', name: 'SKIN-SAMMLER', desc: '5 Detector-Skins besessen', stat: 'skins', max: true, goal: 5, reward: 300 },
    { id: 'terlik', icon: '😵', name: 'KLATSCH!', desc: 'Vom Terlik getroffen worden', stat: 'terlikHit', goal: 1, reward: 50 },
  ];
})();
