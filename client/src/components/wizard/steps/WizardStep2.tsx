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

  // Custom dropdown state
  const [suggestions, setSuggestions] = useState<google.maps.places.PlaceResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

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

  // Initialize geocoder and places service when maps loads
  useEffect(() => {
    if (isLoaded && !geocoder) {
      setGeocoder(new google.maps.Geocoder());
    }
    if (isLoaded && !placesService && map) {
      setPlacesService(new google.maps.places.PlacesService(map));
    }
  }, [isLoaded, geocoder, placesService, map]);


  // Custom search function using Google Places Text Search
  const searchPlaces = useCallback(
    async (query: string) => {
      if (!placesService || !query.trim() || query.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      console.log('🔍 Searching for places:', query);

      try {
        const request: google.maps.places.TextSearchRequest = {
          query: query + ', Turkey' // Add Turkey bias for better local results
        };

        placesService.textSearch(request, (results, status) => {
          console.log('📍 Places search results:', { status, results });
          
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setSuggestions(results.slice(0, 5)); // Limit to 5 suggestions
            setShowSuggestions(true);
            console.log('✅ Found', results.length, 'places');
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
            console.warn('⚠️ Places search failed:', status);
          }
          setIsSearching(false);
        });
      } catch (error) {
        console.error('❌ Error searching places:', error);
        setSuggestions([]);
        setShowSuggestions(false);
        setIsSearching(false);
      }
    },
    [placesService]
  );

  // Handle custom suggestion selection
  const selectSuggestion = useCallback(
    (place: google.maps.places.PlaceResult) => {
      console.log('🎯 Custom suggestion selected:', place);

      if (!place.geometry?.location) {
        console.warn('⚠️ No location data in selected place');
        return;
      }

      const addressData = mapGooglePlaceToAddressData(place);
      if (!addressData) {
        console.warn('⚠️ Could not map place to address data');
        return;
      }

      console.log('✅ Mapped custom address data:', addressData);

      // Update input value
      if (inputRef.current) {
        inputRef.current.value = addressData.formattedAddress;
        console.log('✅ Input value updated from custom dropdown:', inputRef.current.value);
      }

      // Update form values
      setValue('address', addressData.formattedAddress, { shouldValidate: true });
      setValue('addressData', addressData, { shouldValidate: true });
      
      // Update map location
      setSelectedLocation(place.geometry.location);

      // Center map on selected location
      if (map) {
        map.panTo(place.geometry.location);
        map.setZoom(15);
      }

      // Hide suggestions
      setShowSuggestions(false);
      setSuggestions([]);
    },
    [map, setValue]
  );

  // Handle autocomplete load (for Google Maps API compatibility, but we'll use our custom search)
  const onAutocompleteLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    console.log('🗺️ Google Places Autocomplete loaded (will be hidden)');
    
    // Configure autocomplete for Turkey (but we won't use this)
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

  // Handle input change for custom search
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      console.log('🔤 Custom input change:', value);
      
      // Update form value
      setValue('address', value, { shouldValidate: true });
      
      // Trigger custom search with debouncing
      if (value.length >= 2) {
        // Simple debouncing with timeout
        setTimeout(() => {
          if (inputRef.current?.value === value) {
            searchPlaces(value);
          }
        }, 300);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [setValue, searchPlaces]
  );

  // Handle input blur to hide suggestions
  const handleInputBlur = useCallback(() => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  // Handle input focus to show suggestions if available
  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions]);

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
        {/* Hidden Google Autocomplete for API compatibility */}
        <div style={{ display: 'none' }}>
          <Autocomplete onLoad={onAutocompleteLoad}>
            <input type="text" />
          </Autocomplete>
        </div>

        {/* Custom Address Input with Dropdown */}
        <div className="relative">
          <Input
            ref={inputRef}
            id="address"
            placeholder="Adres arayın... (örn: Elif Tuhafiye)"
            defaultValue={data.address || ''}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            data-testid="input-address-search"
            className="w-full"
            autoComplete="off"
          />
          
          {/* Loading indicator */}
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Custom Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.place_id || index}
                  className="px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                  onClick={() => selectSuggestion(suggestion)}
                  data-testid={`suggestion-${index}`}
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {suggestion.name || 'Unnamed Location'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {suggestion.formatted_address}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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