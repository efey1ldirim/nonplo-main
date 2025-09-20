import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLoadScript, GoogleMap, Autocomplete, Marker } from '@react-google-maps/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin } from 'lucide-react';
import { wizardStep2Schema, type WizardStep2Data, type AgentWizardSession, type AddressData, type AddressComponents } from '@shared/schema';

interface WizardStep2Props {
  data: AgentWizardSession;
  onSave: (data: Partial<AgentWizardSession>) => void;
  onNext: () => void;
  canProceed: boolean;
}

// Google Maps configuration
const LIBRARIES: ("places")[] = ["places"];
const TURKEY_CENTER = { lat: 39.9334, lng: 32.8597 };
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '320px',
  borderRadius: '8px'
};

// Utility functions for Google Maps integration
const mapGooglePlaceToAddressData = (place: google.maps.places.PlaceResult): AddressData | null => {
  if (!place.place_id || !place.formatted_address || !place.geometry?.location) {
    return null;
  }

  const components: AddressComponents = {};
  
  // Parse Google's address components
  if (place.address_components) {
    place.address_components.forEach((component) => {
      const types = component.types;
      
      if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        components.city = component.long_name;
      } else if (types.includes('country')) {
        components.country = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        components.district = component.long_name;
      } else if (types.includes('sublocality') || types.includes('neighborhood')) {
        components.neighbourhood = component.long_name;
      } else if (types.includes('postal_code')) {
        components.postcode = component.long_name;
      } else if (types.includes('route')) {
        components.road = component.long_name;
      } else if (types.includes('street_number')) {
        components.houseNumber = component.long_name;
      }
    });
  }

  return {
    placeId: place.place_id,
    formattedAddress: place.formatted_address,
    latitude: place.geometry.location.lat(),
    longitude: place.geometry.location.lng(),
    components,
    type: place.types?.[0] || 'unknown',
    importance: null
  };
};

const reverseGeocode = async (
  geocoder: google.maps.Geocoder,
  location: google.maps.LatLng
): Promise<AddressData | null> => {
  return new Promise((resolve) => {
    geocoder.geocode({ location }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const result = mapGooglePlaceToAddressData(results[0]);
        resolve(result);
      } else {
        resolve(null);
      }
    });
  });
};

export default function WizardStep2({ data, onSave, onNext, canProceed }: WizardStep2Props) {
  // Google Maps setup
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // Component state and refs
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<google.maps.LatLng | null>(null);

  // Initialize selected location from existing data
  useEffect(() => {
    if (data.addressData && typeof data.addressData === 'object' && 
        'latitude' in data.addressData && 'longitude' in data.addressData && 
        typeof data.addressData.latitude === 'number' && typeof data.addressData.longitude === 'number' &&
        isLoaded) {
      const location = new google.maps.LatLng(data.addressData.latitude, data.addressData.longitude);
      setSelectedLocation(location);
    }
  }, [data.addressData, isLoaded]);

  // Form setup
  const form = useForm<WizardStep2Data>({
    resolver: zodResolver(wizardStep2Schema),
    defaultValues: {
      address: data.address || '',
      addressData: data.addressData || undefined,
      timezone: data.timezone || 'Europe/Istanbul',
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

  // Initialize geocoder when maps loads
  useEffect(() => {
    if (isLoaded && !geocoder) {
      setGeocoder(new google.maps.Geocoder());
    }
  }, [isLoaded, geocoder]);

  // Handle autocomplete load
  const onAutocompleteLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    console.log('🗺️ Google Places Autocomplete loaded');
    
    // Configure autocomplete for Turkey
    autocompleteInstance.setComponentRestrictions({ country: 'tr' });
    autocompleteInstance.setFields([
      'place_id',
      'formatted_address',
      'geometry.location',
      'address_components',
      'types'
    ]);
    
    setAutocomplete(autocompleteInstance);
  }, []);

  // Handle place selection from autocomplete
  const onPlaceChanged = useCallback(() => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    console.log('📍 Place selected from autocomplete:', place);

    if (!place.geometry?.location) {
      console.warn('⚠️ No location data in selected place');
      return;
    }

    const addressData = mapGooglePlaceToAddressData(place);
    if (!addressData) {
      console.warn('⚠️ Could not map place to address data');
      return;
    }

    console.log('✅ Mapped address data:', addressData);
    console.log('📝 Setting input value to:', addressData.formattedAddress);

    // Update input value directly
    if (inputRef.current) {
      inputRef.current.value = addressData.formattedAddress;
      console.log('✅ Input value updated directly:', inputRef.current.value);
    }

    // Update form values with the full formatted address
    setValue('address', addressData.formattedAddress, { shouldValidate: true });
    setValue('addressData', addressData, { shouldValidate: true });
    
    // Update map location
    setSelectedLocation(place.geometry.location);

    // Center map on selected location
    if (map) {
      map.panTo(place.geometry.location);
      map.setZoom(15);
    }
  }, [autocomplete, map, setValue]);

  // Handle map click for location selection
  const onMapClick = useCallback(async (event: google.maps.MapMouseEvent) => {
    if (!event.latLng || !geocoder) return;

    console.log('🗺️ Map clicked at:', event.latLng.toJSON());
    
    // Set marker immediately
    setSelectedLocation(event.latLng);

    try {
      // Reverse geocode the clicked location
      const addressData = await reverseGeocode(geocoder, event.latLng);
      
      if (addressData) {
        console.log('✅ Reverse geocoded address:', addressData);
        
        // Update form values
        setValue('address', addressData.formattedAddress);
        setValue('addressData', addressData);
      } else {
        console.warn('⚠️ Could not reverse geocode location');
        
        // Set basic location data without address
        const basicAddressData: AddressData = {
          placeId: `manual_${Date.now()}`,
          formattedAddress: `${event.latLng.lat().toFixed(6)}, ${event.latLng.lng().toFixed(6)}`,
          latitude: event.latLng.lat(),
          longitude: event.latLng.lng(),
          components: {},
          type: 'manual'
        };
        
        setValue('address', basicAddressData.formattedAddress);
        setValue('addressData', basicAddressData);
      }
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
    }
  }, [geocoder, setValue]);

  // Handle map load
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    console.log('🗺️ Google Map loaded');
    setMap(mapInstance);
  }, []);

  // Handle loading errors
  if (loadError) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-red-600 mb-2">Google Maps yüklenemedi</p>
          <p className="text-sm text-muted-foreground">Lütfen internet bağlantınızı kontrol edin</p>
        </div>
      </div>
    );
  }

  // Show loading while maps loads
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <p>Google Maps yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">İşletme Konumu</h2>
        <p className="text-muted-foreground text-sm">
          İşletmenizin konumunu belirleyin. Arama yaparak veya harita üzerinde tıklayarak konum seçebilirsiniz.
        </p>
      </div>

      {/* Address Search Input */}
      <div className="space-y-2">
        <Label htmlFor="address">Adres Arama</Label>
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
        >
          <Input
            ref={inputRef}
            id="address"
            placeholder="Adres arayın... (örn: Taksim, İstanbul)"
            defaultValue={data.address || ''}
            onChange={(e) => {
              console.log('🔤 Input change:', e.target.value);
              setValue('address', e.target.value);
            }}
            data-testid="input-address-search"
            className="w-full"
          />
        </Autocomplete>
      </div>

      {/* Google Maps Widget */}
      <Card data-testid="map-widget">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Konum Seçin</span>
            </div>
            
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={selectedLocation?.toJSON() || TURKEY_CENTER}
              zoom={selectedLocation ? 15 : 6}
              onLoad={onMapLoad}
              onClick={onMapClick}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                gestureHandling: 'cooperative'
              }}
            >
              {selectedLocation && (
                <Marker
                  position={selectedLocation.toJSON()}
                  data-testid="marker-selected"
                />
              )}
            </GoogleMap>
          </div>
        </CardContent>
      </Card>

      {/* Selected Location Info */}
      {watch('addressData') && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                Seçilen Konum
              </h3>
              <div className="text-sm space-y-1">
                <p data-testid="text-selected-address">
                  <strong>Adres:</strong> {watch('addressData')?.formattedAddress}
                </p>
                <p data-testid="text-coordinates">
                  <strong>Koordinatlar:</strong> {watch('addressData')?.latitude.toFixed(6)}, {watch('addressData')?.longitude.toFixed(6)}
                </p>
                {watch('addressData')?.components.city && (
                  <p data-testid="text-city">
                    <strong>Şehir:</strong> {watch('addressData')?.components.city}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timezone Selection */}
      <div className="space-y-2">
        <Label htmlFor="timezone">Saat Dilimi</Label>
        <Input
          id="timezone"
          value={watch('timezone') || 'Europe/Istanbul'}
          onChange={(e) => setValue('timezone', e.target.value)}
          placeholder="Europe/Istanbul"
          data-testid="input-timezone"
          readOnly
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Türkiye için otomatik olarak Europe/Istanbul seçilmiştir.
        </p>
      </div>
    </div>
  );
}