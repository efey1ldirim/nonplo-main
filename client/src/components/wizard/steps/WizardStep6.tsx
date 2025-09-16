import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Package, Sparkles } from 'lucide-react';
import { wizardStep6Schema, type WizardStep6Data, type AgentWizardSession } from '@shared/schema';

interface WizardStep6Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

export default function WizardStep6({ data, onSave, onNext, canProceed }: WizardStep6Props) {
  const form = useForm<WizardStep6Data>({
    resolver: zodResolver(wizardStep6Schema),
    defaultValues: {
      productServiceRaw: data.productServiceRaw || '',
    },
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.productServiceRaw !== data.productServiceRaw) {
        onSave({
          productServiceRaw: values.productServiceRaw,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, data, onSave]);

  const handleSubmit = (values: WizardStep6Data) => {
    onSave(values);
    onNext();
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 min-h-full">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto">
          <Package className="w-8 h-8 text-orange-600 dark:text-orange-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Ürün/Hizmet Bilgileri
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          İşletmenizin sunduğu ürün ve hizmetleri detaylıca açıklayın
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Ürün/Hizmet Açıklaması</span>
                <span className="text-red-500 text-sm">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="productServiceRaw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Ne sunuyorsunuz? Ürün/hizmetlerinizi detaylıca anlatın
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Örnek:
                        
Kuaförümüzde şu hizmetleri sunuyoruz:
- Kadın saç kesimi: 150-300 TL
- Erkek saç kesimi: 80-120 TL
- Saç boyama: 200-500 TL
- Kaynakla uzatma: 1000-2000 TL
- Makyaj: 200-400 TL
- Gelin paketi: 1500-3000 TL

Özel günleriniz için randevu almanızı öneriyoruz.
Kaliteli ürünler kullanarak saçlarınızı sağlıklı tutmaya özen gösteriyoruz.`}
                        className="min-h-[250px]"
                        {...field}
                        data-testid="textarea-product-service"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="button-optimize-product"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI ile Optimize Et</span>
            </Button>
            <Button
              type="submit"
              disabled={!canProceed}
              data-testid="button-next-step6"
            >
              Devam Et
            </Button>
          </div>
        </form>
      </Form>

      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">⚠️ Zorunlu Alan</h4>
        <p className="text-sm text-red-800 dark:text-red-200">
          Bu bilgiler dijital çalışanınızın müşterilerinize doğru bilgi verebilmesi için çok önemlidir.
        </p>
      </div>
      </div>
    </div>
  );
}