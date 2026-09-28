/* Halal Haram Detector – Update 3.0: „Mehr von allem“
 * Neue Spielmodi (Zeitjagd, Chaos, Zutaten-Profi, Boss-Marathon, Kiosk-Schicht, Tages-Challenge),
 * Chaos-Störungen, drei neue Bosse, ~50 neue Produkte, neue Figuren, Events, Sprüche,
 * Power-ups, Skins, Erfolge und Tagesaufgaben.
 *
 * Designregeln bleiben: HALAL nur, wenn es offensichtlich ist oder ein „HALAL ✓“-Siegel trägt,
 * HARAM nur bei eindeutig Schwein oder Alkohol, alles Unklare → INGREDIENTS. Umstrittene
 * Sonderfälle (Käse/Lab, Sojasoße, Spuren-Alkohol in Aromen, Meeresfrüchte …) kommen nicht vor.
 * Der Humor liegt beim überforderten Detector und bei Alltagssituationen – nie bei Glaubensinhalten.
 */
(function () {
  'use strict';
  const D = window.HHD.DATA;
  const E = (e) => ({ t: 'emoji', e });
  const P = (t, o) => Object.assign({ t }, o);
  const SH = '­'; // weicher Trennstrich für lange Etiketten
  function I(id, name, ans, tier, places, art, extra) {
    D.ITEMS.push(Object.assign({ id, name, ans, tier, places, art }, extra || {}));
  }
  const item = (id) => D.ITEMS.find((i) => i.id === id);

  /* ---------- Orte ---------- */
  Object.assign(D.PLACES, { weihnachtsmarkt: 'WEIHNACHTSMARKT', hochzeit: 'HOCHZEIT', spaeti: 'SPÄTI' });

  /* ---------- Versteckte Schauplätze (nicht auf der Stadtkarte) ---------- */
  D.AREAS.push(
    { id: 'kioskshift', name: 'DEIN KIOSK', emoji: '🏪', xp: Infinity, level: 1, scene: 'street', time: 'day', hidden: true,
      places: ['kiosk', 'spaeti', 'strasse', 'tankstelle', 'baeckerei'], shops: ['KIOSK', 'SPÄTI', 'LOTTO', 'KIOSK 24/7', 'TELEFONLADEN'], desc: 'Hinter der Theke.' },
    { id: 'wedding', name: 'HOCHZEITSSAAL', emoji: '💒', xp: Infinity, level: 5, scene: 'hall', time: 'indoor', hidden: true,
      places: ['hochzeit', 'restaurant'], shops: ['HOCHZEITSSAAL', 'BUFFET', 'DJ HABIBI', 'TORTE', 'FOTOBOX'], desc: '500 Gäste.' },
    { id: 'wintermarkt', name: 'WEIHNACHTSMARKT', emoji: '🎄', xp: Infinity, level: 3, scene: 'street', time: 'night', hidden: true,
      places: ['weihnachtsmarkt', 'markt'], shops: ['GLÜHWEIN', 'MARONEN', 'BRATWURST', 'KINDERPUNSCH', 'LEBKUCHEN'], desc: 'Lichter, Buden, Fallen.' }
  );
  // Weihnachtsmarkt-Produkte tauchen auch auf dem Nachtmarkt und in der Mega City auf
  D.AREAS.find((a) => a.id === 'night').places.push('weihnachtsmarkt', 'spaeti');
  D.AREAS.find((a) => a.id === 'street').places.push('spaeti');
  D.AREAS.find((a) => a.id === 'mall').places.push('hochzeit');
  D.AREAS.find((a) => a.id === 'mega').places.push('weihnachtsmarkt', 'hochzeit', 'spaeti');

  /* ---------- Neue Figuren ---------- */
  Object.assign(D.NPCS, {
    opa: { name: 'OPA', face: '👴🏽', lines: ['FRÜHER GAB ES NUR BROT UND WASSER.', 'ZU MEINER ZEIT HATTEN WIR KEINEN DETECTOR!', 'WAS?! 5 MARK?!', 'ICH HAB MEINE BRILLE VERGESSEN.', 'LIES MAL VOR, MEIN SOHN.', 'DAS HAT MEIN ARZT VERBOTEN.'] },
    schwester: { name: 'KLEINE SCHWESTER', face: '👧🏽', lines: ['ICH SAG ES MAMA!', 'DAS IST MEINS!', 'KAUFST DU MIR DAS?', 'IST DAS VEGAN?', 'ICH WILL AUCH SCANNEN!', 'DU HAST GERATEN, ICH HAB’S GESEHEN!'] },
    cousin: { name: 'COUSIN', face: '😏', lines: ['MEIN KUMPEL KENNT DEN BESITZER.', 'ICH HAB DA EINEN GUY FÜR SO WAS.', 'HAB ICH GESTERN GEGESSEN. PASST.', 'VERTRAU MIR, ICH BIN QUASI EXPERTE.', 'WALLAH, ICH HAB’S GELESEN. FAST.'] },
    gast: { name: 'HOCHZEITSGAST', face: '🕺🏽', lines: ['HALAY! HALAY!', 'WO IST DAS BUFFET?', 'WANN GIBT ES ESSEN?!', 'DER DJ SPIELT SCHON WIEDER TARKAN!', 'NOCH EIN TELLER, BITTE!', 'WER IST DAS BRAUTPAAR NOCHMAL?'] },
    student: { name: 'STUDENT', face: '🧑🏻‍🎓', lines: ['GIBT’S STUDENTENRABATT?', 'NUR EIN KAFFEE, BITTE.', 'ICH ZAHL MIT KARTE. 1,20 €.', 'IST DAS VEGAN? UND HALAL? UND BILLIG?', 'KLAUSUR IN 10 MINUTEN!'] },
    chef: { name: 'KIOSK-CHEF', face: '🧑🏽‍💼', lines: ['KUNDE IST KÖNIG!', 'NICHT SO LANGSAM!', 'LÄCHELN, BRUDER!', 'WER HAT DIE KASSE NICHT GEZÄHLT?', 'PFANDFLASCHEN NACH HINTEN!'] },
  });
  D.NPCS.oma.lines.push('KIND, DU MUSST MEHR ESSEN!', 'DAS IST NACH MEINEM GEHEIMREZEPT.');
  D.NPCS.kid.lines.push('ICH HAB 50 CENT. WAS KRIEG ICH DAFÜR?', 'KANN DER DETECTOR AUCH HAUSAUFGABEN?');
  D.NPCS.tourist.lines.push('EXCUSE ME, IS THIS HALAL?', 'WHAT IS DÖNER?!');
  D.NPCS.meister.lines.push('SOSSE? ALLE 17?', 'GEHT AUFS HAUS. SPASS. 7,50.');
  Object.assign(D.PLACE_NPCS, {
    weihnachtsmarkt: ['vendor', 'tourist', 'opa'], hochzeit: ['gast', 'tante', 'onkel'], spaeti: ['student', 'cousin', 'driver'],
  });
  D.PLACE_NPCS.baeckerei.push('opa');
  D.PLACE_NPCS.kiosk.push('schwester', 'student');
  D.PLACE_NPCS.park.push('opa', 'schwester');
  D.PLACE_NPCS.supermarkt.push('schwester');

  /* ---------- Neue Produkte ---------- */
  // Eindeutig halal: Obst, Gemüse, Grundnahrungsmittel, Getränke ohne Alkohol, Siegel
  I('zitrone', 'Zitrone', 'halal', 1, ['markt', 'supermarkt'], E('🍋'), { cat: 'obst', why: 'Eine Zitrone. Sauer, aber halal.' });
  I('birne', 'Birne', 'halal', 1, ['markt', 'supermarkt', 'park'], E('🍐'), { cat: 'obst' });
  I('paprika', 'Paprika', 'halal', 1, ['markt', 'supermarkt'], E('🫑'), { cat: 'gemuese' });
  I('zwiebel', 'Zwiebel', 'halal', 1, ['markt', 'doener', 'supermarkt'], E('🧅'), { cat: 'gemuese', why: 'Eine Zwiebel. Der Detector weint trotzdem.' });
  I('kirschen', 'Kirschen', 'halal', 2, ['markt', 'park'], E('🍒'), { cat: 'obst' });
  I('knoblauch', 'Knoblauch', 'halal', 2, ['markt', 'doener', 'zuhause'], E('🧄'), { cat: 'gemuese', why: 'Knoblauch. Halal – nur nicht für deine Mitmenschen.' });
  I('erdnuesse', 'Erdnüsse', 'halal', 2, ['kiosk', 'park', 'spaeti'], E('🥜'), { cat: 'pflanzlich' });
  I('pfannkuchen', 'Pfannkuchen', 'halal', 2, ['zuhause', 'baeckerei'], E('🥞'), { cat: 'basis', why: 'Mehl, Milch, Eier. Mamas Rezept.' });
  I('gruentee', 'Grüner Tee', 'halal', 2, ['restaurant', 'zuhause', 'kiosk'], E('🍵'), { cat: 'getraenk' });
  I('bulgur', 'Bulgur', 'halal', 2, ['supermarkt', 'zuhause'], P('bag', { c: '#e9c46a', c2: '#fff', brand: 'EV', label: 'BULGUR', e: '🌾' }), { cat: 'basis', why: 'Hartweizen. Mehr nicht.' });
  I('hummus', 'Hummus', 'halal', 2, ['supermarkt', 'iftar', 'restaurant'], P('cup', { c: '#e9d8a6', c2: '#6a994e', brand: 'NATUR', label: 'HUMMUS', e: '🥣' }), { cat: 'pflanzlich', why: 'Kichererbsen, Tahini, Zitrone, Knoblauch.', iftar: 1 });
  I('pilav', 'Reis-Pilav', 'halal', 2, ['hochzeit', 'restaurant', 'zuhause', 'iftar'], P('tray', { c: '#fefae0', c2: '#bc6c25', brand: 'HOCHZEIT', label: 'PILAV', e: '🍚' }), { cat: 'basis', why: 'Reis, Butter, Salz. Hochzeitsklassiker.', iftar: 1 });
  I('maronen', 'Heiße Maronen', 'halal', 3, ['weihnachtsmarkt', 'markt', 'strasse'], E('🌰'), { cat: 'pflanzlich', why: 'Geröstete Esskastanien. Heiß und halal.' });
  I('salz', 'Salz', 'halal', 3, ['supermarkt', 'zuhause'], E('🧂'), { cat: 'basis', why: 'Es ist Salz. Der Detector fühlt sich unterfordert.' });
  I('energy', 'Energy Drink', 'halal', 3, ['kiosk', 'tankstelle', 'spaeti'], P('can', { c: '#1d3557', c2: '#a8ff3e', brand: 'VOLT', label: 'ENERGY', e: '⚡' }), { cat: 'getraenk', why: 'Kein Alkohol. Taurin wird synthetisch hergestellt – kein Stier war beteiligt.' });
  I('kraeutertee', 'Kräutertee', 'halal', 3, ['supermarkt', 'zuhause', 'baeckerei'], P('box', { c: '#2d6a4f', c2: '#ffd166', brand: 'KRÄUTER', label: 'TEE', e: '🌿' }), { cat: 'getraenk', twin: 'kraeuterlikoer', why: 'Getrocknete Kräuter zum Aufgießen.' });
  I('kinderpunsch', 'Kinderpunsch', 'halal', 3, ['weihnachtsmarkt'], P('cup', { c: '#c1121f', c2: '#fff', brand: 'ALKOHOLFREI', label: 'KINDER' + SH + 'PUNSCH', e: '🍵' }), { cat: 'getraenk', twin: 'gluehwein', why: 'Heißer Früchtetee mit Gewürzen – ohne Alkohol, steht drauf.' });
  I('olivenoel', 'Olivenöl', 'halal', 3, ['supermarkt', 'markt', 'zuhause'], P('bottle', { c: '#606c38', c2: '#fefae0', brand: 'ZEYTIN', label: 'OLIVENÖL', e: '🫒' }), { cat: 'basis' });
  I('halalnuggets', 'Chicken Nuggets (HALAL ✓)', 'halal', 3, ['mall', 'foodcourt', 'supermarkt'], P('box', { c: '#ffb703', c2: '#d00000', brand: 'NUGGETZ', label: 'CHICKEN NUGGETS', e: '🍗', badge: 'HALAL ✓' }), { cat: 'zert', twin: 'nuggets' });
  I('halalsalami', 'Rindersalami (HALAL ✓)', 'halal', 3, ['supermarkt', 'markt'], P('tray', { c: '#d62828', c2: '#fff', brand: 'HALAL FEIN', label: 'RINDER' + SH + 'SALAMI', e: '🥩', badge: 'HALAL ✓' }), { cat: 'zert', twin: 'schweinesalami' });
  I('eiswuerfel', 'Eiswürfel', 'halal', 4, ['kiosk', 'restaurant', 'spaeti'], E('🧊'), { cat: 'getraenk', why: 'Gefrorenes Wasser. Der Detector ist beleidigt.' });
  I('tofu', 'Tofu natur', 'halal', 4, ['supermarkt', 'mall'], P('box', { c: '#f1faee', c2: '#2a9d8f', brand: 'SOJA', label: 'TOFU NATUR', e: '⬜' }), { cat: 'pflanzlich', why: 'Sojabohnen, Wasser, Gerinnungsmittel. Pflanzlich.' });
  I('virginmojito', 'Virgin Mojito (alkoholfrei)', 'halal', 4, ['restaurant', 'night', 'mall'], P('cup', { c: '#95d5b2', c2: '#fff', brand: 'VIRGIN', label: 'MOJITO 0 %', e: '🍹' }), { cat: 'getraenk', twin: 'mojito', why: '„Virgin“ = ohne Alkohol: Limette, Minze, Soda.' });

  // Eindeutig haram: Schwein oder Alkohol als Getränk
  I('rostbratwurst', 'Rostbratwurst', 'haram', 2, ['weihnachtsmarkt', 'park', 'strasse'], P('tray', { c: '#9c6644', c2: '#fff', brand: 'THÜRINGER', label: 'BRATWURST', e: '🌭', badge: 'SCHWEIN' }), { cat: 'schwein', why: 'Schweinebratwurst – steht auf dem Etikett.' });
  I('gluehwein', 'Glühwein', 'haram', 3, ['weihnachtsmarkt'], P('cup', { c: '#6a040f', c2: '#fff', brand: 'MARKTBUDE', label: 'GLÜHWEIN', e: '🍷' }), { cat: 'alkohol', twin: 'kinderpunsch', why: 'Heißer Rotwein. Alkohol – auch wenn es nach Zimt riecht.' });
  I('kraeuterlikoer', 'Kräuterlikör', 'haram', 3, ['kiosk', 'tankstelle', 'spaeti'], P('bottle', { c: '#2d6a4f', c2: '#ffd166', brand: 'KRÄUTER', label: 'LIKÖR 35 %', e: '🌿', tall: 1 }), { cat: 'alkohol', twin: 'kraeutertee', why: 'Klingt nach Kräutertee, ist aber 35 % Alkohol.' });
  I('schweinshaxe', 'Schweinshaxe', 'haram', 3, ['restaurant', 'weihnachtsmarkt'], P('tray', { c: '#bc6c25', c2: '#fff', brand: 'BRAUHAUS', label: 'SCHWEINS' + SH + 'HAXE', e: '🍖', badge: 'SCHWEIN' }), { cat: 'schwein' });
  I('mojito', 'Mojito (mit Rum)', 'haram', 4, ['restaurant', 'night', 'mall'], P('cup', { c: '#95d5b2', c2: '#fff', brand: 'BAR', label: 'MOJITO', e: '🍹' }), { cat: 'alkohol', twin: 'virginmojito', why: 'Ein klassischer Mojito enthält Rum. Steht sogar dran.' });
  I('champagner', 'Champagner', 'haram', 4, ['airport', 'restaurant', 'hochzeit'], E('🍾'), { cat: 'alkohol' });
  I('mett', 'Mettbrötchen', 'haram', 4, ['baeckerei', 'kiosk'], P('paper', { c: '#ffb4a2', c2: '#fff', brand: 'BÄCKEREI', label: 'METT' + SH + 'BRÖTCHEN', e: '🥯', badge: 'SCHWEIN' }), { cat: 'schwein', why: 'Mett = rohes Schweinehack.' });
  I('weisswurst', 'Weißwurst', 'haram', 5, ['restaurant', 'airport'], P('tray', { c: '#f8f9fa', c2: '#264653', brand: 'MÜNCHEN', label: 'WEISSWURST', e: '🌭', badge: 'SCHWEIN' }), { cat: 'schwein', why: 'Kalb UND Schwein. Das zweite Wort zählt.' });

  // Zutaten checken
  I('schokokuss', 'Schokoküsse', 'check', 2, ['baeckerei', 'supermarkt', 'kiosk'], P('box', { c: '#6f4518', c2: '#fff', brand: 'SCHAUMI', label: 'SCHOKO' + SH + 'KÜSSE', e: '🍫' }), { fill: 'sweet', v: [
    ['halal', ['Zucker', 'Glukosesirup', 'Eiklar', 'Schokolade', 'Waffel']],
    ['haram', ['Zucker', 'Glukosesirup', '!Gelatine (Schwein)', 'Schokolade', 'Waffel']],
  ] });
  I('kaugummi', 'Kaugummi', 'check', 2, ['kiosk', 'tankstelle', 'spaeti'], P('box', { c: '#ff70a6', c2: '#fff', brand: 'BUBBLE', label: 'KAUGUMMI', e: '🍬' }), { fill: 'sweet', v: [
    ['halal', ['Kaumasse', 'Süßungsmittel: Xylit', 'Aroma (alkoholfrei)', 'Farbstoff: Spirulina']],
    ['haram', ['Kaumasse', 'Zucker', '!Gelatine (Schwein)', 'Aroma (alkoholfrei)']],
  ] });
  I('gummiwuermer', 'Saure Gummiwürmer', 'check', 2, ['kiosk', 'spaeti', 'tankstelle'], P('bag', { c: '#8338ec', c2: '#fff', brand: 'SAUER', label: 'GUMMI' + SH + 'WÜRMER', e: '🪱' }), { fill: 'sweet', v: [
    ['halal', ['Zucker', 'Glukosesirup', 'Pektin', 'Citronensäure']],
    ['halal', ['Zucker', 'Glukosesirup', 'Gelatine (Rind, halal-zertifiziert)', 'Citronensäure']],
    ['haram', ['Zucker', 'Glukosesirup', '!Gelatine (Schwein)', 'Citronensäure']],
  ] });
  I('doenerbox', 'Dönerbox', 'check', 2, ['doener', 'foodtruck', 'spaeti'], P('box', { c: '#fb8500', c2: '#fff', brand: 'DÖNER', label: 'DÖNERBOX', e: '🍟' }), { fill: 'doener', v: [
    ['halal', ['Pommes', 'Kalbfleisch (halal-zertifiziert)', 'Salat', 'Knoblauchsoße']],
    ['haram', ['Pommes', '!Drehspieß-Fleisch (Schwein)', 'Salat', 'Knoblauchsoße']],
  ] });
  I('wackelpudding', 'Wackelpudding', 'check', 3, ['supermarkt', 'zuhause'], P('cup', { c: '#06d6a0', c2: '#fff', brand: 'WACKEL', label: 'WACKEL' + SH + 'PUDDING', e: '🟩' }), { fill: 'sweet', v: [
    ['halal', ['Wasser', 'Zucker', 'Agar-Agar', 'Waldmeister-Aroma (alkoholfrei)']],
    ['haram', ['Wasser', 'Zucker', '!Gelatine (Schwein)', 'Aroma (alkoholfrei)']],
  ] });
  I('marzipan', 'Marzipan', 'check', 3, ['baeckerei', 'weihnachtsmarkt', 'supermarkt'], P('bar', { c: '#f4acb7', c2: '#fff', brand: 'LÜBECK', label: 'MARZIPAN', e: '🍬' }), { fill: 'sweet', v: [
    ['halal', ['Mandeln', 'Zucker', 'Rosenwasser']],
    ['haram', ['Mandeln', 'Zucker', '!Rum (für den Geschmack)']],
  ] });
  I('vitamingummis', 'Vitamin-Gummis', 'check', 3, ['supermarkt', 'mall'], P('box', { c: '#ffbe0b', c2: '#fff', brand: 'VITA+', label: 'VITAMIN' + SH + 'GUMMIS', e: '💊' }), { fill: 'sweet', why: 'Vitamine? Gesund! Gelatine? Checken!', v: [
    ['halal', ['Glukosesirup', 'Zucker', 'Pektin', 'Vitamin C', 'Vitamin D']],
    ['haram', ['Glukosesirup', 'Zucker', '!Gelatine (Schwein)', 'Vitamin C', 'Vitamin D']],
  ] });
  I('fruehlingsrollen', 'Frühlingsrollen', 'check', 3, ['restaurant', 'foodcourt', 'night'], P('box', { c: '#f77f00', c2: '#fff', brand: 'ASIA', label: 'FRÜHLINGS' + SH + 'ROLLEN', e: '🥢' }), { fill: 'savory', v: [
    ['halal', ['Teigblätter', 'Weißkohl', 'Karotten', 'Glasnudeln', 'Ingwer']],
    ['haram', ['Teigblätter', 'Weißkohl', '!Schweinehack', 'Glasnudeln', 'Ingwer']],
  ] });
  I('gyros', 'Gyros', 'check', 3, ['restaurant', 'doener', 'foodtruck'], P('tray', { c: '#e76f51', c2: '#fff', brand: 'TAVERNA', label: 'GYROS', e: '🥙' }), { fill: 'meat', twin: 'doener', why: 'Sieht aus wie Döner – Gyros ist aber oft Schwein. Checken!', v: [
    ['haram', ['!Schweinefleisch (Nacken)', 'Zwiebeln', 'Gewürze', 'Tzatziki']],
    ['halal', ['Hähnchenfleisch (halal-zertifiziert)', 'Zwiebeln', 'Gewürze', 'Joghurtsoße']],
  ] });
  I('eiskaffee', 'Eiskaffee', 'check', 4, ['restaurant', 'mall', 'foodcourt'], P('cup', { c: '#7f5539', c2: '#fff', brand: 'CAFÉ', label: 'EISKAFFEE', e: '☕' }), { fill: 'dairy', v: [
    ['halal', ['Kaffee', 'Vanilleeis', 'Sahne']],
    ['haram', ['Kaffee', 'Vanilleeis', '!Schuss Likör', 'Sahne']],
  ] });
  I('apfelstrudel', 'Apfelstrudel', 'check', 4, ['restaurant', 'baeckerei', 'weihnachtsmarkt'], P('paper', { c: '#e9c46a', c2: '#fff', brand: 'CAFÉ', label: 'APFEL' + SH + 'STRUDEL', e: '🥧' }), { fill: 'bakery', v: [
    ['halal', ['Strudelteig', 'Äpfel', 'Zimt', 'Rosinen', 'Zucker']],
    ['haram', ['Strudelteig', 'Äpfel', 'Zimt', '!Rum-Rosinen (in Rum eingelegt)', 'Zucker']],
  ] });
  I('maultaschen', 'Maultaschen', 'check', 4, ['restaurant', 'supermarkt'], P('box', { c: '#90be6d', c2: '#fff', brand: 'SCHWABEN', label: 'MAUL' + SH + 'TASCHEN', e: '🥟' }), { fill: 'savory', v: [
    ['haram', ['Nudelteig', '!Brät (Schwein)', 'Spinat', 'Zwiebeln']],
    ['halal', ['Nudelteig', 'Rinderhack (halal-zertifiziert)', 'Spinat', 'Zwiebeln']],
    ['halal', ['Nudelteig', 'Spinat', 'Ei', 'Zwiebeln', 'Petersilie']],
  ] });
  I('kaiserschmarrn', 'Kaiserschmarrn', 'check', 4, ['restaurant', 'weihnachtsmarkt'], P('tray', { c: '#ffe8a3', c2: '#fff', brand: 'ALM', label: 'KAISER' + SH + 'SCHMARRN', e: '🥞' }), { fill: 'bakery', v: [
    ['halal', ['Mehl', 'Eier', 'Milch', 'Zucker', 'Rosinen', 'Puderzucker']],
    ['haram', ['Mehl', 'Eier', 'Milch', 'Zucker', '!In Rum eingelegte Rosinen']],
  ] });
  I('tortellini', 'Tortellini', 'check', 4, ['restaurant', 'supermarkt'], P('bag', { c: '#ffd166', c2: '#c1121f', brand: 'PASTA', label: 'TORTEL' + SH + 'LINI', e: '🍝' }), { fill: 'savory', v: [
    ['haram', ['Hartweizengrieß', 'Ei', '!Schinken (Schwein)', 'Paniermehl']],
    ['halal', ['Hartweizengrieß', 'Ei', 'Kürbis', 'Paniermehl']],
  ] });
  I('burrito', 'Burrito', 'check', 4, ['foodcourt', 'foodtruck', 'mall'], E('🌯'), { fill: 'savory', v: [
    ['halal', ['Tortilla', 'Bohnen', 'Reis', 'Paprika', 'Salsa']],
    ['halal', ['Tortilla', 'Hähnchen (halal-zertifiziert)', 'Reis', 'Mais']],
    ['haram', ['Tortilla', '!Chorizo (Schwein)', 'Reis', 'Bohnen']],
  ] });
  I('hochzeitstorte', 'Hochzeitstorte', 'check', 4, ['hochzeit'], E('🎂'), { fill: 'bakery', v: [
    ['halal', ['Biskuit', 'Sahne', 'Erdbeeren', 'Zucker', 'Vanille']],
    ['haram', ['Biskuit', 'Sahne', '!Amaretto (Likör)', 'Zucker', 'Vanille']],
  ] });
  I('pannacotta', 'Panna Cotta', 'check', 5, ['restaurant', 'airport'], P('cup', { c: '#fff1e6', c2: '#e63946', brand: 'DOLCE', label: 'PANNA COTTA', e: '🍮' }), { fill: 'dairy', v: [
    ['halal', ['Sahne', 'Zucker', 'Agar-Agar', 'Vanille', 'Himbeersoße']],
    ['haram', ['Sahne', 'Zucker', '!Gelatine (Schwein)', 'Vanille']],
  ] });

  // Bekannte Produkte passen jetzt auch zur Hochzeit, zum Späti und zum Weihnachtsmarkt
  [['baklava', 'hochzeit'], ['sarma', 'hochzeit'], ['cay', 'hochzeit'], ['koefte', 'hochzeit'], ['lokum', 'hochzeit'], ['datteln', 'hochzeit'],
    ['cola', 'spaeti'], ['bierdose', 'spaeti'], ['chipsmystery', 'spaeti'], ['gummibaerchen', 'spaeti'], ['energy', 'spaeti'],
    ['wein', 'weihnachtsmarkt'], ['softeis', 'weihnachtsmarkt'], ['crepe', 'weihnachtsmarkt'], ['zuckerwatte', 'weihnachtsmarkt'], ['popcorn', 'weihnachtsmarkt']]
    .forEach(([id, p]) => { const it = item(id); if (it && !it.places.includes(p)) it.places.push(p); });
  ['hummus', 'pilav'].forEach((id) => { const it = item(id); if (it) it.iftar = 1; });

  /* ---------- Neue Legendary Items ---------- */
  D.LEGENDARY.push(
    { id: 'goldensimit', name: 'GOLDENES SIMIT', ans: 'halal', tier: 1, places: ['baeckerei'], art: P('paper', { c: '#ffd700', c2: '#fff6c2', brand: 'LEGENDARY', label: 'GOLD-SIMIT', e: '🥯' }), cat: 'basis', legend: true, why: 'LEGENDARY. Sesam aus Gold. Trotzdem nur ein Simit.' },
    { id: 'platinayran', name: 'PLATIN-AYRAN', ans: 'halal', tier: 1, places: ['doener'], art: P('cup', { c: '#e5e5e5', c2: '#ffffff', brand: 'LEGENDARY', label: 'PLATIN-AYRAN', e: '🥛' }), cat: 'getraenk', legend: true, why: 'LEGENDARY. Joghurt, Wasser, Salz – in Platin.' }
  );

  /* ---------- Sprüche (mehr Abwechslung) ---------- */
  const L = D.LINES;
  L.correctHalal.push('HALAL. WIE DIE OMA ES GEWOLLT HÄTTE.', 'SAUBER GESCANNT, AKHI.', 'DER DETECTOR NICKT.', 'LÄUFT BEI DIR.', 'HALAL, HABIBI. WEITER.');
  L.correctHaram.push('HARAM ERKANNT. WEG DAMIT.', 'DER DETECTOR SAGT: NÖ.', 'BLEIBT IM REGAL.', 'NICHT HEUTE, SCHWEIN.', 'ALARM! RICHTIG ERKANNT.');
  L.correctCheck.push('ZUTATENLISTE GEKNACKT. 🔓', 'LESEN IST MACHT.', 'DAS KLEINGEDRUCKTE HAT VERLOREN.', 'SHERLOCK HALAL.');
  L.found.push('DA VERSTECKT ES SICH!', 'NICHT MIT DEINEN AUGEN.', 'ZEILE FÜR ZEILE – GEFUNDEN.');
  L.wrong.push('DER DETECTOR HAT EINE TRÄNE VERLOREN.', 'OPA HÄTTE DAS GESEHEN. OHNE BRILLE.', 'DEIN COUSIN WÄRE STOLZ. LEIDER.', 'DAS WAR NIX, AKHI.');
  L.guessed.push('RATEN? IM ERNST?', 'DER DETECTOR HAT DICH RATEN SEHEN.');
  L.lucky.push('GLÜCK IST KEINE STRATEGIE, BRO.', 'ZUFÄLLIG RICHTIG. ZÄHLT NICHT.');
  L.timeout.push('DER DÖNER IST KALT GEWORDEN.', 'BRUDER SCHLÄFT IM STEHEN.', 'KUNDE IST WEITERGEGANGEN.');
  L.instant.push('SCHNELLER ALS DER DÖNERSPIESS DREHT.', 'LICHTGESCHWINDIGKEIT!');
  L.gameover.push('DER DETECTOR BRAUCHT EINEN ÇAY.', 'OPA SAGT: FRÜHER WARST DU SCHNELLER.', 'NÄCHSTES MAL LIEST DU DIE ZUTATEN. INSHALLAH.');

  /* ---------- Bosse ---------- */
  L.automatTaunt = ['BITTE PASSEND ZAHLEN!', 'PRODUKT KLEMMT!', 'KEIN WECHSELGELD!', 'BEEP BOOP. KAUF MICH.', 'SPIRALE 4B IST LEER!', 'MÜNZE NICHT ERKANNT.'];
  L.automatHurt = ['FEHLER E-47!', 'MEINE SPIRALEN!', 'TILT! TILT!', 'RÜCKGELD… WIRD… AUSGEZAHLT…'];
  L.tanteTaunt = ['WANN HEIRATEST DU?', 'DU HAST ZUGENOMMEN!', 'MEIN SOHN IST ARZT!', 'WAS VERDIENST DU?', 'ISS NOCH WAS!', 'WARUM RUFST DU NIE AN?'];
  L.tanteHurt = ['NA GUT, DU BIST SCHLAU.', 'ICH SAG ES DEINER MUTTER!', 'HMPF.', 'MASHALLAH… DAS HAB ICH NICHT ERWARTET.'];
  L.hochzeitTaunt = ['HALAY! HALAY!', 'DAS BUFFET IST ERÖFFNET!', 'NOCH 400 GÄSTE!', 'DER DJ SPIELT TARKAN!', 'GELD ANSTECKEN!', 'WER HAT DIE TORTE BESTELLT?'];
  L.hochzeitHurt = ['DIE TORTE WACKELT!', 'NICHT DAS BUFFET!', 'DER DJ MACHT PAUSE!', 'DIE BRAUT SCHAUT SCHON!'];

  D.BOSSES = {
    market: { id: 'market', name: 'DER SUPERMARKT', short: 'SUPERMARKT', icon: '🏪', style: 'box', sign: 'SUPERMARKT', color: '#ff3b5c', area: 'market',
      places: ['supermarkt'], intro: 'Produkte fliegen von links und rechts!', start: 'ZUTATEN? HAHA!', laugh: 'HAHAHA! +5 HP',
      taunt: 'bossTaunt', hurt: 'bossHurt', win: 'SUPERMARKET CLEARED', winSub: 'Die Regale ergeben sich.', stat: 'bossMarket', orient: false },
    automat: { id: 'automat', name: 'DER SNACK-AUTOMAT', short: 'AUTOMAT', icon: '🎰', style: 'box', sign: 'SNACK-AUTOMAT', color: '#3a86ff', area: 'airport',
      places: ['kiosk', 'tankstelle', 'spaeti', 'airport'], intro: 'Er spuckt Snacks im Sekundentakt!', start: 'EINWURF: 2 €', laugh: 'RÜCKGELD: 0,00 €. +5 HP',
      taunt: 'automatTaunt', hurt: 'automatHurt', win: 'AUTOMAT GEKNACKT', winSub: 'Alle Spiralen leer.', stat: 'bossAutomat', orient: false },
    tante: { id: 'tante', name: 'DIE TANTE', short: 'TANTE', icon: '🧕🏻', style: 'emoji', emoji: '🧕🏻', tag: 'TANTEN-VERHÖR', area: 'doener',
      places: ['zuhause', 'iftar', 'basar', 'hochzeit'], intro: 'Sie hat gekocht. Und sie hat Fragen.', start: 'SETZ DICH, ICH HAB GEKOCHT!', laugh: 'SIEHST DU?! +5 HP',
      taunt: 'tanteTaunt', hurt: 'tanteHurt', win: 'TANTE ÜBERZEUGT', winSub: 'Sie erzählt es der ganzen Familie.', stat: 'bossTante', orient: true },
    hochzeit: { id: 'hochzeit', name: 'DIE HOCHZEIT', short: 'HOCHZEIT', icon: '💒', style: 'emoji', emoji: '🎂', tag: '500 GÄSTE', area: 'wedding',
      places: ['hochzeit', 'restaurant', 'iftar'], intro: '500 Gäste. 1 Detector. Das Buffet ist eröffnet!', start: 'HALAY! HALAY!', laugh: 'NOCH EIN GANG! +5 HP',
      taunt: 'hochzeitTaunt', hurt: 'hochzeitHurt', win: 'HOCHZEIT GERETTET', winSub: 'Das Brautpaar bedankt sich.', stat: 'bossHochzeit', orient: true },
    terlik: { id: 'terlik', name: 'MAMAS TERLIK', short: 'TERLIK', icon: '🩴', style: 'emoji', emoji: '🩴', tag: 'MAMAS TERLIK', area: 'night',
      places: ['zuhause', 'iftar', 'kiosk', 'supermarkt'], intro: '„WIR HABEN ESSEN ZU HAUSE!“ – jeder Fehler: KLATSCH!', start: 'ICH ZÄHLE BIS DREI!', laugh: 'HAB ICH DOCH GESAGT! +5 HP',
      taunt: 'terlikTaunt', hurt: 'terlikHurt', win: 'TERLIK BESIEGT! 🩴', winSub: 'Mama ist stolz.', stat: 'bossTerlik', orient: true },
  };
  D.BOSS_ORDER = ['market', 'automat', 'tante', 'hochzeit', 'terlik'];

  /* ---------- Chaos-Störungen ---------- */
  D.MUTATORS = [
    { id: 'mirror', icon: '🪞', name: 'SPIEGEL', desc: 'HALAL und HARAM haben die Plätze getauscht!' },
    { id: 'shuffle', icon: '🔀', name: 'MISCHMASCH', desc: 'Die Tasten mischen sich bei jedem Produkt neu.' },
    { id: 'fog', icon: '🌫️', name: 'NEBEL', desc: 'Dichter Nebel. Genau hinschauen!' },
    { id: 'mini', icon: '🔬', name: 'MINI', desc: 'Alle Produkte sind winzig.' },
    { id: 'spin', icon: '🎠', name: 'KARUSSELL', desc: 'Die Produkte drehen sich.' },
    { id: 'noname', icon: '🙈', name: 'OHNE NAMEN', desc: 'Keine Namensschilder – nur das Bild zählt.' },
    { id: 'nopic', icon: '📝', name: 'NUR TEXT', desc: 'Keine Bilder – nur der Name.' },
    { id: 'upside', icon: '🙃', name: 'KOPFSTAND', desc: 'Alles steht auf dem Kopf.' },
    { id: 'turbo', icon: '⚡', name: 'TURBO', desc: '30 % weniger Zeit!' },
    { id: 'slow', icon: '🐌', name: 'GEMÜTLICH', desc: 'Mehr Zeit. Kurz durchatmen.' },
    { id: 'double', icon: '💰', name: 'DOPPELT', desc: 'Alle Punkte zählen doppelt!' },
    { id: 'blackout', icon: '🔦', name: 'STROMAUSFALL', desc: 'Licht aus – nur die Taschenlampe leuchtet.' },
    { id: 'liar', icon: '🤥', name: 'LÜGEN-ANZEIGE', desc: 'Das Display rät – und liegt oft falsch. Die Stimme bleibt ehrlich.' },
  ];

  /* ---------- Kiosk-Schicht ---------- */
  D.KIOSK = {
    customers: ['shopper', 'kid', 'tourist', 'oma', 'opa', 'schwester', 'cousin', 'student', 'driver', 'onkel', 'tante', 'bro'],
    ask: {
      shopper: ['IST DAS HALAL?', 'KANN ICH DAS ESSEN?'],
      kid: ['DARF ICH DAS ESSEN?', 'IST DAS HALAL? BITTE SAG JA!'],
      tourist: ['EXCUSE ME – IS THIS HALAL?', 'HALAL? YES? NO? MAYBE?'],
      oma: ['KANN MEIN ENKEL DAS ESSEN?', 'IST DAS AUCH ANSTÄNDIG?'],
      opa: ['LIES MAL VOR, WAS DA DRIN IST.', 'IST DA SCHWEIN DRIN?'],
      schwester: ['IST DAS HALAL? SONST SAG ICH’S MAMA!', 'DARF ICH DAS? JA ODER NEIN?'],
      cousin: ['DAS IST HALAL, ODER? SAG JA.', 'KURZ CHECKEN, BRUDER?'],
      student: ['IST DAS HALAL UND UNTER 2 EURO?', 'SCHNELL, KLAUSUR! HALAL?'],
      driver: ['SCHNELL: HALAL ODER NICHT?', 'ICH STEH IN ZWEITER REIHE – HALAL?'],
      onkel: ['MEIN SOHN, IST DAS HALAL?', 'FÜR DIE FAMILIE – HALAL?'],
      tante: ['IST DAS HALAL? FÜR DIE HOCHZEIT!', 'MEINE NACHBARIN FRAGT, OB DAS HALAL IST.'],
      bro: ['BRUDER, IST DAS HALAL?', 'SAG MAL EHRLICH – HALAL?'],
    },
    happy: ['DANKE, BRUDER! 🙏', '5 STERNE! ⭐', 'EHRENMANN!', 'KOMPETENT! 👍', 'ICH KOMM WIEDER!', 'BESTER KIOSK DER STADT!'],
    angry: ['ICH GEH ZUR KONKURRENZ!', '1 STERN. 😤', 'ICH SCHREIB EINE BEWERTUNG!', 'WO IST DER CHEF?!', 'UNFASSBAR.'],
    reviews: [
      [5, '„Kompetent, schnell und liest sogar Zutatenlisten. 5 Sterne!“'],
      [4, '„Sehr gut beraten. Nur einmal kurz verwirrt.“'],
      [3, '„Ganz okay. Der Detector hat öfter gepiept als geholfen.“'],
      [2, '„Hat mir Weingummi erklärt. Falsch. 2 Sterne.“'],
      [1, '„Hat Gummibärchen als halal verkauft. 1 Stern.“'],
      [0, '„Der Chef hat ihn nach Hause geschickt.“'],
    ],
  };

  /* ---------- Events 3.0 ---------- */
  D.EVENTS3 = {
    blackout: { title: '🔦 STROMAUSFALL!', sub: 'Der Detector läuft auf Akku. Taschenlampe an!' },
    sale: { title: '⚡ BLITZANGEBOT!', sub: 'Die nächsten 5 Produkte zählen doppelt!' },
    corso: { title: '🚗 HOCHZEITSKORSO!', sub: 'DÜT DÜT DÜÜÜT! Nicht ablenken lassen.' },
    voicemsg: ['📱 ONKEL: 🎤 Sprachnachricht (7:32)', '📱 TANTE: 🎤 Sprachnachricht (12:05)', '📱 FAMILIENGRUPPE: 47 neue Nachrichten', '📱 MAMA: „Bring Brot mit.“', '📱 COUSIN: „Bruder, hast du kurz 5 €?“'],
  };

  /* ---------- Power-ups ---------- */
  Object.assign(D.POWERUPS, {
    freeze: { icon: '❄️', name: 'EISZEIT', desc: 'Hält die Zeit für das aktuelle Produkt an – auch in der Zutatenliste.', price: 220, key: '4' },
    joker: { icon: '⏭️', name: 'JOKER', desc: 'Überspringt ein Produkt ohne Strafe. Die Combo bleibt.', price: 180, key: '5' },
  });

  /* ---------- Skins ---------- */
  const at = D.SKINS.findIndex((s) => s.id === 'forbidden');
  D.SKINS.splice(at, 0,
    { id: 'simit', name: 'SIMIT EDITION', device: 'SIMIT-SCANNER', price: 2500, laser: '#f4a261', desc: 'Knusprig, rund, mit Sesam. Piept nach frischem Brot.', pitch: 0.97 },
    { id: 'pixel', name: 'PIXEL EDITION', device: 'DETECTOR 8-BIT', price: 3500, laser: '#9bbc0f', desc: 'Retro-Grafik. Piept in 8 Bit.', pitch: 1.3 }
  );
  D.SKINS.push(
    { id: 'kiosk', name: 'KIOSK EDITION', device: 'KIOSK-KASSE 24/7', price: null, unlockText: '5★ SCHICHT', laser: '#ffd166', desc: 'Freischalten: eine Kiosk-Schicht mit 5 Sternen beenden.', pitch: 1.08 },
    { id: 'hochzeit', name: 'HOCHZEITS EDITION', device: 'HOCHZEITS-DETECTOR 💍', price: null, unlockText: 'BOSS-MARATHON', laser: '#ffc8dd', desc: 'Freischalten: alle 5 Bosse im Boss-Marathon besiegen.', pitch: 1.02 }
  );

  /* ---------- Spielmodi ---------- */
  // map: vor dem Start einen Stadtbereich wählen · area: fester Schauplatz
  Object.assign(D.MODES.normal, { desc: 'Das Original: immer schneller, 3 Leben, Bosse nach Level 3 und 6.', map: true });
  Object.assign(D.MODES.ramadan, { map: true, ramadan: true });
  Object.assign(D.MODES.hardcore, { map: true, lives: 1, maxLives: 1 });
  Object.assign(D.MODES.zen, { map: true, zen: true });
  Object.assign(D.MODES, {
    daily: { id: 'daily', name: 'TAGES-CHALLENGE', icon: '📅', desc: '30 Produkte – heute für alle genau gleich. Jeden Tag neu.', area: 'street', daily: true, items: 30, perLevel: 5, noBoss: true, noExtras: true, isNew: true },
    zeit: { id: 'zeit', name: 'ZEITJAGD', icon: '⏱️', desc: '60 Sekunden auf der Uhr, die immer schneller läuft. Richtig: +0,5 s, Check: +1,5 s, Fehler: −3 s.', area: 'street', clock: 60, noBoss: true, noExtras: true, isNew: true },
    chaos: { id: 'chaos', name: 'CHAOS', icon: '🌀', desc: 'Alle 6 Produkte eine neue Störung: Spiegel-Tasten, Nebel, Stromausfall, Lügen-Anzeige …', map: true, chaos: true, isNew: true },
    profi: { id: 'profi', name: 'ZUTATEN-PROFI', icon: '📜', desc: 'Nur Zutatenlisten, und sie werden immer länger. Problem antippen oder HALAL bestätigen.', area: 'market', checkOnly: true, noBoss: true, noExtras: true, isNew: true },
    bossrush: { id: 'bossrush', name: 'BOSS-MARATHON', icon: '👑', desc: '5 Bosse am Stück: Supermarkt, Automat, Tante, Hochzeit, Terlik.', area: 'market', bossRush: true, noExtras: true, isNew: true },
    kiosk: { id: 'kiosk', name: 'KIOSK-SCHICHT', icon: '🏪', desc: 'Du stehst hinter der Theke: 25 Kunden fragen „Ist das halal?“. 5 Sterne, Trinkgeld für Tempo.', area: 'kioskshift', kiosk: true, customers: 25, perLevel: 5, lives: 5, maxLives: 5, fixedArea: true, noBoss: true, noExtras: true, isNew: true },
  });
  // Reihenfolge in der Modus-Auswahl
  D.MODE_ORDER = ['daily', 'normal', 'ramadan', 'chaos', 'zeit', 'profi', 'bossrush', 'kiosk', 'hardcore', 'zen'];

  /* ---------- Ränge ---------- */
  D.TITLES.push([40, 'GROSSWESIR DER ZUTATEN'], [50, 'LEGENDE VOM KIOSK']);
  D.RANKS.push(
    [100000, 'ENDGEGNER DER GUMMIBÄRCHEN', 'Gelatine hat Angst vor dir.'],
    [150000, 'DER ALGORITHMUS', 'Du bist kein Mensch mehr. Du bist ein Scanner.']
  );

  /* ---------- Tagesaufgaben ---------- */
  D.MISSIONS.push(
    { id: 'zeit20', text: 'Schaffe 20 richtige Antworten in einer Zeitjagd', goal: 20, stat: 'zeitCorrect', max: true, reward: 180 },
    { id: 'chaos5', text: 'Überstehe 5 Störungen im Chaos-Modus', goal: 5, stat: 'chaosMut', max: true, reward: 180 },
    { id: 'kiosk1', text: 'Beende eine Kiosk-Schicht', goal: 1, stat: 'kioskDone', reward: 200 },
    { id: 'profi10', text: 'Löse 10 Listen im Zutaten-Profi', goal: 10, stat: 'profiOk', reward: 150 },
    { id: 'daily1', text: 'Spiele die Tages-Challenge', goal: 1, stat: 'dailyRun', reward: 120 },
    { id: 'boss2', text: 'Besiege 2 Bosse', goal: 2, stat: 'boss', reward: 250 },
    { id: 'dark3', text: 'Entscheide 3× richtig im Stromausfall', goal: 3, stat: 'blackoutOk', reward: 150 },
    { id: 'pu2', text: 'Setze 2 Power-ups ein', goal: 2, stat: 'puUsed', reward: 100 }
  );

  /* ---------- Erfolge ---------- */
  D.ACHIEVEMENTS.push(
    { id: 'zeit30', icon: '⏱️', name: 'UHRMACHER', desc: '30 richtige Antworten in einer Zeitjagd', stat: 'zeitCorrect', max: true, goal: 30, reward: 300 },
    { id: 'chaos10', icon: '🌀', name: 'CHAOS-BÄNDIGER', desc: '10 Störungen in einer Chaos-Runde überstanden', stat: 'chaosMut', max: true, goal: 10, reward: 300 },
    { id: 'profi50', icon: '📜', name: 'KLEINGEDRUCKT-KÖNIG', desc: '50 Listen im Zutaten-Profi gelöst', stat: 'profiOk', goal: 50, reward: 300 },
    { id: 'bossrush', icon: '👑', name: 'BOSS-MARATHON', desc: 'Alle 5 Bosse in einem Marathon besiegt', stat: 'bossrushWin', goal: 1, reward: 800 },
    { id: 'kiosk5', icon: '⭐', name: '5-STERNE-KIOSK', desc: 'Eine Kiosk-Schicht mit 5 Sternen beendet', stat: 'kiosk5', goal: 1, reward: 400 },
    { id: 'tips', icon: '💰', name: 'TRINKGELD-KÖNIG', desc: '500 🪙 Trinkgeld gesammelt', stat: 'tips', goal: 500, reward: 250 },
    { id: 'daily3', icon: '📅', name: 'TÄGLICH DABEI', desc: '3 Tages-Challenges geschafft', stat: 'dailyDone', goal: 3, reward: 300 },
    { id: 'automat', icon: '🎰', name: 'AUTOMATEN-KNACKER', desc: 'Den Snack-Automaten besiegt', stat: 'bossAutomat', goal: 1, reward: 250 },
    { id: 'tante', icon: '🧕', name: 'TANTEN-DIPLOMAT', desc: 'Die Tante überzeugt', stat: 'bossTante', goal: 1, reward: 250 },
    { id: 'hochzeit', icon: '💍', name: 'HOCHZEITSRETTER', desc: 'Die Hochzeit gerettet', stat: 'bossHochzeit', goal: 1, reward: 300 },
    { id: 'dark10', icon: '🔦', name: 'IM DUNKELN', desc: '10 richtige Entscheidungen im Stromausfall', stat: 'blackoutOk', goal: 10, reward: 200 },
    { id: 'allmodes', icon: '🎮', name: 'ALLROUNDER', desc: 'Alle 10 Spielmodi gespielt', stat: 'modesPlayed', max: true, goal: 10, reward: 500 }
  );
})();
