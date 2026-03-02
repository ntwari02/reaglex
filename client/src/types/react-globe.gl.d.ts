declare module 'react-globe.gl' {
  import { ReactNode, Ref } from 'react';

  export type GlobeDatum = Record<string, unknown>;

  type Accessor<Datum> = (datum: Datum) => number | string;

  export type GlobeControls = {
    enableZoom?: boolean;
    zoomSpeed?: number;
    minDistance?: number;
    maxDistance?: number;
    dollyIn?: (scale: number) => void;
    dollyOut?: (scale: number) => void;
    zoomIn?: () => void;
    zoomOut?: () => void;
    update?: () => void;
  };

  export type GlobeInstance = {
    controls(): GlobeControls | undefined;
  };

  export interface GlobeProps<Datum = any> {
    className?: string;
    globeImageUrl?: string;
    bumpImageUrl?: string;
    backgroundColor?: string;
    showAtmosphere?: boolean;
    atmosphereColor?: string;
    atmosphereAltitude?: number;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    pointsData?: Datum[];
    pointLat?: Accessor<Datum>;
    pointLng?: Accessor<Datum>;
    pointAltitude?: Accessor<Datum>;
    pointRadius?: number | Accessor<Datum>;
    pointColor?: (datum: Datum) => string;
    pointLabel?: (datum: Datum) => string;
    labelsData?: Datum[];
    labelLat?: Accessor<Datum>;
    labelLng?: Accessor<Datum>;
    labelText?: (datum: Datum) => string;
    labelSize?: Accessor<Datum>;
    labelDotRadius?: number | Accessor<Datum>;
    labelColor?: (datum: Datum) => string;
    children?: ReactNode;
  }

  export interface GlobeComponent {
    <Datum = any>(props: GlobeProps<Datum> & { ref?: Ref<GlobeInstance | null> }): JSX.Element;
  }

  const Globe: GlobeComponent;

  export default Globe;
}

