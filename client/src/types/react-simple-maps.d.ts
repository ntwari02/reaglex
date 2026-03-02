declare module 'react-simple-maps' {
  import { ComponentType, ReactNode, SVGAttributes } from 'react';

  export type GeographyFeature = {
    rsmKey: string;
    properties: {
      name?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };

  export interface GeographyProps {
    geography: GeographyFeature;
    style?: {
      default?: Record<string, unknown>;
      hover?: Record<string, unknown>;
      pressed?: Record<string, unknown>;
    };
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }

  export interface MarkerProps extends SVGAttributes<SVGGElement> {
    coordinates: [number, number];
    children?: ReactNode;
  }

  export const ComposableMap: ComponentType<{
    projectionConfig?: Record<string, unknown>;
    className?: string;
    children?: ReactNode;
  }>;

  export const Geographies: ComponentType<{
    geography: string | object;
    children: (props: { geographies: GeographyFeature[] }) => ReactNode;
  }>;

  export const Geography: ComponentType<GeographyProps>;

  export const Marker: ComponentType<MarkerProps>;

  export const ZoomableGroup: ComponentType<{
    zoom?: number;
    center?: [number, number];
    minZoom?: number;
    maxZoom?: number;
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void;
    children?: ReactNode;
  }>;
}

