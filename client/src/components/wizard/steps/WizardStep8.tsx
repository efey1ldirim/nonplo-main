import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { User, UserCheck, Sparkles, Loader2, Check, X } from 'lucide-react';
import { wizardStep8Schema, type WizardStep8Data, type AgentWizardSession } from '@shared/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WizardStep8Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

export default function WizardStep8({ data, onSave, onNext, canProceed }: WizardStep8Props) {
  const { toast } = useToast();
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  const form = useForm<WizardStep8Data>({
    resolver: zodResolver(wizardStep8Schema),
    defaultValues: {
      employeeName: data.employeeName || '',
      employeeRole: data.employeeRole || '',
    },
  });

  const { watch } = form;
  const watchedValues = watch();

  // Fetch forbidden words
  const { data: forbiddenWordsData } = useQuery({
    queryKey: ['/api/tools/forbidden-words'],
    staleTime: 5 * 60 * 1000,
  });

  const forbiddenWords: string[] = (forbiddenWordsData as any)?.words || [];

  // Validate employee name for forbidden words
  useEffect(() => {
    const employeeName = watchedValues.employeeName?.trim() || '';
    
    if (employeeName.length === 0) {
      setValidationStatus('idle');
      return;
    }

    if (employeeName.length < 2) {
      setValidationStatus('idle');
      return;
    }

    // Debounce validation
    const timer = setTimeout(() => {
      setValidationStatus('validating');
      
      // Check for forbidden words
      const lowerName = employeeName.toLowerCase();
      const hasForbiddenWord = forbiddenWords.some(word => 
        lowerName.includes(word.toLowerCase())
      );

      setTimeout(() => {
        if (hasForbiddenWord) {
          setValidationStatus('invalid');
        } else {
          setValidationStatus('valid');
        }
      }, 500);
    }, 800);

    return () => clearTimeout(timer);
  }, [watchedValues.employeeName, forbiddenWords]);

  const handleSubmit = (values: WizardStep8Data) => {
    onSave(values);
    onNext();
  };

  const optimizeMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('/api/wizard/optimize-text', {
        method: 'POST',
        body: JSON.stringify({ text, fieldType: 'role' }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.optimizedText) {
        form.setValue('employeeRole', data.optimizedText);
        onSave({ employeeRole: data.optimizedText });
        toast({
          title: 'Başarılı!',
          description: 'Görev tanımı AI ile optimize edildi.',
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
    const currentText = form.getValues('employeeRole');
    if (!currentText || currentText.trim().length === 0) {
      toast({
        title: 'Uyarı',
        description: 'Lütfen önce bir görev tanımı girin.',
        variant: 'destructive',
      });
      return;
    }
    optimizeMutation.mutate(currentText);
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
                      <div className="relative">
                        <Input
                          placeholder="Örn: Ayşe, Mehmet, Elif"
                          {...field}
                          data-testid="input-employee-name"
                          className="pr-10"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {validationStatus === 'validating' && (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                          )}
                          {validationStatus === 'valid' && (
                            <Check className="w-5 h-5 text-green-500" />
                          )}
                          {validationStatus === 'invalid' && (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </FormControl>
                    {validationStatus === 'invalid' && (
                      <p className="text-sm text-red-500 mt-2">
                        ⚠️ Çalışan adı uygun değil. Lütfen daha profesyonel bir isim seçin.
                      </p>
                    )}
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