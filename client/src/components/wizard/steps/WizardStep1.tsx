import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Briefcase, Search } from 'lucide-react';
import { wizardStep1Schema, type WizardStep1Data, type AgentWizardSession } from '@shared/schema';

interface WizardStep1Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

// Popular industries for quick selection
const POPULAR_INDUSTRIES = [
  'Restoran & Cafe',
  'Kuaför & Güzellik',
  'Eczane',
  'Diş Kliniği',
  'Veteriner Hekim',
  'Emlak',
  'Otel & Turizm',
  'Fitness & Spor',
  'Eğitim & Kurs',
  'Hukuk & Danışmanlık',
  'Muhasebe',
  'Teknoloji & IT',
  'E-ticaret',
  'Temizlik Hizmetleri',
  'Nakliyat & Lojistik',
  'İnşaat & Mimarlık',
  'Sağlık & Medikal',
  'Otomotiv',
  'Gıda & İçecek',
  'Moda & Tekstil'
];

export default function WizardStep1({ data, onSave, onNext, canProceed }: WizardStep1Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState(data.industry || '');

  const form = useForm<WizardStep1Data>({
    resolver: zodResolver(wizardStep1Schema),
    defaultValues: {
      businessName: data.businessName || '',
      industry: data.industry || '',
    },
  });

  const { watch, setValue } = form;
  const watchedValues = watch();

  // Auto-save when form values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.businessName !== data.businessName || values.industry !== data.industry) {
        onSave({
          businessName: values.businessName,
          industry: values.industry,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, data, onSave]);

  const filteredIndustries = POPULAR_INDUSTRIES.filter(industry =>
    industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectIndustry = (industry: string) => {
    setSelectedIndustry(industry);
    setValue('industry', industry);
    setSearchTerm('');
  };

  const handleSubmit = (values: WizardStep1Data) => {
    onSave(values);
    onNext();
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-full">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          İşletmenizi Tanıyalım
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          İşletme adınızı ve faaliyet gösterdiğiniz sektörü belirtin
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>İşletme Adı</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      İşletme Adınız <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: Güzel Saç Kuaförü, Lezzet Restaurant"
                        {...field}
                        data-testid="input-business-name"
                        className="text-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5" />
                <span>Sektör Seçimi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Faaliyet Gösterdiğiniz Sektör <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            placeholder="Sektör ara veya aşağıdan seç..."
                            value={searchTerm || selectedIndustry}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              if (e.target.value.length > 0) {
                                setSelectedIndustry('');
                                setValue('industry', e.target.value);
                              }
                            }}
                            className="pl-10"
                            data-testid="input-industry-search"
                          />
                        </div>
                        
                        {!searchTerm && !selectedIndustry && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                              Popüler sektörler:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {POPULAR_INDUSTRIES.slice(0, 12).map((industry) => (
                                <Badge
                                  key={industry}
                                  variant="outline"
                                  className="cursor-pointer hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900"
                                  onClick={() => selectIndustry(industry)}
                                  data-testid={`badge-industry-${industry.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                >
                                  {industry}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {searchTerm && filteredIndustries.length > 0 && (
                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 max-h-48 overflow-y-auto">
                            {filteredIndustries.map((industry) => (
                              <div
                                key={industry}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                                onClick={() => selectIndustry(industry)}
                                data-testid={`suggestion-${industry.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              >
                                {industry}
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedIndustry && (
                          <div className="flex items-center space-x-2">
                            <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Seçilen: {selectedIndustry}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedIndustry('');
                                setValue('industry', '');
                              }}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              Değiştir
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!canProceed}
              className="min-w-32"
              data-testid="button-next-step1"
            >
              Devam Et
            </Button>
          </div>
        </form>
      </Form>

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          💡 İpucu
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          İşletme adınız müşterilerinizin sizi tanıyacağı isimdir. 
          Sektör seçiminiz dijital çalışanınızın size özel yanıtlar verebilmesi için önemlidir.
        </p>
      </div>
      </div>
    </div>
  );
}