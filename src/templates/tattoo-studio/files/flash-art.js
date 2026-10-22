// Flash artwork, drawn as SVG in the old-school way: bold black line, a few
// flat fills. Each entry is the inside of a 100×120 viewBox. The flash wall in
// app.js refers to these by key (FLASH[].art), so new designs go here.
window.FLASH_ART = (function () {
  var L = 'fill="none" stroke="#14110e" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';
  var O = 'stroke="#14110e" stroke-width="3.2" stroke-linejoin="round"';
  var RED = '#c43b24', GOLD = '#dba52c', GREEN = '#3e7b4f', SKIN = '#ecc9a0', BONE = '#f6efe1', INK = '#14110e';

  return {
    dagger:
      '<path ' + O + ' fill="#cfd3d6" d="M50 6 L58 26 L56 72 L50 82 L44 72 L42 26 Z"/>' +
      '<path ' + L + ' d="M50 14 V74"/>' +
      '<path ' + O + ' fill="' + GOLD + '" d="M28 72 Q50 66 72 72 Q72 80 66 80 Q50 76 34 80 Q28 80 28 72 Z"/>' +
      '<rect ' + O + ' fill="' + RED + '" x="45" y="80" width="10" height="24" rx="3"/>' +
      '<path ' + L + ' d="M45 88 H55 M45 96 H55"/>' +
      '<circle ' + O + ' fill="' + GOLD + '" cx="50" cy="110" r="6"/>' +
      '<path ' + O + ' fill="' + RED + '" d="M50 40 q-6 8 0 14 q6 -6 0 -14 Z"/>',

    rose:
      '<path ' + O + ' fill="' + GREEN + '" d="M30 78 Q12 74 8 90 Q24 96 34 84 Z"/>' +
      '<path ' + O + ' fill="' + GREEN + '" d="M70 78 Q88 74 92 90 Q76 96 66 84 Z"/>' +
      '<path ' + L + ' d="M50 82 Q48 100 52 116"/>' +
      '<path ' + O + ' fill="' + RED + '" d="M50 18 C76 16 88 40 80 60 C74 78 58 84 50 84 C42 84 26 78 20 60 C12 40 24 16 50 18 Z"/>' +
      '<path ' + L + ' d="M50 30 C66 30 72 44 66 56 C60 66 44 66 38 56 C32 46 38 36 48 36 C58 36 60 48 52 52 C46 54 44 48 48 46"/>' +
      '<path ' + L + ' d="M22 52 C30 66 40 72 50 72 C60 72 70 66 78 52"/>' +
      '<path fill="' + BONE + '" opacity=".55" d="M30 30 q6 -6 12 -6 q-8 4 -10 12 Z"/>',

    swallow:
      '<path ' + O + ' fill="#2b4f8f" d="M14 40 Q34 34 50 46 Q60 30 86 22 Q74 38 72 50 Q88 52 96 64 Q76 62 62 66 Q56 80 40 84 Q44 72 40 64 Q24 62 14 40 Z"/>' +
      '<path ' + O + ' fill="' + RED + '" d="M40 64 Q48 58 58 62 Q54 72 44 72 Z"/>' +
      '<path ' + O + ' fill="' + BONE + '" d="M44 72 Q54 72 62 66 Q58 78 46 82 Z"/>' +
      '<path ' + O + ' fill="#2b4f8f" d="M40 84 L30 108 L42 96 L46 112 L52 82 Z"/>' +
      '<circle fill="' + INK + '" cx="28" cy="46" r="2.6"/>' +
      '<path ' + L + ' d="M14 40 L6 42 L14 46"/>' +
      '<path ' + L + ' d="M62 40 Q70 36 78 34 M64 48 Q74 46 84 46"/>',

    snake:
      '<path ' + O + ' fill="' + GREEN + '" d="M60 10 C80 10 86 30 70 38 C54 46 30 44 26 62 C22 80 44 84 62 82 C82 80 86 96 74 106 C66 112 52 112 44 106 C56 106 66 102 66 96 C66 88 50 92 40 92 C18 92 8 74 14 56 C20 38 44 36 56 32 C68 28 70 18 60 18 Z"/>' +
      '<path ' + L + ' d="M28 60 C34 54 46 52 58 48 M22 74 C28 82 40 84 52 84"/>' +
      '<path ' + O + ' fill="' + GOLD + '" d="M60 10 C48 10 40 18 44 26 C48 32 58 30 62 22 Z"/>' +
      '<circle fill="' + RED + '" cx="50" cy="18" r="2.6"/>' +
      '<path stroke="' + RED + '" stroke-width="2.4" fill="none" stroke-linecap="round" d="M42 22 L32 24 M32 24 L28 21 M32 24 L28 27"/>',

    heart:
      '<path ' + O + ' fill="' + RED + '" d="M50 98 C24 78 10 62 12 42 C14 26 34 20 50 38 C66 20 86 26 88 42 C90 62 76 78 50 98 Z"/>' +
      '<path fill="' + BONE + '" opacity=".6" d="M24 38 q4 -8 14 -6 q-10 2 -10 12 Z"/>' +
      '<path ' + O + ' fill="' + BONE + '" d="M6 52 H94 L88 60 L94 68 H6 L12 60 Z"/>' +
      '<text x="50" y="64.5" text-anchor="middle" font-family="Pirata One, serif" font-size="13" fill="' + INK + '">Mercy</text>' +
      '<path ' + O + ' fill="' + GOLD + '" d="M50 6 L54 18 L50 30 L46 18 Z"/>' +
      '<path ' + L + ' d="M36 14 L42 22 M64 14 L58 22"/>',

    eye:
      '<path ' + L + ' d="M50 4 V16 M22 12 L30 24 M78 12 L70 24 M6 32 L18 38 M94 32 L82 38"/>' +
      '<path ' + O + ' fill="' + GOLD + '" d="M50 22 L92 96 H8 Z"/>' +
      '<path ' + O + ' fill="' + BONE + '" d="M24 70 Q50 44 76 70 Q50 92 24 70 Z"/>' +
      '<circle ' + O + ' fill="#2b4f8f" cx="50" cy="69" r="10"/>' +
      '<circle fill="' + INK + '" cx="50" cy="69" r="4.4"/>' +
      '<circle fill="' + BONE + '" cx="54" cy="65" r="2"/>' +
      '<path ' + L + ' d="M18 106 Q50 98 82 106"/>' +
      '<path fill="' + RED + '" d="M42 106 q8 -6 16 0 q-8 6 -16 0Z"/>',

    moon:
      '<path ' + O + ' fill="' + GOLD + '" d="M62 8 C30 10 14 36 16 62 C18 92 44 112 74 108 C50 100 36 82 36 58 C36 34 48 16 62 8 Z"/>' +
      '<path ' + L + ' d="M34 44 Q40 40 44 46 M30 66 L38 64 M28 80 Q34 86 42 82"/>' +
      '<circle fill="' + INK + '" cx="39" cy="50" r="2.2"/>' +
      '<path ' + L + ' d="M70 30 L74 40 L84 42 L74 46 L70 56 L66 46 L56 42 L66 40 Z"/>' +
      '<path ' + L + ' d="M82 68 L84 74 L90 76 L84 78 L82 84 L80 78 L74 76 L80 74 Z"/>' +
      '<circle fill="' + RED + '" cx="34" cy="72" r="3.4" opacity=".7"/>',

    moth:
      '<g transform="translate(2 16) scale(1.5)">' +
      '<path ' + O + ' fill="' + SKIN + '" stroke-width="2.1" d="M29.4 24C22 14 8 10 4 16c-3 5 3 13 12 15-7 2-11 8-8 13 4 6 15 2 21.4-8z"/>' +
      '<path ' + O + ' fill="' + SKIN + '" stroke-width="2.1" d="M34.6 24C42 14 56 10 60 16c3 5-3 13-12 15 7 2 11 8 8 13-4 6-15 2-21.4-8z"/>' +
      '<circle stroke="#14110e" stroke-width="2" fill="' + RED + '" cx="17" cy="20" r="3.6"/><circle stroke="#14110e" stroke-width="2" fill="' + RED + '" cx="47" cy="20" r="3.6"/>' +
      '<path ' + O + ' fill="' + INK + '" stroke-width="2" d="M32 18c-1.6 0-2.6 1.6-2.6 3.6V44c0 2.2 1.2 4 2.6 4s2.6-1.8 2.6-4V21.6c0-2-1-3.6-2.6-3.6z"/>' +
      '<path fill="none" stroke="#14110e" stroke-width="2" stroke-linecap="round" d="M30 17c-2-4-5-6-8-7M34 17c2-4 5-6 8-7M12 39c3 1 7 0 10-3M52 39c-3 1-7 0-10-3"/>' +
      '</g>',

    skull:
      '<path ' + O + ' fill="' + BONE + '" d="M50 12 C76 12 88 30 86 52 C85 64 78 70 74 72 V86 H26 V72 C22 70 15 64 14 52 C12 30 24 12 50 12 Z"/>' +
      '<path ' + O + ' fill="' + INK + '" d="M24 50 C24 40 44 40 44 52 C44 62 26 64 24 50 Z M76 50 C76 40 56 40 56 52 C56 62 74 64 76 50 Z"/>' +
      '<path ' + O + ' fill="' + INK + '" d="M50 58 L56 70 H44 Z"/>' +
      '<path ' + L + ' d="M34 76 V86 M42 76 V86 M50 76 V86 M58 76 V86 M66 76 V86"/>' +
      '<path ' + O + ' fill="' + RED + '" d="M10 100 Q30 88 50 100 Q70 112 90 100 L88 112 Q70 120 50 110 Q30 100 12 112 Z"/>' +
      '<path ' + L + ' d="M66 22 Q74 26 76 34"/>',

    anchor:
      '<circle ' + O + ' fill="none" cx="50" cy="14" r="7"/>' +
      '<path ' + O + ' fill="#7d8b95" d="M46 22 H54 V96 H46 Z"/>' +
      '<path ' + O + ' fill="' + GOLD + '" d="M30 32 H70 V40 H30 Z"/>' +
      '<path fill="none" stroke-linecap="round" stroke-width="10" stroke="#14110e" d="M18 76 Q24 104 50 104 Q76 104 82 76"/>' +
      '<path fill="none" stroke-linecap="round" stroke-width="4" stroke="#7d8b95" d="M18 76 Q24 104 50 104 Q76 104 82 76"/>' +
      '<path ' + O + ' fill="#7d8b95" d="M10 82 L18 68 L26 82 Z M74 82 L82 68 L90 82 Z"/>' +
      '<path ' + O + ' fill="' + RED + '" d="M36 46 Q50 38 64 46 Q60 60 50 58 Q40 60 36 46 Z"/>',

    sacred:
      '<path ' + O + ' fill="' + GOLD + '" d="M50 2 C40 14 58 18 46 30 C60 26 62 16 58 8 C66 16 66 26 60 32 H40 C34 24 40 12 50 2 Z"/>' +
      '<path ' + O + ' fill="' + RED + '" d="M50 108 C24 88 12 70 14 52 C16 36 34 30 50 44 C66 30 84 36 86 52 C88 70 76 88 50 108 Z"/>' +
      '<path ' + L + ' d="M26 54 Q50 72 74 54 M30 70 Q50 86 70 70"/>' +
      '<path ' + O + ' fill="' + BONE + '" d="M44 30 H56 V46 H44 Z"/>' +
      '<path ' + L + ' d="M34 14 L40 24 M66 14 L60 24 M22 30 L32 36 M78 30 L68 36"/>',

    hourglass:
      '<path ' + O + ' fill="#8a5a33" d="M18 8 H82 V18 H18 Z M18 102 H82 V112 H18 Z"/>' +
      '<path ' + O + ' fill="' + BONE + '" d="M26 18 H74 C74 44 56 52 56 60 C56 68 74 76 74 102 H26 C26 76 44 68 44 60 C44 52 26 44 26 18 Z"/>' +
      '<path ' + O + ' fill="' + GOLD + '" d="M34 30 H66 C62 44 52 50 50 58 C48 50 38 44 34 30 Z M32 100 C36 86 44 82 50 80 C56 82 64 86 68 100 Z"/>' +
      '<path ' + L + ' d="M50 60 V80"/>' +
      '<path ' + O + ' fill="' + GREEN + '" d="M74 20 Q96 30 86 52 Q80 40 74 40 Z"/>',
  };
})();
