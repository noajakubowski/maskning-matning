'use strict';

function tillNfc(text) {
  return text.normalize('NFC');
}

function kodPunktIndex(str, utf16Index) {
  return [...str.slice(0, utf16Index)].length;
}

function kodPunktLangd(str) {
  return [...str].length;
}

module.exports = { tillNfc, kodPunktIndex, kodPunktLangd };
