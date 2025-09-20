import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Clock } from 'lucide-react';
import { wizardStep2Schema, type WizardStep2Data, type AgentWizardSession } from '@shared/schema';

interface WizardStep2Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

// Address search service via backend proxy
const addressSearchService = {
  searchPlaces: async (query: string) => {
    try {
      // Use backend proxy to avoid CORS issues
      const response = await fetch('/api/address/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const result = await response.json();
      console.log('🔍 Address search response:', result);
      
      if (result.success && Array.isArray(result.data)) {
        console.log('✅ Found addresses:', result.data.length);
        return result.data;
      } else {
        console.warn('⚠️ No data in response:', result);
        return [];
      }
    } catch (error) {
      console.error('Address search error:', error);
      return [];
    }
  }
};

export default function WizardStep2({ data, onSave, onNext, canProceed }: WizardStep2Props) {
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(data.addressData || null);

  const form = useForm<WizardStep2Data>({
    resolver: zodResolver(wizardStep2Schema),
    defaultValues: {
      address: data.address || '',
      addressData: data.addressData || undefined,
      timezone: data.timezone || '',
    },
  });

  const { watch, setValue } = form;

  // Auto-save when form values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.address !== data.address || 
          values.timezone !== data.timezone ||
          JSON.stringify(values.addressData) !== JSON.stringify(data.addressData)) {
        onSave({
          address: values.address,
          addressData: values.addressData,
          timezone: values.timezone,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, data, onSave]);

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await addressSearchService.searchPlaces(query);
      setAddressSuggestions(results);
    } catch (error) {
      console.error('Address search error:', error);
      setAddressSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const selectAddress = (place: any) => {
    setSelectedPlace(place);
    setSearchQuery(place.formattedAddress);
    setValue('address', place.formattedAddress);
    setValue('addressData', place);
    
    // Auto-detect timezone based on coordinates (mock implementation)
    const timezone = getTimezoneFromCoords(place.latitude, place.longitude);
    setValue('timezone', timezone);
    
    setAddressSuggestions([]);
  };

  const getTimezoneFromCoords = (lat: number, lng: number): string => {
    // Simple timezone detection for Turkey
    // Turkey is entirely in Europe/Istanbul timezone (UTC+3)
    if (lat >= 35.8 && lat <= 42.1 && lng >= 25.7 && lng <= 44.8) {
      return 'Europe/Istanbul';
    }
    return 'Europe/Istanbul'; // Default to Turkey timezone
  };

  const handleSubmit = (values: WizardStep2Data) => {
    onSave(values);
    onNext();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
          <MapPin className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Konum Bilginiz
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          İşletmenizin adres bilgisini belirtin (isteğe bağlı)
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Adres Bilgisi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İşletme Adresi</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Adres veya konum arayın..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            searchAddress(e.target.value);
                            if (!e.target.value) {
                              setSelectedPlace(null);
                              setValue('address', '');
                              setValue('addressData', undefined);
                              setValue('timezone', '');
                            }
                          }}
                          data-testid="input-address-search"
                          className="pr-10"
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    
                    {addressSuggestions.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 max-h-48 overflow-y-auto mt-2">
                        {addressSuggestions.map((place, index) => (
                          <div
                            key={place.placeId}
                            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                            onClick={() => selectAddress(place)}
                            data-testid={`address-suggestion-${index}`}
                          >
                            <div className="flex items-start space-x-3">
                              <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {place.formattedAddress}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {place.components.city}, {place.components.country}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />

              {selectedPlace && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Navigation className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 dark:text-green-100">
                        Seçilen Konum
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        {(selectedPlace as any).formattedAddress}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-green-700 dark:text-green-300">
                        <span>Enlem: {(selectedPlace as any).latitude?.toFixed(4)}</span>
                        <span>Boylam: {(selectedPlace as any).longitude?.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {form.watch('timezone') && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Saat Dilimi: {form.watch('timezone')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </form>
      </Form>
    </div>
  );
}