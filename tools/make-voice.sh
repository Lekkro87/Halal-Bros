#!/usr/bin/env bash
# Erzeugt die Detector-Stimme („HALAL“ / „HARAM“) und schreibt js/voicedata.js.
#
# Benötigt (Linux): pico2wave (SVOX Pico), sox, lame
#   sudo apt-get install libttspico-utils sox lame
#
# Aufruf aus dem Projektordner:  bash tools/make-voice.sh
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Aussprache fest vorgegeben (X-SAMPA), Betonung auf der zweiten Silbe: ha-LAL, ha-RAM
phonemes() { case "$1" in halal) echo 'ha"la:l' ;; haram) echo 'ha"Ra:m' ;; esac; }
# Stimmungen: n = normal, d = dramatisch (tiefer, langsamer), h = Hype (höher, schneller)
pitch() { case "$1" in n) echo 100 ;; d) echo 86 ;; h) echo 124 ;; esac; }
speed() { case "$1" in n) echo 100 ;; d) echo 80 ;; h) echo 110 ;; esac; }

out=js/voicedata.js
{
  echo "/* Halal Haram Detector – Detector-Stimme „HALAL“ / „HARAM“"
  echo "   Automatisch erzeugt mit tools/make-voice.sh – nicht von Hand bearbeiten."
  echo "   Sprachsynthese: SVOX Pico (Apache License 2.0), Schnitt mit SoX, MP3 mit LAME."
  echo "   Eingebettet, damit die Stimme auch per Doppelklick (file://) und offline funktioniert. */"
  echo "(function () {"
  echo "  'use strict';"
  echo "  const HHD = (window.HHD = window.HHD || {});"
  echo "  HHD.VOICE = {"
  for w in halal haram; do
    echo "    $w: {"
    for m in n d h; do
      pico2wave -l de-DE -w "$tmp/raw.wav" \
        "<pitch level='$(pitch $m)'><speed level='$(speed $m)'><phoneme alphabet='xsampa' ph='$(phonemes $w)'/></speed></pitch>"
      # Stille abschneiden, leicht komprimieren, normalisieren
      sox "$tmp/raw.wav" -r 22050 -b 16 "$tmp/cut.wav" \
        silence 1 0.005 -48d reverse silence 1 0.005 -48d reverse \
        highpass 90 compand 0.005,0.12 6:-70,-60,-30,-18,-10,-8,0,-6 -4 -90 0.005 gain -n -1
      sox "$tmp/cut.wav" "$tmp/fade.wav" fade q 0.004 -0 0.03
      lame --quiet -m m -b 40 --noreplaygain "$tmp/fade.wav" "$tmp/voice.mp3"
      echo "      $m: '$(base64 < "$tmp/voice.mp3" | tr -d '\n')',"
    done
    echo "    },"
  done
  echo "  };"
  echo "})();"
} > "$out"
echo "Geschrieben: $out ($(wc -c < "$out") Bytes)"
