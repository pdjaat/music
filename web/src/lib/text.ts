// Client-side transliteration (kept in sync with the server util).

const DEVANAGARI: Record<string, string> = {
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l', 'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gy',
  'ॅ': 'a', 'ॉ': 'o', 'ॆ': 'e', 'ॊ': 'o', 'ॲ': 'a', 'ऑ': 'o', 'ऍ': 'e',
  '्': '', 'ं': 'n', 'ँ': 'n', 'ः': 'h', '़': '',
};

const GURMUKHI: Record<string, string> = {
  'ਅ': 'a', 'ਆ': 'a', 'ਇ': 'i', 'ਈ': 'i', 'ਉ': 'u', 'ਊ': 'u', 'ਏ': 'e', 'ਐ': 'ai', 'ਓ': 'o', 'ਔ': 'au',
  'ਕ': 'k', 'ਖ': 'kh', 'ਗ': 'g', 'ਘ': 'gh', 'ਙ': 'n', 'ਚ': 'ch', 'ਛ': 'chh', 'ਜ': 'j', 'ਝ': 'jh', 'ਞ': 'n',
  'ਟ': 't', 'ਠ': 'th', 'ਡ': 'd', 'ਢ': 'dh', 'ਣ': 'n', 'ਤ': 't', 'ਥ': 'th', 'ਦ': 'd', 'ਧ': 'dh', 'ਨ': 'n',
  'ਪ': 'p', 'ਫ': 'ph', 'ਬ': 'b', 'ਭ': 'bh', 'ਮ': 'm', 'ਯ': 'y', 'ਰ': 'r', 'ਲ': 'l', 'ਵ': 'v', 'ੜ': 'r',
  'ਸ': 's', 'ਹ': 'h', 'ਸ਼': 'sh', 'ਜ਼': 'z', 'ਫ਼': 'f', 'ੲ': 'e', 'ੳ': 'o',
  'ਾ': 'a', 'ਿ': 'i', 'ੀ': 'i', 'ੁ': 'u', 'ੂ': 'u', 'ੇ': 'e', 'ੈ': 'ai', 'ੋ': 'o', 'ੌ': 'au',
  '੍': '', 'ਂ': 'n', 'ੰ': 'n', 'ਃ': 'h', 'ੱ': '',
};

const BENGALI: Record<string, string> = {
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng', 'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n', 'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ਫ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm', 'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh',
  'স': 's', 'হ': 'h', '়': '', 'য়': 'y', 'ড়': 'r', 'ঢ়': 'rh', 'ৎ': 't', 'ং': 'ng', 'ঁ': 'n',
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ੁ': 'u', 'ূ': 'u', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
};

const GUJARATI: Record<string, string> = {
  'અ': 'a', 'આ': 'a', 'ઇ': 'i', 'ઈ': 'i', 'ઉ': 'u', 'ઊ': 'u', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au',
  'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'n', 'ચ': 'ch', 'છ': 'chh', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'n',
  'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n', 'ત': 't', 'થ': 'th', 'ਦ': 'd', 'ધ': 'dh', 'ન': 'n',
  'પ': 'p', 'ਫ': 'ph', 'બ': 'b', 'ભ': 'bh', 'મ': 'm', 'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v',
  'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h', 'ળ': 'l',
  'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au',
  '્': '', 'ં': 'n', 'ઁ': 'n', 'ઃ': 'h',
};

const ODIA: Record<string, string> = {
  'ଅ': 'a', 'ଆ': 'a', 'ଇ': 'i', 'ଈ': 'i', 'ଉ': 'u', 'ଊ': 'u', 'ଏ': 'e', 'ଐ': 'ai', 'ଓ': 'o', 'ଔ': 'au',
  'କ': 'k', 'ଖ': 'kh', 'ଗ': 'g', 'ଘ': 'gh', 'ଙ': 'n', 'ଚ': 'ch', 'ଛ': 'chh', 'ଜ': 'j', 'ଝ': 'jh', 'ଞ': 'n',
  'ଟ': 't', 'ଠ': 'th', 'ଡ': 'd', 'ଢ': 'dh', 'ଣ': 'n', 'ତ': 't', 'ଥ': 'th', 'ଦ': 'd', 'ଧ': 'dh', 'ନ': 'n',
  'ପ': 'p', 'ଫ': 'ph', 'ବ': 'b', 'ଭ': 'bh', 'ମ': 'm', 'ଯ': 'y', 'ର': 'r', 'ଲ': 'l', 'ଵ': 'v', 'ଶ': 'sh',
  'ଷ': 'sh', 'ସ': 's', 'ହ': 'h', 'ଳ': 'l', '଼': '',
  'ା': 'a', 'ି': 'i', 'ୀ': 'i', 'ୁ': 'u', 'ୂ': 'u', 'େ': 'e', 'ୈ': 'ai', 'ୋ': 'o', 'ୌ': 'au',
  '୍': '', 'ଂ': 'n', 'ଁ': 'n', 'ଃ': 'h',
};

const ASSAMESE: Record<string, string> = {
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ਘ': 'gh', 'ঙ': 'ng', 'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n', 'ਤ': 't', 'থ': 'th', 'ਦ': 'd', 'ਧ': 'dh', 'ਨ': 'n',
  'প': 'p', 'ਫ': 'ph', 'ਬ': 'b', 'ਭ': 'bh', 'ਮ': 'm', 'য': 'j', 'ৰ': 'r', 'ਲ': 'l', 'ৱ': 'w', 'শ': 'sh',
  'ষ': 'sh', 'ਸ': 's', 'ਹ': 'h',
  'ਾ': 'a', 'ਿ': 'i', 'ੀ': 'i', 'ੁ': 'u', 'ੂ': 'u', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
};

const TAMIL: Record<string, string> = {
  'அ': 'a', 'ஆ': 'a', 'இ': 'i', 'ஈ': 'i', 'உ': 'u', 'ஊ': 'u', 'எ': 'e', 'ஏ': 'e', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'o', 'ஔ': 'au',
  'க': 'k', 'ங': 'ng', 'ச': 'ch', 'ஞ': 'ny', 'ட': 't', 'ண': 'n', 'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm',
  'ய': 'y', 'ர': 'r', 'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
  'ஜ': 'j', 'ஸ': 's', 'ஷ': 'sh', 'ஹ': 'h',
  'ா': 'a', 'ி': 'i', 'ீ': 'i', 'ு': 'u', 'ூ': 'u', 'ெ': 'e', 'ே': 'e', 'ை': 'ai', 'ொ': 'o', 'ோ': 'o', 'ௌ': 'au',
  '்': '', 'ஂ': 'n', 'ஃ': 'h',
};

const TELUGU: Record<string, string> = {
  'అ': 'a', 'ఆ': 'a', 'ఇ': 'i', 'ఈ': 'i', 'ఉ': 'u', 'ఊ': 'u', 'ఎ': 'e', 'ఏ': 'e', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'o', 'ఔ': 'au',
  'క': 'k', 'ఖ': 'kh', 'గ': 'g', 'ఘ': 'gh', 'ఙ': 'ng', 'చ': 'ch', 'ఛ': 'chh', 'జ': 'j', 'ఝ': 'jh', 'ఞ': 'ny',
  'ట': 't', 'ఠ': 'th', 'డ': 'd', 'ఢ': 'dh', 'ణ': 'n', 'త': 't', 'థ': 'th', 'ద': 'd', 'ధ': 'dh', 'న': 'n',
  'ప': 'p', 'ఫ': 'ph', 'బ': 'b', 'భ': 'bh', 'మ': 'm', 'య': 'y', 'ర': 'r', 'ల': 'l', 'వ': 'v', 'శ': 'sh',
  'ష': 'sh', 'స': 's', 'హ': 'h', 'ళ': 'l', 'క్ష': 'ksh', 'జ్ఞ': 'gya',
  'ా': 'a', 'ి': 'i', 'ీ': 'i', 'ు': 'u', 'ూ': 'u', 'ె': 'e', 'ే': 'e', 'ై': 'ai', 'ొ': 'o', 'ో': 'o', 'ౌ': 'au',
  '్': '', 'ం': 'n', 'ః': 'h',
};

const KANNADA: Record<string, string> = {
  'ಅ': 'a', 'ಆ': 'a', 'ಇ': 'i', 'ಈ': 'i', 'ಉ': 'u', 'ಊ': 'u', 'ಎ': 'e', 'ಏ': 'e', 'ಐ': 'ai', 'ಒ': 'o', 'ಓ': 'o', 'ಔ': 'au',
  'ಕ': 'k', 'ਖ': 'kh', 'ಗ': 'g', 'ਘ': 'gh', 'ಙ': 'ng', 'ಚ': 'ch', 'ಛ': 'chh', 'ਜ': 'j', 'ਝ': 'jh', 'ಞ': 'ny',
  'ಟ': 't', 'ਠ': 'th', 'ಡ': 'd', 'ਢ': 'dh', 'ಣ': 'n', 'ತ': 't', 'ਥ': 'th', 'ਦ': 'd', 'ਧ': 'dh', 'ನ': 'n',
  'ਪ': 'p', 'ਫ': 'ph', 'ਬ': 'b', 'ਭ': 'bh', 'ಮ': 'm', 'ਯ': 'y', 'ರ': 'r', 'ਲ': 'l', 'ವ': 'v', 'ಶ': 'sh',
  'ಷ': 'sh', 'ಸ': 's', 'ਹ': 'h', 'ಳ': 'l', 'ೞ': 'l',
  'ಾ': 'a', 'ಿ': 'i', 'ೀ': 'i', 'ੁ': 'u', 'ੂ': 'u', 'ೆ': 'e', 'ೇ': 'e', 'ೈ': 'ai', 'ೊ': 'o', 'ೋ': 'o', 'ೌ': 'au',
  '್': '', 'ಂ': 'n', 'ಃ': 'h',
};

const MALAYALAM: Record<string, string> = {
  'അ': 'a', 'ആ': 'a', 'ഇ': 'i', 'ഈ': 'i', 'ഉ': 'u', 'ഊ': 'u', 'എ': 'e', 'ഏ': 'e', 'ഐ': 'ai', 'ഒ': 'o', 'ഓ': 'o', 'ഔ': 'au',
  'ക': 'k', 'ഖ': 'kh', 'ഗ': 'g', 'ഘ': 'gh', 'ங': 'ng', 'ച': 'ch', 'ഛ': 'chh', 'ജ': 'j', 'ഝ': 'jh', 'ഞ': 'ny',
  'ട': 't', 'ഠ': 'th', 'ഡ': 'd', 'ഢ': 'dh', 'ണ': 'n', 'ത': 't', 'ഥ': 'th', 'ദ': 'd', 'ധ': 'dh', 'ന': 'n',
  'പ': 'p', 'ഫ': 'ph', 'ബ': 'b', 'ഭ': 'bh', 'മ': 'm', 'യ': 'y', 'ര': 'r', 'ല': 'l', 'വ': 'v', 'ശ': 'sh',
  'ഷ': 'sh', 'സ': 's', 'ഹ': 'h', 'ള': 'l', 'ഴ': 'zh', 'റ': 'r',
  'ാ': 'a', 'ി': 'i', 'ീ': 'i', 'ു': 'u', 'ൂ': 'u', 'െ': 'e', 'േ': 'e', 'ൈ': 'ai', 'ൊ': 'o', 'ോ': 'o', 'ൗ': 'au',
  '്': '', 'ം': 'm', 'ഃ': 'h',
};

const SCRIPTS = [DEVANAGARI, GURMUKHI, BENGALI, GUJARATI, ODIA, ASSAMESE, TAMIL, TELUGU, KANNADA, MALAYALAM];

const VOWELS = new Set<string>([
  'अ','आ','इ','ई','उ','ऊ','ए','ऐ','ओ','औ','ा','ि','ी','ु','ू','े','ै','ो','ौ','ॅ','ॉ','ॆ','ॊ','ॲ','ऑ','ऍ',
  'ਅ','ਆ','ਇ','ਈ','ਉ','ਊ','ਏ','ਐ','ਓ','ਔ','ਾ','ਿ','ੀ','ੁ','ੂ','ੇ','ੈ','ੋ','ੌ','ੲ','ੳ',
  'অ','আ','ই','ঈ','উ','ঊ','এ','ঐ','ও','ঔ','া','ি','ী','ু','ূ','ে','ৈ','ো','ৌ',
  'અ','આ','ઇ','ઈ','ઉ','ઊ','એ','ઐ','ઓ','ઔ','ા','િ','ી','ુ','ૂ','ે','ૈ','ો','ૌ',
  'ଅ','ଆ','ଇ','ଈ','ଉ','ଊ','ଏ','ଐ','ଓ','ଔ','ା','ି','ୀ','ୁ','ୂ','େ','ୈ','ୋ','ୌ',
  'அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ','ா','ி','ீ','ு','ூ','ெ','ே','ை','ொ','ோ','ௌ',
  'అ','ఆ','ఇ','ఈ','ఉ','ఊ','ఎ','ఏ','ఐ','ఒ','ఓ','ఔ','ా','ి','ీ','ు','ూ','ె','ే','ై','ొ','ో','ౌ',
  'ಅ','ಆ','ಇ','ಈ','ಉ','ಊ','ಎ','ಏ','ಐ','ಒ','ಓ','ಔ','ಾ','ಿ','ೀ','ು','ೂ','ೆ','ೇ','ೈ','ೊ','ೋ','ೌ',
  'അ','ആ','ഇ','ഈ','ഉ','ഊ','എ','ഏ','ഐ','ഒ','ഓ','ഔ','ാ','ി','ീ','ു','ൂ','െ','േ','ൈ','ൊ','ോ','ൗ',
]);

const VIRAMA = new Set<string>(['्', '੍', '্', '્', '୍', '்', '్', '್', '଼']);
const GEMINATE = new Set<string>(['ੱ']);
const ANUSVARA = new Set<string>(['ं', 'ँ', 'ः', 'ਂ', 'ੰ', 'ਃ', 'ং', 'ঃ', 'ઁ', 'ઃ', 'ଂ', 'ଁ', 'ଃ', 'ஂ', 'ஃ', 'ం', 'ః', 'ಂ', 'ಃ', 'ം', 'ഃ']);

const ALL_MAP = new Map<string, string>();
for (const s of SCRIPTS) for (const [k, v] of Object.entries(s)) ALL_MAP.set(k, v);
const KEYS = [...ALL_MAP.keys()].sort((a, b) => b.length - a.length);

export function transliterate(input: string): string {
  if (!input) return '';
  const tokens: Array<{ out: string; kind: 'vowel' | 'consonant' | 'virama' | 'anusvara' | 'geminate' | 'other' }> = [];
  let i = 0;
  while (i < input.length) {
    let matched: string | undefined;
    for (const k of KEYS) {
      if (input.startsWith(k, i)) { matched = k; break; }
    }
    if (matched) {
      const out = ALL_MAP.get(matched)!;
      if (GEMINATE.has(matched)) tokens.push({ out, kind: 'geminate' });
      else if (VIRAMA.has(matched)) tokens.push({ out, kind: 'virama' });
      else if (ANUSVARA.has(matched)) tokens.push({ out, kind: 'anusvara' });
      else if (VOWELS.has(matched)) tokens.push({ out, kind: 'vowel' });
      else tokens.push({ out, kind: 'consonant' });
      i += matched.length;
    } else {
      const ch = input[i];
      if (/\s/.test(ch)) tokens.push({ out: ' ', kind: 'other' });
      else tokens.push({ out: ch, kind: 'other' });
      i += 1;
    }
  }
  let out = '';
  let pendingDouble = false;
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.kind === 'geminate') { pendingDouble = true; continue; }
    if (tok.kind === 'virama') continue;
    if (tok.kind === 'consonant' && tok.out !== '') {
      if (pendingDouble) { out += tok.out + tok.out; pendingDouble = false; } else { out += tok.out; }
      const next = tokens[t + 1];
      if (next && (next.kind === 'consonant' || next.kind === 'anusvara')) out += 'a';
      continue;
    }
    out += tok.out;
  }
  return out
    .replace(/nh\b/g, 'ngh')
    .replace(/\bpanjabi\b/g, 'punjabi')
    .replace(/\bhariyanavi\b/g, 'haryanvi')
    .replace(/\bbhojapuri\b/g, 'bhojpuri')
    .replace(/\bosamiya\b|\basamiya\b/g, 'assamese')
    .replace(/\bkannad\b/g, 'kannada')
    .replace(/\bsangit\b/g, 'sangeet')
    .replace(/\bthamizh\b/g, 'tamil')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeText(input: string): string {
  return transliterate(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function searchVariants(query: string): string[] {
  const set = new Set<string>();
  const q = query.trim();
  if (!q) return [];
  set.add(q);
  set.add(transliterate(q));
  return [...set];
}

export function formatDuration(sec?: number): string {
  if (!sec || sec <= 0 || !Number.isFinite(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
