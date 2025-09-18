import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { HelpCircle, Sparkles } from 'lucide-react';
import { wizardStep5Schema, type WizardStep5Data, type AgentWizardSession } from '@shared/schema';

interface WizardStep5Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

export default function WizardStep5({ data, onSave, onNext }: WizardStep5Props) {
  const form = useForm<WizardStep5Data>({
    resolver: zodResolver(wizardStep5Schema),
    defaultValues: {
      faqRaw: data.faqRaw || '',
    },
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.faqRaw !== data.faqRaw) {
        onSave({
          faqRaw: values.faqRaw,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, data, onSave]);

  const handleSubmit = (values: WizardStep5Data) => {
    onSave(values);
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto">
          <HelpCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Sık Sorulan Sorular
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Müşterilerinizin sık sorduğu soruları ve cevaplarını ekleyin
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5" />
                <span>FAQ Bilgileri</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="faqRaw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sık Sorulan Sorular ve Cevapları</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Örnek format:

S: Randevu nasıl alabilirim?
C: Randevu almak için bizi arayabilir veya WhatsApp üzerinden mesaj gönderebilirsiniz.

S: Fiyatlarınız nedir?
C: Hizmet fiyatlarımız için lütfen bizimle iletişime geçin, size detaylı fiyat listesini gönderelim.

S: Çalışma saatleriniz nedir?
C: Pazartesi-Cuma 09:00-18:00, Cumartesi 10:00-17:00 saatleri arasında hizmet veriyoruz.`}
                        className="min-h-[200px]"
                        {...field}
                        data-testid="textarea-faq"
                      />
                    </FormControl>
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
              data-testid="button-optimize-faq"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI ile Optimize Et</span>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}