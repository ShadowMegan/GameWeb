const BAD_WORDS = [
  'mierda',
  'merde',
  'puta',
  'puto',
  'cabron',
  'cabrón',
  'pendejo',
  'pendeja',
  'idiota',
  'imbecil',
  'imbecil',
  'estupido',
  'estúpido',
  'basura',
  'carajo',
  'hijo de puta',
  'malparido',
  'malparida',
  'gonorrea',
  'hp',
  'ctm',
  'mk',
  'webon',
  'weon',
  'wea',
  'la concha',
  'concha de',
  'forro',
  'forzudo',
  'mongolo',
  'mongola',
  'retrasado',
  'retrasada',
  'subnormal',
  'discapacitado',
  'discapacitada',
  'down',
  'nazi',
  'hitler',
  'nazi',
  'facha',
  'feminazi',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'dick',
  'cock',
  'pussy',
  'bastard',
  'whore',
  'slut',
  'damn',
  'crap',
  'wtf',
  'stfu',
  'kill yourself',
  'kys',
]

const normalizedWords = BAD_WORDS.map((word) =>
  word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''),
)

export function containsBadWords(text) {
  if (!text) return false
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return normalizedWords.some((word) => normalized.includes(word))
}

export function getBadWordsErrorMessage() {
  return 'Por favor utiliza un lenguaje adecuado.'
}
