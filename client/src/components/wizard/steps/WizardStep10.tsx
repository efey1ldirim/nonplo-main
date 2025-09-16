import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar, Mail, Search, FileSearch, Package, CreditCard, User } from 'lucide-react';
import { wizardStep10Schema, type WizardStep10Data, type AgentWizardSession } from '@shared/schema';

interface WizardStep10Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

const TOOLS = [
  {
    key: 'googleCalendar',
    name: 'Google Takvim',
    description: 'Randevu oluşturma ve takvim yönetimi',
    icon: Calendar,
    color: 'text-blue-600',
    category: 'Randevu & Planlama'
  },
  {
    key: 'gmail',
    name: 'Gmail',
    description: 'E-posta gönderme ve okuma',
    icon: Mail,
    color: 'text-red-600',
    category: 'İletişim'
  },
  {
    key: 'webSearch',
    name: 'Web Arama',
    description: 'Güncel bilgi arama ve araştırma',
    icon: Search,
    color: 'text-green-600',
    category: 'Bilgi & Araştırma'
  },
  {
    key: 'fileSearch',
    name: 'Dosya Arama',
    description: 'Yüklenen dosyalardan bilgi arama',
    icon: FileSearch,
    color: 'text-purple-600',
    category: 'Bilgi & Araştırma'
  },
  {
    key: 'productCatalog',
    name: 'Ürün Kataloğu',
    description: 'Ürün/hizmet bilgileri ve fiyatlandırma',
    icon: Package,
    color: 'text-orange-600',
    category: 'Satış & Pazarlama'
  },
  {
    key: 'paymentLinks',
    name: 'Ödeme Linkleri',
    description: 'Ödemeli linkler oluşturma',
    icon: CreditCard,
    color: 'text-indigo-600',
    category: 'Satış & Pazarlama'
  },
  {
    key: 'humanHandoff',
    name: 'İnsan Devresi',
    description: 'Gerektiğinde gerçek kişiye yönlendirme',
    icon: User,
    color: 'text-gray-600',
    category: 'Destek & Yönlendirme'
  }
];

const CATEGORIES = [
  'Randevu & Planlama',
  'İletişim',
  'Bilgi & Araştırma',
  'Satış & Pazarlama',
  'Destek & Yönlendirme'
];

export default function WizardStep10({ data, onSave, onNext, canProceed }: WizardStep10Props) {
  const form = useForm<WizardStep10Data>({
    resolver: zodResolver(wizardStep10Schema),
    defaultValues: {
      selectedTools: (data.selectedTools as any) || {
        googleCalendar: false,
        gmail: false,
        webSearch: true, // Default enabled
        fileSearch: true, // Default enabled
        productCatalog: false,
        paymentLinks: false,
        humanHandoff: true // Default enabled
      },
    },
  });

  const { watch } = form;
  const watchedTools = watch('selectedTools');

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (JSON.stringify(values.selectedTools) !== JSON.stringify(data.selectedTools)) {
        onSave({
          selectedTools: values.selectedTools,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, data, onSave]);

  const handleSubmit = (values: WizardStep10Data) => {
    onSave(values);
    onNext();
  };

  const getSelectedToolsCount = () => {
    return Object.values(watchedTools || {}).filter(Boolean).length;
  };

  const getToolsByCategory = (category: string) => {
    return TOOLS.filter(tool => tool.category === category);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center mx-auto">
          <Search className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Araçlar & Yetenekler
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Dijital çalışanınızın hangi araçları kullanabileceğini seçin
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Seçilen Araç Sayısı
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Daha fazla araç = Daha güçlü dijital çalışan
            </p>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {getSelectedToolsCount()}/{TOOLS.length}
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {CATEGORIES.map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {getToolsByCategory(category).map((tool) => (
                    <FormField
                      key={tool.key}
                      control={form.control}
                      name={`selectedTools.${tool.key}` as any}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className={`w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${tool.color}`}>
                                <tool.icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {tool.name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  {tool.description}
                                </div>
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid={`switch-tool-${tool.key}`}
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button
              type="submit"
              className="min-w-32"
              data-testid="button-next-step10"
            >
              Onaya Git
            </Button>
          </div>
        </form>
      </Form>

      <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">⚠️ Önemli Notlar</h4>
        <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
          <li>• Google Takvim ve Gmail için ayrıca hesap bağlantısı yapmanız gerekecek</li>
          <li>• Ödeme linkleri için Stripe entegrasyonu kurulmalı</li>
          <li>• Seçilen araçlar sonradan da değiştirilebilir</li>
        </ul>
      </div>
    </div>
  );
}