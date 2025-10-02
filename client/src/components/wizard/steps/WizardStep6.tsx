import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Package, Sparkles, Loader2 } from 'lucide-react';
import { wizardStep6Schema, type WizardStep6Data, type AgentWizardSession } from '@shared/schema';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WizardStep6Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

export default function WizardStep6({ data, onSave, onNext, canProceed }: WizardStep6Props) {
  const { toast } = useToast();
  const form = useForm<WizardStep6Data>({
    resolver: zodResolver(wizardStep6Schema),
    defaultValues: {
      productServiceRaw: data.productServiceRaw || '',
    },
  });

  const handleSubmit = (values: WizardStep6Data) => {
    onSave(values);
    onNext();
  };

  const optimizeMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('/api/wizard/optimize-text', {
        method: 'POST',
        body: JSON.stringify({ text, fieldType: 'product' }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.optimizedText) {
        form.setValue('productServiceRaw', data.optimizedText);
        onSave({ productServiceRaw: data.optimizedText });
        toast({
          title: 'Başarılı!',
          description: 'Ürün/hizmet açıklamanız AI ile optimize edildi.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Hata',
        description: error.message || 'Optimizasyon sırasında bir hata oluştu.',
        variant: 'destructive',
      });
    }
  });

  const handleOptimize = () => {
    const currentText = form.getValues('productServiceRaw');
    if (!currentText || currentText.trim().length === 0) {
      toast({
        title: 'Uyarı',
        description: 'Lütfen önce bir metin girin.',
        variant: 'destructive',
      });
      return;
    }
    optimizeMutation.mutate(currentText);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
              onClick={handleOptimize}
              disabled={optimizeMutation.isPending}
            >
              {optimizeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Optimize ediliyor...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI ile Optimize Et</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}