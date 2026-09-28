/* Halal Haram Detector – Spielinhalte
 *
 * Wichtige Designregel: Das Spiel ist Unterhaltung und kein religiöses Rechtsgutachten.
 * Eindeutige Antworten gibt es nur, wenn das Spiel selbst die Information liefert
 * (Produkt ist offensichtlich, „HALAL ✓“-Siegel oder Zutatenliste). Alles Unklare
 * soll über INGREDIENTS 🔎 geprüft werden. Debattierte Sonderfälle (Lab, Essigarten,
 * Spuren-Alkohol in Aromen, Meeresfrüchte …) kommen bewusst nicht als Entscheidung vor.
 *
 * Zutaten mit „!“ am Anfang sind im Spiel das Problem (Schwein bzw. Alkohol).
 */
(function () {
  'use strict';
  const HHD = (window.HHD = window.HHD || {});

  /* ---------- Orte ---------- */
  const PLACES = {
    strasse: 'STRASSE', kiosk: 'KIOSK', baeckerei: 'BÄCKEREI', schule: 'SCHULE', park: 'PARK',
    tankstelle: 'TANKSTELLE', einkaufsstrasse: 'EINKAUFSSTRASSE', doener: 'DÖNERLADEN',
    foodtruck: 'FOOD TRUCK', supermarkt: 'SUPERMARKT', markt: 'MARKT', mall: 'EINKAUFSZENTRUM',
    foodcourt: 'FOOD COURT', restaurant: 'RESTAURANT', airport: 'FLUGHAFEN', night: 'NACHTMARKT',
  };

  /* Stadtbereiche = Meta-Progression (per XP freigeschaltet) */
  const AREAS = [
    { id: 'street', name: 'STRASSE', emoji: '🛣️', xp: 0, level: 1, scene: 'street', time: 'day',
      places: ['strasse', 'kiosk', 'baeckerei', 'schule', 'park', 'tankstelle', 'einkaufsstrasse', 'markt'],
      shops: ['KIOSK', 'BÄCKEREI', 'SCHULE', 'TANKSTELLE', 'MARKT', 'PARK'], desc: 'Kiosk, Bäckerei, Schule, Park. Der Anfang.' },
    { id: 'doener', name: 'DÖNERLADEN', emoji: '🥙', xp: 400, level: 2, scene: 'street', time: 'sunset',
      places: ['doener', 'foodtruck', 'kiosk', 'strasse'],
      shops: ['DÖNER', 'KIOSK', 'FOOD TRUCK', 'DÖNER PALAST', 'TELEFONLADEN'], desc: '„BRUDER, WAS WILLST DU?“' },
    { id: 'market', name: 'SUPERMARKT', emoji: '🛒', xp: 1200, level: 3, scene: 'shelves', time: 'indoor',
      places: ['supermarkt'], shops: [], desc: 'Regale voller Fallen. Genau lesen.' },
    { id: 'mall', name: 'EINKAUFSZENTRUM', emoji: '🏬', xp: 2500, level: 4, scene: 'hall', time: 'indoor',
      places: ['mall', 'foodcourt', 'restaurant', 'baeckerei'],
      shops: ['FOOD COURT', 'RESTAURANT', 'BÄCKEREI', 'SUSHI BAR', 'BURGER'], desc: 'Food Court. Chaos. Mehrere Produkte.' },
    { id: 'airport', name: 'FLUGHAFEN', emoji: '✈️', xp: 4500, level: 5, scene: 'hall', time: 'indoor',
      places: ['airport', 'restaurant', 'kiosk'],
      shops: ['GATE A12', 'DUTY FREE', 'LOUNGE', 'KIOSK', 'RESTAURANT'], desc: 'Turbo. Unter einer Sekunde.' },
    { id: 'night', name: 'NACHTMARKT', emoji: '🏮', xp: 7000, level: 6, scene: 'street', time: 'night',
      places: ['night', 'foodtruck', 'markt'],
      shops: ['NACHTMARKT', 'FOOD TRUCK', 'STREET FOOD', 'GRILL', 'NUDELN'], desc: 'Nightmare. Alles geht zu schnell.' },
    { id: 'mega', name: 'MEGA FOOD CITY', emoji: '🌆', xp: 10000, level: 7, scene: 'street', time: 'apocalypse',
      places: Object.keys(PLACES),
      shops: ['MEGA DÖNER', 'HYPERMARKT', 'KIOSK 24/7', 'FOOD TRUCK', 'RESTAURANT', 'SUSHI XXL'], desc: 'Detector Apocalypse.' },
  ];

  /* ---------- Schwierigkeitsstufen innerhalb einer Runde ---------- */
  const LEVELS = [
    { n: 1, name: 'BEGINNER', area: 'street', time: 2.6, minTime: 2.2, checkShare: 0.16, twin: 0, events: 0, preview: 0, items: 8, listLen: [4, 6], checkTime: 7, scroll: 0 },
    { n: 2, name: 'STREET', area: 'doener', time: 2.15, minTime: 1.8, checkShare: 0.26, twin: 0.05, events: 0.05, preview: 0, items: 10, listLen: [5, 7], checkTime: 6.5, scroll: 0 },
    { n: 3, name: 'SUPERMARKET', area: 'market', time: 1.85, minTime: 1.55, checkShare: 0.3, twin: 0.3, events: 0.1, preview: 1, items: 12, listLen: [6, 9], checkTime: 6, scroll: 0.4, boss: true },
    { n: 4, name: 'CHAOS', area: 'mall', time: 1.6, minTime: 1.3, checkShare: 0.3, twin: 0.2, events: 0.22, preview: 2, items: 12, listLen: [7, 10], checkTime: 5.5, scroll: 0.6 },
    { n: 5, name: 'TURBO', area: 'airport', time: 1.25, minTime: 0.95, checkShare: 0.3, twin: 0.2, events: 0.25, preview: 2, items: 14, listLen: [8, 11], checkTime: 5, scroll: 0.75 },
    { n: 6, name: 'NIGHTMARE', area: 'night', time: 1.05, minTime: 0.85, checkShare: 0.32, twin: 0.25, events: 0.35, preview: 2, items: 14, listLen: [9, 13], checkTime: 4.6, scroll: 0.9, boss: true },
    { n: 7, name: 'DETECTOR APOCALYPSE', area: 'mega', time: 0.95, minTime: 0.62, checkShare: 0.33, twin: 0.25, events: 0.45, preview: 2, items: Infinity, listLen: [10, 15], checkTime: 4.4, scroll: 1 },
  ];

  /* ---------- NPCs ---------- */
  const NPCS = {
    meister: { name: 'DÖNER-MEISTER', face: '👨🏽‍🍳', lines: ['BRUDER, WAS WILLST DU?', 'MIT ALLES?', 'SCHARF ODER NICHT SCHARF?', 'ZWIEBEL JA? ZWIEBEL NEIN?', 'KOMM, ICH MACH DIR EXTRA SOSSE.', 'NÄCHSTER!', 'HIER ODER MITNEHMEN?'] },
    staff: { name: 'SUPERMARKT-MITARBEITER', face: '🧑🏻‍💼', lines: ['GANG 7, GLAUB ICH.', 'DAS IST IM ANGEBOT!', 'ICH HAB EIGENTLICH PAUSE.', 'KASSE 3 IST AUCH OFFEN.', 'WEISS ICH NICHT, BIN NEU.', 'SAMMELN SIE PUNKTE?'] },
    kid: { name: 'NEUGIERIGES KIND', face: '🧒🏽', lines: ['WAS MACHT DAS GERÄT?', 'IST DAS EIN LASER?!', 'DARF ICH MAL SCANNEN?', 'MAMA SAGT, DAS IST GESUND.', 'SCANN MEINE HAUSAUFGABEN!', 'WARUM PIEPT DAS?'] },
    driver: { name: 'LIEFERFAHRER', face: '🧑🏿‍🦱', lines: ['LIEFERUNG FÜR… ÄH… DICH?', 'HAB ICH NICHT BESTELLT? EGAL.', '5 STERNE BITTE!', 'ICH STEH IN ZWEITER REIHE!', 'UNTERSCHRIFT HIER. SCHNELL.'] },
    vendor: { name: 'MARKTVERKÄUFER', face: '🧔🏻', lines: ['FRISCH! ALLES FRISCH!', '2 KILO FÜR 3 EURO!', 'PROBIER MAL, BRUDER!', 'BESTE QUALITÄT, EHRENWORT!', 'FÜR DICH SONDERPREIS!'] },
    shopper: { name: 'NPC MIT EINKAUFSTASCHE', face: '👩🏼', lines: ['DARF ICH MAL VORBEI?', 'WO SIND DIE EIER?', 'ICH HAB NUR EINE SACHE!', 'HABEN SIE EINE KUNDENKARTE?', 'DAS WAR GESTERN BILLIGER.'] },
    tourist: { name: 'VERWIRRTER TOURIST', face: '🧑🏼‍🦰', lines: ['EXCUSE ME… WHERE IS… BAHNHOF?', 'IS THIS SCHNITZEL?', 'I TAKE PHOTO, OK?', 'WHY EVERYTHING HAS PFAND?', 'SPRECHEN SIE… ENGLISCH?'] },
    oma: { name: 'OMA', face: '👵🏼', lines: ['ICH HABE DAS SELBST GEMACHT.', 'IHR ESST ALLE ZU WENIG!', 'NIMM NOCH EIN STÜCK!', 'FRÜHER GAB ES SO WAS NICHT.'] },
    bro: { name: 'BRO', face: '😎', lines: ["BROTHER TRUST ME, IT'S HALAL.", 'VERTRAU MIR, BRUDER.', 'HAB ICH SELBST GECHECKT. GLAUB ICH.', 'MEIN COUSIN SAGT, DAS PASST.'] },
  };
  const PLACE_NPCS = {
    doener: ['meister'], foodtruck: ['meister', 'vendor'], supermarkt: ['staff', 'shopper'],
    markt: ['vendor', 'shopper'], night: ['vendor', 'tourist'], schule: ['kid'], park: ['kid', 'shopper'],
    airport: ['tourist'], kiosk: ['driver', 'kid'], tankstelle: ['driver'], restaurant: ['tourist', 'staff'],
    foodcourt: ['shopper', 'kid'], mall: ['shopper', 'tourist'], baeckerei: ['shopper', 'oma'],
    strasse: ['driver', 'tourist', 'kid'], einkaufsstrasse: ['shopper', 'tourist'],
  };

  /* ---------- Produkte ---------- */
  const E = (e) => ({ t: 'emoji', e });
  const P = (t, o) => Object.assign({ t }, o);
  const ITEMS = [];
  function I(id, name, ans, tier, places, art, extra) {
    ITEMS.push(Object.assign({ id, name, ans, tier, places, art }, extra || {}));
  }

  /* --- Tier 1: klare Fälle --- */
  I('apfel', 'Apfel', 'halal', 1, ['markt', 'strasse', 'park', 'schule', 'supermarkt'], E('🍎'), { cat: 'obst' });
  I('banane', 'Banane', 'halal', 1, ['markt', 'supermarkt', 'schule'], E('🍌'), { cat: 'obst' });
  I('wasser', 'Wasser', 'halal', 1, ['kiosk', 'supermarkt', 'tankstelle', 'airport'], P('bottle', { c: '#6cc6ff', c2: '#e8f7ff', brand: 'AQUA', label: 'WASSER', e: '💧' }), { cat: 'getraenk' });
  I('reis', 'Reis', 'halal', 1, ['supermarkt', 'restaurant', 'foodcourt'], E('🍚'), { cat: 'basis' });
  I('karotte', 'Karotte', 'halal', 1, ['markt', 'supermarkt'], E('🥕'), { cat: 'gemuese' });
  I('brot', 'Brot', 'halal', 1, ['baeckerei', 'supermarkt'], E('🍞'), { cat: 'basis', why: 'Mehl, Wasser, Salz, Hefe. Fertig.' });
  I('milch', 'Milch', 'halal', 1, ['supermarkt', 'schule', 'kiosk'], E('🥛'), { cat: 'basis' });
  I('fisch', 'Fisch', 'halal', 1, ['markt', 'supermarkt'], E('🐟'), { cat: 'fisch' });
  I('ei', 'Ei', 'halal', 1, ['markt', 'supermarkt'], E('🥚'), { cat: 'basis' });
  I('kartoffeln', 'Kartoffeln', 'halal', 1, ['markt', 'supermarkt'], E('🥔'), { cat: 'gemuese' });
  I('tomate', 'Tomate', 'halal', 1, ['markt', 'supermarkt'], E('🍅'), { cat: 'gemuese' });
  I('gurke', 'Gurke', 'halal', 1, ['markt', 'supermarkt'], E('🥒'), { cat: 'gemuese' });
  I('speck', 'Speck', 'haram', 1, ['supermarkt', 'restaurant'], E('🥓'), { cat: 'schwein', why: 'Speck = Schwein.' });
  I('schweinefleisch', 'Schweinefleisch', 'haram', 1, ['supermarkt', 'markt'], P('tray', { c: '#ff9fb2', c2: '#fff', brand: 'FLEISCHEREI', label: 'SCHWEINE­FLEISCH', e: '🐷' }), { cat: 'schwein' });
  I('bier', 'Bier', 'haram', 1, ['kiosk', 'tankstelle', 'restaurant', 'night', 'park'], E('🍺'), { cat: 'alkohol' });
  I('wein', 'Wein', 'haram', 1, ['supermarkt', 'restaurant', 'airport'], E('🍷'), { cat: 'alkohol', twin: 'trauben' });
  I('gummibaerchen', 'Gummibärchen', 'check', 1, ['kiosk', 'supermarkt', 'schule', 'tankstelle'], P('bag', { c: '#ff4f7b', c2: '#ffd23f', brand: 'BÄRLI', label: 'GUMMI­BÄRCHEN', e: '🐻' }), { fill: 'sweet', twin: 'halalgummi', v: [
    ['haram', ['Glukosesirup', 'Zucker', '!Gelatine (Schwein)', 'Säuerungsmittel: Citronensäure', 'Fruchtsaftkonzentrat', 'Überzugsmittel: Carnaubawachs']],
    ['halal', ['Glukosesirup', 'Zucker', 'Gelatine (Rind, halal-zertifiziert)', 'Säuerungsmittel: Citronensäure', 'Fruchtsaftkonzentrat']],
    ['halal', ['Glukosesirup', 'Zucker', 'Geliermittel: Pektin', 'Maisstärke', 'Säuerungsmittel: Citronensäure', 'Fruchtsaftkonzentrat']],
  ] });
  I('marshmallows', 'Marshmallows', 'check', 1, ['supermarkt', 'kiosk', 'park'], P('bag', { c: '#ffb3d9', c2: '#ffffff', brand: 'FLUFFY', label: 'MARSH­MALLOWS', e: '☁️' }), { fill: 'sweet', v: [
    ['haram', ['Zucker', 'Glukosesirup', 'Wasser', '!Gelatine (Schwein)', 'Maisstärke', 'Aroma (alkoholfrei)']],
    ['halal', ['Zucker', 'Glukosesirup', 'Wasser', 'Gelatine (Rind, halal-zertifiziert)', 'Maisstärke']],
    ['halal', ['Zucker', 'Tapiokasirup', 'Wasser', 'Carrageen', 'Erbsenprotein', 'Maisstärke']],
  ] });

  /* --- Tier 2: Straße & Döner --- */
  I('falafel', 'Falafel', 'halal', 2, ['doener', 'foodtruck', 'night'], E('🧆'), { cat: 'pflanzlich', why: 'Kichererbsen, Kräuter, Gewürze.', twin: 'frikadelle' });
  I('pommes', 'Pommes', 'halal', 2, ['doener', 'foodcourt', 'foodtruck'], E('🍟'), { cat: 'pflanzlich', why: 'Kartoffeln, Pflanzenöl, Salz.' });
  I('ayran', 'Ayran', 'halal', 2, ['doener', 'kiosk'], P('cup', { c: '#eef5ff', c2: '#2d7dd2', brand: 'AYRAN', label: 'AYRAN', e: '🥛' }), { cat: 'basis', why: 'Joghurt, Wasser, Salz.' });
  I('doener', 'Döner', 'check', 2, ['doener', 'foodtruck'], E('🥙'), { fill: 'doener', v: [
    ['halal', ['Fladenbrot', 'Kalbfleisch (halal-zertifiziert)', 'Salat', 'Zwiebeln', 'Tomaten', 'Knoblauchsoße (Joghurt)']],
    ['halal', ['Fladenbrot', 'Hähnchenfleisch (halal-zertifiziert)', 'Rotkohl', 'Zwiebeln', 'Kräutersoße (Joghurt)']],
    ['haram', ['Fladenbrot', 'Kalbfleisch (halal-zertifiziert)', 'Salat', '!Whiskey-BBQ-Soße (mit Whiskey)', 'Zwiebeln']],
  ] });
  I('duerum', 'Dürüm', 'check', 2, ['doener', 'foodtruck'], E('🌯'), { fill: 'doener', v: [
    ['halal', ['Yufka-Teig', 'Hähnchenfleisch (halal-zertifiziert)', 'Salat', 'Scharfe Soße (Chili)']],
    ['haram', ['Yufka-Teig', 'Hähnchenfleisch (halal-zertifiziert)', 'Salat', '!Cocktailsoße (mit Weinbrand)']],
    ['halal', ['Yufka-Teig', 'Falafel', 'Hummus', 'Salat', 'Sesamsoße']],
  ] });
  I('sosse', 'Unbekannte Soße', 'check', 2, ['doener', 'foodtruck', 'foodcourt'], P('jar', { c: '#ff9f1c', c2: '#fff3d6', brand: '???', label: 'SOSSE', e: '🥫' }), { fill: 'savory', v: [
    ['halal', ['Joghurt', 'Mayonnaise', 'Knoblauch', 'Salz', 'Kräuter']],
    ['haram', ['Mayonnaise', 'Tomatenmark', '!Weinbrand', 'Zucker', 'Paprika']],
    ['halal', ['Tomaten', 'Chili', 'Zwiebeln', 'Essig', 'Zucker', 'Salz']],
  ] });
  I('cola', 'Cola', 'halal', 2, ['kiosk', 'tankstelle', 'foodcourt', 'doener'], P('can', { c: '#e63946', c2: '#ffffff', brand: 'KOLA', label: 'COLA', e: '🥤' }), { cat: 'getraenk', twin: 'bierdose' });
  I('bierdose', 'Dosenbier', 'haram', 2, ['kiosk', 'tankstelle', 'park'], P('can', { c: '#e63946', c2: '#ffd23f', brand: 'KOLA', label: 'BIER', e: '🍺' }), { cat: 'alkohol', twin: 'cola', why: 'Gleiche Dose, aber da steht BIER.' });
  I('osaft', 'Orangensaft', 'halal', 2, ['supermarkt', 'schule', 'airport'], P('bottle', { c: '#ff9f1c', c2: '#fff3c4', brand: 'SONNE', label: 'O-SAFT', e: '🍊' }), { cat: 'getraenk' });
  I('wassermelone', 'Wassermelone', 'halal', 2, ['markt', 'park', 'night'], E('🍉'), { cat: 'obst' });
  I('erdbeeren', 'Erdbeeren', 'halal', 2, ['markt', 'supermarkt', 'park'], E('🍓'), { cat: 'obst' });
  I('brokkoli', 'Brokkoli', 'halal', 2, ['markt', 'supermarkt', 'schule'], E('🥦'), { cat: 'gemuese', why: 'Brokkoli. Das Kind ist enttäuscht, der Detector nicht.' });
  I('schinken', 'Schinken', 'haram', 2, ['supermarkt', 'baeckerei'], P('tray', { c: '#ffb3c1', c2: '#fff', brand: 'LANDGUT', label: 'SCHINKEN', e: '🐖' }), { cat: 'schwein', why: 'Schinken = Schwein.' });
  I('wodka', 'Wodka', 'haram', 2, ['kiosk', 'tankstelle', 'airport'], P('bottle', { c: '#dfe7ef', c2: '#1d3557', brand: 'ICE', label: 'WODKA', e: '🧊', tall: 1 }), { cat: 'alkohol' });
  I('whiskey', 'Whiskey', 'haram', 2, ['kiosk', 'airport', 'restaurant'], E('🥃'), { cat: 'alkohol' });
  I('brezel', 'Brezel', 'halal', 2, ['baeckerei', 'schule', 'einkaufsstrasse'], E('🥨'), { cat: 'basis', why: 'Mehl, Wasser, Lauge, Salz.' });
  I('bonbons', 'Bonbons', 'check', 2, ['kiosk', 'supermarkt', 'schule'], P('bag', { c: '#8338ec', c2: '#ffbe0b', brand: 'LUTSCHI', label: 'BONBONS', e: '🍬' }), { fill: 'sweet', v: [
    ['halal', ['Zucker', 'Glukosesirup', 'Säuerungsmittel: Citronensäure', 'Farbstoff: Spirulina', 'Aroma (alkoholfrei)']],
    ['haram', ['Zucker', 'Glukosesirup', '!Eierlikör (Alkohol 20% vol)', 'Sahne', 'Karamellsirup']],
    ['haram', ['Zucker', 'Glukosesirup', '!Gelatine (Schwein)', 'Farbstoff: Anthocyane']],
  ] });
  I('chipsmystery', 'Chips „Mystery Flavor“', 'check', 2, ['kiosk', 'tankstelle', 'supermarkt'], P('bag', { c: '#3a86ff', c2: '#ffbe0b', brand: 'CRUNCHO', label: 'MYSTERY FLAVOR', e: '❓' }), { fill: 'savory', v: [
    ['halal', ['Kartoffeln', 'Sonnenblumenöl', 'Salz', 'Paprikapulver', 'Zwiebelpulver', 'Hefeextrakt']],
    ['haram', ['Kartoffeln', 'Sonnenblumenöl', '!Schweinespeck-Pulver', 'Salz', 'Raucharoma']],
    ['halal', ['Kartoffeln', 'Rapsöl', 'Meersalz', 'Essig', 'Zucker']],
  ] });
  I('halalchicken', 'Hähnchenbrust (HALAL ✓)', 'halal', 2, ['supermarkt', 'markt'], P('tray', { c: '#ffe29a', c2: '#fff', brand: 'GEFLÜGELHOF', label: 'HÄHNCHEN­BRUST', e: '🐔', badge: 'HALAL ✓' }), { cat: 'zert', twin: 'hallochicken' });
  I('spanferkel', 'Spanferkel', 'haram', 2, ['night', 'restaurant', 'markt'], E('🐖'), { cat: 'schwein', why: 'Das ist literally ein ganzes Schwein. 💀' });
  I('hotdog', 'Hot Dog', 'check', 2, ['kiosk', 'tankstelle', 'park', 'foodtruck'], E('🌭'), { fill: 'meat', v: [
    ['haram', ['Brötchen', '!Würstchen (Schweinefleisch)', 'Senf', 'Röstzwiebeln']],
    ['halal', ['Brötchen', 'Würstchen (Rind, halal-zertifiziert)', 'Senf', 'Röstzwiebeln', 'Ketchup']],
    ['halal', ['Brötchen', 'Veggie-Würstchen (Erbsenprotein)', 'Senf', 'Gurken']],
  ] });
  I('burger', 'Burger', 'check', 2, ['foodcourt', 'restaurant', 'foodtruck', 'mall'], E('🍔'), { fill: 'meat', v: [
    ['halal', ['Brötchen', 'Rindfleisch-Patty (halal-zertifiziert)', 'Salat', 'Tomate', 'Burgersoße']],
    ['haram', ['Brötchen', 'Rindfleisch-Patty (halal-zertifiziert)', '!Bacon (Schwein)', 'Salat', 'Burgersoße']],
    ['haram', ['Brötchen', '!Pulled Pork (Schwein)', 'Krautsalat', 'BBQ-Soße']],
  ] });

  /* --- Tier 3: Supermarkt --- */
  I('schokofuellung', 'Schokolade mit Füllung', 'check', 3, ['supermarkt', 'kiosk', 'airport'], P('bar', { c: '#6b3e26', c2: '#ffd6a5', brand: 'CHOCO', label: 'GEFÜLLT', e: '🍫' }), { fill: 'sweet', v: [
    ['halal', ['Zucker', 'Kakaobutter', 'Kakaomasse', 'Vollmilchpulver', 'Nougat (Haselnuss)', 'Emulgator: Sonnenblumenlecithin']],
    ['haram', ['Zucker', 'Kakaobutter', 'Kakaomasse', '!Rum (4,5% vol)', 'Emulgator: Sojalecithin']],
    ['haram', ['Zucker', 'Kakaomasse', '!Kirschlikör', 'Kirschen', 'Kakaobutter']],
  ] });
  I('fertigsuppe', 'Fertigsuppe', 'check', 3, ['supermarkt', 'tankstelle'], P('cup', { c: '#ffbe0b', c2: '#d62828', brand: '5-MIN', label: 'SUPPE', e: '🍜' }), { fill: 'savory', v: [
    ['haram', ['Nudeln', 'Kartoffelstärke', '!Speck (Schwein)', 'Salz', 'Zwiebeln', 'Petersilie']],
    ['halal', ['Nudeln', 'Karotten', 'Erbsen', 'Salz', 'Hefeextrakt', 'Petersilie']],
    ['halal', ['Nudeln', 'Hühnerbrühe (halal-zertifiziert)', 'Salz', 'Kurkuma', 'Schnittlauch']],
  ] });
  I('tkpizza', 'Tiefkühlpizza', 'check', 3, ['supermarkt', 'tankstelle'], P('box', { c: '#2a9d8f', c2: '#f4a261', brand: 'FROSTINO', label: 'PIZZA SPEZIAL', e: '🍕' }), { fill: 'savory', twin: 'pizzamarinara', v: [
    ['haram', ['Weizenmehl', 'Tomaten', 'Paprika', '!Salami (Schwein)', 'Oregano']],
    ['halal', ['Weizenmehl', 'Tomaten', 'Paprika', 'Rindersalami (halal-zertifiziert)', 'Oregano']],
    ['haram', ['Weizenmehl', 'Tomaten', 'Zwiebeln', '!Schinken (Schwein)', 'Champignons']],
  ] });
  I('wurstunbekannt', 'Unbekannte Wurst', 'check', 3, ['supermarkt', 'markt', 'park'], P('tray', { c: '#c9a0dc', c2: '#fff', brand: 'WURST & CO', label: 'WURST', e: '🌭' }), { fill: 'meat', twin: 'halalsucuk', v: [
    ['haram', ['!Schweinefleisch', 'Salz', 'Gewürze', 'Knoblauch']],
    ['halal', ['Rindfleisch (halal-zertifiziert)', 'Salz', 'Paprika', 'Knoblauch', 'Gewürze']],
    ['haram', ['Putenfleisch', '!Schweinespeck', 'Salz', 'Pfeffer']],
  ] });
  I('proteinriegel', 'Proteinriegel', 'check', 3, ['supermarkt', 'mall', 'tankstelle'], P('bar', { c: '#1f2937', c2: '#22d3ee', brand: 'GAINZ', label: 'PROTEIN', e: '💪' }), { fill: 'sweet', v: [
    ['haram', ['Milcheiweiß', '!Kollagenhydrolysat (Schwein)', 'Glukosesirup', 'Kakao', 'Süßungsmittel: Sucralose']],
    ['halal', ['Milcheiweiß', 'Sojaprotein', 'Haferflocken', 'Datteln', 'Kakao']],
    ['halal', ['Erbsenprotein', 'Zuckeralkohol: Maltit', 'Kakao', 'Mandeln', 'Emulgator: Sonnenblumenlecithin'], 'ZUCKERALKOHOL IST KEIN ALKOHOL. HALAL.'],
  ] });
  I('importsuess', 'Importierte Süßigkeiten', 'check', 3, ['supermarkt', 'airport', 'kiosk'], P('bag', { c: '#06d6a0', c2: '#ef476f', brand: 'IMPORT ★', label: 'SNACK', e: '🍭' }), { fill: 'sweet', v: [
    ['halal', ['Zucker', 'Tapiokastärke', 'Kokosmilch', 'Pandan-Extrakt', 'Salz']],
    ['haram', ['Zucker', 'Glukosesirup', '!Gelatine (Schwein)', 'Farbstoff: E133']],
    ['haram', ['Reismehl', 'Zucker', '!Reiswein (Alkohol)', 'Sesam']],
  ] });
  I('baconchips', 'Chips „BACON FLAVOR“', 'check', 3, ['supermarkt', 'kiosk', 'tankstelle'], P('bag', { c: '#3a86ff', c2: '#ffbe0b', brand: 'CRUNCHO', label: 'BACON FLAVOR', e: '🥓' }), { fill: 'savory', twin: 'halalchips', why: 'BACON FLAVOR ≠ automatisch Bacon. Erst Zutaten checken!', v: [
    ['halal', ['Kartoffeln', 'Sonnenblumenöl', 'Raucharoma', 'Hefeextrakt', 'Paprika', 'Salz'], 'Bacon Flavor ohne Bacon. Nur Rauch-Aroma. HALAL.'],
    ['haram', ['Kartoffeln', 'Sonnenblumenöl', '!Speckpulver (Schwein)', 'Salz', 'Raucharoma']],
  ] });
  I('halalchips', 'Chips „HALAL CHICKEN“', 'halal', 3, ['supermarkt', 'kiosk', 'tankstelle'], P('bag', { c: '#3a86ff', c2: '#ffbe0b', brand: 'CRUNCHO', label: 'HALAL CHICKEN', e: '🍗', badge: 'HALAL ✓' }), { cat: 'zert', twin: 'baconchips' });
  I('speckchips', 'Chips „MIT ECHTEM SPECK“', 'haram', 3, ['supermarkt', 'kiosk'], P('bag', { c: '#3a86ff', c2: '#ffbe0b', brand: 'CRUNCHO', label: 'MIT ECHTEM SPECK', e: '🥓', badge: 'SCHWEIN' }), { cat: 'schwein', twin: 'baconchips', why: '„Mit echtem Speck“ steht drauf. Lesen, Bruder.' });
  I('trauben', 'Trauben', 'halal', 3, ['markt', 'supermarkt'], E('🍇'), { cat: 'obst', twin: 'wein', why: 'Trauben ≠ Wein. Obst ist Obst.' });
  I('honig', 'Honig', 'halal', 3, ['markt', 'supermarkt'], E('🍯'), { cat: 'basis' });
  I('datteln', 'Datteln', 'halal', 3, ['markt', 'supermarkt', 'night'], P('box', { c: '#8d5524', c2: '#ffe8c2', brand: 'OASE', label: 'DATTELN', e: '🌴' }), { cat: 'obst' });
  I('oliven', 'Oliven', 'halal', 3, ['markt', 'supermarkt'], E('🫒'), { cat: 'gemuese' });
  I('cornflakes', 'Cornflakes', 'halal', 3, ['supermarkt'], P('box', { c: '#ffd166', c2: '#ef476f', brand: 'MORGENS', label: 'CORN FLAKES', e: '🌽' }), { cat: 'pflanzlich', twin: 'marshcereal', why: 'Mais, Zucker, Salz. Frühstück.' });
  I('marshcereal', 'Marshmallow-Cerealien', 'check', 3, ['supermarkt'], P('box', { c: '#ffd166', c2: '#ef476f', brand: 'MORGENS', label: 'MALLOW CRUNCH', e: '🥣' }), { fill: 'sweet', twin: 'cornflakes', v: [
    ['haram', ['Hafer', 'Zucker', 'Maisstärke', '!Marshmallows mit Gelatine (Schwein)', 'Salz']],
    ['halal', ['Hafer', 'Zucker', 'Maisstärke', 'Marshmallows (Zucker, Pektin)', 'Salz']],
  ] });
  I('ketchup', 'Ketchup', 'halal', 3, ['supermarkt', 'foodcourt'], P('bottle', { c: '#d62828', c2: '#fff', brand: 'TOMATINO', label: 'KETCHUP', e: '🍅' }), { cat: 'pflanzlich', why: 'Tomaten, Zucker, Essig, Salz.' });
  I('schweinesalami', 'Schweine-Salami', 'haram', 3, ['supermarkt'], P('tray', { c: '#ffb3c1', c2: '#fff', brand: 'LANDGUT', label: 'SCHWEINE-SALAMI', e: '🐷' }), { cat: 'schwein' });
  I('schmalz', 'Schmalz', 'haram', 3, ['supermarkt', 'markt'], P('cup', { c: '#fff6e0', c2: '#e07a5f', brand: 'BAUERNHOF', label: 'SCHWEINE­SCHMALZ', e: '🐷' }), { cat: 'schwein', why: 'Schmalz vom Schwein. Steht drauf.' });
  I('eierlikoer', 'Eierlikör', 'haram', 3, ['supermarkt', 'kiosk'], P('bottle', { c: '#ffe066', c2: '#8d5524', brand: 'OMAS', label: 'EIERLIKÖR', e: '🥚' }), { cat: 'alkohol', why: 'Likör = Alkohol. Auch mit Ei.' });
  I('radler', 'Radler', 'haram', 3, ['kiosk', 'tankstelle', 'park'], P('can', { c: '#ffd60a', c2: '#2b9348', brand: 'ZITRO', label: 'RADLER', e: '🍋' }), { cat: 'alkohol', twin: 'limo', why: 'Radler = Bier + Limo. Bier bleibt Bier.' });
  I('limo', 'Zitronenlimo', 'halal', 3, ['kiosk', 'tankstelle', 'park'], P('can', { c: '#ffd60a', c2: '#2b9348', brand: 'ZITRO', label: 'LIMONADE', e: '🍋' }), { cat: 'getraenk', twin: 'radler' });
  I('weingummi', 'Weingummi', 'check', 3, ['kiosk', 'supermarkt'], P('bag', { c: '#9d0208', c2: '#ffba08', brand: 'BÄRLI', label: 'WEINGUMMI', e: '🍷' }), { fill: 'sweet', why: 'Weingummi heißt nur so – meistens. Zutaten checken!', v: [
    ['halal', ['Glukosesirup', 'Zucker', 'Geliermittel: Pektin', 'Säuerungsmittel: Citronensäure', 'Farbstoff: Anthocyane'], 'Weingummi ohne Wein. Nur der Name. HALAL.'],
    ['haram', ['Glukosesirup', 'Zucker', '!Rotwein (3%)', 'Gelatine (Rind, halal-zertifiziert)', 'Aroma (alkoholfrei)']],
    ['haram', ['Glukosesirup', 'Zucker', '!Gelatine (Schwein)', 'Säuerungsmittel: Milchsäure']],
  ] });
  I('halalgummi', 'Gummibärchen (HALAL ✓)', 'halal', 3, ['supermarkt', 'kiosk'], P('bag', { c: '#ff4f7b', c2: '#ffd23f', brand: 'BÄRLI', label: 'GUMMI­BÄRCHEN', e: '🐻', badge: 'HALAL ✓' }), { cat: 'zert', twin: 'gummibaerchen' });
  I('halalsucuk', 'Sucuk (HALAL ✓)', 'halal', 3, ['supermarkt', 'doener', 'markt'], P('tray', { c: '#e76f51', c2: '#fff', brand: 'ANADOLU', label: 'SUCUK', e: '🌶️', badge: 'HALAL ✓' }), { cat: 'zert', twin: 'wurstunbekannt' });
  I('pizzahawaii', 'Pizza Hawaii (mit Schinken)', 'haram', 3, ['supermarkt', 'foodcourt'], P('box', { c: '#2a9d8f', c2: '#f4a261', brand: 'FROSTINO', label: 'HAWAII MIT SCHINKEN', e: '🍍' }), { cat: 'schwein', twin: 'pizzamarinara', why: 'Schinken steht drauf. Schinken = Schwein.' });
  I('pizzamarinara', 'Pizza Marinara', 'halal', 3, ['supermarkt', 'foodcourt', 'restaurant'], P('box', { c: '#2a9d8f', c2: '#f4a261', brand: 'FROSTINO', label: 'MARINARA', e: '🍕' }), { cat: 'pflanzlich', twin: 'pizzahawaii', why: 'Teig, Tomaten, Knoblauch, Oregano. Nicht mal Käse.' });
  I('kekse', 'Kekse', 'check', 3, ['supermarkt', 'kiosk', 'schule'], E('🍪'), { fill: 'bakery', v: [
    ['halal', ['Weizenmehl', 'Zucker', 'Butter', 'Eier', 'Backpulver', 'Schokostückchen']],
    ['haram', ['Weizenmehl', 'Zucker', '!Schweineschmalz', 'Salz', 'Backpulver']],
  ] });
  I('lakritz', 'Lakritz', 'check', 3, ['kiosk', 'supermarkt'], P('bag', { c: '#1b1b1b', c2: '#e5e5e5', brand: 'SCHWARZ', label: 'LAKRITZ', e: '🖤' }), { fill: 'sweet', v: [
    ['halal', ['Zucker', 'Weizenmehl', 'Süßholzsaft', 'Salmiak', 'Stärke']],
    ['haram', ['Zucker', 'Glukosesirup', 'Süßholzsaft', '!Gelatine (Schwein)', 'Pflanzenöl']],
  ] });
  I('avocado', 'Avocado', 'halal', 3, ['markt', 'supermarkt', 'mall'], E('🥑'), { cat: 'obst' });
  I('mais', 'Maiskolben', 'halal', 3, ['markt', 'night', 'park'], E('🌽'), { cat: 'gemuese' });

  /* --- Tier 4: Einkaufszentrum / Food Court --- */
  I('sushi', 'Sushi', 'check', 4, ['foodcourt', 'restaurant', 'mall', 'airport'], E('🍣'), { fill: 'savory', v: [
    ['halal', ['Reis', 'Lachs', 'Reisessig', 'Zucker', 'Nori-Algen']],
    ['haram', ['Reis', 'Thunfisch', '!Mirin (Reiswein, Alkohol)', 'Zucker', 'Nori-Algen']],
  ] });
  I('ramen', 'Ramen', 'check', 4, ['foodcourt', 'night', 'restaurant'], E('🍜'), { fill: 'savory', v: [
    ['haram', ['Weizennudeln', '!Tonkotsu-Brühe (Schweineknochen)', 'Ei', 'Frühlingszwiebeln', 'Nori']],
    ['halal', ['Weizennudeln', 'Hühnerbrühe (halal-zertifiziert)', 'Ei', 'Frühlingszwiebeln', 'Mais']],
    ['halal', ['Weizennudeln', 'Gemüsebrühe', 'Tofu', 'Pilze', 'Frühlingszwiebeln']],
  ] });
  I('dumplings', 'Dumplings', 'check', 4, ['foodcourt', 'night', 'restaurant'], E('🥟'), { fill: 'savory', v: [
    ['haram', ['Teig (Weizenmehl)', '!Schweinehack', 'Ingwer', 'Frühlingszwiebeln', 'Sesamöl']],
    ['halal', ['Teig (Weizenmehl)', 'Hähnchenhack (halal-zertifiziert)', 'Ingwer', 'Kohl', 'Sesamöl']],
    ['halal', ['Teig (Weizenmehl)', 'Gemüse', 'Glasnudeln', 'Pilze', 'Sesamöl']],
  ] });
  I('pasta', 'Pasta', 'check', 4, ['restaurant', 'foodcourt', 'mall'], E('🍝'), { fill: 'savory', v: [
    ['haram', ['Spaghetti', 'Eigelb', 'Salz', '!Guanciale (Schweinebacke)', 'Pfeffer']],
    ['halal', ['Spaghetti', 'Tomaten', 'Knoblauch', 'Chili', 'Olivenöl', 'Basilikum']],
    ['haram', ['Penne', 'Sahne', '!Weißwein', 'Lachs', 'Dill']],
  ] });
  I('nuggets', 'Chicken Nuggets', 'check', 4, ['foodcourt', 'mall', 'tankstelle'], P('box', { c: '#ffb703', c2: '#d00000', brand: 'NUGGETZ', label: 'CHICKEN NUGGETS', e: '🍗' }), { fill: 'meat', v: [
    ['halal', ['Hähnchenfleisch (halal-zertifiziert)', 'Paniermehl', 'Sonnenblumenöl', 'Salz', 'Gewürze']],
    ['haram', ['Hähnchenfleisch', '!Schweinehaut (Bindemittel)', 'Paniermehl', 'Salz']],
  ] });
  I('baconburger', 'Bacon-Burger', 'haram', 4, ['foodcourt', 'restaurant'], P('box', { c: '#bc4749', c2: '#f2e8cf', brand: 'BURGR', label: 'BACON BURGER', e: '🥓' }), { cat: 'schwein', why: '„Bacon Burger“ – der Bacon ist echt. Schwein.' });
  I('tacos', 'Tacos', 'check', 4, ['foodcourt', 'foodtruck', 'night'], E('🌮'), { fill: 'savory', v: [
    ['halal', ['Maistortilla', 'Rinderhack (halal-zertifiziert)', 'Salat', 'Tomate', 'Salsa']],
    ['haram', ['Maistortilla', '!Carnitas (Schwein)', 'Zwiebeln', 'Koriander', 'Limette']],
    ['halal', ['Maistortilla', 'Bohnen', 'Mais', 'Avocado', 'Salsa']],
  ] });
  I('donut', 'Donut', 'check', 4, ['mall', 'foodcourt', 'tankstelle', 'baeckerei'], E('🍩'), { fill: 'bakery', v: [
    ['halal', ['Weizenmehl', 'Zucker', 'Pflanzenöl', 'Hefe', 'Glasur (Zucker, Kakao)']],
    ['haram', ['Weizenmehl', 'Zucker', '!Schweineschmalz (Frittierfett)', 'Hefe', 'Zuckerglasur']],
    ['haram', ['Weizenmehl', 'Zucker', 'Hefe', '!Füllung: Eierlikör (Alkohol)', 'Puderzucker']],
  ] });
  I('bubbletea', 'Bubble Tea', 'check', 4, ['mall', 'night', 'foodcourt'], E('🧋'), { fill: 'drink', v: [
    ['halal', ['Schwarztee', 'Milch', 'Zucker', 'Tapiokaperlen (Tapiokastärke)']],
    ['haram', ['Grüntee', 'Zucker', 'Tapiokaperlen', '!Jelly-Topping (Gelatine, Schwein)']],
  ] });
  I('softeis', 'Softeis', 'check', 4, ['park', 'mall', 'foodcourt'], E('🍦'), { fill: 'dairy', v: [
    ['halal', ['Milch', 'Zucker', 'Sahne', 'Johannisbrotkernmehl', 'Vanillin']],
    ['haram', ['Milch', 'Zucker', 'Sahne', '!Gelatine (Schwein)', 'Aroma (alkoholfrei)']],
  ] });
  I('eisbecher', 'Eisbecher', 'check', 4, ['mall', 'restaurant', 'park'], E('🍨'), { fill: 'dairy', v: [
    ['haram', ['Vanilleeis', 'Sahne', '!Eierlikör', 'Waffel']],
    ['halal', ['Schokoeis', 'Sahne', 'Kirschen', 'Schokosoße', 'Waffel']],
    ['haram', ['Vanilleeis', '!Amarena-Kirschen in Likör', 'Sahne']],
  ] });
  I('tropical', 'Tropical Cocktail', 'check', 4, ['night', 'airport', 'mall'], E('🍹'), { fill: 'drink', why: 'Ein Cocktail kann alkoholfrei sein – oder eben nicht.', v: [
    ['haram', ['Ananassaft', 'Kokosmilch', '!Rum (40% vol)', 'Eis']],
    ['halal', ['Ananassaft', 'Kokosmilch', 'Limette', 'Eis', 'Minze'], 'Alkoholfreier Cocktail. HALAL.'],
    ['halal', ['Maracujasaft', 'Orangensaft', 'Grenadine-Sirup', 'Eis']],
  ] });
  I('martini', 'Martini', 'haram', 4, ['airport', 'restaurant', 'night'], E('🍸'), { cat: 'alkohol' });
  I('sekt', 'Sekt', 'haram', 4, ['mall', 'airport', 'restaurant'], E('🍾'), { cat: 'alkohol' });
  I('currywurst', 'Currywurst', 'check', 4, ['foodtruck', 'einkaufsstrasse', 'tankstelle'], P('tray', { c: '#f77f00', c2: '#fff', brand: 'IMBISS', label: 'CURRYWURST', e: '🌭' }), { fill: 'meat', v: [
    ['haram', ['!Bratwurst (Schwein)', 'Currysoße', 'Currypulver', 'Pommes']],
    ['halal', ['Rindswurst (halal-zertifiziert)', 'Currysoße', 'Currypulver', 'Pommes']],
  ] });
  I('frikadelle', 'Frikadelle', 'check', 4, ['baeckerei', 'einkaufsstrasse', 'tankstelle', 'restaurant'], E('🧆'), { fill: 'meat', twin: 'falafel', why: 'Sieht aus wie Falafel, ist aber Hackfleisch. Checken!', v: [
    ['haram', ['!Schweinehack', 'Rinderhack', 'Zwiebeln', 'Ei', 'Paniermehl']],
    ['halal', ['Rinderhack (halal-zertifiziert)', 'Zwiebeln', 'Ei', 'Paniermehl', 'Petersilie']],
  ] });
  I('croissant', 'Croissant', 'check', 4, ['baeckerei', 'airport', 'mall'], E('🥐'), { fill: 'bakery', v: [
    ['halal', ['Weizenmehl', 'Butter', 'Zucker', 'Hefe', 'Salz', 'Ei']],
    ['haram', ['Weizenmehl', '!Schweineschmalz', 'Zucker', 'Hefe', 'Salz']],
    ['haram', ['Weizenmehl', 'Butter', 'Hefe', '!Füllung: Schinken (Schwein)']],
  ] });
  I('berliner', 'Berliner', 'check', 4, ['baeckerei', 'einkaufsstrasse'], P('paper', { c: '#e9c46a', c2: '#fff', brand: 'BÄCKEREI', label: 'BERLINER', e: '🍩' }), { fill: 'bakery', v: [
    ['halal', ['Weizenmehl', 'Zucker', 'Hefe', 'Pflanzenöl', 'Füllung: Erdbeermarmelade', 'Puderzucker']],
    ['haram', ['Weizenmehl', 'Zucker', 'Hefe', 'Pflanzenöl', '!Füllung: Eierlikör-Creme (Alkohol)', 'Puderzucker']],
  ] });
  I('schweineohr', 'Schweineohr (Gebäck)', 'check', 4, ['baeckerei', 'einkaufsstrasse'], P('paper', { c: '#e9c46a', c2: '#fff', brand: 'BÄCKEREI', label: 'SCHWEINE­OHR', e: '🥐' }), { fill: 'bakery', twin: 'schweinefleisch', why: 'Ein Schweineohr ist ein Gebäck, Bruder. Aber lies trotzdem.', v: [
    ['halal', ['Weizenmehl', 'Butter', 'Zucker', 'Salz'], 'KEIN SCHWEIN. NUR BLÄTTERTEIG. 💀 HALAL.'],
    ['haram', ['Weizenmehl', '!Schweineschmalz (im Blätterteig)', 'Zucker', 'Salz'], 'Diesmal wirklich Schwein – im Teig. HARAM.'],
  ] });
  I('bagel', 'Bagel', 'halal', 4, ['mall', 'airport', 'baeckerei'], E('🥯'), { cat: 'basis' });
  I('kaffee', 'Kaffee', 'halal', 4, ['airport', 'mall', 'baeckerei', 'tankstelle'], E('☕'), { cat: 'getraenk', why: 'Kaffee. Der Detector braucht auch einen.' });
  I('ananas', 'Ananas', 'halal', 4, ['markt', 'mall', 'night'], E('🍍'), { cat: 'obst' });

  /* --- Tier 5: Flughafen --- */
  I('airlinemenu', 'Airline-Menü', 'check', 5, ['airport'], P('tray', { c: '#adb5bd', c2: '#fff', brand: 'SKY MEAL', label: 'CHICKEN OR PASTA?', e: '✈️' }), { fill: 'savory', v: [
    ['halal', ['Hähnchen (halal-zertifiziert)', 'Reis', 'Gemüse', 'Brötchen', 'Butter']],
    ['haram', ['Pasta', 'Sahnesoße', '!Schinkenwürfel', 'Brötchen']],
    ['haram', ['Hähnchen', '!Weißweinsoße', 'Kartoffeln']],
  ] });
  I('dutyfree', 'Duty-Free Whisky', 'haram', 5, ['airport'], P('bottle', { c: '#b5651d', c2: '#1b1b1b', brand: 'HIGHLAND', label: 'WHISKY 12 J.', e: '🥃', tall: 1 }), { cat: 'alkohol' });
  I('sake', 'Sake', 'haram', 5, ['restaurant', 'airport', 'night'], E('🍶'), { cat: 'alkohol', why: 'Sake = Reiswein = Alkohol.' });
  I('rumkugeln', 'Rumkugeln', 'check', 5, ['baeckerei', 'supermarkt', 'airport'], P('box', { c: '#4a2c2a', c2: '#f1c27d', brand: 'CHOCO', label: 'RUMKUGELN', e: '🟤' }), { fill: 'sweet', v: [
    ['haram', ['Zucker', 'Kakao', 'Kuvertüre', '!Rum (3% vol)', 'Schokostreusel']],
    ['halal', ['Zucker', 'Kakao', 'Kuvertüre', 'Aroma (alkoholfrei)', 'Schokostreusel'], 'Rumkugeln ohne Rum?! Verwirrend, aber: HALAL.'],
  ] });
  I('kirschpralinen', 'Kirsch-Pralinen', 'check', 5, ['airport', 'supermarkt'], P('box', { c: '#9d0208', c2: '#ffd6e0', brand: 'CHERIE', label: 'KIRSCH-PRALINEN', e: '🍒' }), { fill: 'sweet', v: [
    ['haram', ['Zartbitterschokolade', 'Kirsche', '!Kirschwasser (Alkohol)', 'Zucker']],
    ['halal', ['Zartbitterschokolade', 'Kirsche', 'Zuckersirup', 'Zucker']],
  ] });
  I('tiramisu', 'Tiramisu', 'check', 5, ['restaurant', 'foodcourt', 'airport'], P('cup', { c: '#f1e3d3', c2: '#6f4e37', brand: 'DOLCE', label: 'TIRAMISU', e: '☕' }), { fill: 'dairy', v: [
    ['haram', ['Mascarpone', 'Löffelbiskuit', 'Espresso', '!Marsala-Wein', 'Kakao']],
    ['haram', ['Mascarpone', 'Löffelbiskuit', 'Espresso', '!Amaretto (Likör)', 'Kakao']],
    ['halal', ['Mascarpone', 'Löffelbiskuit', 'Espresso', 'Zucker', 'Kakao']],
  ] });
  I('hallochicken', '„HALLO“ Chicken Wings', 'check', 5, ['airport', 'supermarkt', 'foodcourt'], P('tray', { c: '#ffe29a', c2: '#fff', brand: 'HALLO!', label: 'CHICKEN WINGS', e: '🍗' }), { fill: 'meat', twin: 'halalchicken', why: 'Da steht HALLO, nicht HALAL. Genau lesen!', v: [
    ['haram', ['Hähnchenflügel', '!Marinade mit Weißwein', 'Paprika', 'Salz']],
    ['halal', ['Hähnchenflügel (halal-zertifiziert)', 'Paprika', 'Knoblauch', 'Salz']],
  ] });
  I('leberkaese', 'Leberkäse', 'check', 5, ['baeckerei', 'tankstelle', 'einkaufsstrasse'], P('tray', { c: '#f4a261', c2: '#fff', brand: 'METZGEREI', label: 'LEBERKÄSE', e: '🍖' }), { fill: 'meat', why: 'Leberkäse: meist weder Leber noch Käse. Aber was dann?!', v: [
    ['haram', ['!Schweinefleisch', '!Speck', 'Salz', 'Gewürze']],
    ['halal', ['Rindfleisch (halal-zertifiziert)', 'Salz', 'Gewürze', 'Zwiebeln'], 'Halal-Leberkäse existiert. Der Detector ist beeindruckt.'],
  ] });
  I('wienerschnitzel', 'Wiener Schnitzel (Kalb)', 'check', 5, ['restaurant', 'airport'], P('tray', { c: '#fcbf49', c2: '#fff', brand: 'WIRTSHAUS', label: 'WIENER SCHNITZEL', e: '🥩' }), { fill: 'meat', twin: 'schnitzelwa', v: [
    ['halal', ['Kalbfleisch (halal-zertifiziert)', 'Paniermehl', 'Ei', 'Mehl', 'Sonnenblumenöl']],
    ['haram', ['Kalbfleisch', 'Paniermehl', 'Ei', '!Schweineschmalz (Bratfett)']],
  ] });
  I('schnitzelwa', 'Schnitzel „Wiener Art“', 'haram', 5, ['restaurant', 'foodcourt'], P('tray', { c: '#fcbf49', c2: '#fff', brand: 'WIRTSHAUS', label: 'WIENER ART (SCHWEIN)', e: '🐷' }), { cat: 'schwein', twin: 'wienerschnitzel', why: '„Wiener Art“ = Schwein. Steht sogar drauf.' });
  I('steak', 'Steak', 'check', 5, ['restaurant', 'airport', 'night'], E('🥩'), { fill: 'meat', v: [
    ['halal', ['Rindersteak (halal-zertifiziert)', 'Salz', 'Pfeffer', 'Rosmarin']],
    ['haram', ['Rindersteak', '!Whiskey-Pfeffersoße', 'Salz']],
    ['haram', ['!Schweinenacken-Steak', 'Salz', 'Pfeffer']],
  ] });
  I('keule', 'Hähnchenkeule', 'check', 5, ['foodcourt', 'night', 'restaurant'], E('🍗'), { fill: 'meat', v: [
    ['halal', ['Hähnchenkeule (halal-zertifiziert)', 'Paprika', 'Knoblauch', 'Salz']],
    ['haram', ['Hähnchenkeule', '!Bier-Marinade', 'Paprika', 'Salz']],
  ] });
  I('mango', 'Mango', 'halal', 5, ['markt', 'airport', 'night'], E('🥭'), { cat: 'obst' });
  I('kokos', 'Kokosnuss', 'halal', 5, ['markt', 'airport', 'night'], E('🥥'), { cat: 'obst' });

  /* --- Tier 6: Nachtmarkt --- */
  I('spiess', 'Mystery-Spieß', 'check', 6, ['night', 'foodtruck'], E('🍢'), { fill: 'meat', v: [
    ['halal', ['Lammfleisch (halal-zertifiziert)', 'Paprika', 'Zwiebel', 'Gewürze']],
    ['haram', ['!Schweinebauch', 'Paprika', 'Zwiebel', 'BBQ-Glasur']],
    ['halal', ['Tofu', 'Zucchini', 'Paprika', 'Kräuteröl']],
  ] });
  I('crepe', 'Crêpe', 'check', 6, ['night', 'mall', 'einkaufsstrasse'], E('🥞'), { fill: 'bakery', v: [
    ['halal', ['Weizenmehl', 'Milch', 'Ei', 'Zucker', 'Nuss-Nougat-Creme', 'Banane']],
    ['haram', ['Weizenmehl', 'Milch', 'Ei', 'Zucker', '!Grand Marnier (Orangenlikör)']],
  ] });
  I('gemischtetuete', 'Gemischte Tüte', 'check', 6, ['kiosk', 'schule', 'night'], P('paper', { c: '#ffffff', c2: '#ff006e', brand: 'KIOSK', label: 'GEMISCHTE TÜTE', e: '🍬', stripes: 1 }), { fill: 'sweet', v: [
    ['haram', ['Colafläschchen (Zucker, Pektin)', 'Saure Zungen (Zucker, Pektin)', '!Weiße Mäuse (Gelatine, Schwein)', 'Brausestäbchen', 'Lakritzschnecke', 'Schaumzucker (Pektin)']],
    ['halal', ['Colafläschchen (Zucker, Pektin)', 'Saure Zungen (Zucker, Pektin)', 'Brausestäbchen', 'Lakritzschnecke', 'Schaumzucker (Pektin)', 'Esspapier']],
  ] });
  I('pudding', 'Pudding', 'check', 6, ['supermarkt', 'schule', 'night'], E('🍮'), { fill: 'dairy', v: [
    ['halal', ['Milch', 'Zucker', 'Maisstärke', 'Vanille', 'Karamell']],
    ['haram', ['Milch', 'Zucker', '!Gelatine (Schwein)', 'Karamell']],
  ] });
  I('joghurt', 'Fruchtjoghurt', 'check', 6, ['supermarkt', 'schule'], P('cup', { c: '#ffafcc', c2: '#fff', brand: 'MUHH', label: 'ERDBEER-JOGHURT', e: '🍓' }), { fill: 'dairy', v: [
    ['halal', ['Joghurt', 'Erdbeeren', 'Zucker', 'Pektin']],
    ['haram', ['Joghurt', 'Erdbeeren', 'Zucker', '!Gelatine (Schwein)']],
  ] });
  I('schwarzwaelder', 'Schwarzwälder Kirschtorte', 'check', 6, ['baeckerei', 'restaurant'], E('🍰'), { fill: 'bakery', v: [
    ['haram', ['Biskuit', 'Sahne', 'Sauerkirschen', '!Kirschwasser (Alkohol)', 'Schokoraspeln']],
    ['halal', ['Biskuit', 'Sahne', 'Sauerkirschen', 'Kirschsaft', 'Schokoraspeln'], 'Ohne Kirschwasser. Selten, aber existiert. HALAL.'],
  ] });
  I('zuckerwatte', 'Zuckerwatte', 'halal', 6, ['night', 'park'], P('bag', { c: '#ffc8dd', c2: '#a2d2ff', brand: 'KIRMES', label: 'ZUCKERWATTE', e: '🍭' }), { cat: 'pflanzlich', why: 'Zucker. Luft. Farbe. Das war’s.' });
  I('popcorn', 'Popcorn', 'halal', 6, ['night', 'mall', 'park'], E('🍿'), { cat: 'pflanzlich', why: 'Mais, Öl, Zucker oder Salz.' });

  /* --- Legendary Items (extrem selten, x5 Punkte) --- */
  const LEGENDARY = [
    { id: 'goldendoener', name: 'GOLDENER DÖNER', ans: 'halal', tier: 1, places: ['doener'], art: P('tray', { c: '#ffd700', c2: '#fff6c2', brand: 'LEGENDARY', label: 'GOLD-DÖNER', e: '🥙', badge: 'HALAL ✓' }), cat: 'zert', legend: true, why: 'LEGENDARY. Halal-zertifiziert. Bitte nicht reinbeißen, ist aus Gold.' },
    { id: 'goldenebanane', name: 'GOLDENE BANANE', ans: 'halal', tier: 1, places: ['markt'], art: E('🍌'), cat: 'obst', legend: true, why: 'LEGENDARY. Immer noch Obst.' },
    { id: 'diamantdatteln', name: 'DIAMANT-DATTELN', ans: 'halal', tier: 1, places: ['markt'], art: P('box', { c: '#9bf6ff', c2: '#ffffff', brand: 'LEGENDARY', label: 'DATTELN', e: '💎' }), cat: 'obst', legend: true, why: 'LEGENDARY. Glitzernde Datteln. Halal und fabulous.' },
  ];

  /* --- Spezial-Events --- */
  const EVENTS = {
    mystery: { id: 'mysterybox', name: 'MYSTERY BOX', ans: 'check', tier: 2, places: ['strasse'], art: P('box', { c: '#8d6e63', c2: '#ffe0b2', brand: '???', label: '???', e: '❓', mystery: 1 }), fill: 'none',
      npcLine: 'BROTHER… WHAT IS INSIDE?', npc: 'driver', v: [
        ['halal', ['1× Banane', '1× Zettel: „Viel Glück, Bruder“'], 'Eine Banane. Der Detector ist erleichtert.'],
        ['haram', ['!3× Gummibärchen (Gelatine, Schwein)', '1× Konfetti']],
        ['halal', ['12× Datteln', '1× Gutschein: „+100 Aura“']],
        ['haram', ['!1× Dose Bier', '1× Kronkorken']],
        ['halal', ['Nichts. Nur Luft. 💨'], 'LEER. Luft ist halal. 💀'],
      ] },
    grandma: { id: 'omaskuchen', name: 'OMAS KUCHEN', ans: 'check', tier: 2, places: ['baeckerei'], art: E('🥧'), fill: 'none', hand: true,
      npcLine: 'ICH HABE DAS SELBST GEMACHT.', npc: 'oma', v: [
        ['halal', ['Mehl', 'Eier', 'Zucker', 'Butter', 'Äpfel', 'Liebe ❤️'], 'Oma hat alles richtig gemacht. HALAL. ❤️'],
        ['haram', ['Mehl', 'Eier', 'Zucker', '!„Ein Schlückchen Rum“ 🤫', 'Rosinen'], 'OMA?! Rum im Kuchen! HARAM.'],
        ['halal', ['Mehl', 'Eier', 'Zucker', 'Quark', 'Zitrone', '„Geheimzutat: Zimt“']],
      ] },
    arabic: { id: 'importkekse', name: 'IMPORT-KEKSE', ans: 'check', tier: 3, places: ['supermarkt'], art: P('box', { c: '#ffffff', c2: '#1a936f', brand: 'SWEETY', label: 'بسكويت', e: '🍪' }), fill: 'none', arabic: true,
      npcLine: 'INGREDIENTS IN ARABIC', npc: 'staff', v: [
        ['halal', [['دقيق القمح', 'Weizenmehl'], ['سكر', 'Zucker'], ['زيت نباتي', 'Pflanzenöl'], ['حليب', 'Milch'], ['ملح', 'Salz']]],
        ['halal', [['دقيق القمح', 'Weizenmehl'], ['سكر', 'Zucker'], ['جيلاتين بقري حلال', 'Gelatine (Rind, halal)'], ['تمر', 'Datteln'], ['ملح', 'Salz']]],
        ['haram', [['دقيق القمح', 'Weizenmehl'], ['سكر', 'Zucker'], ['!كحول', 'Alkohol'], ['زيت نباتي', 'Pflanzenöl'], ['ملح', 'Salz']]],
      ] },
    doener17: { id: 'doener17', name: 'DÖNER MIT 17 SOSSEN', ans: 'check', tier: 2, places: ['doener'], art: P('tray', { c: '#ff9f1c', c2: '#fff', brand: 'DÖNER-MEISTER', label: 'DÖNER XXL', e: '🥙', badge: '17 SOSSEN' }), fill: 'none', overload: true,
      npcLine: 'DÖNER MIT 17 SOSSEN. KOMMT SOFORT.', npc: 'meister' },
  };
  const SAUCES17 = ['Knoblauchsoße', 'Kräutersoße', 'Scharfe Soße', 'Cocktailsoße (ohne Alkohol)', 'Currysoße', 'Sesamsoße', 'Joghurt-Minz-Soße', 'Tzatziki', 'Hummus-Soße', 'Burgersoße', 'Ketchup', 'Mayo', 'Senf', 'Chilisoße', 'BBQ-Soße (alkoholfrei)', 'Aioli', 'Samurai-Soße', 'Andalouse-Soße'];

  /* Füllzutaten für längere Listen in höheren Levels (alle unproblematisch) */
  const FILL = {
    sweet: ['Zucker', 'Glukosesirup', 'Dextrose', 'Säuerungsmittel: Citronensäure', 'Aroma (alkoholfrei)', 'Farbstoff: Spirulina-Konzentrat', 'Maisstärke', 'Invertzuckersirup', 'Überzugsmittel: Carnaubawachs', 'Fruchtsaftkonzentrat', 'Kakaobutter', 'Emulgator: Sonnenblumenlecithin', 'Vanillin', 'Reismehl', 'Karamellsirup', 'Zuckeralkohol: Maltit', 'Trennmittel: Bienenwachs'],
    savory: ['Salz', 'Hefeextrakt', 'Zwiebelpulver', 'Knoblauchpulver', 'Paprikapulver', 'Maltodextrin', 'Sonnenblumenöl', 'Kartoffelstärke', 'Tomatenmark', 'Gewürze', 'Säureregulator: Natriumcitrat', 'Verdickungsmittel: Guarkernmehl', 'Kurkuma', 'Pfeffer', 'Essig', 'Senfsaat'],
    bakery: ['Weizenmehl', 'Hefe', 'Salz', 'Zucker', 'Backpulver', 'Pflanzenöl', 'Vanillezucker', 'Eier', 'Milch', 'Puderzucker', 'Sesam', 'Mohn'],
    meat: ['Salz', 'Pfeffer', 'Paprika', 'Knoblauch', 'Zwiebeln', 'Gewürze', 'Rapsöl', 'Dextrose', 'Antioxidationsmittel: Ascorbinsäure', 'Senf'],
    doener: ['Salat', 'Tomaten', 'Zwiebeln', 'Rotkohl', 'Gurken', 'Peperoni', 'Sumach', 'Chiliflocken', 'Petersilie'],
    drink: ['Wasser', 'Zucker', 'Eiswürfel', 'Zitronensaft', 'Minze', 'Kohlensäure', 'Vanillesirup'],
    dairy: ['Milch', 'Sahne', 'Zucker', 'Vanille', 'Johannisbrotkernmehl', 'Maisstärke', 'Kakao'],
    weird: ['E-1337 (pflanzlich, Detector-geprüft)', 'Aroma „Bruder-Mischung“ (pflanzlich)', 'Konfetti (essbar)', 'Geheimzutat: Zimt', 'Glitzer (essbar, pflanzlich)'],
  };

  /* Kommentare beim Antippen einer harmlosen Zutat im Zutaten-Minispiel */
  const TRAPS = [
    [/zuckeralkohol/i, 'ZUCKERALKOHOL IST KEIN ALKOHOL 💀'],
    [/ohne alkohol|alkoholfrei/i, '„OHNE ALKOHOL“. STEHT DA, BRO.'],
    [/halal/i, 'DA STEHT LITERALLY HALAL.'],
    [/kakaobutter/i, 'KAKAOBUTTER. AUS KAKAO, BRO.'],
    [/essig/i, 'ESSIG IST NICHT DAS PROBLEM.'],
    [/pektin/i, 'PEKTIN = PFLANZLICH. ENTSPANN DICH.'],
    [/liebe/i, 'LIEBE IST HALAL. 💚'],
    [/butter/i, 'BUTTER IST NICHT DAS PROBLEM.'],
    [/weingummi|kirsche|trauben/i, 'OBST IST KEIN ALKOHOL.'],
    [/bienenwachs/i, 'BIENENWACHS. DIE BIENEN SIND OKAY.'],
    [/luft/i, 'LUFT. KEIN PROBLEM. 💨'],
  ];

  /* Erklärung für offensichtliche Produkte */
  const WHY = {
    obst: 'Obst. Einfach Obst, Bruder.',
    gemuese: 'Gemüse. Der Detector gähnt.',
    basis: 'Grundnahrungsmittel. Keine Tricks.',
    pflanzlich: 'Pflanzlich & unproblematisch.',
    getraenk: 'Kein Alkohol. Nur Durst.',
    fisch: 'Fisch. Passt.',
    zert: '„HALAL ✓“-Siegel ist deutlich sichtbar.',
    schwein: 'Schwein. Eindeutig.',
    alkohol: 'Alkohol als Getränk. Eindeutig.',
  };

  /* ---------- Sprüche ---------- */
  const LINES = {
    correctHalal: ['BRUDER, DU HAST ES GESEHEN.', 'HALAL DETECTED.', '+100 IQ', 'DER DETECTOR HAT GESPROCHEN.', 'SAUBER.', 'KOMPLETT KORREKT.', 'SCANNER-AUGEN 👁️'],
    correctHaram: ['HARAM DETECTED.', 'NICHT MIT DIR, BRUDER.', 'DER DETECTOR HAT GESPROCHEN.', 'SOFORT ERKANNT.', 'ZURÜCK INS REGAL DAMIT.', '+100 IQ'],
    correctCheck: ['ZUTATEN GELESEN. RESPEKT.', 'ERST LESEN, DANN ENTSCHEIDEN. 🧠', 'KLEINGEDRUCKTES? GELESEN.', 'DER DETECTOR IST STOLZ.', 'BRUDER, DU HAST ES GESEHEN.'],
    found: ['GEFUNDEN! 🔎', 'ERWISCHT!', 'DA WAR ES!', 'DETECTOR-AUGEN 🔎'],
    wrong: ['BRO…', 'WIE HAST DU DAS NICHT GESEHEN?', 'DER DETECTOR IST ENTTÄUSCHT.', 'BRUH.', 'NEIN. EINFACH NEIN.', 'DER DETECTOR WEINT. 😭'],
    guessed: ['BRUDER HAT GERATEN.', 'INGREDIENTS LESEN 😭', 'RATEN IST KEIN SCANNEN.', 'NOW DON’T GUESS… ZU SPÄT.'],
    lucky: ['GLÜCK GEHABT. TROTZDEM GERATEN.', 'RICHTIG GERATEN ZÄHLT NICHT, BRO.', 'DER DETECTOR HAT DAS GESEHEN. 👀'],
    timeout: ['ZU LANGSAM 🐢', 'DER DETECTOR IST EINGESCHLAFEN.', 'HALLO?! ENTSCHEIDEN!', 'BRUDER DENKT NOCH…'],
    instant: ['INSTANT SCAN 💀', 'BRO IST EIN MENSCHLICHER SCANNER.'],
    gameover: ['NOT BAD.', 'BROTHER NEEDS MORE PRACTICE.', 'READ THE INGREDIENTS 💀', 'DER DETECTOR BRAUCHT URLAUB.', 'SOLIDE. ABER DIE GUMMIBÄRCHEN…', 'DEINE AURA IST… VORHANDEN.', 'DER DÖNER-MEISTER HAT ZUGESCHAUT. 👀'],
    bossTaunt: ['KAUF MICH!', 'ZUTATEN? HAHA!', 'SONDERANGEBOT!', 'GANG 7 IST DEIN GRAB!', 'KASSE 3 WIRD NIE ÖFFNEN!', 'PFAND GIBT’S HIER NICHT!'],
    bossHurt: ['AUA!', 'MEINE REGALE!', 'NICHT DIE TIEFKÜHLTRUHE!', 'NEIN! DER AUSVERKAUF!'],
  };

  const COMBOS = [
    [5, 'HALAL STREAK 🔥', '5 IN A ROW'],
    [10, 'DETECTOR MODE ACTIVATED', '10 IN A ROW'],
    [15, 'UNAUFHALTSAM', '15?!'],
    [20, 'BROTHER HAS ASCENDED', '20?!'],
    [30, 'FINAL SCANNER FORM', 'DER DETECTOR IST AUSSER KONTROLLE.'],
    [40, 'SCANNER GOD', '40. EINFACH 40.'],
    [50, 'DETECTOR OVERCLOCKED', 'TEMPERATUR: JA'],
    [75, 'CITY SCAN ACTIVATED', 'DIE STADT WIRD GESCANNT'],
    [100, 'THE DETECTOR SEES EVERYTHING', 'BROTHER HAS BECOME THE DETECTOR.'],
  ];

  const RANKS = [
    [0, 'PRAKTIKANT BEIM DETECTOR', 'Hat den Detector verkehrt herum gehalten.'],
    [1500, 'GUMMIBÄRCHEN-VERDÄCHTIGER', 'Kennt Gelatine vom Hörensagen.'],
    [4000, 'ZUTATEN-LESER LVL 1', 'Liest jetzt auch das Kleingedruckte.'],
    [9000, 'ETIKETTEN-FLÜSTERER', 'Die Verpackungen sprechen mit dir.'],
    [16000, 'MENSCHLICHER BARCODE-SCANNER', 'Piept innerlich bei jedem Produkt.'],
    [28000, 'RECHTE HAND DES DÖNER-MEISTERS', '„Bruder, du darfst die Soße machen.“'],
    [45000, 'ALBTRAUM DES SUPERMARKTS', 'Die Regale zittern, wenn du reinkommst.'],
    [70000, 'DER DETECTOR PERSÖNLICH', 'Mensch und Maschine sind eins.'],
  ];

  const SKINS = [
    { id: 'default', name: 'DEFAULT', device: 'HALAL DETECTOR 3000', price: 0, laser: '#3dff8b', desc: 'Der Klassiker. Piept zuverlässig.', pitch: 1 },
    { id: 'gold', name: 'GOLD', device: 'HALAL DETECTOR 5000', price: 800, laser: '#ffd24a', desc: '2000 mehr als der 3000er. Glänzt.', pitch: 1.12 },
    { id: 'neon', name: 'NEON', device: 'HALAL DETECTOR CYBER', price: 1500, laser: '#ff3df5', desc: 'RGB macht 30% schneller (gefühlt).', pitch: 1.25 },
    { id: 'doener', name: 'DÖNER EDITION', device: 'DÖNER DETECTOR 🥙', price: 2500, laser: '#ff9a3c', desc: 'Sieht aus wie ein Döner. Riecht auch so.', pitch: 0.9 },
    { id: 'banana', name: 'BANANA EDITION', device: 'BANANA SCANNER 🍌', price: 4000, laser: '#fff04a', desc: 'Der Scanner ist eine Banane. Punkt.', pitch: 1.35 },
    { id: 'grandma', name: 'GRANDMA EDITION', device: 'OMAS TEPPICHKLOPFER', price: 6000, laser: '#ff8fb1', desc: 'Ein Teppichklopfer als Scanner. Oma approved.', pitch: 0.8 },
    { id: 'forbidden', name: 'ULTRA RARE', device: 'THE FORBIDDEN SCANNER', price: null, unlockCombo: 75, laser: '#b44dff', desc: 'Nur ein Meme-Name. Freischalten: Combo 75 erreichen.', pitch: 0.7 },
  ];

  const BOARDS = [
    { id: 'score', name: 'HIGHEST SCORE', icon: '🏆' },
    { id: 'combo', name: 'HIGHEST COMBO', icon: '🔥' },
    { id: 'fastest', name: 'FASTEST REACTION', icon: '⚡', asc: true, sec: true },
    { id: 'correct', name: 'MOST CORRECT', icon: '✅' },
    { id: 'aura', name: 'MOST AURA', icon: '✨' },
    { id: 'fastestCheck', name: 'FASTEST INGREDIENTS CHECK', icon: '🔎', asc: true, sec: true },
  ];

  HHD.DATA = { PLACES, AREAS, LEVELS, NPCS, PLACE_NPCS, ITEMS, LEGENDARY, EVENTS, SAUCES17, FILL, TRAPS, WHY, LINES, COMBOS, RANKS, SKINS, BOARDS };
})();
