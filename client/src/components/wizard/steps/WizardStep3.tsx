import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Clock, Calendar, Sun, Moon } from 'lucide-react';
import { wizardStep3Schema, type WizardStep3Data, type AgentWizardSession } from '@shared/schema';

interface WizardStep3Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

const DAYS = [
  { key: 'monday', label: 'Pazartesi', short: 'Pzt' },
  { key: 'tuesday', label: 'Salı', short: 'Sal' },
  { key: 'wednesday', label: 'Çarşamba', short: 'Çar' },
  { key: 'thursday', label: 'Perşembe', short: 'Per' },
  { key: 'friday', label: 'Cuma', short: 'Cum' },
  { key: 'saturday', label: 'Cumartesi', short: 'Cmt' },
  { key: 'sunday', label: 'Pazar', short: 'Paz' }
];

const QUICK_PRESETS = [
  {
    name: '7/24 Açık',
    icon: Sun,
    hours: DAYS.reduce((acc, day) => ({
      ...acc,
      [day.key]: { open: '00:00', close: '23:59', closed: false }
    }), {}),
    holidays: { nationalHolidays: false, religiousHolidays: false, customHolidays: [] }
  },
  {
    name: 'Hafta İçi 9-18',
    icon: Clock,
    hours: DAYS.reduce((acc, day) => ({
      ...acc,
      [day.key]: day.key === 'saturday' || day.key === 'sunday' 
        ? { open: '09:00', close: '18:00', closed: true }
        : { open: '09:00', close: '18:00', closed: false }
    }), {}),
    holidays: { nationalHolidays: true, religiousHolidays: true, customHolidays: [] }
  },
  {
    name: 'Retail (9-21)',
    icon: Calendar,
    hours: DAYS.reduce((acc, day) => ({
      ...acc,
      [day.key]: { open: '09:00', close: '21:00', closed: false }
    }), {}),
    holidays: { nationalHolidays: true, religiousHolidays: true, customHolidays: [] }
  }
];

export default function WizardStep3({ data, onSave, onNext, canProceed }: WizardStep3Props) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const defaultHours = DAYS.reduce((acc, day) => ({
    ...acc,
    [day.key]: { open: '09:00', close: '18:00', closed: false }
  }), {});

  const form = useForm<WizardStep3Data>({
    resolver: zodResolver(wizardStep3Schema),
    defaultValues: {
      workingHours: (data.workingHours as any) || defaultHours,
      holidaysConfig: (data.holidaysConfig as any) || {
        nationalHolidays: true,
        religiousHolidays: true,
        customHolidays: []
      },
    },
  });

  // Auto-save when form values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (JSON.stringify(values.workingHours) !== JSON.stringify(data.workingHours) ||
          JSON.stringify(values.holidaysConfig) !== JSON.stringify(data.holidaysConfig)) {
        onSave({
          workingHours: values.workingHours,
          holidaysConfig: values.holidaysConfig,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, data, onSave]);

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setSelectedPreset(preset.name);
    form.setValue('workingHours', preset.hours);
    form.setValue('holidaysConfig', preset.holidays);
  };

  const handleSubmit = (values: WizardStep3Data) => {
    onSave(values);
    onNext();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Çalışma Saatleri
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          İşletmenizin açık olduğu saatleri ve tatil günlerini belirtin
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Quick Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Hızlı Ayarlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {QUICK_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant={selectedPreset === preset.name ? "default" : "outline"}
                    className="h-auto p-4 flex-col space-y-2"
                    onClick={() => applyPreset(preset)}
                    data-testid={`preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <preset.icon className="w-6 h-6" />
                    <span className="font-medium">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Haftalık Çalışma Saatleri</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DAYS.map((day) => (
                  <FormField
                    key={day.key}
                    control={form.control}
                    name={`workingHours.${day.key}` as any}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="w-20 font-medium">{day.label}</div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={!field.value?.closed}
                              onCheckedChange={(checked) => {
                                field.onChange({
                                  ...field.value,
                                  closed: !checked
                                });
                              }}
                              data-testid={`switch-${day.key}`}
                            />
                            <span className="text-sm text-gray-500">
                              {field.value?.closed ? 'Kapalı' : 'Açık'}
                            </span>
                          </div>
                          {!field.value?.closed && (
                            <div className="flex items-center space-x-2 ml-auto">
                              <Input
                                type="time"
                                value={field.value?.open || '09:00'}
                                onChange={(e) => field.onChange({
                                  ...field.value,
                                  open: e.target.value
                                })}
                                className="w-32"
                                data-testid={`time-open-${day.key}`}
                              />
                              <span>-</span>
                              <Input
                                type="time"
                                value={field.value?.close || '18:00'}
                                onChange={(e) => field.onChange({
                                  ...field.value,
                                  close: e.target.value
                                })}
                                className="w-32"
                                data-testid={`time-close-${day.key}`}
                              />
                            </div>
                          )}
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Holidays Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Tatil Günleri</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="holidaysConfig.nationalHolidays"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base font-medium">
                        Resmi Tatiller
                      </FormLabel>
                      <p className="text-sm text-gray-500">
                        Ulusal ve resmi bayramlarda kapalı
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-national-holidays"
                    />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="holidaysConfig.religiousHolidays"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base font-medium">
                        Dini Bayramlar
                      </FormLabel>
                      <p className="text-sm text-gray-500">
                        Ramazan ve Kurban Bayramlarında kapalı
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-religious-holidays"
                    />
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
              data-testid="button-next-step3"
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
          Çalışma saatleriniz dijital çalışanınızın müşterilerinize ne zaman yanıt verebileceğini belirler.
          Kapalı olduğunuz saatlerde otomatik mesajlar gönderilir.
        </p>
      </div>
    </div>
  );
}