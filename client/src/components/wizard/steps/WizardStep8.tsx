import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { User, UserCheck, Sparkles } from 'lucide-react';
import { wizardStep8Schema, type WizardStep8Data, type AgentWizardSession } from '@shared/schema';

interface WizardStep8Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

export default function WizardStep8({ data, onSave, onNext, canProceed }: WizardStep8Props) {
  const form = useForm<WizardStep8Data>({
    resolver: zodResolver(wizardStep8Schema),
    defaultValues: {
      employeeName: data.employeeName || '',
      employeeRole: data.employeeRole || '',
    },
  });

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.employeeName !== data.employeeName || values.employeeRole !== data.employeeRole) {
        onSave({
          employeeName: values.employeeName,
          employeeRole: values.employeeRole,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, data, onSave]);

  const handleSubmit = (values: WizardStep8Data) => {
    onSave(values);
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto">
          <UserCheck className="w-8 h-8 text-teal-600 dark:text-teal-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dijital Çalışan Profili
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Dijital çalışanınızın adını ve görevini belirleyin
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Çalışan Bilgileri</span>
                <span className="text-red-500 text-sm">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="employeeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Dijital Çalışan Adı <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Örn: Ayşe, Mehmet, Elif"
                        {...field}
                        data-testid="input-employee-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employeeRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Görev Tanımı <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Bu dijital çalışandan ne yapmasını bekliyorsunuz? Detaylıca açıklayın:

Örnek:
- Müşteri sorularını yanıtlamak
- Randevu almalarına yardımcı olmak
- Ürün/hizmet bilgileri vermek
- Fiyat bilgilerini paylaşmak
- Şikayetleri dinlemek ve çözüm önerileri sunmak
- Gerektiğinde gerçek kişiye yönlendirmek`}
                        className="min-h-[150px]"
                        {...field}
                        data-testid="textarea-employee-role"
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
              data-testid="button-optimize-role"
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