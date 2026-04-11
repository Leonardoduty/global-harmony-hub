declare module 'react-simple-maps' {
  import { ComponentType, ReactNode } from 'react';
  
  export interface ComposableMapProps {
    projectionConfig?: { scale?: number; center?: [number, number] };
    className?: string;
    children?: ReactNode;
  }
  export const ComposableMap: ComponentType<ComposableMapProps>;
  
  export interface GeographiesProps {
    geography: string;
    children: (data: { geographies: any[] }) => ReactNode;
  }
  export const Geographies: ComponentType<GeographiesProps>;
  
  export interface GeographyProps {
    geography: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: { hover?: Record<string, string> };
    onClick?: (event: any) => void;
    className?: string;
    key?: string;
  }
  export const Geography: ComponentType<GeographyProps>;
  
  export interface MarkerProps {
    coordinates: [number, number];
    children?: ReactNode;
  }
  export const Marker: ComponentType<MarkerProps>;
}
