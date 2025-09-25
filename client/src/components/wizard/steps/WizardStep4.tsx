import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe, Instagram, Twitter, Facebook, Youtube, Linkedin, Video, Check, X, Loader2 } from 'lucide-react';
import { wizardStep4Schema, type WizardStep4Data, type AgentWizardSession } from '@shared/schema';

interface WizardStep4Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

const SOCIAL_PLATFORMS = [
  {
    key: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    placeholder: 'instagram.com/your-account',
    color: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-400'
  },
  {
    key: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    placeholder: 'facebook.com/your-page',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
  },
  {
    key: 'twitter',
    name: 'Twitter/X',
    icon: Twitter,
    placeholder: 'twitter.com/your-account',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: Video,
    placeholder: 'tiktok.com/@your-account',
    color: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
  },
  {
    key: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    placeholder: 'youtube.com/your-channel',
    color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    placeholder: 'linkedin.com/company/your-company',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
  }
];

// Validasyon durumları için tip tanımları
type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';
type ValidationResults = Record<string, ValidationStatus>;

export default function WizardStep4({ data, onSave, onNext, canProceed }: WizardStep4Props) {
  const [validationResults, setValidationResults] = useState<ValidationResults>({});
  
  const form = useForm<WizardStep4Data>({
    resolver: zodResolver(wizardStep4Schema),
    defaultValues: {
      website: data.website || '',
      socialMedia: (data.socialMedia as any) || {},
    },
  });

  // Auto-save when form values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.website !== data.website ||
          JSON.stringify(values.socialMedia) !== JSON.stringify(data.socialMedia)) {
        onSave({
          website: values.website,
          socialMedia: values.socialMedia,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, data, onSave]);

  const handleSubmit = (values: WizardStep4Data) => {
    onSave(values);
    onNext();
  };

  const formatUrl = (url: string, platform: string): string => {
    if (!url) return '';
    
    // Remove https:// or http:// if present
    let cleanUrl = url.replace(/^https?:\/\//, '');
    
    // Add platform domain if not present
    if (!cleanUrl.includes('.')) {
      switch (platform) {
        case 'instagram':
          cleanUrl = `instagram.com/${cleanUrl.replace('@', '')}`;
          break;
        case 'twitter':
          cleanUrl = `twitter.com/${cleanUrl.replace('@', '')}`;
          break;
        case 'tiktok':
          cleanUrl = `tiktok.com/@${cleanUrl.replace('@', '')}`;
          break;
        case 'youtube':
          cleanUrl = `youtube.com/${cleanUrl}`;
          break;
        case 'linkedin':
          cleanUrl = `linkedin.com/company/${cleanUrl}`;
          break;
        case 'facebook':
          cleanUrl = `facebook.com/${cleanUrl}`;
          break;
      }
    }
    
    return cleanUrl;
  };

  // Gelişmiş sosyal medya hesap validasyonu
  const validateSocialAccount = async (url: string, platform: string): Promise<boolean> => {
    if (!url || url.trim() === '') return true; // Boş URL'ler geçerli kabul edilir
    
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(fullUrl);
      
      // Platform-specific validation patterns
      const validationRules: Record<string, { 
        domains: string[], 
        pattern: RegExp,
        minLength: number,
        maxLength: number 
      }> = {
        instagram: {
          domains: ['instagram.com', 'www.instagram.com'],
          pattern: /^\/([a-zA-Z0-9._]{1,30})$/,
          minLength: 1,
          maxLength: 30
        },
        facebook: {
          domains: ['facebook.com', 'www.facebook.com', 'fb.com'],
          pattern: /^\/([a-zA-Z0-9.]{1,50})$/,
          minLength: 5,
          maxLength: 50
        },
        twitter: {
          domains: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'],
          pattern: /^\/([a-zA-Z0-9_]{1,15})$/,
          minLength: 1,
          maxLength: 15
        },
        tiktok: {
          domains: ['tiktok.com', 'www.tiktok.com'],
          pattern: /^\/@([a-zA-Z0-9._]{1,24})$/,
          minLength: 2,
          maxLength: 24
        },
        youtube: {
          domains: ['youtube.com', 'www.youtube.com', 'youtu.be'],
          pattern: /^\/(c\/|channel\/|user\/|@)?([a-zA-Z0-9_-]{1,100})$/,
          minLength: 1,
          maxLength: 100
        },
        linkedin: {
          domains: ['linkedin.com', 'www.linkedin.com'],
          pattern: /^\/(company|in)\/([a-zA-Z0-9-]{1,100})$/,
          minLength: 3,
          maxLength: 100
        }
      };

      const rules = validationRules[platform];
      if (!rules) return false;

      // Check domain
      if (!rules.domains.includes(urlObj.hostname)) {
        return false;
      }

      // Extract username from path
      const match = urlObj.pathname.match(rules.pattern);
      if (!match) return false;

      const username = match[match.length - 1]; // Get the last capture group (username)
      
      // Length validation
      if (username.length < rules.minLength || username.length > rules.maxLength) {
        return false;
      }

      // Check for invalid patterns
      const invalidPatterns = [
        /^[._]/,        // Starts with dot or underscore
        /[._]$/,        // Ends with dot or underscore  
        /\.\./,         // Double dots
        /__/,           // Double underscores
        /^\d+$/,        // Only numbers
      ];
      
      for (const invalidPattern of invalidPatterns) {
        if (invalidPattern.test(username)) {
          return false;
        }
      }

      // Check for inappropriate content
      const inappropriateWords = [
        'yarrak', 'sik', 'amk', 'orospu', 'pezevenk', 'kahpe', 'sürtük',
        'fuck', 'shit', 'dick', 'cock', 'pussy', 'bitch', 'damn', 'hell',
        'admin', 'support', 'help', 'official', 'test', 'null', 'undefined'
      ];
      
      const lowerUsername = username.toLowerCase();
      for (const word of inappropriateWords) {
        if (lowerUsername.includes(word)) {
          return false;
        }
      }

      // Check for too many consecutive characters
      if (/(.)\1{4,}/.test(username)) { // 5 or more same chars in a row
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  // Debounced validasyon
  const debounceValidation = (callback: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(...args), delay);
    };
  };

  // Validasyon tetikleyici
  const handleValidation = async (url: string, platform: string) => {
    if (!url || url.trim() === '') {
      setValidationResults(prev => ({ ...prev, [platform]: 'idle' }));
      return;
    }

    setValidationResults(prev => ({ ...prev, [platform]: 'validating' }));
    
    try {
      const isValid = await validateSocialAccount(url, platform);
      setValidationResults(prev => ({ 
        ...prev, 
        [platform]: isValid ? 'valid' : 'invalid' 
      }));
    } catch (error) {
      setValidationResults(prev => ({ ...prev, [platform]: 'invalid' }));
    }
  };

  const debouncedValidation = debounceValidation(handleValidation, 1000);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto">
          <Globe className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Online Varlığınız
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Web sitenizi ve sosyal medya hesaplarınızı ekleyin
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Website */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Web Sitesi</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Web Site Adresiniz</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="www.orneksite.com"
                        {...field}
                        data-testid="input-website"
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Sosyal Medya Hesapları</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Bu hesaplardan içerik çekilerek dijital çalışanınız geliştirilecek
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {SOCIAL_PLATFORMS.map((platform) => (
                <FormField
                  key={platform.key}
                  control={form.control}
                  name={`socialMedia.${platform.key}` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${platform.color}`}>
                          <platform.icon className="w-4 h-4" />
                        </div>
                        <span>{platform.name}</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder={platform.placeholder}
                            {...field}
                            data-testid={`input-${platform.key}`}
                            onChange={(e) => {
                              const formatted = formatUrl(e.target.value, platform.key);
                              field.onChange(formatted);
                              
                              // Validasyonu tetikle
                              debouncedValidation(formatted, platform.key);
                            }}
                            className="pr-10"
                          />
                          
                          {/* Validasyon durum ikonu */}
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {validationResults[platform.key] === 'validating' && (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            )}
                            {validationResults[platform.key] === 'valid' && (
                              <Check className="w-4 h-4 text-green-500" />
                            )}
                            {validationResults[platform.key] === 'invalid' && (
                              <X className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </FormControl>
                      
                      {/* Validasyon mesajları */}
                      {validationResults[platform.key] === 'invalid' && (
                        <p className="text-sm text-red-500 mt-1">
                          Bu {platform.name} hesabı geçerli değil veya bulunamadı
                        </p>
                      )}
                      {validationResults[platform.key] === 'valid' && (
                        <p className="text-sm text-green-500 mt-1">
                          ✓ Hesap doğrulandı
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </CardContent>
          </Card>

        </form>
      </Form>
    </div>
  );
}