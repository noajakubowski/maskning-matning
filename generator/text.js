'use strict';

function tillNfc(text) {
  return text.normalize('NFC');
}

function teckenLangd(text) {
  return [...tillNfc(text)].length;
}

function offsetFranIndex(text, index) {
  let n = 0;
  for (const ch of tillNfc(text)) {
    if (n === index) return text.indexOf(ch, n === 0 ? 0 : undefined);
    n++;
  }
  return text.length;
}

function delstrangPaIndex(text, start, slut) {
  const tecken = [...tillNfc(text)];
  return tecken.slice(start, slut).join('');
}

module.exports = { tillNfc, teckenLangd, delstrangPaIndex };
