// Profanity filter for Turkish content - now reads from yasaklikelimeler.txt
let cachedBannedWords: string[] | null = null;

const loadBannedWordsFromFile = (): string[] => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(process.cwd(), 'yasaklikelimeler.txt');
    
    if (!fs.existsSync(filePath)) {
      console.warn('yasaklikelimeler.txt not found, using default words');
      return getDefaultBannedWords();
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const words = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(word => word.toLowerCase());
    
    return words.length > 0 ? words : getDefaultBannedWords();
  } catch (error) {
    console.error('Error reading yasaklikelimeler.txt:', error);
    return getDefaultBannedWords();
  }
};

const getDefaultBannedWords = (): string[] => [
  // Common Turkish profanity and inappropriate words
  'amk', 'amına', 'amınakoyayım', 'amq', 'aq', 'anasını', 'orospu', 'oç', 'götüne', 'götüm', 'sik', 'sikmek', 'sikeyim', 'sikimi', 'amcık', 'piç', 'ibne', 'göt', 'bok', 'yarrak', 'dalyarak', 'gerizekalı', 'salak', 'aptal', 'gerzek', 'döl', 'fahişe', 'pezevenk', 'sürtük', 'kahpe', 'kevaşe', 'şerefsiz', 'namussuz', 'yavşak', 'puşt', 'amcığa', 'sikerim', 'siktirgit', 'siktir', 'siktimin', 'allahını', 'annesini', 'babasını', 'avradını', 'am', 'amlar', 'amları',
  // Common English profanity
  'fuck', 'shit', 'bitch', 'asshole', 'damn', 'hell', 'bastard', 'crap', 'piss', 'whore', 'slut', 'cunt', 'dick', 'cock', 'pussy', 'fag', 'nigger', 'motherfucker', 'bullshit'
];

const getBannedWords = (): string[] => {
  if (cachedBannedWords === null) {
    cachedBannedWords = loadBannedWordsFromFile();
  }
  return cachedBannedWords;
};

// Function to refresh banned words cache (call when file is updated)
export const refreshBannedWords = (): void => {
  cachedBannedWords = null;
};

// Words that might contain banned words but are legitimate
const whitelist = [
  'sikke', 'sikinti', 'sikleti', 'sikintos', 'klasik', 'fizik', 'müzik', 'aşık', 'işik', 'başık'
];

export const containsProfanity = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;

  const lowerText = text.toLowerCase()
    .replace(/[^\wığüşöçĞÜŞÖÇİ\s]/g, '') // Remove special characters but keep Turkish chars
    .replace(/\s+/g, ' ')
    .trim();

  // Check if any whitelisted word is present first
  const isWhitelisted = whitelist.some(word => lowerText.includes(word.toLowerCase()));
  if (isWhitelisted) return false;

  // Check for banned words
  const bannedWords = getBannedWords();
  return bannedWords.some(bannedWord => {
    const lowerBanned = bannedWord.toLowerCase();
    
    // Check exact word match (with word boundaries)
    const wordBoundaryRegex = new RegExp(`\\b${lowerBanned}\\b`, 'i');
    if (wordBoundaryRegex.test(lowerText)) return true;
    
    // Check for common letter substitutions
    const substitutions: { [key: string]: string[] } = {
      'a': ['@', '4'],
      'e': ['3'],
      'i': ['1', '!'],
      'o': ['0'],
      's': ['$', '5'],
      'g': ['9'],
      't': ['7']
    };
    
    let modifiedBanned = lowerBanned;
    for (const [letter, subs] of Object.entries(substitutions)) {
      for (const sub of subs) {
        modifiedBanned = modifiedBanned.replace(new RegExp(letter, 'g'), `[${letter}${sub}]`);
      }
    }
    
    const substitutionRegex = new RegExp(modifiedBanned, 'i');
    return substitutionRegex.test(lowerText);
  });
};

export const getProfanityMessage = (): string => {
  return 'İsim uygunsuz kelimeler içeriyor. Lütfen daha uygun bir isim seçin.';
};

export const sanitizeBusinessName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  
  // Basic sanitization - remove harmful characters but keep Turkish characters
  return name
    .replace(/[<>:"\\|?*]/g, '') // Remove file system invalid chars
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64); // Limit length
};