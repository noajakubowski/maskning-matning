#!/usr/bin/env node
'use strict';

/*
 * Avslutningskoder:
 *   0  granskat, inga brister
 *   1  granskat, brister hittades
 *   2  granskade ingenting — inga kontroller angavs, eller parsningen misslyckades
 */

const fs = require('fs');
const path = require('path');

// ── Tokenizer ───────────────────────────────────────────────────────────────

const KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for',
  'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null',
  'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'undefined', 'var', 'void', 'while', 'with', 'yield', 'async', 'await',
  'of', 'static', 'from', 'as',
]);

function kanStartaRegex(prev) {
  if (!prev) return true;
  if (prev.type === 'identifier' || prev.type === 'number' ||
      prev.type === 'string' || prev.type === 'regex') {
    return false;
  }
  if (prev.type === 'punct' && ')]}'.includes(prev.value)) {
    return false;
  }
  if (prev.type === 'operator' && (prev.value === '++' || prev.value === '--')) {
    return false;
  }
  return true;
}

function tokenize(kall, filnamn) {
  const tokens = [];
  let i = 0;
  let rad = 1;
  let kol = 1;
  const len = kall.length;

  function pos() {
    return { rad, kol, start: i };
  }

  function lagg(type, value, p) {
    tokens.push({
      type,
      value,
      rad: p.rad,
      kol: p.kol,
      start: p.start,
      end: i,
    });
  }

  function peek(n = 0) {
    return kall[i + n];
  }

  function hoppa(n = 1) {
    for (let k = 0; k < n; k++) {
      if (kall[i] === '\n') {
        rad++;
        kol = 1;
      } else {
        kol++;
      }
      i++;
    }
  }

  function hoppaOverMellanslag() {
    while (i < len) {
      const c = kall[i];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        hoppa();
      } else if (c === '/' && peek(1) === '/') {
        while (i < len && kall[i] !== '\n') hoppa();
      } else if (c === '/' && peek(1) === '*') {
        hoppa(2);
        while (i < len) {
          if (kall[i] === '*' && peek(1) === '/') {
            hoppa(2);
            break;
          }
          hoppa();
        }
      } else {
        break;
      }
    }
  }

  function lasStrang(quote) {
    const p = pos();
    hoppa();
    let value = '';
    while (i < len) {
      const c = kall[i];
      if (c === '\\') {
        hoppa();
        if (i < len) {
          value += kall[i];
          hoppa();
        }
      } else if (c === quote) {
        hoppa();
        lagg('string', value, p);
        return;
      } else if (c === '\n' && quote !== '`') {
        throw new ParseFel('Oavslutad sträng', filnamn, p.rad, p.kol);
      } else {
        value += c;
        hoppa();
      }
    }
    throw new ParseFel('Oavslutad sträng', filnamn, p.rad, p.kol);
  }

  function lasTemplateQuasi(arForsta) {
    const p = pos();
    if (arForsta) hoppa();
    let value = '';
    while (i < len) {
      const c = kall[i];
      if (c === '\\') {
        hoppa();
        if (i < len) {
          value += kall[i];
          hoppa();
        }
      } else if (c === '$' && peek(1) === '{') {
        lagg(arForsta ? 'template_start' : 'template_middle', value, p);
        hoppa(2);
        return 'expr';
      } else if (c === '`') {
        hoppa();
        lagg('template_end', value, p);
        return 'klar';
      } else {
        value += c;
        hoppa();
      }
    }
    throw new ParseFel('Oavslutad template literal', filnamn, p.rad, p.kol);
  }

  function lasRegex() {
    const p = pos();
    hoppa();
    let pattern = '';
    let inClass = false;
    while (i < len) {
      const c = kall[i];
      if (c === '\\') {
        pattern += c;
        hoppa();
        if (i < len) {
          pattern += kall[i];
          hoppa();
        }
        continue;
      }
      if (c === '[') inClass = true;
      if (c === ']' && inClass) inClass = false;
      if (c === '/' && !inClass) {
        hoppa();
        let flags = '';
        while (i < len && /[a-zA-Z]/.test(kall[i])) {
          flags += kall[i];
          hoppa();
        }
        lagg('regex', { pattern, flags }, p);
        return;
      }
      pattern += c;
      hoppa();
    }
    throw new ParseFel('Oavslutad regex', filnamn, p.rad, p.kol);
  }

  function lasNummer() {
    const p = pos();
    let value = '';
    while (i < len && /[0-9.a-fA-FxXbBoO_n]/.test(kall[i])) {
      value += kall[i];
      hoppa();
    }
    lagg('number', value, p);
  }

  function lasIdentifier() {
    const p = pos();
    let value = '';
    while (i < len && /[a-zA-Z0-9_$]/.test(kall[i])) {
      value += kall[i];
      hoppa();
    }
    if (KEYWORDS.has(value)) lagg('keyword', value, p);
    else lagg('identifier', value, p);
  }

  const OPERATORS = [
    '>>>', '>>=', '<<=', '===', '!==', '==', '!=', '<=', '>=', '=>',
    '**=', '||=', '&&=', '??=', '**', '&&', '||', '??', '>>', '<<',
    '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '++', '--', '...',
  ];

  if (kall.startsWith('#!')) {
    while (i < len && kall[i] !== '\n') hoppa();
  }

  let templateExprDjup = 0;

  while (i < len) {
    hoppaOverMellanslag();
    if (i >= len) break;
    const p = pos();
    const c = kall[i];

    if (c === '`') {
      let state = lasTemplateQuasi(true);
      while (state === 'expr') {
        templateExprDjup = 0;
        hoppaOverMellanslag();
        while (i < len) {
          hoppaOverMellanslag();
          if (i >= len) break;
          const pc = kall[i];
          if (templateExprDjup === 0 && pc === '}') {
            hoppa();
            break;
          }
          if (pc === '{') {
            lagg('punct', '{', pos());
            hoppa();
            templateExprDjup++;
            continue;
          }
          if (pc === '}' && templateExprDjup > 0) {
            lagg('punct', '}', pos());
            hoppa();
            templateExprDjup--;
            continue;
          }
          if (pc === '`') {
            throw new ParseFel('Nästlade template literals i uttryck stöds inte', filnamn, rad, kol);
          }
          tokeniseraTecken();
          break;
        }
        hoppaOverMellanslag();
        state = lasTemplateQuasi(false);
      }
      continue;
    }

    tokeniseraTecken();
  }

  function tokeniseraTecken() {
    hoppaOverMellanslag();
    if (i >= len) return;
    const p = pos();
    const c = kall[i];

    if (c === '"' || c === "'") {
      lasStrang(c);
      return;
    }

    if (c === '/' && kanStartaRegex(tokens[tokens.length - 1])) {
      lasRegex();
      return;
    }

    if (/[0-9]/.test(c)) {
      lasNummer();
      return;
    }

    if (/[a-zA-Z_$]/.test(c)) {
      lasIdentifier();
      return;
    }

    let matched = false;
    for (const op of OPERATORS) {
      if (kall.slice(i, i + op.length) === op) {
        lagg('operator', op, p);
        hoppa(op.length);
        matched = true;
        break;
      }
    }
    if (matched) return;

    if ('()[]{}.,;:'.includes(c)) {
      lagg('punct', c, p);
      hoppa();
      return;
    }

    if ('+-*/%=<>&|^!?~'.includes(c)) {
      lagg('operator', c, p);
      hoppa();
      return;
    }

    throw new ParseFel(`Oväntat tecken: ${JSON.stringify(c)}`, filnamn, rad, kol);
  }

  lagg('eof', '', pos());
  return tokens;
}

class ParseFel extends Error {
  constructor(message, fil, rad, kol) {
    super(message);
    this.fil = fil;
    this.rad = rad;
    this.kol = kol;
    this.name = 'ParseFel';
  }
}

// ── Parser ──────────────────────────────────────────────────────────────────

class Parser {
  constructor(tokens, kall, filnamn) {
    this.tokens = tokens;
    this.kall = kall;
    this.filnamn = filnamn;
    this.pos = 0;
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset];
  }

  advance() {
    return this.tokens[this.pos++];
  }

  at(type, value) {
    const t = this.peek();
    if (!t || t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  expect(type, value) {
    const t = this.peek();
    if (!this.at(type, value)) {
      const h = t ? (t.type + ':' + t.value) : 'EOF';
      const extra = value !== undefined ? (' ' + value) : '';
      throw new ParseFel('Förväntade ' + type + extra + ', fick ' + h, this.filnamn, t ? t.rad : 1, t ? t.kol : 1);
    }
    return this.advance();
  }

  parseProgram() {
    const body = [];
    while (!this.at('eof')) {
      body.push(this.parseStatement());
    }
    return { type: 'Program', body };
  }

  parseStatement() {
    const t = this.peek();
    if (this.at('keyword', 'import')) return this.parseImport();
    if (this.at('keyword', 'export')) return this.parseExport();
    if (this.at('keyword', 'function')) return this.parseFunctionDecl(false);
    if (this.at('keyword', 'async') && this.at('keyword', 'function', 1)) {
      this.advance();
      return this.parseFunctionDecl(false);
    }
    if (this.at('keyword', 'class')) return this.parseClassDecl();
    if (this.at('keyword', 'const') || this.at('keyword', 'let') || this.at('keyword', 'var')) {
      return this.parseVarDecl(false);
    }
    if (this.at('punct', '{')) return this.parseBlock();
    if (this.at('keyword', 'if')) return this.parseIf();
    if (this.at('keyword', 'for') || this.at('keyword', 'while') || this.at('keyword', 'do')) {
      return this.parseLoop();
    }
    if (this.at('keyword', 'return')) return this.parseReturn();
    if (this.at('keyword', 'throw')) return this.parseThrow();
    if (this.at('keyword', 'try')) return this.parseTry();
    if (this.at('keyword', 'switch')) return this.parseSwitch();
    if (this.at('keyword', 'continue')) {
      const start = this.advance();
      if (this.at('punct', ';')) this.advance();
      return { type: 'ContinueStatement', rad: start.rad, kol: start.kol };
    }
    if (this.at('keyword', 'break')) {
      const start = this.advance();
      if (this.at('punct', ';')) this.advance();
      return { type: 'BreakStatement', rad: start.rad, kol: start.kol };
    }
    if (this.at('punct', ';')) {
      this.advance();
      return { type: 'EmptyStatement' };
    }
    const expr = this.parseExpression(true);
    if (this.at('punct', ';')) this.advance();
    return { type: 'ExpressionStatement', expression: expr };
  }

  parseImport() {
    const start = this.advance();
    const specifiers = [];
    if (this.at('punct', '(')) {
      this.advance();
      const arg = this.parseExpression(true);
      this.expect('punct', ')');
      if (this.at('punct', ';')) this.advance();
      return { type: 'ImportExpression', argument: arg, rad: start.rad, kol: start.kol };
    }
    if (this.at('identifier') || this.at('punct', '{') || this.at('operator', '*')) {
      if (this.at('operator', '*')) {
        this.advance();
        this.expect('identifier', 'as');
        specifiers.push({ type: 'ImportNamespaceSpecifier', local: this.parseBindingIdentifier() });
      } else if (this.at('punct', '{')) {
        this.advance();
        while (!this.at('punct', '}')) {
          const imported = this.parseBindingIdentifier();
          let local = imported;
          if (this.at('identifier', 'as')) {
            this.advance();
            local = this.parseBindingIdentifier();
          }
          specifiers.push({ type: 'ImportSpecifier', imported, local });
          if (this.at('punct', ',')) this.advance();
        }
        this.expect('punct', '}');
      } else {
        const def = this.parseBindingIdentifier();
        specifiers.push({ type: 'ImportDefaultSpecifier', local: def });
      }
      if (this.at('punct', ',')) {
        this.advance();
        if (this.at('operator', '*')) {
          this.advance();
          this.expect('identifier', 'as');
          specifiers.push({ type: 'ImportNamespaceSpecifier', local: this.parseBindingIdentifier() });
        } else if (this.at('punct', '{')) {
          this.advance();
          while (!this.at('punct', '}')) {
            const imported = this.parseBindingIdentifier();
            let local = imported;
            if (this.at('identifier', 'as')) {
              this.advance();
              local = this.parseBindingIdentifier();
            }
            specifiers.push({ type: 'ImportSpecifier', imported, local });
            if (this.at('punct', ',')) this.advance();
          }
          this.expect('punct', '}');
        }
      }
    }
    this.expect('identifier', 'from');
    const source = this.parseStringLiteral();
    if (this.at('punct', ';')) this.advance();
    return { type: 'ImportDeclaration', specifiers, source, rad: start.rad, kol: start.kol };
  }

  parseExport() {
    const start = this.advance();
    if (this.at('operator', '*')) {
      this.advance();
      this.expect('identifier', 'from');
      const source = this.parseStringLiteral();
      if (this.at('punct', ';')) this.advance();
      return { type: 'ExportAllDeclaration', source, rad: start.rad, kol: start.kol };
    }
    if (this.at('punct', '{')) {
      this.advance();
      while (!this.at('punct', '}')) {
        this.parseBindingIdentifier();
        if (this.at('identifier', 'as')) {
          this.advance();
          this.parseBindingIdentifier();
        }
        if (this.at('punct', ',')) this.advance();
      }
      this.expect('punct', '}');
      if (this.at('identifier', 'from')) {
        this.advance();
        const source = this.parseStringLiteral();
        if (this.at('punct', ';')) this.advance();
        return { type: 'ExportNamedDeclaration', source, rad: start.rad, kol: start.kol };
      }
      if (this.at('punct', ';')) this.advance();
      return { type: 'ExportNamedDeclaration', source: null, rad: start.rad, kol: start.kol };
    }
    if (this.at('keyword', 'default')) {
      this.advance();
      if (this.at('keyword', 'function') || this.at('keyword', 'class') || this.at('keyword', 'async')) {
        const decl = this.parseStatement();
        return { type: 'ExportDefaultDeclaration', declaration: decl, rad: start.rad, kol: start.kol };
      }
      const expr = this.parseExpression(true);
      if (this.at('punct', ';')) this.advance();
      return { type: 'ExportDefaultDeclaration', declaration: expr, rad: start.rad, kol: start.kol };
    }
    const decl = this.parseStatement();
    return { type: 'ExportNamedDeclaration', declaration: decl, source: null, rad: start.rad, kol: start.kol };
  }

  parseFunctionDecl(isExpr) {
    const start = this.advance();
    const id = this.at('identifier') ? this.parseBindingIdentifier() : null;
    const { params, body, async } = this.parseFunctionParts(false);
    const node = {
      type: isExpr ? 'FunctionExpression' : 'FunctionDeclaration',
      id, params, body, async,
      rad: start.rad, kol: start.kol,
    };
    return node;
  }

  parseClassDecl() {
    const start = this.advance();
    const id = this.at('identifier') ? this.parseBindingIdentifier() : null;
    let superClass = null;
    if (this.at('keyword', 'extends')) {
      this.advance();
      superClass = this.parseExpression(true);
    }
    this.expect('punct', '{');
    const body = [];
    while (!this.at('punct', '}')) {
      body.push(this.parseClassElement());
    }
    this.expect('punct', '}');
    return { type: 'ClassDeclaration', id, superClass, body, rad: start.rad, kol: start.kol };
  }

  parseClassElement() {
    let statisk = false;
    if (this.at('keyword', 'static')) {
      statisk = true;
      this.advance();
    }
    if (this.at('punct', ';')) {
      this.advance();
      return { type: 'EmptyStatement' };
    }
    if (this.at('identifier') && this.peek(1) && this.peek(1).type === 'punct' && this.peek(1).value === '(') {
      const key = this.parseBindingIdentifier();
      const { params, body } = this.parseFunctionParts(false);
      return { type: 'MethodDefinition', key, params, body, statisk, kind: 'method' };
    }
    if (this.at('keyword', 'constructor')) {
      this.advance();
      const { params, body } = this.parseFunctionParts(false);
      return { type: 'MethodDefinition', key: { type: 'Identifier', name: 'constructor' }, params, body, statisk, kind: 'constructor' };
    }
    const expr = this.parseExpression(true);
    if (this.at('punct', ';')) this.advance();
    return { type: 'ExpressionStatement', expression: expr };
  }

  parseFunctionParts(isArrow) {
    const async = false;
    this.expect('punct', '(');
    const params = this.parseParams();
    this.expect('punct', ')');
    if (isArrow) {
      this.expect('operator', '=>');
      let body;
      if (this.at('punct', '{')) body = this.parseBlock();
      else body = { type: 'BlockStatement', body: [{ type: 'ReturnStatement', argument: this.parseExpression(true) }] };
      return { params, body, async };
    }
    const body = this.parseBlock();
    return { params, body, async };
  }

  parseParams() {
    const params = [];
    while (!this.at('punct', ')')) {
      if (this.at('punct', '{')) {
        this.advance();
        while (!this.at('punct', '}')) {
          params.push(this.parseBindingPattern());
          if (this.at('punct', ',')) this.advance();
        }
        this.expect('punct', '}');
      } else if (this.at('punct', '[')) {
        params.push(this.parseArrayPattern());
      } else {
        params.push(this.parseBindingIdentifier());
      }
      if (this.at('operator', '=')) {
        this.advance();
        params[params.length - 1] = {
          type: 'AssignmentPattern',
          left: params[params.length - 1],
          right: this.parseExpression(true),
        };
      }
      if (this.at('punct', ',')) this.advance();
    }
    return params;
  }

  parseBindingPattern() {
    if (this.at('punct', '[')) return this.parseArrayPattern();
    if (this.at('punct', '{')) {
      this.advance();
      const props = [];
      while (!this.at('punct', '}')) {
        const key = this.at('identifier') ? this.parseBindingIdentifier() : this.parseStringLiteral();
        let value = key;
        if (this.at('punct', ':')) {
          this.advance();
          value = this.parseBindingPattern();
        }
        props.push({ key, value });
        if (this.at('punct', ',')) this.advance();
      }
      this.expect('punct', '}');
      return { type: 'ObjectPattern', properties: props };
    }
    return this.parseBindingIdentifier();
  }

  parseArrayPattern() {
    this.expect('punct', '[');
    const elements = [];
    while (!this.at('punct', ']')) {
      if (this.at('punct', ',')) {
        elements.push(null);
        this.advance();
        continue;
      }
      elements.push(this.parseBindingPattern());
      if (this.at('punct', ',')) this.advance();
    }
    this.expect('punct', ']');
    return { type: 'ArrayPattern', elements };
  }

  parseBindingIdentifier() {
    const t = this.peek();
    if (t.type === 'identifier' || t.type === 'keyword') {
      const adv = this.advance();
      return { type: 'Identifier', name: adv.value, rad: adv.rad, kol: adv.kol };
    }
    throw new ParseFel('Förväntade identifier, fick ' + (t ? (t.type + ':' + t.value) : 'EOF'), this.filnamn, t ? t.rad : 1, t ? t.kol : 1);
  }

  parseVarDecl(isFor) {
    const start = this.advance();
    const kind = start.value;
    const declarations = [];
    do {
      const id = this.parseBindingPattern();
      let init = null;
      if (this.at('operator', '=')) {
        this.advance();
        init = this.parseExpression(true);
      }
      declarations.push({ type: 'VariableDeclarator', id, init });
    } while (this.at('punct', ',') && this.advance());
    if (!isFor && this.at('punct', ';')) this.advance();
    return { type: 'VariableDeclaration', kind, declarations, rad: start.rad, kol: start.kol };
  }

  parseBlock() {
    const start = this.expect('punct', '{');
    const body = [];
    while (!this.at('punct', '}')) {
      body.push(this.parseStatement());
    }
    this.expect('punct', '}');
    return { type: 'BlockStatement', body, rad: start.rad, kol: start.kol };
  }

  parseIf() {
    const start = this.advance();
    this.expect('punct', '(');
    const test = this.parseExpression(true);
    this.expect('punct', ')');
    const consequent = this.parseStatement();
    let alternate = null;
    if (this.at('keyword', 'else')) {
      this.advance();
      alternate = this.parseStatement();
    }
    return { type: 'IfStatement', test, consequent, alternate, rad: start.rad, kol: start.kol };
  }

  parseLoop() {
    const start = this.advance();
    const kw = start.value;
    if (kw === 'do') {
      const body = this.parseStatement();
      this.expect('keyword', 'while');
      this.expect('punct', '(');
      const test = this.parseExpression(true);
      this.expect('punct', ')');
      if (this.at('punct', ';')) this.advance();
      return { type: 'DoWhileStatement', body, test, rad: start.rad, kol: start.kol };
    }
    this.expect('punct', '(');
    let init = null;
    let test = null;
    let update = null;
    if (kw === 'for') {
      if (this.at('keyword', 'const') || this.at('keyword', 'let') || this.at('keyword', 'var')) {
        init = this.parseVarDecl(true);
        if (this.at('keyword', 'in') || this.at('keyword', 'of')) {
          const op = this.advance().value;
          const right = this.parseExpression(true);
          this.expect('punct', ')');
          const body = this.parseStatement();
          return {
            type: op === 'in' ? 'ForInStatement' : 'ForOfStatement',
            left: init,
            right,
            body,
            rad: start.rad,
            kol: start.kol,
          };
        }
      } else if (!this.at('punct', ';')) {
        init = this.parseExpression(true);
      }
      this.expect('punct', ';');
      if (!this.at('punct', ';')) test = this.parseExpression(true);
      this.expect('punct', ';');
      if (!this.at('punct', ')')) update = this.parseExpression(true);
    } else {
      test = this.parseExpression(true);
    }
    this.expect('punct', ')');
    const body = this.parseStatement();
    return { type: kw === 'for' ? 'ForStatement' : 'WhileStatement', init, test, update, body, rad: start.rad, kol: start.kol };
  }

  parseReturn() {
    const start = this.advance();
    let argument = null;
    if (!this.at('punct', ';') && !this.at('punct', '}') && !this.at('eof')) {
      argument = this.parseExpression(true);
    }
    if (this.at('punct', ';')) this.advance();
    return { type: 'ReturnStatement', argument, rad: start.rad, kol: start.kol };
  }

  parseThrow() {
    const start = this.advance();
    const argument = this.parseExpression(true);
    if (this.at('punct', ';')) this.advance();
    return { type: 'ThrowStatement', argument, rad: start.rad, kol: start.kol };
  }

  parseTry() {
    const start = this.advance();
    const block = this.parseBlock();
    let handler = null;
    let finalizer = null;
    if (this.at('keyword', 'catch')) {
      this.advance();
      this.expect('punct', '(');
      const param = this.parseBindingPattern();
      this.expect('punct', ')');
      handler = { type: 'CatchClause', param, body: this.parseBlock() };
    }
    if (this.at('keyword', 'finally')) {
      this.advance();
      finalizer = this.parseBlock();
    }
    return { type: 'TryStatement', block, handler, finalizer, rad: start.rad, kol: start.kol };
  }

  parseSwitch() {
    const start = this.advance();
    this.expect('punct', '(');
    const discriminant = this.parseExpression(true);
    this.expect('punct', ')');
    this.expect('punct', '{');
    const cases = [];
    while (!this.at('punct', '}')) {
      let test = null;
      if (this.at('keyword', 'case')) {
        this.advance();
        test = this.parseExpression(true);
      } else if (this.at('keyword', 'default')) {
        this.advance();
      }
      this.expect('punct', ':');
      const consequent = [];
      while (!this.at('keyword', 'case') && !this.at('keyword', 'default') && !this.at('punct', '}')) {
        consequent.push(this.parseStatement());
      }
      cases.push({ test, consequent });
    }
    this.expect('punct', '}');
    return { type: 'SwitchStatement', discriminant, cases, rad: start.rad, kol: start.kol };
  }

  parseExpression(noIn) {
    return this.parseAssign(noIn);
  }

  parseAssign(noIn) {
    let left = this.parseConditional(noIn);
    const assignOps = ['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??='];
    while (this.at('operator') && assignOps.includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseAssign(noIn);
      left = { type: 'AssignmentExpression', operator: op, left, right };
    }
    return left;
  }

  parseConditional(noIn) {
    let expr = this.parseLogicalOr(noIn);
    if (this.at('operator', '?')) {
      this.advance();
      const consequent = this.parseExpression(true);
      this.expect('punct', ':');
      const alternate = this.parseExpression(noIn);
      expr = { type: 'ConditionalExpression', test: expr, consequent, alternate };
    }
    return expr;
  }

  parseLogicalOr(noIn) {
    let left = this.parseLogicalAnd(noIn);
    while (this.at('operator', '||') || this.at('operator', '??')) {
      const op = this.advance().value;
      left = { type: 'LogicalExpression', operator: op, left, right: this.parseLogicalAnd(noIn) };
    }
    return left;
  }

  parseLogicalAnd(noIn) {
    let left = this.parseBitwiseOr(noIn);
    while (this.at('operator', '&&')) {
      const op = this.advance().value;
      left = { type: 'LogicalExpression', operator: op, left, right: this.parseBitwiseOr(noIn) };
    }
    return left;
  }

  parseBitwiseOr(noIn) {
    let left = this.parseBitwiseXor(noIn);
    while (this.at('operator', '|')) {
      const op = this.advance().value;
      left = { type: 'BinaryExpression', operator: op, left, right: this.parseBitwiseXor(noIn) };
    }
    return left;
  }

  parseBitwiseXor(noIn) {
    let left = this.parseBitwiseAnd(noIn);
    while (this.at('operator', '^')) {
      const op = this.advance().value;
      left = { type: 'BinaryExpression', operator: op, left, right: this.parseBitwiseAnd(noIn) };
    }
    return left;
  }

  parseBitwiseAnd(noIn) {
    let left = this.parseEquality(noIn);
    while (this.at('operator', '&')) {
      const op = this.advance().value;
      left = { type: 'BinaryExpression', operator: op, left, right: this.parseEquality(noIn) };
    }
    return left;
  }

  parseEquality(noIn) {
    let left = this.parseRelational(noIn);
    while (this.at('operator') && ['==', '!=', '===', '!=='].includes(this.peek().value)) {
      const op = this.advance().value;
      left = { type: 'BinaryExpression', operator: op, left, right: this.parseRelational(noIn) };
    }
    return left;
  }

  parseRelational(noIn) {
    let left = this.parseShift(noIn);
    while (this.at('operator') && ['<', '>', '<=', '>='].includes(this.peek().value)) {
      const op = this.advance().value;
      left = { type: 'BinaryExpression', operator: op, left, right: this.parseShift(noIn) };
    }
    while (this.at('keyword', 'instanceof')) {
      const op = this.advance().value;
      left = { type: 'BinaryExpression', operator: op, left, right: this.parseShift(noIn) };
    }
    if (!noIn) {
      while (this.at('keyword', 'in')) {
        const op = this.advance().value;
        left = { type: 'BinaryExpression', operator: op, left, right: this.parseShift(noIn) };
      }
    }
    return left;
  }

  parseShift(noIn) {
    let left = this.parseAdditive(noIn);
    while (this.at('operator') && ['<<', '>>', '>>>'].includes(this.peek().value)) {
      const op = this.advance().value;
      left = { type: 'BinaryExpression', operator: op, left, right: this.parseAdditive(noIn) };
    }
    return left;
  }

  parseAdditive(noIn) {
    let left = this.parseMultiplicative(noIn);
    while (this.at('operator') && ['+', '-'].includes(this.peek().value)) {
      const op = this.advance().value;
      left = { type: 'BinaryExpression', operator: op, left, right: this.parseMultiplicative(noIn) };
    }
    return left;
  }

  parseMultiplicative(noIn) {
    let left = this.parseUnary(noIn);
    while (this.at('operator') && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.advance().value;
      left = { type: 'BinaryExpression', operator: op, left, right: this.parseUnary(noIn) };
    }
    return left;
  }

  parseUnary(noIn) {
    if (this.at('keyword', 'typeof') || this.at('keyword', 'void') || this.at('keyword', 'delete')) {
      const op = this.advance().value;
      return { type: 'UnaryExpression', operator: op, argument: this.parseUnary(noIn), prefix: true };
    }
    if (this.at('operator') && ['+', '-', '!', '~', '++', '--'].includes(this.peek().value)) {
      const op = this.advance().value;
      return { type: 'UnaryExpression', operator: op, argument: this.parseUnary(noIn), prefix: true };
    }
    if (this.at('keyword', 'await')) {
      this.advance();
      return { type: 'AwaitExpression', argument: this.parseUnary(noIn) };
    }
    return this.parsePostfix(noIn);
  }

  parsePostfix(noIn) {
    let expr = this.parsePrimary(noIn);
    while (true) {
      if (this.at('punct', '.')) {
        this.advance();
        const prop = this.parseMemberProperty();
        expr = { type: 'MemberExpression', object: expr, property: prop, computed: false };
      } else if (this.at('punct', '[')) {
        this.advance();
        const prop = this.parseExpression(true);
        this.expect('punct', ']');
        expr = { type: 'MemberExpression', object: expr, property: prop, computed: true };
      } else if (this.at('punct', '(')) {
        this.advance();
        const args = this.parseArguments();
        this.expect('punct', ')');
        expr = { type: 'CallExpression', callee: expr, arguments: args };
      } else if (this.at('operator', '++') || this.at('operator', '--')) {
        const op = this.advance().value;
        expr = { type: 'UpdateExpression', operator: op, argument: expr, prefix: false };
      } else if (this.at('operator', '?.')) {
        this.advance();
        if (this.at('punct', '(')) {
          this.advance();
          const args = this.parseArguments();
          this.expect('punct', ')');
          expr = { type: 'CallExpression', callee: { type: 'MemberExpression', object: expr, property: { type: 'Identifier', name: 'call' }, computed: false, optional: true }, arguments: args, optional: true };
        } else if (this.at('punct', '[')) {
          this.advance();
          const prop = this.parseExpression(true);
          this.expect('punct', ']');
          expr = { type: 'MemberExpression', object: expr, property: prop, computed: true, optional: true };
        } else {
          const prop = this.parseMemberProperty();
          expr = { type: 'MemberExpression', object: expr, property: prop, computed: false, optional: true };
        }
      } else {
        break;
      }
    }
    return expr;
  }

  parseMemberProperty() {
    if (this.at('identifier')) return this.parseBindingIdentifier();
    if (this.at('keyword', 'default')) {
      const t = this.advance();
      return { type: 'Identifier', name: t.value, rad: t.rad, kol: t.kol };
    }
    return this.parseStringLiteral();
  }

  serUtSomArrow() {
    let p = this.pos + 1;
    let djup = 1;
    while (p < this.tokens.length && djup > 0) {
      const t = this.tokens[p];
      if (t.type === 'punct' && t.value === '(') djup++;
      if (t.type === 'punct' && t.value === ')') djup--;
      p++;
    }
    return p < this.tokens.length &&
      this.tokens[p].type === 'operator' &&
      this.tokens[p].value === '=>';
  }

  parseArrowFunction() {
    const start = this.advance();
    const params = this.parseParams();
    this.expect('punct', ')');
    this.expect('operator', '=>');
    let body;
    if (this.at('punct', '{')) body = this.parseBlock();
    else {
      body = {
        type: 'BlockStatement',
        body: [{ type: 'ReturnStatement', argument: this.parseExpression(true) }],
      };
    }
    return {
      type: 'ArrowFunctionExpression',
      params,
      body,
      async: false,
      rad: start.rad,
      kol: start.kol,
    };
  }

  parsePrimary(noIn) {
    const t = this.peek();
    if (this.at('identifier')) return this.parseBindingIdentifier();
    if (this.at('keyword', 'this')) {
      const kw = this.advance();
      return { type: 'ThisExpression', rad: kw.rad, kol: kw.kol };
    }
    if (this.at('keyword', 'super')) {
      const kw = this.advance();
      return { type: 'Super', rad: kw.rad, kol: kw.kol };
    }
    if (this.at('keyword', 'true') || this.at('keyword', 'false')) {
      const kw = this.advance();
      return { type: 'Literal', value: kw.value === 'true', raw: kw.value, rad: kw.rad, kol: kw.kol };
    }
    if (this.at('keyword', 'null')) {
      const kw = this.advance();
      return { type: 'Literal', value: null, raw: 'null', rad: kw.rad, kol: kw.kol };
    }
    if (this.at('keyword', 'undefined')) {
      const kw = this.advance();
      return { type: 'Identifier', name: 'undefined', rad: kw.rad, kol: kw.kol };
    }
    if (this.at('number')) return this.parseNumericLiteral();
    if (this.at('string')) return this.parseStringLiteral();
    if (this.at('regex')) return this.parseRegexLiteral();
    if (this.at('template_start') || this.at('template_end')) return this.parseTemplateLiteral();
    if (this.at('punct', '(')) {
      if (this.serUtSomArrow()) return this.parseArrowFunction();
      this.advance();
      const expr = this.parseExpression(noIn);
      this.expect('punct', ')');
      return expr;
    }
    if (this.at('punct', '[')) return this.parseArrayExpr();
    if (this.at('punct', '{')) return this.parseObjectExpr();
    if (this.at('keyword', 'function')) return this.parseFunctionDecl(true);
    if (this.at('keyword', 'class')) return this.parseClassExpr();
    if (this.at('keyword', 'new')) return this.parseNew();
    if (this.at('keyword', 'import')) {
      this.advance();
      if (this.at('punct', '(')) {
        this.advance();
        const arg = this.parseExpression(true);
        this.expect('punct', ')');
        return { type: 'ImportExpression', argument: arg, rad: t.rad, kol: t.kol };
      }
    }
    throw new ParseFel(`Oväntat uttryck: ${t.type}:${t.value}`, this.filnamn, t.rad, t.kol);
  }

  parseNumericLiteral() {
    const t = this.advance();
    return { type: 'Literal', value: Number(t.value), raw: t.value, rad: t.rad, kol: t.kol };
  }

  parseStringLiteral() {
    const t = this.advance();
    return { type: 'Literal', value: t.value, raw: t.value, kind: 'string', rad: t.rad, kol: t.kol };
  }

  parseRegexLiteral() {
    const t = this.advance();
    return { type: 'Literal', value: null, regex: t.value, kind: 'regex', rad: t.rad, kol: t.kol };
  }

  parseTemplateLiteral() {
    const start = this.peek();
    const quasis = [];
    const expressions = [];
    while (this.at('template_start') || this.at('template_middle') || this.at('template_end')) {
      const t = this.advance();
      quasis.push({ type: 'TemplateElement', value: t.value, tail: t.type === 'template_end', rad: t.rad, kol: t.kol });
      if (t.type !== 'template_end') {
        expressions.push(this.parseExpression(true));
      }
    }
    return { type: 'TemplateLiteral', quasis, expressions, rad: start.rad, kol: start.kol };
  }

  parseArrayExpr() {
    const start = this.expect('punct', '[');
    const elements = [];
    while (!this.at('punct', ']')) {
      if (this.at('punct', ',')) {
        elements.push(null);
        this.advance();
        continue;
      }
      if (this.at('operator', '...')) {
        this.advance();
        elements.push({ type: 'SpreadElement', argument: this.parseExpression(true) });
      } else {
        elements.push(this.parseExpression(true));
      }
      if (this.at('punct', ',')) this.advance();
    }
    this.expect('punct', ']');
    return { type: 'ArrayExpression', elements, rad: start.rad, kol: start.kol };
  }

  parseObjectExpr() {
    const start = this.expect('punct', '{');
    const properties = [];
    while (!this.at('punct', '}')) {
      if (this.at('operator', '...')) {
        this.advance();
        properties.push({ type: 'SpreadElement', argument: this.parseExpression(true) });
        if (this.at('punct', ',')) this.advance();
        continue;
      }
      let key;
      let computed = false;
      if (this.at('punct', '[')) {
        this.advance();
        key = this.parseExpression(true);
        this.expect('punct', ']');
        computed = true;
      } else if (this.at('identifier') || this.at('keyword')) {
        key = this.parseMemberProperty();
      } else if (this.at('string') || this.at('number')) {
        key = this.parsePrimary(true);
      } else {
        break;
      }
      let value;
      if (this.at('punct', '(')) {
        const { params, body } = this.parseFunctionParts(false);
        value = { type: 'FunctionExpression', id: null, params, body, async: false };
        properties.push({ key, value, kind: 'init', computed, method: true });
      } else if (this.at('punct', ':')) {
        this.advance();
        value = this.parseExpression(true);
        properties.push({ key, value, kind: 'init', computed, method: false });
      } else if (this.at('punct', ',') || this.at('punct', '}')) {
        value = key;
        properties.push({ key, value, kind: 'init', computed, method: false, shorthand: true });
      }
      if (this.at('punct', ',')) this.advance();
    }
    this.expect('punct', '}');
    return { type: 'ObjectExpression', properties, rad: start.rad, kol: start.kol };
  }

  parseClassExpr() {
    const node = this.parseClassDecl();
    node.type = 'ClassExpression';
    return node;
  }

  parseNew() {
    const start = this.advance();
    const callee = this.parsePrimary(true);
    return { type: 'NewExpression', callee, arguments: [], rad: start.rad, kol: start.kol };
  }

  parseArguments() {
    const args = [];
    while (!this.at('punct', ')')) {
      if (this.at('operator', '...')) {
        this.advance();
        args.push({ type: 'SpreadElement', argument: this.parseExpression(true) });
      } else {
        args.push(this.parseExpression(true));
      }
      if (this.at('punct', ',')) this.advance();
    }
    return args;
  }
}

function parseKall(kall, filnamn) {
  const tokens = tokenize(kall, filnamn);
  const parser = new Parser(tokens, kall, filnamn);
  return parser.parseProgram();
}

// ── Analys ──────────────────────────────────────────────────────────────────

function position(node) {
  return { rad: node.rad || 1, kol: node.kol || 1 };
}

function arMathRandomAnrop(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'CallExpression') {
    const c = node.callee;
    if (c && c.type === 'MemberExpression' && !c.computed) {
      const obj = c.object;
      const prop = c.property;
      if (obj && obj.type === 'Identifier' && obj.name === 'Math' &&
          prop && prop.type === 'Identifier' && prop.name === 'random') {
        return true;
      }
    }
    if (c && c.type === 'MemberExpression' && c.computed) {
      const obj = c.object;
      const prop = c.property;
      if (obj && obj.type === 'Identifier' && obj.name === 'Math' &&
          prop && prop.type === 'Literal' && prop.kind === 'string' && prop.value === 'random') {
        return true;
      }
    }
  }
  return false;
}

function samlaMathRandom(node, trffar = []) {
  if (!node || typeof node !== 'object') return trffar;
  if (arMathRandomAnrop(node)) {
    trffar.push(position(node));
  }
  for (const key of Object.keys(node)) {
    const val = node[key];
    if (Array.isArray(val)) {
      for (const barn of val) samlaMathRandom(barn, trffar);
    } else if (val && typeof val === 'object') {
      samlaMathRandom(val, trffar);
    }
  }
  return trffar;
}

function arRequireAnrop(node) {
  return node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length >= 1 &&
    node.arguments[0].type === 'Literal' &&
    node.arguments[0].kind === 'string';
}

function samlaImporter(node, trffar = []) {
  if (!node || typeof node !== 'object') return trffar;

  if (node.type === 'ImportDeclaration' && node.source) {
    trffar.push({ sokvag: node.source.value, rad: node.source.rad, kol: node.source.kol });
  }
  if (node.type === 'ExportAllDeclaration' && node.source) {
    trffar.push({ sokvag: node.source.value, rad: node.source.rad, kol: node.source.kol });
  }
  if (node.type === 'ExportNamedDeclaration' && node.source) {
    trffar.push({ sokvag: node.source.value, rad: node.source.rad, kol: node.source.kol });
  }
  if (arRequireAnrop(node)) {
    const arg = node.arguments[0];
    trffar.push({ sokvag: arg.value, rad: arg.rad, kol: arg.kol });
  }
  if (node.type === 'ImportExpression' && node.argument &&
      node.argument.type === 'Literal' && node.argument.kind === 'string') {
    trffar.push({ sokvag: node.argument.value, rad: node.argument.rad, kol: node.argument.kol });
  }

  for (const key of Object.keys(node)) {
    const val = node[key];
    if (Array.isArray(val)) {
      for (const barn of val) samlaImporter(barn, trffar);
    } else if (val && typeof val === 'object') {
      samlaImporter(val, trffar);
    }
  }
  return trffar;
}

function samlaStrangar(node, trffar = []) {
  if (!node || typeof node !== 'object') return trffar;

  if (node.type === 'Literal' && node.kind === 'string') {
    trffar.push({ varde: node.value, rad: node.rad, kol: node.kol });
  }
  if (node.type === 'TemplateLiteral') {
    for (const q of node.quasis) {
      trffar.push({ varde: q.value, rad: q.rad, kol: q.kol, template: true });
    }
  }

  for (const key of Object.keys(node)) {
    const val = node[key];
    if (Array.isArray(val)) {
      for (const barn of val) samlaStrangar(barn, trffar);
    } else if (val && typeof val === 'object') {
      samlaStrangar(val, trffar);
    }
  }
  return trffar;
}

// ── Granskning ──────────────────────────────────────────────────────────────

function listaJsFiler(mal) {
  const stat = fs.statSync(mal);
  if (stat.isFile()) return mal.endsWith('.js') ? [mal] : [];
  const ut = [];
  for (const namn of fs.readdirSync(mal)) {
    const full = path.join(mal, namn);
    if (fs.statSync(full).isDirectory()) ut.push(...listaJsFiler(full));
    else if (namn.endsWith('.js')) ut.push(full);
  }
  return ut;
}

function granskaKall(kall, filnamn, kontroller) {
  let ast;
  try {
    ast = parseKall(kall, filnamn);
  } catch (err) {
    if (err instanceof ParseFel) {
      return {
        kod: 2,
        brister: [],
        parseFel: `${filnamn}:${err.rad}:${err.kol} ${err.message}`,
      };
    }
    throw err;
  }

  const brister = [];

  if (kontroller.forbjudAnrop.includes('Math.random')) {
    for (const t of samlaMathRandom(ast)) {
      brister.push({
        typ: 'anrop',
        fil: filnamn,
        rad: t.rad,
        kol: t.kol,
        meddelande: 'Math.random anropas',
      });
    }
  }

  if (kontroller.forbjudImport.length > 0) {
    const importer = samlaImporter(ast);
    for (const imp of importer) {
      for (const prefix of kontroller.forbjudImport) {
        if (imp.sokvag.includes(prefix)) {
          brister.push({
            typ: 'import',
            fil: filnamn,
            rad: imp.rad,
            kol: imp.kol,
            meddelande: `import av "${imp.sokvag}" matchar förbjudet prefix "${prefix}"`,
          });
        }
      }
    }
  }

  if (kontroller.forbjudStrang.length > 0) {
    const strangar = samlaStrangar(ast);
    for (const s of strangar) {
      for (const del of kontroller.forbjudStrang) {
        if (s.varde.includes(del)) {
          brister.push({
            typ: 'strang',
            fil: filnamn,
            rad: s.rad,
            kol: s.kol,
            meddelande: `strängliteral innehåller "${del}"`,
          });
        }
      }
    }
  }

  return { kod: brister.length > 0 ? 1 : 0, brister, parseFel: null };
}

function granskaSokvag(mal, kontroller) {
  if (kontroller.forbjudAnrop.length === 0 &&
      kontroller.forbjudImport.length === 0 &&
      kontroller.forbjudStrang.length === 0) {
    return { kod: 2, brister: [], parseFel: null, meddelande: 'Inga kontroller angavs' };
  }

  const filer = listaJsFiler(mal);
  if (filer.length === 0) {
    return { kod: 2, brister: [], parseFel: null, meddelande: 'Inga .js-filer hittades' };
  }

  const allaBrister = [];
  let parseFel = null;

  for (const fil of filer) {
    const kall = fs.readFileSync(fil, 'utf8');
    const resultat = granskaKall(kall, fil, kontroller);
    if (resultat.parseFel) {
      parseFel = resultat.parseFel;
      return { kod: 2, brister: [], parseFel };
    }
    allaBrister.push(...resultat.brister);
  }

  return { kod: allaBrister.length > 0 ? 1 : 0, brister: allaBrister, parseFel: null };
}

function skrivResultat(resultat, kontroller) {
  if (resultat.meddelande) {
    console.error(resultat.meddelande);
    return;
  }
  if (resultat.parseFel) {
    console.error(`BRIST: parsning misslyckades — ${resultat.parseFel}`);
    return;
  }

  const kontrollNamn = [];
  if (kontroller.forbjudAnrop.includes('Math.random')) kontrollNamn.push('Math.random');
  for (const p of kontroller.forbjudImport) kontrollNamn.push(`import:${p}`);
  for (const s of kontroller.forbjudStrang) kontrollNamn.push(`sträng:${s}`);

  for (const namn of kontrollNamn) {
    const typ = namn.startsWith('import:') ? 'import'
      : namn.startsWith('sträng:') ? 'strang'
        : 'anrop';
    const prefix = namn.startsWith('import:') ? namn.slice(7)
      : namn.startsWith('sträng:') ? namn.slice(7)
        : namn;
    const relevanta = resultat.brister.filter((b) => {
      if (typ === 'anrop') return b.typ === 'anrop';
      if (typ === 'import') return b.typ === 'import' && b.meddelande.includes(`"${prefix}"`);
      return b.typ === 'strang' && b.meddelande.includes(`"${prefix}"`);
    });
    if (relevanta.length === 0) {
      console.log(`OK  ${namn}`);
    } else {
      for (const b of relevanta) {
        console.error(`BRIST: ${b.fil}:${b.rad}:${b.kol} ${b.meddelande}`);
      }
    }
  }
}

// ── Självtest ───────────────────────────────────────────────────────────────

function korSjalvtest() {
  let fel = 0;

  function kontrollera(beskrivning, kall, forvantade, kontroller) {
    const r = granskaKall(kall, '<sjalvtest>', kontroller);
    if (r.parseFel) {
      console.error(`BRIST självtest parsning: ${beskrivning} — ${r.parseFel}`);
      fel++;
      return;
    }
    const math = samlaMathRandom(parseKall(kall, '<sjalvtest>'));
    const importer = samlaImporter(parseKall(kall, '<sjalvtest>'));
    const strangar = samlaStrangar(parseKall(kall, '<sjalvtest>'));

    if (forvantade.mathRandom !== undefined) {
      const n = math.length;
      if (n !== forvantade.mathRandom) {
        console.error(`BRIST självtest: ${beskrivning} — förväntade ${forvantade.mathRandom} Math.random, fick ${n}`);
        fel++;
      }
    }
    if (forvantade.importer !== undefined) {
      const sokvagar = importer.map((i) => i.sokvag);
      const ok = forvantade.importer.every((s) => sokvagar.includes(s));
      if (!ok) {
        console.error(`BRIST självtest: ${beskrivning} — importer ${JSON.stringify(sokvagar)}`);
        fel++;
      }
      if (forvantade.importerAntal !== undefined && importer.length !== forvantade.importerAntal) {
        console.error(`BRIST självtest: ${beskrivning} — förväntade ${forvantade.importerAntal} importer, fick ${importer.length}`);
        fel++;
      }
    }
    if (forvantade.strangInnehaller !== undefined) {
      const ok = strangar.some((s) => s.varde.includes(forvantade.strangInnehaller));
      if (!ok) {
        console.error(`BRIST självtest: ${beskrivning} — hittade inte sträng med "${forvantade.strangInnehaller}"`);
        fel++;
      }
    }
    if (forvantade.strangImportEj !== undefined) {
      const imp = importer.some((i) => i.sokvag.includes(forvantade.strangImportEj));
      if (imp) {
        console.error(`BRIST självtest: ${beskrivning} — felaktig importträff`);
        fel++;
      }
    }
  }

  const anropKontroll = { forbjudAnrop: ['Math.random'], forbjudImport: [], forbjudStrang: [] };

  kontrollera('anrop 1', 'const x = Math.random();', { mathRandom: 1 }, anropKontroll);
  kontrollera('anrop 2', 'const y = foo(Math.random() * 3);', { mathRandom: 1 }, anropKontroll);
  kontrollera('anrop 3', 'if (Math.random() > 0.5) {}', { mathRandom: 1 }, anropKontroll);

  kontrollera('ej anrop regex', 'const re = /Math\\.random/;', { mathRandom: 0 }, anropKontroll);
  kontrollera('ej anrop sträng dubbel', 'const s = "Math.random";', { mathRandom: 0 }, anropKontroll);
  kontrollera('ej anrop sträng enkel', "const t = 'anropa aldrig Math.random';", { mathRandom: 0 }, anropKontroll);
  kontrollera('ej anrop radkommentar', '// Math.random får inte användas\nconst a = 1;', { mathRandom: 0 }, anropKontroll);
  kontrollera('ej anrop blockkommentar', '/* Math.random är förbjudet */\nconst a = 1;', { mathRandom: 0 }, anropKontroll);
  kontrollera('ej anrop template', 'const b = `mönstret Math.random hittas inte`;', { mathRandom: 0 }, anropKontroll);
  kontrollera('ej anrop division', 'const c = a / Math.PI / b;', { mathRandom: 0 }, anropKontroll);

  const importKontroll = { forbjudAnrop: [], forbjudImport: ['detektor'], forbjudStrang: ['detektor'] };

  kontrollera(
    'require import',
    "require('../detektor/namn/lexikon.json');",
    { importer: ['../detektor/namn/lexikon.json'], importerAntal: 1 },
    importKontroll,
  );
  kontrollera(
    'sträng ej import',
    'const s = "det står detektor i en sträng";',
    { importer: [], importerAntal: 0, strangInnehaller: 'detektor' },
    importKontroll,
  );

  if (fel === 0) {
    console.log('OK  självtest');
  } else {
    console.error(`BRIST: självtest — ${fel} fall misslyckades`);
  }

  return fel > 0 ? 1 : 0;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function main(argv) {
  if (argv.includes('--sjalvtest')) {
    return korSjalvtest();
  }

  const kontroller = {
    forbjudAnrop: [],
    forbjudImport: [],
    forbjudStrang: [],
  };

  const positioner = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--forbjud-anrop') {
      kontroller.forbjudAnrop.push(argv[++i]);
    } else if (a === '--forbjud-import') {
      kontroller.forbjudImport.push(argv[++i]);
    } else if (a === '--forbjud-strang') {
      kontroller.forbjudStrang.push(argv[++i]);
    } else if (!a.startsWith('--')) {
      positioner.push(a);
    }
  }

  if (positioner.length === 0) {
    console.error('Användning: node verktyg/granska-kod.js <fil-eller-mapp> [flaggor]');
    console.error('           node verktyg/granska-kod.js --sjalvtest');
    return 2;
  }

  const resultat = granskaSokvag(path.resolve(positioner[0]), kontroller);
  skrivResultat(resultat, kontroller);
  return resultat.kod;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = {
  tokenize,
  parseKall,
  samlaMathRandom,
  samlaImporter,
  samlaStrangar,
  granskaKall,
  granskaSokvag,
  korSjalvtest,
  ParseFel,
};
