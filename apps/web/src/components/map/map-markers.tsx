'use client';

import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { Store, Building2, Home, Warehouse, Stethoscope, Hospital, GraduationCap, BookOpen, UtensilsCrossed, Wine, Fuel, ShoppingCart, Briefcase, ShoppingBag, Pill, Dumbbell, Hotel, Factory, Truck, Package, HardHat, Building, MapPin } from 'lucide-react';
import { MapMarker } from '@radar/types';

const iconMap: Record<string, React.ElementType> = {
  Store, Building2, Home, Warehouse, Stethoscope, Hospital, GraduationCap, BookOpen, UtensilsCrossed, Wine, Fuel, ShoppingCart, Briefcase, ShoppingBag, Pill, Dumbbell, Hotel, Factory, Truck, Package, HardHat, Building
};

export const createCustomIcon = (marker: MapMarker) => {
  const IconComponent = marker.segmentIcon && iconMap[marker.segmentIcon] 
    ? iconMap[marker.segmentIcon] 
    : MapPin;
    
  const color = marker.segmentColor || '#3B82F6';
  const isRegistered = (marker as any).isRegisteredLead === true;

  const iconMarkup = renderToStaticMarkup(
    <div style={{
      backgroundColor: color,
      width: '34px',
      height: '34px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: isRegistered ? '2.5px solid #10B981' : '2px solid white',
      boxShadow: isRegistered ? '0 0 8px rgba(16, 185, 129, 0.6), 0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.3)',
      color: 'white',
      position: 'relative'
    }}>
      <IconComponent size={16} />
      {isRegistered && (
        <div style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          backgroundColor: '#10B981',
          borderRadius: '50%',
          width: '14px',
          height: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1.5px solid white',
          fontSize: '9px',
          fontWeight: 'bold',
          color: 'white',
          lineHeight: 1
        }}>
          ✓
        </div>
      )}
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-leaflet-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};
