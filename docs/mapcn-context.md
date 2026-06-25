# mapcn Documentation Context

Generated for ShareMyRide

---

# Introduction

Source: https://www.mapcn.dev/docs

BasicsGetting StartedInstallationllms.txtAPI ReferenceComponentsMapControlsMarkersPopupsRoutesArcsGeoJSONClustersAdvancedIntroductionCopy-paste map components for React.mapcn provides beautifully designed, accessible, and customizable map components. Built on MapLibre GL, styled with Tailwind CSS, and designed to work with shadcn/ui.Philosophymapcn follows the shadcn model for maps: copy-paste components you can own, with zero lock-in and sensible defaults that work immediately.Maps are often treated as black boxes hidden behind wrapper libraries and configuration-heavy SDKs. mapcn takes a different approach. It stays close to MapLibre, keeps the API familiar, and lets you drop down to the raw map instance whenever you need more control.The goal is simple: make maps feel like the rest of your UI stack - composable, themeable, accessible, and easy to customize with Tailwind and shadcn patterns.Why mapcn?Most React map setups are either too opinionated or too heavy. mapcn is built for teams that want to ship quickly without giving up control:Own Your Code: Copy the components into your project and customize everything.Start Fast: Run one command and render your first map with production-ready defaults.Scale Safely: Build on top of MapLibre directly, then drop to raw APIs when needed.Design-System Friendly: Styled with Tailwind and made to fit naturally with shadcn/ui patterns.Any Map Stylemapcn works with any MapLibre-compatible tiles. This means you can use tiles from virtually any provider:OpenStreetMap - Community-driven, open-source map dataCarto - Clean, minimal basemaps perfect for data visualizationMapTiler - Beautiful vector tiles with extensive customization optionsStadia Maps - Fast, reliable tile hosting with multiple stylesThunderforest - Specialized maps for outdoors, cycling, and transportAnd any other provider that supports the MapLibre style specFeaturesZero ConfigWorks out of the box with free map tiles. No API keys needed.Theme AwareAutomatically switches between light and dark map styles.ComposableBuild complex UIs with simple, composable components.TypeScriptFull type safety with comprehensive TypeScript support.Copy & PasteOwn your code. No dependencies, just copy into your project.Any Map StyleUse any MapLibre-compatible tiles: MapTiler, Carto, OpenStreetMap, and more.Installation On This PagePhilosophyWhy mapcn?Any Map StyleFeaturesIntroductionCopy-paste map components for React.mapcn provides beautifully designed, accessible, and customizable map components. Built on MapLibre GL, styled with Tailwind CSS, and designed to work with shadcn/ui.Philosophymapcn follows the shadcn model for maps: copy-paste components you can own, with zero lock-in and sensible defaults that work immediately.Maps are often treated as black boxes hidden behind wrapper libraries and configuration-heavy SDKs. mapcn takes a different approach. It stays close to MapLibre, keeps the API familiar, and lets you drop down to the raw map instance whenever you need more control.The goal is simple: make maps feel like the rest of your UI stack - composable, themeable, accessible, and easy to customize with Tailwind and shadcn patterns.Why mapcn?Most React map setups are either too opinionated or too heavy. mapcn is built for teams that want to ship quickly without giving up control:Own Your Code: Copy the components into your project and customize everything.Start Fast: Run one command and render your first map with production-ready defaults.Scale Safely: Build on top of MapLibre directly, then drop to raw APIs when needed.Design-System Friendly: Styled with Tailwind and made to fit naturally with shadcn/ui patterns.Any Map Stylemapcn works with any MapLibre-compatible tiles. This means you can use tiles from virtually any provider:OpenStreetMap - Community-driven, open-source map dataCarto - Clean, minimal basemaps perfect for data visualizationMapTiler - Beautiful vector tiles with extensive customization optionsStadia Maps - Fast, reliable tile hosting with multiple stylesThunderforest - Specialized maps for outdoors, cycling, and transportAnd any other provider that supports the MapLibre style specFeaturesZero ConfigWorks out of the box with free map tiles. No API keys needed.Theme AwareAutomatically switches between light and dark map styles.ComposableBuild complex UIs with simple, composable components.TypeScriptFull type safety with comprehensive TypeScript support.Copy & PasteOwn your code. No dependencies, just copy into your project.Any Map StyleUse any MapLibre-compatible tiles: MapTiler, Carto, OpenStreetMap, and more.Installation On This PagePhilosophyWhy mapcn?Any Map StyleFeatures

---

# Installation

Source: https://www.mapcn.dev/docs/installation

BasicsGetting StartedInstallationllms.txtAPI ReferenceComponentsMapControlsMarkersPopupsRoutesArcsGeoJSONClustersAdvancedInstallationHow to install and set up mapcn in your project.PrerequisitesA project with Tailwind CSS and shadcn/ui set up.InstallationRun the following command to add the map component:npx shadcn@latest add @mapcn/mapThis will install maplibre-gl and add the map component to your project.UsageImport and use the map component:import { Map, MapControls } from "@/components/ui/map";
import { Card } from "@/components/ui/card";

export function MyMap() {
 return (
 <Card className="h-[320px] p-0 overflow-hidden">
 <Map center={[-74.006, 40.7128]} zoom={11}>
 <MapControls />
 </Map>
 </Card>
 );
}Note: The map uses free CARTO basemap tiles by default. Tiles automatically switch between light and dark themes. IntroductionAPI Reference On This PagePrerequisitesInstallationUsageInstallationHow to install and set up mapcn in your project.PrerequisitesA project with Tailwind CSS and shadcn/ui set up.InstallationRun the following command to add the map component:npx shadcn@latest add @mapcn/mapThis will install maplibre-gl and add the map component to your project.UsageImport and use the map component:import { Map, MapControls } from "@/components/ui/map";
import { Card } from "@/components/ui/card";

export function MyMap() {
 return (
 <Card className="h-[320px] p-0 overflow-hidden">
 <Map center={[-74.006, 40.7128]} zoom={11}>
 <MapControls />
 </Map>
 </Card>
 );
}Note: The map uses free CARTO basemap tiles by default. Tiles automatically switch between light and dark themes. IntroductionAPI Reference On This PagePrerequisitesInstallationUsage

---

# Map

Source: https://www.mapcn.dev/docs/basic-map

BasicsGetting StartedInstallationllms.txtAPI ReferenceComponentsMapControlsMarkersPopupsRoutesArcsGeoJSONClustersAdvancedMapThe simplest way to add an interactive map to your application.Basic UsageThe Map component handles MapLibre GL setup, theming, and provides context for child components.import { Map } from "@/components/ui/map";

export function BasicMapExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-74.006, 40.7128]} zoom={12} />
 </div>
 );
}
View CodeControlled ModeUse the viewport and onViewportChangeprops to control the map's viewport externally. This is useful when you need to sync the map state with your application or respond to viewport changes.lng: -74.006lat: 40.713zoom: 8.0bearing: 0.0°pitch: 0.0°"use client";

import { useState } from "react";
import { Map, type MapViewport } from "@/components/ui/map";

export function ControlledMapExample() {
 const [viewport, setViewport] = useState<MapViewport>({
 center: [-74.006, 40.7128],
 zoom: 8,
 bearing: 0,
 pitch: 0,
 });

 return (
 <div className="relative h-[420px] w-full">
 <Map viewport={viewport} onViewportChange={setViewport} />
 <div className="bg-background/80 absolute top-2 left-2 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded border px-2 py-1.5 font-mono text-xs backdrop-blur">
 <span>
 <span className="text-muted-foreground">lng:</span>{" "}
 {viewport.center[0].toFixed(3)}
 </span>
 <span>
 <span className="text-muted-foreground">lat:</span>{" "}
 {viewport.center[1].toFixed(3)}
 </span>
 <span>
 <span className="text-muted-foreground">zoom:</span>{" "}
 {viewport.zoom.toFixed(1)}
 </span>
 <span>
 <span className="text-muted-foreground">bearing:</span>{" "}
 {viewport.bearing.toFixed(1)}°
 </span>
 <span>
 <span className="text-muted-foreground">pitch:</span>{" "}
 {viewport.pitch.toFixed(1)}°
 </span>
 </div>
 </div>
 );
}
View CodeBlank BasemapThe blank prop swaps the default street basemap for a transparent, tile-less canvas - perfect for data visualizations where you draw your own layers instead of showing streets and labels.Note: blank is a blank canvas. Used alone, <Map blank /> renders nothing - you must add your own layers on top (e.g. MapGeoJSON, MapArc, or markers). See GeoJSON for more on rendering shapes on a blank map.Here, a MapGeoJSON layer renders world country borders on top of the transparent canvas.import { Map, MapGeoJSON } from "@/components/ui/map";
import { WORLD_GEOJSON } from "@/lib/use-world-data";

export function BlankMapExample() {
 return (
 <div className="h-[420px] w-full">
 {/* `blank` is a transparent canvas — add your own layers on top. */}
 <Map blank center={[10, 25]}>
 <MapGeoJSON data={WORLD_GEOJSON} />
 </Map>
 </div>
 );
}
View CodeCustom StylesUse the styles prop to provide custom map styles. This example uses free vector tiles from OpenFreeMap, an open-source project, the data comes from OpenStreetMap.Default (Carto)OpenStreetMapOpenStreetMap 3D"use client";

import { useState, useEffect, useRef } from "react";
import { Map, type MapRef } from "@/components/ui/map";

const styles = {
 default: undefined,
 openstreetmap: "https://tiles.openfreemap.org/styles/bright",
 openstreetmap3d: "https://tiles.openfreemap.org/styles/liberty",
};

type StyleKey = keyof typeof styles;

export function CustomStyleExample() {
 const mapRef = useRef<MapRef>(null);
 const [style, setStyle] = useState<StyleKey>("default");
 const selectedStyle = styles[style];
 const is3D = style === "openstreetmap3d";

 useEffect(() => {
 mapRef.current?.easeTo({ pitch: is3D ? 60 : 0, duration: 500 });
 }, [is3D]);

 return (
 <div className="relative h-[420px] w-full">
 <Map
 ref={mapRef}
 center={[-0.1276, 51.5074]}
 zoom={15}
 styles={
 selectedStyle
 ? { light: selectedStyle, dark: selectedStyle }
 : undefined
 }
 />
 <div className="absolute top-2 right-2 z-10">
 <select
 value={style}
 onChange={(e) => setStyle(e.target.value as StyleKey)}
 className="bg-background text-foreground rounded-md border px-2 py-1 text-sm shadow"
 >
 <option value="default">Default (Carto)</option>
 <option value="openstreetmap">OpenStreetMap</option>
 <option value="openstreetmap3d">OpenStreetMap 3D</option>
 </select>
 </div>
 </div>
 );
}
View Code API ReferenceControls On This PageBasic UsageControlled ModeBlank BasemapCustom StylesMapThe simplest way to add an interactive map to your application.Basic UsageThe Map component handles MapLibre GL setup, theming, and provides context for child components.import { Map } from "@/components/ui/map";

export function BasicMapExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-74.006, 40.7128]} zoom={12} />
 </div>
 );
}
View CodeControlled ModeUse the viewport and onViewportChangeprops to control the map's viewport externally. This is useful when you need to sync the map state with your application or respond to viewport changes.lng: -74.006lat: 40.713zoom: 8.0bearing: 0.0°pitch: 0.0°"use client";

import { useState } from "react";
import { Map, type MapViewport } from "@/components/ui/map";

export function ControlledMapExample() {
 const [viewport, setViewport] = useState<MapViewport>({
 center: [-74.006, 40.7128],
 zoom: 8,
 bearing: 0,
 pitch: 0,
 });

 return (
 <div className="relative h-[420px] w-full">
 <Map viewport={viewport} onViewportChange={setViewport} />
 <div className="bg-background/80 absolute top-2 left-2 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded border px-2 py-1.5 font-mono text-xs backdrop-blur">
 <span>
 <span className="text-muted-foreground">lng:</span>{" "}
 {viewport.center[0].toFixed(3)}
 </span>
 <span>
 <span className="text-muted-foreground">lat:</span>{" "}
 {viewport.center[1].toFixed(3)}
 </span>
 <span>
 <span className="text-muted-foreground">zoom:</span>{" "}
 {viewport.zoom.toFixed(1)}
 </span>
 <span>
 <span className="text-muted-foreground">bearing:</span>{" "}
 {viewport.bearing.toFixed(1)}°
 </span>
 <span>
 <span className="text-muted-foreground">pitch:</span>{" "}
 {viewport.pitch.toFixed(1)}°
 </span>
 </div>
 </div>
 );
}
View CodeBlank BasemapThe blank prop swaps the default street basemap for a transparent, tile-less canvas - perfect for data visualizations where you draw your own layers instead of showing streets and labels.Note: blank is a blank canvas. Used alone, <Map blank /> renders nothing - you must add your own layers on top (e.g. MapGeoJSON, MapArc, or markers). See GeoJSON for more on rendering shapes on a blank map.Here, a MapGeoJSON layer renders world country borders on top of the transparent canvas.import { Map, MapGeoJSON } from "@/components/ui/map";
import { WORLD_GEOJSON } from "@/lib/use-world-data";

export function BlankMapExample() {
 return (
 <div className="h-[420px] w-full">
 {/* `blank` is a transparent canvas — add your own layers on top. */}
 <Map blank center={[10, 25]}>
 <MapGeoJSON data={WORLD_GEOJSON} />
 </Map>
 </div>
 );
}
View CodeCustom StylesUse the styles prop to provide custom map styles. This example uses free vector tiles from OpenFreeMap, an open-source project, the data comes from OpenStreetMap.Default (Carto)OpenStreetMapOpenStreetMap 3D"use client";

import { useState, useEffect, useRef } from "react";
import { Map, type MapRef } from "@/components/ui/map";

const styles = {
 default: undefined,
 openstreetmap: "https://tiles.openfreemap.org/styles/bright",
 openstreetmap3d: "https://tiles.openfreemap.org/styles/liberty",
};

type StyleKey = keyof typeof styles;

export function CustomStyleExample() {
 const mapRef = useRef<MapRef>(null);
 const [style, setStyle] = useState<StyleKey>("default");
 const selectedStyle = styles[style];
 const is3D = style === "openstreetmap3d";

 useEffect(() => {
 mapRef.current?.easeTo({ pitch: is3D ? 60 : 0, duration: 500 });
 }, [is3D]);

 return (
 <div className="relative h-[420px] w-full">
 <Map
 ref={mapRef}
 center={[-0.1276, 51.5074]}
 zoom={15}
 styles={
 selectedStyle
 ? { light: selectedStyle, dark: selectedStyle }
 : undefined
 }
 />
 <div className="absolute top-2 right-2 z-10">
 <select
 value={style}
 onChange={(e) => setStyle(e.target.value as StyleKey)}
 className="bg-background text-foreground rounded-md border px-2 py-1 text-sm shadow"
 >
 <option value="default">Default (Carto)</option>
 <option value="openstreetmap">OpenStreetMap</option>
 <option value="openstreetmap3d">OpenStreetMap 3D</option>
 </select>
 </div>
 </div>
 );
}
View Code API ReferenceControls On This PageBasic UsageControlled ModeBlank BasemapCustom Styles

---

# API Reference

Source: https://www.mapcn.dev/docs/api-reference

BasicsGetting StartedInstallationllms.txtAPI ReferenceComponentsMapControlsMarkersPopupsRoutesArcsGeoJSONClustersAdvancedAPI ReferenceComplete reference for all map components and their props.Note: This library is built on top of MapLibre GL JS. Most components extend the native MapLibre options. Refer to the MapLibre Map API for additional options not listed here.Component AnatomyAll parts of the component that you can use and combine to build your map.<Map>
 <MapMarker longitude={...} latitude={...}>
 <MarkerContent>
 <MarkerLabel />
 </MarkerContent>
 <MarkerPopup />
 <MarkerTooltip />
 </MapMarker>

 <MapPopup longitude={...} latitude={...} />
 <MapControls />
 <MapRoute coordinates={...} />
 <MapArc data={...} />
 <MapGeoJSON data={...} />
 <MapClusterLayer data={...} />
</Map>MapThe root container component that initializes MapLibre GL and provides context to child components. Automatically handles theme switching between light and dark modes.Extends MapOptions from MapLibre GL (excluding container and style).PropTypeDefaultDescriptionchildrenReactNode—Child components (markers, popups, controls, routes).classNamestring—Additional CSS classes for the map container.theme"light" | "dark"—Theme for the map. If not provided, automatically detects from document class or system preference.styles{ light?: string | StyleSpecification; dark?: string | StyleSpecification }—Custom map styles for light and dark themes. Overrides the default Carto base map tiles.blankbooleanfalseUse a transparent, tile-less basemap instead of the default Carto street basemap. This is a blank canvas — used alone it renders nothing, so you must add your own layers (e.g. MapGeoJSON, MapArc, markers) on top. Ideal for data visualizations (choropleths, arcs, dot maps). Ignored when an explicit styles prop is provided.projectionProjectionSpecification—Map projection type. Use { type: "globe" } for 3D globe view.viewportPartial<MapViewport>—Controlled viewport state. When used with onViewportChange, enables controlled mode. Can also be used alone for initial viewport.onViewportChange(viewport: MapViewport) => void—Callback fired continuously as the viewport changes (during pan, zoom, rotate). Can be used alone to observe changes, or with viewport prop to enable controlled mode.loadingbooleanfalseShow a loading indicator on the map.useMapA hook that provides access to the MapLibre map instance and loading state. Must be used within a Map component.const { map, isLoaded } = useMap();Returns map (MapLibre.Map) and isLoaded (boolean) tells you if the map is loaded and ready to use.MapControlsRenders map control buttons (zoom, compass, locate, fullscreen). Must be used inside Map.PropTypeDefaultDescriptionposition"top-left" | "top-right" | "bottom-left" | "bottom-right""bottom-right"Position of the controls on the map.showZoombooleantrueShow zoom in/out buttons.showCompassbooleanfalseShow compass button to reset bearing.showLocatebooleanfalseShow locate button to find user's location.showFullscreenbooleanfalseShow fullscreen toggle button.classNamestring—Additional CSS classes for the controls container.onLocate(coords: { longitude: number; latitude: number }) => void—Callback with user coordinates when located.MapMarkerA container for marker-related components. Provides context for its children and handles marker positioning.Extends MarkerOptions from MapLibre GL (excluding element).PropTypeDefaultDescriptionlongitudenumber—Longitude coordinate for marker position.latitudenumber—Latitude coordinate for marker position.childrenReactNode—Marker subcomponents (MarkerContent, MarkerPopup, etc).onClick(e: MouseEvent) => void—Callback when marker is clicked.onMouseEnter(e: MouseEvent) => void—Callback when mouse enters marker.onMouseLeave(e: MouseEvent) => void—Callback when mouse leaves marker.onDragStart(lngLat: {lng, lat}) => void—Callback when marker drag starts (requires draggable: true).onDrag(lngLat: {lng, lat}) => void—Callback during marker drag (requires draggable: true).onDragEnd(lngLat: {lng, lat}) => void—Callback when marker drag ends (requires draggable: true).MarkerContentRenders the visual content of a marker. Must be used inside MapMarker. If no children provided, renders a default blue dot marker.PropTypeDefaultDescriptionchildrenReactNode—Custom marker content. Defaults to a blue dot.classNamestring—Additional CSS classes for the marker container.MarkerPopupRenders a popup attached to the marker that opens on click. Must be used inside MapMarker.Extends PopupOptions from MapLibre GL (excluding className and closeButton).The className and closeButtonfrom MapLibre's PopupOptions are excluded to prevent style conflicts. Use the component's own props to style the popup. MapLibre's default popup styles are reset via CSS.PropTypeDefaultDescriptionchildrenReactNode—Popup content.classNamestring—Additional CSS classes for the popup container.closeButtonbooleanfalseShow a close button in the popup.MarkerTooltipRenders a tooltip that appears on hover. Must be used inside MapMarker.Extends PopupOptions from MapLibre GL (excluding className, closeButton, and closeOnClick as tooltips auto-dismiss on hover out).The classNamefrom MapLibre's PopupOptions is excluded to prevent style conflicts. Use the component's own classNameprop to style the tooltip content. MapLibre's default popup styles are reset via CSS.PropTypeDefaultDescriptionchildrenReactNode—Tooltip content.classNamestring—Additional CSS classes for the tooltip container.MarkerLabelRenders a text label above or below the marker. Must be used inside MarkerContent.PropTypeDefaultDescriptionchildrenReactNode—Label text content.classNamestring—Additional CSS classes for the label.position"top" | "bottom""top"Position of the label relative to the marker.MapPopupA standalone popup component that can be placed anywhere on the map without a marker. Must be used inside Map.Extends PopupOptions from MapLibre GL (excluding className and closeButton).The className and closeButtonfrom MapLibre's PopupOptions are excluded to prevent style conflicts. Use the component's own props to style the popup. MapLibre's default popup styles are reset via CSS.PropTypeDefaultDescriptionlongitudenumber—Longitude coordinate for popup position.latitudenumber—Latitude coordinate for popup position.onClose() => void—Callback when popup is closed.childrenReactNode—Popup content.classNamestring—Additional CSS classes for the popup container.closeButtonbooleanfalseShow a close button in the popup.MapRouteRenders a line/route on the map connecting coordinate points. Must be used inside Map. Supports click and hover interactions for building route selection UIs.PropTypeDefaultDescriptionidstringundefined (auto-generated)Optional unique identifier for the route layer. Auto-generated if not provided.coordinates[number, number][]—Array of [longitude, latitude] coordinate pairs.colorstring"#4285F4"Line color (CSS color value).widthnumber3Line width in pixels.opacitynumber0.8Line opacity (0 to 1).dashArray[number, number]—Dash pattern [dash length, gap length] for dashed lines.onClick() => void—Callback when the route line is clicked.onMouseEnter() => void—Callback when mouse enters the route line.onMouseLeave() => void—Callback when mouse leaves the route line.interactivebooleanfalseRespond to mouse events (hover, cursor, callbacks).MapArcRenders curved lines between coordinate pairs using a quadratic Bézier in longitude/latitude space. Must be used inside Map. Supports click and hover interactions for building arc selection UIs.Built on a MapLibre line layer — the paint and layout props accept any field from LineLayerSpecification (e.g. line-color, line-width, line-opacity, line-dasharray, line-blur).Style per arc by passing a MapLibre expression as any paint value. Reference fields on each datum with ["get", "fieldName"].PropTypeDefaultDescriptiondataMapArcDatum[]—Arcs to render. Each needs a unique id and from / to as [lng, lat]. Extra fields are forwarded to feature properties.idstringautoId prefix for the underlying source/layers.curvaturenumber0.2How far the arc bows away from a straight line. 0 renders a straight line, higher values bend more, negative values bend to the opposite side.samplesnumber64Points per arc. Higher = smoother.paintLineLayerSpecification['paint']{ "line-color": "#4285F4", "line-width": 2, "line-opacity": 0.85 }Paint props merged over defaults. Values may be MapLibre expressions for per-feature styling.layoutLineLayerSpecification['layout']{ "line-join": "round", "line-cap": "round" }Layout props merged over defaults.hoverPaintLineLayerSpecification['paint']—Paint overrides applied to the hovered arc via feature-state.onClick(e: MapArcEvent) => void—Fired when an arc is clicked.onHover(e: MapArcEvent | null) => void—Fired when the hovered arc changes, with the cursor's lng/lat at entry. Receives null when the cursor leaves all arcs.interactivebooleantrueRespond to mouse events (hover, cursor, callbacks).beforeIdstring—Insert the arc layers before this layer id.MapGeoJSONRenders arbitrary GeoJSON as fill + outline layers. Must be used inside Map — typically with the blank prop for choropleths and region/data maps. Accepts a FeatureCollection, Feature, Geometry, or a URL string to fetch from. Supports a generic type parameter for typed feature properties: MapGeoJSON<MyProperties>.Fill and outline default to a theme-aware monochrome surface tone, so shapes read clearly on light/dark out of the box. Override either layer via fillPaint / linePaint (pass false to omit a layer), and pass MapLibre expressions as paint values for data-driven styling. Hover highlighting via fillHoverPaint requires promoteId.PropTypeDefaultDescriptiondataFeatureCollection | Feature | Geometry | string—GeoJSON data (FeatureCollection, Feature, or Geometry) or a URL string to fetch it from.idstringautoId prefix for the underlying source/layers.promoteIdstring—Feature property to promote to the feature id. Required for hover feature-state (fillHoverPaint) and stable onHover / onClick payloads.fillPaintFillLayerSpecification['paint'] | false—Paint for the polygon fill layer, merged over a theme-aware fill-color default. Pass false to omit the fill layer (e.g. outlines only).linePaintLineLayerSpecification['paint'] | false—Paint for the outline layer, merged over a theme-aware hairline default. Pass false to omit the outline layer.fillHoverPaintFillLayerSpecification['paint']—Paint merged onto the fill layer for the hovered feature, applied via hover feature-state. Requires promoteId.onClick(e: MapGeoJSONEvent) => void—Fired when a feature is clicked.onHover(e: MapGeoJSONEvent | null) => void—Fired when the hovered feature changes. Receives null when the cursor leaves all features.interactivebooleanfalseRespond to mouse events (hover, cursor, callbacks).beforeIdstring—Insert the layers before this layer id.MapClusterLayerRenders clustered point data using MapLibre GL's native clustering. Automatically groups nearby points into clusters that expand on click. Must be used inside Map. Supports a generic type parameter for typed feature properties: MapClusterLayer<MyProperties>.PropTypeDefaultDescriptiondatastring | GeoJSON.FeatureCollection—GeoJSON FeatureCollection data or URL to fetch GeoJSON from.clusterMaxZoomnumber14Maximum zoom level to cluster points on.clusterRadiusnumber50Radius of each cluster when clustering points (in pixels).clusterColors[string, string, string]["#22c55e", "#eab308", "#ef4444"]Colors for cluster circles: [small, medium, large] based on point count.clusterThresholds[number, number][100, 750]Point count thresholds for color/size steps: [medium, large].pointColorstring"#3b82f6"Color for unclustered individual points.onPointClick(feature: GeoJSON.Feature, coordinates: [number, number]) => void—Callback when an unclustered point is clicked.onClusterClick(clusterId: number, coordinates: [number, number], pointCount: number) => void—Callback when a cluster is clicked. If not provided, zooms into the cluster. InstallationMap On This PageComponent AnatomyMapuseMapMapControlsMapMarkerMarkerContentMarkerPopupMarkerTooltipMarkerLabelMapPopupMapRouteMapArcMapGeoJSONMapClusterLayerAPI ReferenceComplete reference for all map components and their props.Note: This library is built on top of MapLibre GL JS. Most components extend the native MapLibre options. Refer to the MapLibre Map API for additional options not listed here.Component AnatomyAll parts of the component that you can use and combine to build your map.<Map>
 <MapMarker longitude={...} latitude={...}>
 <MarkerContent>
 <MarkerLabel />
 </MarkerContent>
 <MarkerPopup />
 <MarkerTooltip />
 </MapMarker>

 <MapPopup longitude={...} latitude={...} />
 <MapControls />
 <MapRoute coordinates={...} />
 <MapArc data={...} />
 <MapGeoJSON data={...} />
 <MapClusterLayer data={...} />
</Map>MapThe root container component that initializes MapLibre GL and provides context to child components. Automatically handles theme switching between light and dark modes.Extends MapOptions from MapLibre GL (excluding container and style).PropTypeDefaultDescriptionchildrenReactNode—Child components (markers, popups, controls, routes).classNamestring—Additional CSS classes for the map container.theme"light" | "dark"—Theme for the map. If not provided, automatically detects from document class or system preference.styles{ light?: string | StyleSpecification; dark?: string | StyleSpecification }—Custom map styles for light and dark themes. Overrides the default Carto base map tiles.blankbooleanfalseUse a transparent, tile-less basemap instead of the default Carto street basemap. This is a blank canvas — used alone it renders nothing, so you must add your own layers (e.g. MapGeoJSON, MapArc, markers) on top. Ideal for data visualizations (choropleths, arcs, dot maps). Ignored when an explicit styles prop is provided.projectionProjectionSpecification—Map projection type. Use { type: "globe" } for 3D globe view.viewportPartial<MapViewport>—Controlled viewport state. When used with onViewportChange, enables controlled mode. Can also be used alone for initial viewport.onViewportChange(viewport: MapViewport) => void—Callback fired continuously as the viewport changes (during pan, zoom, rotate). Can be used alone to observe changes, or with viewport prop to enable controlled mode.loadingbooleanfalseShow a loading indicator on the map.useMapA hook that provides access to the MapLibre map instance and loading state. Must be used within a Map component.const { map, isLoaded } = useMap();Returns map (MapLibre.Map) and isLoaded (boolean) tells you if the map is loaded and ready to use.MapControlsRenders map control buttons (zoom, compass, locate, fullscreen). Must be used inside Map.PropTypeDefaultDescriptionposition"top-left" | "top-right" | "bottom-left" | "bottom-right""bottom-right"Position of the controls on the map.showZoombooleantrueShow zoom in/out buttons.showCompassbooleanfalseShow compass button to reset bearing.showLocatebooleanfalseShow locate button to find user's location.showFullscreenbooleanfalseShow fullscreen toggle button.classNamestring—Additional CSS classes for the controls container.onLocate(coords: { longitude: number; latitude: number }) => void—Callback with user coordinates when located.MapMarkerA container for marker-related components. Provides context for its children and handles marker positioning.Extends MarkerOptions from MapLibre GL (excluding element).PropTypeDefaultDescriptionlongitudenumber—Longitude coordinate for marker position.latitudenumber—Latitude coordinate for marker position.childrenReactNode—Marker subcomponents (MarkerContent, MarkerPopup, etc).onClick(e: MouseEvent) => void—Callback when marker is clicked.onMouseEnter(e: MouseEvent) => void—Callback when mouse enters marker.onMouseLeave(e: MouseEvent) => void—Callback when mouse leaves marker.onDragStart(lngLat: {lng, lat}) => void—Callback when marker drag starts (requires draggable: true).onDrag(lngLat: {lng, lat}) => void—Callback during marker drag (requires draggable: true).onDragEnd(lngLat: {lng, lat}) => void—Callback when marker drag ends (requires draggable: true).MarkerContentRenders the visual content of a marker. Must be used inside MapMarker. If no children provided, renders a default blue dot marker.PropTypeDefaultDescriptionchildrenReactNode—Custom marker content. Defaults to a blue dot.classNamestring—Additional CSS classes for the marker container.MarkerPopupRenders a popup attached to the marker that opens on click. Must be used inside MapMarker.Extends PopupOptions from MapLibre GL (excluding className and closeButton).The className and closeButtonfrom MapLibre's PopupOptions are excluded to prevent style conflicts. Use the component's own props to style the popup. MapLibre's default popup styles are reset via CSS.PropTypeDefaultDescriptionchildrenReactNode—Popup content.classNamestring—Additional CSS classes for the popup container.closeButtonbooleanfalseShow a close button in the popup.MarkerTooltipRenders a tooltip that appears on hover. Must be used inside MapMarker.Extends PopupOptions from MapLibre GL (excluding className, closeButton, and closeOnClick as tooltips auto-dismiss on hover out).The classNamefrom MapLibre's PopupOptions is excluded to prevent style conflicts. Use the component's own classNameprop to style the tooltip content. MapLibre's default popup styles are reset via CSS.PropTypeDefaultDescriptionchildrenReactNode—Tooltip content.classNamestring—Additional CSS classes for the tooltip container.MarkerLabelRenders a text label above or below the marker. Must be used inside MarkerContent.PropTypeDefaultDescriptionchildrenReactNode—Label text content.classNamestring—Additional CSS classes for the label.position"top" | "bottom""top"Position of the label relative to the marker.MapPopupA standalone popup component that can be placed anywhere on the map without a marker. Must be used inside Map.Extends PopupOptions from MapLibre GL (excluding className and closeButton).The className and closeButtonfrom MapLibre's PopupOptions are excluded to prevent style conflicts. Use the component's own props to style the popup. MapLibre's default popup styles are reset via CSS.PropTypeDefaultDescriptionlongitudenumber—Longitude coordinate for popup position.latitudenumber—Latitude coordinate for popup position.onClose() => void—Callback when popup is closed.childrenReactNode—Popup content.classNamestring—Additional CSS classes for the popup container.closeButtonbooleanfalseShow a close button in the popup.MapRouteRenders a line/route on the map connecting coordinate points. Must be used inside Map. Supports click and hover interactions for building route selection UIs.PropTypeDefaultDescriptionidstringundefined (auto-generated)Optional unique identifier for the route layer. Auto-generated if not provided.coordinates[number, number][]—Array of [longitude, latitude] coordinate pairs.colorstring"#4285F4"Line color (CSS color value).widthnumber3Line width in pixels.opacitynumber0.8Line opacity (0 to 1).dashArray[number, number]—Dash pattern [dash length, gap length] for dashed lines.onClick() => void—Callback when the route line is clicked.onMouseEnter() => void—Callback when mouse enters the route line.onMouseLeave() => void—Callback when mouse leaves the route line.interactivebooleanfalseRespond to mouse events (hover, cursor, callbacks).MapArcRenders curved lines between coordinate pairs using a quadratic Bézier in longitude/latitude space. Must be used inside Map. Supports click and hover interactions for building arc selection UIs.Built on a MapLibre line layer — the paint and layout props accept any field from LineLayerSpecification (e.g. line-color, line-width, line-opacity, line-dasharray, line-blur).Style per arc by passing a MapLibre expression as any paint value. Reference fields on each datum with ["get", "fieldName"].PropTypeDefaultDescriptiondataMapArcDatum[]—Arcs to render. Each needs a unique id and from / to as [lng, lat]. Extra fields are forwarded to feature properties.idstringautoId prefix for the underlying source/layers.curvaturenumber0.2How far the arc bows away from a straight line. 0 renders a straight line, higher values bend more, negative values bend to the opposite side.samplesnumber64Points per arc. Higher = smoother.paintLineLayerSpecification['paint']{ "line-color": "#4285F4", "line-width": 2, "line-opacity": 0.85 }Paint props merged over defaults. Values may be MapLibre expressions for per-feature styling.layoutLineLayerSpecification['layout']{ "line-join": "round", "line-cap": "round" }Layout props merged over defaults.hoverPaintLineLayerSpecification['paint']—Paint overrides applied to the hovered arc via feature-state.onClick(e: MapArcEvent) => void—Fired when an arc is clicked.onHover(e: MapArcEvent | null) => void—Fired when the hovered arc changes, with the cursor's lng/lat at entry. Receives null when the cursor leaves all arcs.interactivebooleantrueRespond to mouse events (hover, cursor, callbacks).beforeIdstring—Insert the arc layers before this layer id.MapGeoJSONRenders arbitrary GeoJSON as fill + outline layers. Must be used inside Map — typically with the blank prop for choropleths and region/data maps. Accepts a FeatureCollection, Feature, Geometry, or a URL string to fetch from. Supports a generic type parameter for typed feature properties: MapGeoJSON<MyProperties>.Fill and outline default to a theme-aware monochrome surface tone, so shapes read clearly on light/dark out of the box. Override either layer via fillPaint / linePaint (pass false to omit a layer), and pass MapLibre expressions as paint values for data-driven styling. Hover highlighting via fillHoverPaint requires promoteId.PropTypeDefaultDescriptiondataFeatureCollection | Feature | Geometry | string—GeoJSON data (FeatureCollection, Feature, or Geometry) or a URL string to fetch it from.idstringautoId prefix for the underlying source/layers.promoteIdstring—Feature property to promote to the feature id. Required for hover feature-state (fillHoverPaint) and stable onHover / onClick payloads.fillPaintFillLayerSpecification['paint'] | false—Paint for the polygon fill layer, merged over a theme-aware fill-color default. Pass false to omit the fill layer (e.g. outlines only).linePaintLineLayerSpecification['paint'] | false—Paint for the outline layer, merged over a theme-aware hairline default. Pass false to omit the outline layer.fillHoverPaintFillLayerSpecification['paint']—Paint merged onto the fill layer for the hovered feature, applied via hover feature-state. Requires promoteId.onClick(e: MapGeoJSONEvent) => void—Fired when a feature is clicked.onHover(e: MapGeoJSONEvent | null) => void—Fired when the hovered feature changes. Receives null when the cursor leaves all features.interactivebooleanfalseRespond to mouse events (hover, cursor, callbacks).beforeIdstring—Insert the layers before this layer id.MapClusterLayerRenders clustered point data using MapLibre GL's native clustering. Automatically groups nearby points into clusters that expand on click. Must be used inside Map. Supports a generic type parameter for typed feature properties: MapClusterLayer<MyProperties>.PropTypeDefaultDescriptiondatastring | GeoJSON.FeatureCollection—GeoJSON FeatureCollection data or URL to fetch GeoJSON from.clusterMaxZoomnumber14Maximum zoom level to cluster points on.clusterRadiusnumber50Radius of each cluster when clustering points (in pixels).clusterColors[string, string, string]["#22c55e", "#eab308", "#ef4444"]Colors for cluster circles: [small, medium, large] based on point count.clusterThresholds[number, number][100, 750]Point count thresholds for color/size steps: [medium, large].pointColorstring"#3b82f6"Color for unclustered individual points.onPointClick(feature: GeoJSON.Feature, coordinates: [number, number]) => void—Callback when an unclustered point is clicked.onClusterClick(clusterId: number, coordinates: [number, number], pointCount: number) => void—Callback when a cluster is clicked. If not provided, zooms into the cluster. InstallationMap On This PageComponent AnatomyMapuseMapMapControlsMapMarkerMarkerContentMarkerPopupMarkerTooltipMarkerLabelMapPopupMapRouteMapArcMapGeoJSONMapClusterLayer

---

# Markers

Source: https://www.mapcn.dev/docs/markers

BasicsGetting StartedInstallationllms.txtAPI ReferenceComponentsMapControlsMarkersPopupsRoutesArcsGeoJSONClustersAdvancedMarkersAdd interactive markers to your map with popups and tooltips.Use MapMarker to place markers on the map. Each marker can have custom content, popups that open on click, and tooltips that appear on hover.Performance tip: MapMarker is DOM-based and works best for a few hundred markers. For larger datasets, see the GeoJSON layers example instead. Rendering many DOM markers can make the browser sluggish.Basic ExampleSimple markers with tooltips and popups showing location information.import {
 Map,
 MapMarker,
 MarkerContent,
 MarkerPopup,
 MarkerTooltip,
} from "@/components/ui/map";

const locations = [
 {
 id: 1,
 name: "Empire State Building",
 lng: -73.9857,
 lat: 40.7484,
 },
 {
 id: 2,
 name: "Central Park",
 lng: -73.9654,
 lat: 40.7829,
 },
 { id: 3, name: "Times Square", lng: -73.9855, lat: 40.758 },
];

export function MarkersExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.98, 40.76]} zoom={12}>
 {locations.map((location) => (
 <MapMarker
 key={location.id}
 longitude={location.lng}
 latitude={location.lat}
 >
 <MarkerContent>
 <div className="bg-primary size-4 rounded-full border-2 border-white shadow-lg" />
 </MarkerContent>
 <MarkerTooltip>{location.name}</MarkerTooltip>
 <MarkerPopup>
 <div className="space-y-1">
 <p className="text-foreground font-medium">{location.name}</p>
 <p className="text-muted-foreground text-xs">
 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
 </p>
 </div>
 </MarkerPopup>
 </MapMarker>
 ))}
 </Map>
 </div>
 );
}
View CodeRich PopupsBuild complex popups with images, ratings, and action buttons using shadcn/ui components.import {
 Map,
 MapMarker,
 MarkerContent,
 MarkerLabel,
 MarkerPopup,
} from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Star, Navigation, Clock, ExternalLink } from "lucide-react";
import Image from "next/image";

const places = [
 {
 id: 1,
 name: "The Metropolitan Museum of Art",
 label: "Museum",
 category: "Museum",
 rating: 4.8,
 reviews: 12453,
 hours: "10:00 AM - 5:00 PM",
 image:
 "https://images.unsplash.com/photo-1575223970966-76ae61ee7838?w=300&h=200&fit=crop",
 lng: -73.9632,
 lat: 40.7794,
 },
 {
 id: 2,
 name: "Brooklyn Bridge",
 label: "Landmark",
 category: "Landmark",
 rating: 4.9,
 reviews: 8234,
 hours: "Open 24 hours",
 image:
 "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=300&h=200&fit=crop",
 lng: -73.9969,
 lat: 40.7061,
 },
 {
 id: 3,
 name: "Grand Central Terminal",
 label: "Transit",
 category: "Transit",
 rating: 4.7,
 reviews: 5621,
 hours: "5:15 AM - 2:00 AM",
 image:
 "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=300&h=200&fit=crop",
 lng: -73.9772,
 lat: 40.7527,
 },
];

export function PopupExample() {
 return (
 <div className="h-[500px] w-full">
 <Map center={[-73.98, 40.74]} zoom={11}>
 {places.map((place) => (
 <MapMarker key={place.id} longitude={place.lng} latitude={place.lat}>
 <MarkerContent>
 <div className="size-5 cursor-pointer rounded-full border-2 border-white bg-rose-500 shadow-lg transition-transform hover:scale-110" />
 <MarkerLabel position="bottom">{place.label}</MarkerLabel>
 </MarkerContent>
 <MarkerPopup className="w-62 p-0">
 <div className="relative h-32 overflow-hidden rounded-t-md">
 <Image
 fill
 src={place.image}
 alt={place.name}
 className="object-cover"
 />
 </div>
 <div className="space-y-2 p-3">
 <div>
 <p className="text-muted-foreground pb-0.5 text-[11px] font-medium tracking-wide uppercase">
 {place.category}
 </p>
 <h3 className="text-foreground leading-tight font-semibold">
 {place.name}
 </h3>
 </div>
 <div className="flex items-center gap-3 text-sm">
 <div className="flex items-center gap-1">
 <Star className="size-3.5 fill-amber-400 text-amber-400" />
 <span className="font-medium">{place.rating}</span>
 <span className="text-muted-foreground">
 ({place.reviews.toLocaleString()})
 </span>
 </div>
 </div>
 <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
 <Clock className="size-3.5" />
 <span>{place.hours}</span>
 </div>
 <div className="flex gap-2 pt-1">
 <Button size="sm" className="flex-1">
 <Navigation className="size-3.5" />
 Directions
 </Button>
 <Button size="icon-sm" variant="outline">
 <ExternalLink className="size-3.5" />
 </Button>
 </div>
 </div>
 </MarkerPopup>
 </MapMarker>
 ))}
 </Map>
 </div>
 );
}
View CodeDraggable MarkerCreate draggable markers that users can move around the map. Click the marker to see its current coordinates in a popup."use client";

import { useState } from "react";
import { Map, MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { MapPin } from "lucide-react";

export function DraggableMarkerExample() {
 const [draggableMarker, setDraggableMarker] = useState({
 lng: -73.98,
 lat: 40.75,
 });

 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.98, 40.75]} zoom={12}>
 <MapMarker
 draggable
 longitude={draggableMarker.lng}
 latitude={draggableMarker.lat}
 onDrag={(lngLat) => {
 setDraggableMarker({ lng: lngLat.lng, lat: lngLat.lat });
 }}
 >
 <MarkerContent>
 <div className="cursor-move">
 <MapPin
 className="fill-black stroke-white dark:fill-white"
 size={28}
 />
 </div>
 </MarkerContent>
 <MarkerPopup>
 <div className="space-y-1">
 <p className="text-foreground font-medium">Coordinates</p>
 <p className="text-muted-foreground text-xs tabular-nums">
 {draggableMarker.lat.toFixed(4)},{" "}
 {draggableMarker.lng.toFixed(4)}
 </p>
 </div>
 </MarkerPopup>
 </MapMarker>
 </Map>
 </div>
 );
}
View Code ControlsPopups On This PageBasic ExampleRich PopupsDraggable MarkerMarkersAdd interactive markers to your map with popups and tooltips.Use MapMarker to place markers on the map. Each marker can have custom content, popups that open on click, and tooltips that appear on hover.Performance tip: MapMarker is DOM-based and works best for a few hundred markers. For larger datasets, see the GeoJSON layers example instead. Rendering many DOM markers can make the browser sluggish.Basic ExampleSimple markers with tooltips and popups showing location information.import {
 Map,
 MapMarker,
 MarkerContent,
 MarkerPopup,
 MarkerTooltip,
} from "@/components/ui/map";

const locations = [
 {
 id: 1,
 name: "Empire State Building",
 lng: -73.9857,
 lat: 40.7484,
 },
 {
 id: 2,
 name: "Central Park",
 lng: -73.9654,
 lat: 40.7829,
 },
 { id: 3, name: "Times Square", lng: -73.9855, lat: 40.758 },
];

export function MarkersExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.98, 40.76]} zoom={12}>
 {locations.map((location) => (
 <MapMarker
 key={location.id}
 longitude={location.lng}
 latitude={location.lat}
 >
 <MarkerContent>
 <div className="bg-primary size-4 rounded-full border-2 border-white shadow-lg" />
 </MarkerContent>
 <MarkerTooltip>{location.name}</MarkerTooltip>
 <MarkerPopup>
 <div className="space-y-1">
 <p className="text-foreground font-medium">{location.name}</p>
 <p className="text-muted-foreground text-xs">
 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
 </p>
 </div>
 </MarkerPopup>
 </MapMarker>
 ))}
 </Map>
 </div>
 );
}
View CodeRich PopupsBuild complex popups with images, ratings, and action buttons using shadcn/ui components.import {
 Map,
 MapMarker,
 MarkerContent,
 MarkerLabel,
 MarkerPopup,
} from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Star, Navigation, Clock, ExternalLink } from "lucide-react";
import Image from "next/image";

const places = [
 {
 id: 1,
 name: "The Metropolitan Museum of Art",
 label: "Museum",
 category: "Museum",
 rating: 4.8,
 reviews: 12453,
 hours: "10:00 AM - 5:00 PM",
 image:
 "https://images.unsplash.com/photo-1575223970966-76ae61ee7838?w=300&h=200&fit=crop",
 lng: -73.9632,
 lat: 40.7794,
 },
 {
 id: 2,
 name: "Brooklyn Bridge",
 label: "Landmark",
 category: "Landmark",
 rating: 4.9,
 reviews: 8234,
 hours: "Open 24 hours",
 image:
 "https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=300&h=200&fit=crop",
 lng: -73.9969,
 lat: 40.7061,
 },
 {
 id: 3,
 name: "Grand Central Terminal",
 label: "Transit",
 category: "Transit",
 rating: 4.7,
 reviews: 5621,
 hours: "5:15 AM - 2:00 AM",
 image:
 "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=300&h=200&fit=crop",
 lng: -73.9772,
 lat: 40.7527,
 },
];

export function PopupExample() {
 return (
 <div className="h-[500px] w-full">
 <Map center={[-73.98, 40.74]} zoom={11}>
 {places.map((place) => (
 <MapMarker key={place.id} longitude={place.lng} latitude={place.lat}>
 <MarkerContent>
 <div className="size-5 cursor-pointer rounded-full border-2 border-white bg-rose-500 shadow-lg transition-transform hover:scale-110" />
 <MarkerLabel position="bottom">{place.label}</MarkerLabel>
 </MarkerContent>
 <MarkerPopup className="w-62 p-0">
 <div className="relative h-32 overflow-hidden rounded-t-md">
 <Image
 fill
 src={place.image}
 alt={place.name}
 className="object-cover"
 />
 </div>
 <div className="space-y-2 p-3">
 <div>
 <p className="text-muted-foreground pb-0.5 text-[11px] font-medium tracking-wide uppercase">
 {place.category}
 </p>
 <h3 className="text-foreground leading-tight font-semibold">
 {place.name}
 </h3>
 </div>
 <div className="flex items-center gap-3 text-sm">
 <div className="flex items-center gap-1">
 <Star className="size-3.5 fill-amber-400 text-amber-400" />
 <span className="font-medium">{place.rating}</span>
 <span className="text-muted-foreground">
 ({place.reviews.toLocaleString()})
 </span>
 </div>
 </div>
 <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
 <Clock className="size-3.5" />
 <span>{place.hours}</span>
 </div>
 <div className="flex gap-2 pt-1">
 <Button size="sm" className="flex-1">
 <Navigation className="size-3.5" />
 Directions
 </Button>
 <Button size="icon-sm" variant="outline">
 <ExternalLink className="size-3.5" />
 </Button>
 </div>
 </div>
 </MarkerPopup>
 </MapMarker>
 ))}
 </Map>
 </div>
 );
}
View CodeDraggable MarkerCreate draggable markers that users can move around the map. Click the marker to see its current coordinates in a popup."use client";

import { useState } from "react";
import { Map, MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { MapPin } from "lucide-react";

export function DraggableMarkerExample() {
 const [draggableMarker, setDraggableMarker] = useState({
 lng: -73.98,
 lat: 40.75,
 });

 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.98, 40.75]} zoom={12}>
 <MapMarker
 draggable
 longitude={draggableMarker.lng}
 latitude={draggableMarker.lat}
 onDrag={(lngLat) => {
 setDraggableMarker({ lng: lngLat.lng, lat: lngLat.lat });
 }}
 >
 <MarkerContent>
 <div className="cursor-move">
 <MapPin
 className="fill-black stroke-white dark:fill-white"
 size={28}
 />
 </div>
 </MarkerContent>
 <MarkerPopup>
 <div className="space-y-1">
 <p className="text-foreground font-medium">Coordinates</p>
 <p className="text-muted-foreground text-xs tabular-nums">
 {draggableMarker.lat.toFixed(4)},{" "}
 {draggableMarker.lng.toFixed(4)}
 </p>
 </div>
 </MarkerPopup>
 </MapMarker>
 </Map>
 </div>
 );
}
View Code ControlsPopups On This PageBasic ExampleRich PopupsDraggable Marker

---

# Routes

Source: https://www.mapcn.dev/docs/routes

BasicsGetting StartedInstallationllms.txtAPI ReferenceComponentsMapControlsMarkersPopupsRoutesArcsGeoJSONClustersAdvancedRoutesDraw lines and paths connecting coordinates on the map.Use MapRoute to draw lines connecting a series of coordinates. Perfect for showing directions, trails, or any path between points.Basic RouteDraw a route with numbered stop markers along the path.import {
 Map,
 MapMarker,
 MarkerContent,
 MarkerTooltip,
 MapRoute,
} from "@/components/ui/map";

const route = [
 [-74.006, 40.7128], // NYC City Hall
 [-73.9857, 40.7484], // Empire State Building
 [-73.9772, 40.7527], // Grand Central
 [-73.9654, 40.7829], // Central Park
] as [number, number][];

const stops = [
 { name: "City Hall", lng: -74.006, lat: 40.7128 },
 { name: "Empire State Building", lng: -73.9857, lat: 40.7484 },
 { name: "Grand Central Terminal", lng: -73.9772, lat: 40.7527 },
 { name: "Central Park", lng: -73.9654, lat: 40.7829 },
];

export function RouteExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.98, 40.75]} zoom={11.2}>
 <MapRoute coordinates={route} color="#3b82f6" width={4} opacity={0.8} />

 {stops.map((stop, index) => (
 <MapMarker key={stop.name} longitude={stop.lng} latitude={stop.lat}>
 <MarkerContent>
 <div className="flex size-4.5 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-xs font-semibold text-white shadow-lg">
 {index + 1}
 </div>
 </MarkerContent>
 <MarkerTooltip>{stop.name}</MarkerTooltip>
 </MapMarker>
 ))}
 </Map>
 </div>
 );
}
View CodeRoute PlanningDisplay multiple route options and let users select between them. This example fetches real driving directions from the OSRM API. Click on a route or use the buttons to switch."use client";

import { useEffect, useState } from "react";
import {
 Map,
 MapMarker,
 MarkerContent,
 MapRoute,
 MarkerLabel,
} from "@/components/ui/map";
import { Loader2, Clock, Route } from "lucide-react";
import { Button } from "@/components/ui/button";

const start = { name: "Amsterdam", lng: 4.9041, lat: 52.3676 };
const end = { name: "Rotterdam", lng: 4.4777, lat: 51.9244 };

interface RouteData {
 coordinates: [number, number][];
 duration: number; // seconds
 distance: number; // meters
}

function formatDuration(seconds: number): string {
 const mins = Math.round(seconds / 60);
 if (mins < 60) return `${mins} min`;
 const hours = Math.floor(mins / 60);
 const remainingMins = mins % 60;
 return `${hours}h ${remainingMins}m`;
}

function formatDistance(meters: number): string {
 if (meters < 1000) return `${Math.round(meters)} m`;
 return `${(meters / 1000).toFixed(1)} km`;
}

export function OsrmRouteExample() {
 const [routes, setRoutes] = useState<RouteData[]>([]);
 const [selectedIndex, setSelectedIndex] = useState(0);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 async function fetchRoutes() {
 try {
 const response = await fetch(
 `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true`
 );
 const data = await response.json();

 if (data.routes?.length > 0) {
 const routeData: RouteData[] = data.routes.map(
 (route: {
 geometry: { coordinates: [number, number][] };
 duration: number;
 distance: number;
 }) => ({
 coordinates: route.geometry.coordinates,
 duration: route.duration,
 distance: route.distance,
 })
 );
 setRoutes(routeData);
 }
 } catch (error) {
 console.error("Failed to fetch routes:", error);
 } finally {
 setIsLoading(false);
 }
 }

 fetchRoutes();
 }, []);

 // Sort routes: non-selected first, selected last (renders on top)
 const sortedRoutes = routes
 .map((route, index) => ({ route, index }))
 .sort((a, b) => {
 if (a.index === selectedIndex) return 1;
 if (b.index === selectedIndex) return -1;
 return 0;
 });

 return (
 <div className="h-[500px] w-full relative">
 <Map center={[4.69, 52.14]} zoom={8.5}>
 {sortedRoutes.map(({ route, index }) => {
 const isSelected = index === selectedIndex;
 return (
 <MapRoute
 key={index}
 coordinates={route.coordinates}
 color={isSelected ? "#6366f1" : "#94a3b8"}
 width={isSelected ? 6 : 5}
 opacity={isSelected ? 1 : 0.6}
 onClick={() => setSelectedIndex(index)}
 />
 );
 })}

 <MapMarker longitude={start.lng} latitude={start.lat}>
 <MarkerContent>
 <div className="size-5 rounded-full bg-green-500 border-2 border-white shadow-lg" />
 <MarkerLabel position="top">{start.name}</MarkerLabel>
 </MarkerContent>
 </MapMarker>

 <MapMarker longitude={end.lng} latitude={end.lat}>
 <MarkerContent>
 <div className="size-5 rounded-full bg-red-500 border-2 border-white shadow-lg" />
 <MarkerLabel position="bottom">{end.name}</MarkerLabel>
 </MarkerContent>
 </MapMarker>
 </Map>

 {routes.length > 0 && (
 <div className="absolute top-3 left-3 flex flex-col gap-2">
 {routes.map((route, index) => {
 const isActive = index === selectedIndex;
 const isFastest = index === 0;
 return (
 <Button
 key={index}
 variant={isActive ? "default" : "secondary"}
 size="sm"
 onClick={() => setSelectedIndex(index)}
 className="justify-start gap-3"
 >
 <div className="flex items-center gap-1.5">
 <Clock className="size-3.5" />
 <span className="font-medium">
 {formatDuration(route.duration)}
 </span>
 </div>
 <div className="flex items-center gap-1.5 text-xs opacity-80">
 <Route className="size-3" />
 {formatDistance(route.distance)}
 </div>
 {isFastest && (
 <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
 Fastest
 </span>
 )}
 </Button>
 );
 })}
 </div>
 )}

 {isLoading && (
 <div className="absolute inset-0 flex items-center justify-center bg-background/50">
 <Loader2 className="size-6 animate-spin text-muted-foreground" />
 </div>
 )}
 </div>
 );
}
View Code PopupsArcs On This PageBasic RouteRoute PlanningRoutesDraw lines and paths connecting coordinates on the map.Use MapRoute to draw lines connecting a series of coordinates. Perfect for showing directions, trails, or any path between points.Basic RouteDraw a route with numbered stop markers along the path.import {
 Map,
 MapMarker,
 MarkerContent,
 MarkerTooltip,
 MapRoute,
} from "@/components/ui/map";

const route = [
 [-74.006, 40.7128], // NYC City Hall
 [-73.9857, 40.7484], // Empire State Building
 [-73.9772, 40.7527], // Grand Central
 [-73.9654, 40.7829], // Central Park
] as [number, number][];

const stops = [
 { name: "City Hall", lng: -74.006, lat: 40.7128 },
 { name: "Empire State Building", lng: -73.9857, lat: 40.7484 },
 { name: "Grand Central Terminal", lng: -73.9772, lat: 40.7527 },
 { name: "Central Park", lng: -73.9654, lat: 40.7829 },
];

export function RouteExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.98, 40.75]} zoom={11.2}>
 <MapRoute coordinates={route} color="#3b82f6" width={4} opacity={0.8} />

 {stops.map((stop, index) => (
 <MapMarker key={stop.name} longitude={stop.lng} latitude={stop.lat}>
 <MarkerContent>
 <div className="flex size-4.5 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-xs font-semibold text-white shadow-lg">
 {index + 1}
 </div>
 </MarkerContent>
 <MarkerTooltip>{stop.name}</MarkerTooltip>
 </MapMarker>
 ))}
 </Map>
 </div>
 );
}
View CodeRoute PlanningDisplay multiple route options and let users select between them. This example fetches real driving directions from the OSRM API. Click on a route or use the buttons to switch."use client";

import { useEffect, useState } from "react";
import {
 Map,
 MapMarker,
 MarkerContent,
 MapRoute,
 MarkerLabel,
} from "@/components/ui/map";
import { Loader2, Clock, Route } from "lucide-react";
import { Button } from "@/components/ui/button";

const start = { name: "Amsterdam", lng: 4.9041, lat: 52.3676 };
const end = { name: "Rotterdam", lng: 4.4777, lat: 51.9244 };

interface RouteData {
 coordinates: [number, number][];
 duration: number; // seconds
 distance: number; // meters
}

function formatDuration(seconds: number): string {
 const mins = Math.round(seconds / 60);
 if (mins < 60) return `${mins} min`;
 const hours = Math.floor(mins / 60);
 const remainingMins = mins % 60;
 return `${hours}h ${remainingMins}m`;
}

function formatDistance(meters: number): string {
 if (meters < 1000) return `${Math.round(meters)} m`;
 return `${(meters / 1000).toFixed(1)} km`;
}

export function OsrmRouteExample() {
 const [routes, setRoutes] = useState<RouteData[]>([]);
 const [selectedIndex, setSelectedIndex] = useState(0);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 async function fetchRoutes() {
 try {
 const response = await fetch(
 `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true`
 );
 const data = await response.json();

 if (data.routes?.length > 0) {
 const routeData: RouteData[] = data.routes.map(
 (route: {
 geometry: { coordinates: [number, number][] };
 duration: number;
 distance: number;
 }) => ({
 coordinates: route.geometry.coordinates,
 duration: route.duration,
 distance: route.distance,
 })
 );
 setRoutes(routeData);
 }
 } catch (error) {
 console.error("Failed to fetch routes:", error);
 } finally {
 setIsLoading(false);
 }
 }

 fetchRoutes();
 }, []);

 // Sort routes: non-selected first, selected last (renders on top)
 const sortedRoutes = routes
 .map((route, index) => ({ route, index }))
 .sort((a, b) => {
 if (a.index === selectedIndex) return 1;
 if (b.index === selectedIndex) return -1;
 return 0;
 });

 return (
 <div className="h-[500px] w-full relative">
 <Map center={[4.69, 52.14]} zoom={8.5}>
 {sortedRoutes.map(({ route, index }) => {
 const isSelected = index === selectedIndex;
 return (
 <MapRoute
 key={index}
 coordinates={route.coordinates}
 color={isSelected ? "#6366f1" : "#94a3b8"}
 width={isSelected ? 6 : 5}
 opacity={isSelected ? 1 : 0.6}
 onClick={() => setSelectedIndex(index)}
 />
 );
 })}

 <MapMarker longitude={start.lng} latitude={start.lat}>
 <MarkerContent>
 <div className="size-5 rounded-full bg-green-500 border-2 border-white shadow-lg" />
 <MarkerLabel position="top">{start.name}</MarkerLabel>
 </MarkerContent>
 </MapMarker>

 <MapMarker longitude={end.lng} latitude={end.lat}>
 <MarkerContent>
 <div className="size-5 rounded-full bg-red-500 border-2 border-white shadow-lg" />
 <MarkerLabel position="bottom">{end.name}</MarkerLabel>
 </MarkerContent>
 </MapMarker>
 </Map>

 {routes.length > 0 && (
 <div className="absolute top-3 left-3 flex flex-col gap-2">
 {routes.map((route, index) => {
 const isActive = index === selectedIndex;
 const isFastest = index === 0;
 return (
 <Button
 key={index}
 variant={isActive ? "default" : "secondary"}
 size="sm"
 onClick={() => setSelectedIndex(index)}
 className="justify-start gap-3"
 >
 <div className="flex items-center gap-1.5">
 <Clock className="size-3.5" />
 <span className="font-medium">
 {formatDuration(route.duration)}
 </span>
 </div>
 <div className="flex items-center gap-1.5 text-xs opacity-80">
 <Route className="size-3" />
 {formatDistance(route.distance)}
 </div>
 {isFastest && (
 <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
 Fastest
 </span>
 )}
 </Button>
 );
 })}
 </div>
 )}

 {isLoading && (
 <div className="absolute inset-0 flex items-center justify-center bg-background/50">
 <Loader2 className="size-6 animate-spin text-muted-foreground" />
 </div>
 )}
 </div>
 );
}
View Code PopupsArcs On This PageBasic RouteRoute Planning

---

# Clusters

Source: https://www.mapcn.dev/docs/clusters

BasicsGetting StartedInstallationllms.txtAPI ReferenceComponentsMapControlsMarkersPopupsRoutesArcsGeoJSONClustersAdvancedClustersVisualize large datasets with automatic point clustering.The MapClusterLayercomponent uses MapLibre's built-in clustering to efficiently render large numbers of points. Points are automatically grouped into clusters at low zoom levels, and expand as you zoom in.Basic ExampleClick on clusters to zoom in. Click individual points to see details in a popup."use client";

import { useState } from "react";
import { Map, MapClusterLayer, MapPopup, MapControls } from "@/components/ui/map";

interface EarthquakeProperties {
 mag: number;
 place: string;
 tsunami: number;
}

export default function ClusterExample() {
 const [selectedPoint, setSelectedPoint] = useState<{
 coordinates: [number, number];
 properties: EarthquakeProperties;
 } | null>(null);

 return (
 <div className="h-[420px] w-full">
 <Map center={[-103.59, 40.66]} zoom={3.4} fadeDuration={0}>
 <MapClusterLayer<EarthquakeProperties>
 data="https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson"
 clusterRadius={50}
 clusterMaxZoom={14}
 clusterColors={["#1d8cf8", "#6d5dfc", "#e23670"]}
 pointColor="#1d8cf8"
 onPointClick={(feature, coordinates) => {
 setSelectedPoint({
 coordinates,
 properties: feature.properties,
 });
 }}
 />

 {selectedPoint && (
 <MapPopup
 key={`${selectedPoint.coordinates[0]}-${selectedPoint.coordinates[1]}`}
 longitude={selectedPoint.coordinates[0]}
 latitude={selectedPoint.coordinates[1]}
 onClose={() => setSelectedPoint(null)}
 closeOnClick={false}
 focusAfterOpen={false}
 closeButton
 className="w-34"
 >
 <div className="text-[13px]">
 <p className="text-muted-foreground">
 Magnitude:{" "}
 <span className="text-foreground font-medium">
 {selectedPoint.properties.mag}
 </span>
 </p>
 <p className="text-muted-foreground">
 Tsunami:{" "}
 <span className="text-foreground font-medium">
 {selectedPoint.properties?.tsunami === 1 ? "Yes" : "No"}
 </span>
 </p>
 </div>
 </MapPopup>
 )}

 <MapControls />
 </Map>
 </div>
 );
}
View Code GeoJSONAdvanced ClustersVisualize large datasets with automatic point clustering.The MapClusterLayercomponent uses MapLibre's built-in clustering to efficiently render large numbers of points. Points are automatically grouped into clusters at low zoom levels, and expand as you zoom in.Basic ExampleClick on clusters to zoom in. Click individual points to see details in a popup."use client";

import { useState } from "react";
import { Map, MapClusterLayer, MapPopup, MapControls } from "@/components/ui/map";

interface EarthquakeProperties {
 mag: number;
 place: string;
 tsunami: number;
}

export default function ClusterExample() {
 const [selectedPoint, setSelectedPoint] = useState<{
 coordinates: [number, number];
 properties: EarthquakeProperties;
 } | null>(null);

 return (
 <div className="h-[420px] w-full">
 <Map center={[-103.59, 40.66]} zoom={3.4} fadeDuration={0}>
 <MapClusterLayer<EarthquakeProperties>
 data="https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson"
 clusterRadius={50}
 clusterMaxZoom={14}
 clusterColors={["#1d8cf8", "#6d5dfc", "#e23670"]}
 pointColor="#1d8cf8"
 onPointClick={(feature, coordinates) => {
 setSelectedPoint({
 coordinates,
 properties: feature.properties,
 });
 }}
 />

 {selectedPoint && (
 <MapPopup
 key={`${selectedPoint.coordinates[0]}-${selectedPoint.coordinates[1]}`}
 longitude={selectedPoint.coordinates[0]}
 latitude={selectedPoint.coordinates[1]}
 onClose={() => setSelectedPoint(null)}
 closeOnClick={false}
 focusAfterOpen={false}
 closeButton
 className="w-34"
 >
 <div className="text-[13px]">
 <p className="text-muted-foreground">
 Magnitude:{" "}
 <span className="text-foreground font-medium">
 {selectedPoint.properties.mag}
 </span>
 </p>
 <p className="text-muted-foreground">
 Tsunami:{" "}
 <span className="text-foreground font-medium">
 {selectedPoint.properties?.tsunami === 1 ? "Yes" : "No"}
 </span>
 </p>
 </div>
 </MapPopup>
 )}

 <MapControls />
 </Map>
 </div>
 );
}
View Code GeoJSONAdvanced

---

# Advanced

Source: https://www.mapcn.dev/docs/advanced-usage

BasicsGetting StartedInstallationllms.txtAPI ReferenceComponentsMapControlsMarkersPopupsRoutesArcsGeoJSONClustersAdvancedAdvancedAccess the underlying MapLibre GL instance for advanced customization.Access the underlying MapLibre GL map instance to use any feature from the MapLibre GL JS API. You can use either a ref or the useMap hook.Tip: Check the MapLibre GL JS documentation for the full list of available methods and events.Using a RefThe simplest way to access the map instance. Use a ref to call map methods from event handlers or effects.import { Map, type MapRef } from "@/components/ui/map";
import { useRef } from "react";

function MyMapComponent() {
 const mapRef = useRef<MapRef>(null);

 const handleFlyTo = () => {
 // Access the MapLibre GL map instance via ref
 mapRef.current?.flyTo({ center: [-74, 40.7], zoom: 12 });
 };

 return (
 <>
 <button onClick={handleFlyTo}>Fly to NYC</button>
 <Map ref={mapRef} center={[-74, 40.7]} zoom={10} />
 </>
 );
}Using the HookFor child components rendered inside Map, use the useMap hook to access the map instance and listen to events.import { Map, useMap } from "@/components/ui/map";
import { useEffect } from "react";

// For child components inside Map, use the useMap hook
function MapEventListener() {
 const { map, isLoaded } = useMap();

 useEffect(() => {
 if (!map || !isLoaded) return;
 
 const handleClick = (e) => {
 console.log("Clicked at:", e.lngLat);
 };

 map.on("click", handleClick);
 return () => map.off("click", handleClick);
 }, [map, isLoaded]);

 return null;
}

// Usage
<Map center={[-74, 40.7]} zoom={10}>
 <MapEventListener />
</Map>Example: Custom ControlsThis example shows how to create custom controls that manipulate the map's pitch and bearing, and listen to map events to display real-time values."use client";

import { useEffect, useState } from "react";
import { Map, useMap } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { RotateCcw, Mountain } from "lucide-react";

function MapController() {
 const { map, isLoaded } = useMap();
 const [pitch, setPitch] = useState(0);
 const [bearing, setBearing] = useState(0);

 useEffect(() => {
 if (!map || !isLoaded) return;

 const handleMove = () => {
 setPitch(Math.round(map.getPitch()));
 setBearing(Math.round(map.getBearing()));
 };

 map.on("move", handleMove);
 return () => {
 map.off("move", handleMove);
 };
 }, [map, isLoaded]);

 const handle3DView = () => {
 map?.easeTo({
 pitch: 60,
 bearing: -20,
 duration: 1000,
 });
 };

 const handleReset = () => {
 map?.easeTo({
 pitch: 0,
 bearing: 0,
 duration: 1000,
 });
 };

 if (!isLoaded) return null;

 return (
 <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
 <div className="flex gap-2">
 <Button size="sm" variant="secondary" onClick={handle3DView}>
 <Mountain className="mr-1.5 size-4" />
 3D View
 </Button>
 <Button size="sm" variant="secondary" onClick={handleReset}>
 <RotateCcw className="mr-1.5 size-4" />
 Reset
 </Button>
 </div>
 <div className="bg-background/90 rounded-md border px-3 py-2 font-mono text-xs backdrop-blur">
 <div>Pitch: {pitch}°</div>
 <div>Bearing: {bearing}°</div>
 </div>
 </div>
 );
}

export function AdvancedUsageExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.9857, 40.7484]} zoom={15}>
 <MapController />
 </Map>
 </div>
 );
}
View CodeExample: Custom GeoJSON LayerAdd custom GeoJSON data as layers with fill and outline styles. This example shows NYC parks with hover interactions."use client";

import { useCallback, useEffect, useState } from "react";
import { Map, MapControls, useMap } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Layers, X } from "lucide-react";

const geojsonData = {
 type: "FeatureCollection" as const,
 features: [
 {
 type: "Feature" as const,
 properties: { name: "Central Park", type: "park" },
 geometry: {
 type: "Polygon" as const,
 coordinates: [
 [
 [-73.9731, 40.7644],
 [-73.9819, 40.7681],
 [-73.958, 40.8006],
 [-73.9493, 40.7969],
 [-73.9731, 40.7644],
 ],
 ],
 },
 },
 {
 type: "Feature" as const,
 properties: { name: "Bryant Park", type: "park" },
 geometry: {
 type: "Polygon" as const,
 coordinates: [
 [
 [-73.9837, 40.7536],
 [-73.9854, 40.7542],
 [-73.984, 40.7559],
 [-73.9823, 40.7553],
 [-73.9837, 40.7536],
 ],
 ],
 },
 },
 ],
};

function CustomLayer() {
 const { map, isLoaded } = useMap();
 const [isLayerVisible, setIsLayerVisible] = useState(false);
 const [hoveredPark, setHoveredPark] = useState<string | null>(null);

 const addLayers = useCallback(() => {
 if (!map) return;
 // Add source if it doesn't exist
 if (!map.getSource("parks")) {
 map.addSource("parks", {
 type: "geojson",
 data: geojsonData,
 });
 }

 // Add fill layer if it doesn't exist
 if (!map.getLayer("parks-fill")) {
 map.addLayer({
 id: "parks-fill",
 type: "fill",
 source: "parks",
 paint: {
 "fill-color": "#22c55e",
 "fill-opacity": 0.4,
 },
 layout: {
 visibility: isLayerVisible ? "visible" : "none",
 },
 });
 }

 // Add outline layer if it doesn't exist
 if (!map.getLayer("parks-outline")) {
 map.addLayer({
 id: "parks-outline",
 type: "line",
 source: "parks",
 paint: {
 "line-color": "#16a34a",
 "line-width": 2,
 },
 layout: {
 visibility: isLayerVisible ? "visible" : "none",
 },
 });
 }
 }, [map, isLayerVisible]);

 useEffect(() => {
 if (!map || !isLoaded) return;

 // Add layers on mount
 addLayers();

 // Hover effect
 const handleMouseEnter = () => {
 map.getCanvas().style.cursor = "pointer";
 };

 const handleMouseLeave = () => {
 map.getCanvas().style.cursor = "";
 setHoveredPark(null);
 };

 const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
 const features = map.queryRenderedFeatures(e.point, {
 layers: ["parks-fill"],
 });
 if (features.length > 0) {
 setHoveredPark(features[0].properties?.name || null);
 }
 };

 map.on("mouseenter", "parks-fill", handleMouseEnter);
 map.on("mouseleave", "parks-fill", handleMouseLeave);
 map.on("mousemove", "parks-fill", handleMouseMove);

 return () => {
 map.off("mouseenter", "parks-fill", handleMouseEnter);
 map.off("mouseleave", "parks-fill", handleMouseLeave);
 map.off("mousemove", "parks-fill", handleMouseMove);
 };
 }, [map, isLoaded, isLayerVisible]);

 const toggleLayer = () => {
 if (!map) return;

 const visibility = isLayerVisible ? "none" : "visible";
 map.setLayoutProperty("parks-fill", "visibility", visibility);
 map.setLayoutProperty("parks-outline", "visibility", visibility);
 setIsLayerVisible(!isLayerVisible);
 };

 return (
 <>
 <div className="absolute top-3 left-3 z-10">
 <Button
 size="sm"
 variant={isLayerVisible ? "default" : "secondary"}
 onClick={toggleLayer}
 >
 {isLayerVisible ? (
 <X className="mr-1.5 size-4" />
 ) : (
 <Layers className="mr-1.5 size-4" />
 )}
 {isLayerVisible ? "Hide Parks" : "Show Parks"}
 </Button>
 </div>

 {hoveredPark && (
 <div className="bg-background/90 absolute bottom-3 left-3 z-10 rounded-md border px-3 py-2 text-sm font-medium backdrop-blur">
 {hoveredPark}
 </div>
 )}
 </>
 );
}

export function CustomLayerExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.97, 40.78]} zoom={11.8}>
 <MapControls />
 <CustomLayer />
 </Map>
 </div>
 );
}
View CodeExample: Markers via LayersWhen displaying hundreds or thousands of markers, use GeoJSON layers instead of DOM-based MapMarker components. This approach renders markers on the WebGL canvas, providing significantly better performance."use client";

import { useEffect, useState, useId } from "react";
import { Map, MapPopup, useMap } from "@/components/ui/map";

// Generate random points around NYC
function generateRandomPoints(count: number) {
 const center = { lng: -73.98, lat: 40.75 };
 const features = [];

 for (let i = 0; i < count; i++) {
 const lng = center.lng + (Math.random() - 0.5) * 0.15;
 const lat = center.lat + (Math.random() - 0.5) * 0.1;
 features.push({
 type: "Feature" as const,
 properties: {
 id: i,
 name: `Location ${i + 1}`,
 category: ["Restaurant", "Cafe", "Bar", "Shop"][
 Math.floor(Math.random() * 4)
 ],
 },
 geometry: {
 type: "Point" as const,
 coordinates: [lng, lat],
 },
 });
 }

 return {
 type: "FeatureCollection" as const,
 features,
 };
}

// 200 markers - would be slow with DOM markers, but fast with layers
const pointsData = generateRandomPoints(200);

interface SelectedPoint {
 id: number;
 name: string;
 category: string;
 coordinates: [number, number];
}

function MarkersLayer() {
 const { map, isLoaded } = useMap();
 const id = useId();
 const sourceId = `markers-source-${id}`;
 const layerId = `markers-layer-${id}`;
 const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
 null,
 );

 useEffect(() => {
 if (!map || !isLoaded) return;

 map.addSource(sourceId, {
 type: "geojson",
 data: pointsData,
 });

 map.addLayer({
 id: layerId,
 type: "circle",
 source: sourceId,
 paint: {
 "circle-radius": 6,
 "circle-color": "#3b82f6",
 "circle-stroke-width": 2,
 "circle-stroke-color": "#ffffff",
 // add more paint properties here to customize the appearance of the markers
 },
 });

 const handleClick = (
 e: maplibregl.MapMouseEvent & {
 features?: maplibregl.MapGeoJSONFeature[];
 },
 ) => {
 if (!e.features?.length) return;

 const feature = e.features[0];
 const coords = (feature.geometry as GeoJSON.Point).coordinates as [
 number,
 number,
 ];

 setSelectedPoint({
 id: feature.properties?.id,
 name: feature.properties?.name,
 category: feature.properties?.category,
 coordinates: coords,
 });
 };

 const handleMouseEnter = () => {
 map.getCanvas().style.cursor = "pointer";
 };

 const handleMouseLeave = () => {
 map.getCanvas().style.cursor = "";
 };

 map.on("click", layerId, handleClick);
 map.on("mouseenter", layerId, handleMouseEnter);
 map.on("mouseleave", layerId, handleMouseLeave);

 return () => {
 map.off("click", layerId, handleClick);
 map.off("mouseenter", layerId, handleMouseEnter);
 map.off("mouseleave", layerId, handleMouseLeave);

 try {
 if (map.getLayer(layerId)) map.removeLayer(layerId);
 if (map.getSource(sourceId)) map.removeSource(sourceId);
 } catch {
 // ignore cleanup errors
 }
 };
 }, [map, isLoaded, sourceId, layerId]);

 return (
 <>
 {selectedPoint && (
 <MapPopup
 longitude={selectedPoint.coordinates[0]}
 latitude={selectedPoint.coordinates[1]}
 onClose={() => setSelectedPoint(null)}
 closeOnClick={false}
 focusAfterOpen={false}
 offset={10}
 closeButton
 >
 <div className="min-w-24">
 <p className="font-medium">{selectedPoint.name}</p>
 <p className="text-muted-foreground text-sm">
 {selectedPoint.category}
 </p>
 </div>
 </MapPopup>
 )}
 </>
 );
}

export function LayerMarkersExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.98, 40.75]} zoom={11}>
 <MarkersLayer />
 </Map>
 </div>
 );
}
View CodeExtend to BuildYou can extend this to build custom features like:Real-time tracking - Live location updates for delivery, rides, or fleet managementGeofencing - Trigger actions when users enter or leave specific areasHeatmaps - Visualize density data like population, crime, or activity hotspotsDrawing tools - Let users draw polygons, lines, or place markers for custom areas3D buildings - Extrude building footprints for urban visualizationAnimations - Animate markers along routes or create fly-through experiencesCustom data layers - Overlay weather, traffic, or satellite imagery ClustersOn This PageUsing a RefUsing the HookExample: Custom ControlsExample: Custom GeoJSON LayerExample: Markers via LayersExtend to BuildAdvancedAccess the underlying MapLibre GL instance for advanced customization.Access the underlying MapLibre GL map instance to use any feature from the MapLibre GL JS API. You can use either a ref or the useMap hook.Tip: Check the MapLibre GL JS documentation for the full list of available methods and events.Using a RefThe simplest way to access the map instance. Use a ref to call map methods from event handlers or effects.import { Map, type MapRef } from "@/components/ui/map";
import { useRef } from "react";

function MyMapComponent() {
 const mapRef = useRef<MapRef>(null);

 const handleFlyTo = () => {
 // Access the MapLibre GL map instance via ref
 mapRef.current?.flyTo({ center: [-74, 40.7], zoom: 12 });
 };

 return (
 <>
 <button onClick={handleFlyTo}>Fly to NYC</button>
 <Map ref={mapRef} center={[-74, 40.7]} zoom={10} />
 </>
 );
}Using the HookFor child components rendered inside Map, use the useMap hook to access the map instance and listen to events.import { Map, useMap } from "@/components/ui/map";
import { useEffect } from "react";

// For child components inside Map, use the useMap hook
function MapEventListener() {
 const { map, isLoaded } = useMap();

 useEffect(() => {
 if (!map || !isLoaded) return;
 
 const handleClick = (e) => {
 console.log("Clicked at:", e.lngLat);
 };

 map.on("click", handleClick);
 return () => map.off("click", handleClick);
 }, [map, isLoaded]);

 return null;
}

// Usage
<Map center={[-74, 40.7]} zoom={10}>
 <MapEventListener />
</Map>Example: Custom ControlsThis example shows how to create custom controls that manipulate the map's pitch and bearing, and listen to map events to display real-time values."use client";

import { useEffect, useState } from "react";
import { Map, useMap } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { RotateCcw, Mountain } from "lucide-react";

function MapController() {
 const { map, isLoaded } = useMap();
 const [pitch, setPitch] = useState(0);
 const [bearing, setBearing] = useState(0);

 useEffect(() => {
 if (!map || !isLoaded) return;

 const handleMove = () => {
 setPitch(Math.round(map.getPitch()));
 setBearing(Math.round(map.getBearing()));
 };

 map.on("move", handleMove);
 return () => {
 map.off("move", handleMove);
 };
 }, [map, isLoaded]);

 const handle3DView = () => {
 map?.easeTo({
 pitch: 60,
 bearing: -20,
 duration: 1000,
 });
 };

 const handleReset = () => {
 map?.easeTo({
 pitch: 0,
 bearing: 0,
 duration: 1000,
 });
 };

 if (!isLoaded) return null;

 return (
 <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
 <div className="flex gap-2">
 <Button size="sm" variant="secondary" onClick={handle3DView}>
 <Mountain className="mr-1.5 size-4" />
 3D View
 </Button>
 <Button size="sm" variant="secondary" onClick={handleReset}>
 <RotateCcw className="mr-1.5 size-4" />
 Reset
 </Button>
 </div>
 <div className="bg-background/90 rounded-md border px-3 py-2 font-mono text-xs backdrop-blur">
 <div>Pitch: {pitch}°</div>
 <div>Bearing: {bearing}°</div>
 </div>
 </div>
 );
}

export function AdvancedUsageExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.9857, 40.7484]} zoom={15}>
 <MapController />
 </Map>
 </div>
 );
}
View CodeExample: Custom GeoJSON LayerAdd custom GeoJSON data as layers with fill and outline styles. This example shows NYC parks with hover interactions."use client";

import { useCallback, useEffect, useState } from "react";
import { Map, MapControls, useMap } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Layers, X } from "lucide-react";

const geojsonData = {
 type: "FeatureCollection" as const,
 features: [
 {
 type: "Feature" as const,
 properties: { name: "Central Park", type: "park" },
 geometry: {
 type: "Polygon" as const,
 coordinates: [
 [
 [-73.9731, 40.7644],
 [-73.9819, 40.7681],
 [-73.958, 40.8006],
 [-73.9493, 40.7969],
 [-73.9731, 40.7644],
 ],
 ],
 },
 },
 {
 type: "Feature" as const,
 properties: { name: "Bryant Park", type: "park" },
 geometry: {
 type: "Polygon" as const,
 coordinates: [
 [
 [-73.9837, 40.7536],
 [-73.9854, 40.7542],
 [-73.984, 40.7559],
 [-73.9823, 40.7553],
 [-73.9837, 40.7536],
 ],
 ],
 },
 },
 ],
};

function CustomLayer() {
 const { map, isLoaded } = useMap();
 const [isLayerVisible, setIsLayerVisible] = useState(false);
 const [hoveredPark, setHoveredPark] = useState<string | null>(null);

 const addLayers = useCallback(() => {
 if (!map) return;
 // Add source if it doesn't exist
 if (!map.getSource("parks")) {
 map.addSource("parks", {
 type: "geojson",
 data: geojsonData,
 });
 }

 // Add fill layer if it doesn't exist
 if (!map.getLayer("parks-fill")) {
 map.addLayer({
 id: "parks-fill",
 type: "fill",
 source: "parks",
 paint: {
 "fill-color": "#22c55e",
 "fill-opacity": 0.4,
 },
 layout: {
 visibility: isLayerVisible ? "visible" : "none",
 },
 });
 }

 // Add outline layer if it doesn't exist
 if (!map.getLayer("parks-outline")) {
 map.addLayer({
 id: "parks-outline",
 type: "line",
 source: "parks",
 paint: {
 "line-color": "#16a34a",
 "line-width": 2,
 },
 layout: {
 visibility: isLayerVisible ? "visible" : "none",
 },
 });
 }
 }, [map, isLayerVisible]);

 useEffect(() => {
 if (!map || !isLoaded) return;

 // Add layers on mount
 addLayers();

 // Hover effect
 const handleMouseEnter = () => {
 map.getCanvas().style.cursor = "pointer";
 };

 const handleMouseLeave = () => {
 map.getCanvas().style.cursor = "";
 setHoveredPark(null);
 };

 const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
 const features = map.queryRenderedFeatures(e.point, {
 layers: ["parks-fill"],
 });
 if (features.length > 0) {
 setHoveredPark(features[0].properties?.name || null);
 }
 };

 map.on("mouseenter", "parks-fill", handleMouseEnter);
 map.on("mouseleave", "parks-fill", handleMouseLeave);
 map.on("mousemove", "parks-fill", handleMouseMove);

 return () => {
 map.off("mouseenter", "parks-fill", handleMouseEnter);
 map.off("mouseleave", "parks-fill", handleMouseLeave);
 map.off("mousemove", "parks-fill", handleMouseMove);
 };
 }, [map, isLoaded, isLayerVisible]);

 const toggleLayer = () => {
 if (!map) return;

 const visibility = isLayerVisible ? "none" : "visible";
 map.setLayoutProperty("parks-fill", "visibility", visibility);
 map.setLayoutProperty("parks-outline", "visibility", visibility);
 setIsLayerVisible(!isLayerVisible);
 };

 return (
 <>
 <div className="absolute top-3 left-3 z-10">
 <Button
 size="sm"
 variant={isLayerVisible ? "default" : "secondary"}
 onClick={toggleLayer}
 >
 {isLayerVisible ? (
 <X className="mr-1.5 size-4" />
 ) : (
 <Layers className="mr-1.5 size-4" />
 )}
 {isLayerVisible ? "Hide Parks" : "Show Parks"}
 </Button>
 </div>

 {hoveredPark && (
 <div className="bg-background/90 absolute bottom-3 left-3 z-10 rounded-md border px-3 py-2 text-sm font-medium backdrop-blur">
 {hoveredPark}
 </div>
 )}
 </>
 );
}

export function CustomLayerExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.97, 40.78]} zoom={11.8}>
 <MapControls />
 <CustomLayer />
 </Map>
 </div>
 );
}
View CodeExample: Markers via LayersWhen displaying hundreds or thousands of markers, use GeoJSON layers instead of DOM-based MapMarker components. This approach renders markers on the WebGL canvas, providing significantly better performance."use client";

import { useEffect, useState, useId } from "react";
import { Map, MapPopup, useMap } from "@/components/ui/map";

// Generate random points around NYC
function generateRandomPoints(count: number) {
 const center = { lng: -73.98, lat: 40.75 };
 const features = [];

 for (let i = 0; i < count; i++) {
 const lng = center.lng + (Math.random() - 0.5) * 0.15;
 const lat = center.lat + (Math.random() - 0.5) * 0.1;
 features.push({
 type: "Feature" as const,
 properties: {
 id: i,
 name: `Location ${i + 1}`,
 category: ["Restaurant", "Cafe", "Bar", "Shop"][
 Math.floor(Math.random() * 4)
 ],
 },
 geometry: {
 type: "Point" as const,
 coordinates: [lng, lat],
 },
 });
 }

 return {
 type: "FeatureCollection" as const,
 features,
 };
}

// 200 markers - would be slow with DOM markers, but fast with layers
const pointsData = generateRandomPoints(200);

interface SelectedPoint {
 id: number;
 name: string;
 category: string;
 coordinates: [number, number];
}

function MarkersLayer() {
 const { map, isLoaded } = useMap();
 const id = useId();
 const sourceId = `markers-source-${id}`;
 const layerId = `markers-layer-${id}`;
 const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
 null,
 );

 useEffect(() => {
 if (!map || !isLoaded) return;

 map.addSource(sourceId, {
 type: "geojson",
 data: pointsData,
 });

 map.addLayer({
 id: layerId,
 type: "circle",
 source: sourceId,
 paint: {
 "circle-radius": 6,
 "circle-color": "#3b82f6",
 "circle-stroke-width": 2,
 "circle-stroke-color": "#ffffff",
 // add more paint properties here to customize the appearance of the markers
 },
 });

 const handleClick = (
 e: maplibregl.MapMouseEvent & {
 features?: maplibregl.MapGeoJSONFeature[];
 },
 ) => {
 if (!e.features?.length) return;

 const feature = e.features[0];
 const coords = (feature.geometry as GeoJSON.Point).coordinates as [
 number,
 number,
 ];

 setSelectedPoint({
 id: feature.properties?.id,
 name: feature.properties?.name,
 category: feature.properties?.category,
 coordinates: coords,
 });
 };

 const handleMouseEnter = () => {
 map.getCanvas().style.cursor = "pointer";
 };

 const handleMouseLeave = () => {
 map.getCanvas().style.cursor = "";
 };

 map.on("click", layerId, handleClick);
 map.on("mouseenter", layerId, handleMouseEnter);
 map.on("mouseleave", layerId, handleMouseLeave);

 return () => {
 map.off("click", layerId, handleClick);
 map.off("mouseenter", layerId, handleMouseEnter);
 map.off("mouseleave", layerId, handleMouseLeave);

 try {
 if (map.getLayer(layerId)) map.removeLayer(layerId);
 if (map.getSource(sourceId)) map.removeSource(sourceId);
 } catch {
 // ignore cleanup errors
 }
 };
 }, [map, isLoaded, sourceId, layerId]);

 return (
 <>
 {selectedPoint && (
 <MapPopup
 longitude={selectedPoint.coordinates[0]}
 latitude={selectedPoint.coordinates[1]}
 onClose={() => setSelectedPoint(null)}
 closeOnClick={false}
 focusAfterOpen={false}
 offset={10}
 closeButton
 >
 <div className="min-w-24">
 <p className="font-medium">{selectedPoint.name}</p>
 <p className="text-muted-foreground text-sm">
 {selectedPoint.category}
 </p>
 </div>
 </MapPopup>
 )}
 </>
 );
}

export function LayerMarkersExample() {
 return (
 <div className="h-[420px] w-full">
 <Map center={[-73.98, 40.75]} zoom={11}>
 <MarkersLayer />
 </Map>
 </div>
 );
}
View CodeExtend to BuildYou can extend this to build custom features like:Real-time tracking - Live location updates for delivery, rides, or fleet managementGeofencing - Trigger actions when users enter or leave specific areasHeatmaps - Visualize density data like population, crime, or activity hotspotsDrawing tools - Let users draw polygons, lines, or place markers for custom areas3D buildings - Extrude building footprints for urban visualizationAnimations - Animate markers along routes or create fly-through experiencesCustom data layers - Overlay weather, traffic, or satellite imagery ClustersOn This PageUsing a RefUsing the HookExample: Custom ControlsExample: Custom GeoJSON LayerExample: Markers via LayersExtend to Build

---
