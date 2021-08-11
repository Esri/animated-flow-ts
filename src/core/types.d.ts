/**
 * @module wind-es/flow/types
 *
 * This module contains simple type definitions used by the core visualization system.
 */

/**
 * A visualization is a graphic representation of an extent.
 *
 * When constructed and rendered correctly it naturally aligns
 * with the underlying basemap.
 *
 * When a visualization is rendered, a `VisualizationRenderParams`
 * object is passed to the `wind-es.core.visualization.LayerView2D.renderVisualization()`
 * that defines its position, orientation and scale.
 */
 export type VisualizationRenderParams = {
  /**
   * Size of the drawing surface.
   *
   * This coincides with the size of the MapView when the device pixel ratio
   * is 1. For retina displays it is going to be larger than 1.
   */
  size: [number, number];

  /**
   * The position on the drawing surface of the upper-left corner of the extent.
   */
  translation: [number, number];

  /**
   * The rotation of the visualization in radians.
   *
   * This is the same as the rotation of the `MapView`
   * but expressed in radians.
   */
  rotation: number;

  /**
   * The relative scale at which the visualization mush be rendered.
   *
   * A scale of 1 means that the visualization is rendering at its
   * "natural" size; for instance, it was loaded when the zoom level
   * was Z, and then the use started panning and rotating, but not
   * zooming in and out. One such visualization is still rendering
   * at scale 1. A scale > 1 means that the user is zooming in, and
   * a scale < 1 means that the user is zooming out.
   */
  scale: number;

  /**
   * The opacity at which the visualization mush be rendered.
   *
   * This will be used to fade out old visualizations and they get
   * replaced with fresher visualizations with more recent data.
   */
  opacity: number;

  /**
   * The pixel ratio of the rendering device.
   * 
   * It is possible that `Resource.pixelRatio` is different from
   * `VisualizationRenderParams.pixelRatio`, for instance because
   * the visualization has been first loaded on a different screen
   * and then has been moved to another one; in this scenario, the
   * rendering code that overrides `VisualizationLayerView2D.renderVisualization()`
   * may need to rescale some visual elements on the fly so that
   * something reasonable can still be shown while waiting for a
   * new visualization, with a matching pixel ratio, to load.
   */
  pixelRatio: number;
};