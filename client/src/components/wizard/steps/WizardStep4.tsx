import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe, Instagram, Twitter, Facebook, Youtube, Linkedin, Video } from 'lucide-react';
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

export default function WizardStep4({ data, onSave, onNext, canProceed }: WizardStep4Props) {
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

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-full">
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
                        <Input
                          placeholder={platform.placeholder}
                          {...field}
                          data-testid={`input-${platform.key}`}
                          onChange={(e) => {
                            const formatted = formatUrl(e.target.value, platform.key);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="min-w-32"
              data-testid="button-next-step4"
            >
              Devam Et
            </Button>
          </div>
        </form>
      </Form>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          💡 İpucu
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Sosyal medya hesaplarınızdaki içerikler analiz edilerek dijital çalışanınızın
          daha kişiselleştirilmiş yanıtlar vermesi sağlanır. Bu adım isteğe bağlıdır.
        </p>
      </div>
      </div>
    </div>
  );
}