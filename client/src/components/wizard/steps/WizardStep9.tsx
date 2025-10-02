import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Users, Briefcase, MessageCircle, Settings } from 'lucide-react';
import { wizardStep9Schema, type WizardStep9Data, type AgentWizardSession } from '@shared/schema';

interface WizardStep9Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

const PERSONALITY_PRESETS = [
  {
    value: 'sevecen',
    label: 'Sevecen',
    icon: Heart,
    description: 'Sıcak ve anlayışlı',
    color: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900 dark:text-pink-300'
  },
  {
    value: 'profesyonel',
    label: 'Profesyonel',
    icon: Briefcase,
    description: 'Resmi ve ciddi',
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300'
  },
  {
    value: 'arkadas_canlisi',
    label: 'Arkadaş Canlısı',
    icon: Users,
    description: 'Samimi ve yakın',
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300'
  },
  {
    value: 'konuskan',
    label: 'Konuşkan',
    icon: MessageCircle,
    description: 'Detaylı ve açıklayıcı',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300'
  },
  {
    value: 'ozel',
    label: 'Özel',
    icon: Settings,
    description: 'Kendi tarzınızı oluşturun',
    color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-300'
  }
];

export default function WizardStep9({ data, onSave, onNext, canProceed }: WizardStep9Props) {
  const defaultPersonality = {
    tone: 'profesyonel' as const,
    formality: 3,
    creativity: 0.7,
    responseLength: 'orta' as const,
    useEmojis: false,
    customInstructions: ''
  };

  const form = useForm<WizardStep9Data>({
    resolver: zodResolver(wizardStep9Schema),
    defaultValues: {
      personality: (data.personality as any) || defaultPersonality,
    },
  });

  const { watch, setValue } = form;
  const watchedPersonality = watch('personality');

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (JSON.stringify(values.personality) !== JSON.stringify(data.personality)) {
        onSave({
          personality: values.personality,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, data, onSave]);

  const selectPersonality = (tone: string) => {
    setValue('personality.tone', tone as any);
  };

  const handleSubmit = (values: WizardStep9Data) => {
    onSave(values);
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Kişilik & Konuşma Tarzı
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Dijital çalışanınızın kişiliğini ve konuşma tarzını belirleyin
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Personality Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Kişilik Seçimi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {PERSONALITY_PRESETS.map((preset) => (
                  <div
                    key={preset.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all
                      ${watchedPersonality.tone === preset.value 
                        ? preset.color 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    onClick={() => selectPersonality(preset.value)}
                    data-testid={`personality-${preset.value}`}
                  >
                    <div className="flex items-center space-x-3">
                      <preset.icon className="w-5 h-5" />
                      <div className="flex-1">
                        <div className="font-medium">{preset.label}</div>
                        <div className="text-sm opacity-80">{preset.description}</div>
                      </div>
                      {watchedPersonality.tone === preset.value && (
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings - Only show when "Özel" is selected */}
          {watchedPersonality.tone === 'ozel' && (
            <Card>
              <CardHeader>
                <CardTitle>Gelişmiş Ayarlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="personality.formality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-between">
                      <span>Formalite Düzeyi</span>
                      <Badge variant="outline">
                        {field.value === 1 && 'Çok Samimi'}
                        {field.value === 2 && 'Samimi'}
                        {field.value === 3 && 'Dengeli'}
                        {field.value === 4 && 'Resmi'}
                        {field.value === 5 && 'Çok Resmi'}
                      </Badge>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                        data-testid="slider-formality"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personality.creativity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-between">
                      <span>Yaratıcılık Düzeyi</span>
                      <Badge variant="outline">
                        {field.value < 0.3 && 'Tutarlı'}
                        {field.value >= 0.3 && field.value < 0.7 && 'Dengeli'}
                        {field.value >= 0.7 && field.value < 1.2 && 'Yaratıcı'}
                        {field.value >= 1.2 && 'Çok Yaratıcı'}
                      </Badge>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                        data-testid="slider-creativity"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personality.responseLength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Yanıt Uzunluğu</FormLabel>
                    <div className="flex space-x-2">
                      {['kisa', 'orta', 'uzun'].map((length) => (
                        <Button
                          key={length}
                          type="button"
                          variant={field.value === length ? "default" : "outline"}
                          onClick={() => field.onChange(length)}
                          data-testid={`button-length-${length}`}
                        >
                          {length === 'kisa' && 'Kısa'}
                          {length === 'orta' && 'Orta'}
                          {length === 'uzun' && 'Uzun'}
                        </Button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personality.useEmojis"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base font-medium">
                        Emoji Kullanımı
                      </FormLabel>
                      <p className="text-sm text-gray-500">
                        Mesajlarda emoji kullanılsın mı?
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-emojis"
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="personality.customInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Özel Talimatlar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Dijital çalışanınızın nasıl davranmasını istediğinizi açıklayın..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="textarea-custom-instructions"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              </CardContent>
            </Card>
          )}

        </form>
      </Form>
    </div>
  );
}