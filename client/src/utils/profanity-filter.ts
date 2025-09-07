// Frontend profanity filter for Turkish content - lighter version
const bannedWords = [
  // Common Turkish profanity 
  'amk', 'amq', 'aq', 'orospu', 'oç', 'sik', 'sikeyim', 'amcık', 'piç', 'ibne', 'göt', 'bok', 'yarrak', 'fahişe', 'pezevenk', 'sürtük', 'kahpe', 'şerefsiz', 'yavşak', 'puşt', 'siktir', 'allahını', 'annesini', 'am', 'amlar', 'amları',
  // Common English profanity
  'fuck', 'shit', 'bitch', 'asshole', 'damn', 'bastard', 'whore', 'slut', 'cunt', 'dick', 'cock', 'pussy', 'motherfucker'
];

const whitelist = [
  'sikke', 'sikinti', 'klasik', 'fizik', 'müzik', 'aşık', 'işik'
];

export const containsProfanity = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;

  const lowerText = text.toLowerCase()
    .replace(/[^\wığüşöçĞÜŞÖÇİ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Check whitelist first
  const isWhitelisted = whitelist.some(word => lowerText.includes(word.toLowerCase()));
  if (isWhitelisted) return false;

  // Check for banned words
  return bannedWords.some(bannedWord => {
    const lowerBanned = bannedWord.toLowerCase();
    const wordBoundaryRegex = new RegExp(`\\b${lowerBanned}\\b`, 'i');
    return wordBoundaryRegex.test(lowerText) || lowerText.includes(lowerBanned);
  });
};

export const getProfanityMessage = (): string => {
  return 'İsim uygunsuz kelimeler içeriyor. Lütfen daha uygun bir isim seçin.';
};