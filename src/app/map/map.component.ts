import { Component, OnInit, Input, ViewChild, SimpleChanges } from '@angular/core';
import { analyzeAndValidateNgModules } from '@angular/compiler';

import 'ol/ol.css';
import { Feature } from 'ol';
import Map from 'ol/Map';
import View from 'ol/View';
import { Coordinate } from 'ol/coordinate';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';

import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import ImageLayer from 'ol/layer/Image';

import { OSM, Vector as VectorSource } from 'ol/source';
import TileWMS from 'ol/source/TileWMS';

import ImageWMS from 'ol/source/ImageWMS';

import { fromLonLat, getPointResolution } from 'ol/proj';
import { register } from 'ol/proj/proj4';
import Projection from 'ol/proj/Projection';

import { ScaleLine, defaults as defaultControls } from 'ol/control';

import Draw from 'ol/interaction/Draw';
import Select from 'ol/interaction/Select';
import Translate from 'ol/interaction/Translate';

import { LineString, Polygon } from 'ol/geom';
import GeometryType from 'ol/geom/GeometryType';

import GeoJSON from 'ol/format/GeoJSON';
import WKT from 'ol/format/WKT';

import Overlay from 'ol/Overlay';
import Positioning from 'ol/OverlayPositioning';

import {click} from 'ol/events/condition';
import {
  addCoordinateTransforms,
  addProjection,
  transform,
} from 'ol/proj';

// import * as turf from '@turf/turf';
import turfLength from '@turf/length';
import turfArea from '@turf/area';
import { lineString, polygon, multiPolygon, feature } from '@turf/helpers';

import proj4 from 'proj4';

import { CommonService } from '../common.service';
import { ListaLayerComponent } from '../lista-layer/lista-layer.component';
import * as $ from 'jquery';
import * as Geocoder from 'ol-geocoder';

class Visibility {
  nomeLayer: string;
  visible: boolean;

  constructor() {
    this.nomeLayer = '';
    this.visible = false;
  }
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {

  @Input() newPosition = '';

  @ViewChild(ListaLayerComponent) listacomp!: ListaLayerComponent;

  infoAcceso = false;
  mostraSpinner = false;

  vector_incendio!:any;
  styleInc!:any;

  map: any;
  source: any;
  vector: any;

  container: any;
  popup: any;
  content: any;
  closer: any;

  listaLayerStato = false;

  drawPoint!: Draw;
  drawLine!: Draw;
  drawPolygon!: Draw;

  common: CommonService;

  particelleLayer?:any = null;

  projection: Projection = new Projection({ code: 'EPSG:6706', extent: [6.53, 36.76, 20.99, 50.1 ] });

  layers: any = [];

  measureTooltip: any;
  measureTooltipElement: any;
  sketch: any;
  listener: any;

  // Interazione: Seleziona e muovi poligono
  selectMoveClick = new Select({
    condition: click,
  });

  // Interazione: Movimento poligono
  translate = new Translate({
    features: this.selectMoveClick.getFeatures()
  });

  geocoder: any = new Geocoder('nominatim', {
    provider: 'osm',
    lang: 'en',
    placeholder: 'Cerca ...',
    limit: 5,
    debug: false,
    autoComplete: true,
    keepOpen: true
  });

  constructor(common: CommonService) {
    this.common = common;
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.container = document.getElementById('popup');
    this.content = document.getElementById('popup-content');
    this.closer = document.getElementById('popup-closer');

    this.popup = new Overlay({
      element: this.container,
      autoPan: true,
      autoPanAnimation: {
        duration: 250,
      }
    });

    this.closer.onclick = function() {
      console.log('closer: popup', this.popup);
      // this.popup.setPosition(undefined);
      // this.closer.blur();
      // this.mostraGeoCoding = false;
      $('#popup').hide();
      console.log('mostraGeoCoding', this.mostraGeoCoding);
      return true;
    };

    proj4.defs('EPSG:6706', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs');
    
    register(proj4);

    proj4.defs("EPSG:3004","+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9996 +x_0=2520000 +y_0=0 +ellps=intl +towgs84=-104.1,-49.1,-9.9,0.971,-2.917,0.714,-11.68 +units=m +no_defs");

    register(proj4);
    this.layers = [];

    let layer = null;

    /*
    $('#test').on('click', function() {
      alert('TEST');
    });
    */

    layer = new TileLayer({
      visible: true,
      source: new OSM()
    });
    layer.set('name', 'OSM');
    this.layers.push(layer);

    this.styleInc = new Style({
      stroke: new Stroke({
        color: 'black',
        width: 3,
        lineDash:[4,4]
      }),
      fill: new Fill({
        color: 'rgba(237, 23, 7, 0.59)'
      }),
    })

    this.vector_incendio = new VectorLayer({
      source: new VectorSource({
        // features: [feature_inc]
      }),
      style: this.styleInc
    });
    this.vector_incendio.set('name', 'Incendi');
    // this.layers.push(vector_incendio);

    // layer = new TileLayer({
    layer = new ImageLayer({
      extent: this.projection.getExtent(),
      visible: false,
      // source: new TileWMS({
      source:new ImageWMS({
        url: 'https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php',
        params: {
          LAYERS: 'province',
          VERSION: '1.1.1',
          ratio: 1
        },
        serverType: 'mapserver'
      })
    });
    layer.set('name', 'province');
    this.layers.push(layer);

    this.particelleLayer = new ImageLayer({
      extent: this.projection.getExtent(),
      visible: false,
      source: new ImageWMS({
        projection: this.projection,
        url: 'https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php',
        params: {
          LAYERS: 'CP.CadastralParcel',
          ratio: 1,
          VERSION: '1.1.1'
        },
        serverType: 'mapserver'/*,
        transition: 0*/
      })
    });
    this.particelleLayer.set('name', 'CP.CadastralParcel');
    this.layers.push( this.particelleLayer);

    layer = new ImageLayer({
      extent: this.projection.getExtent(),
      visible: false,
      // source: new TileWMS({
      source: new ImageWMS({
        url: 'https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php',
        params: {
          LAYERS: 'fabbricati',
          ratio: 1,
          VERSION: '1.1.1'
        },
        serverType: 'mapserver'/*,
        transition: 0*/
      })
    });
    layer.set('name', 'fabbricati');
    this.layers.push(layer);

    layer = new ImageLayer({
      extent: this.projection.getExtent(),
      visible: false,
      //source: new TileWMS({
        source: new ImageWMS({
          url: 'https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php',
          params: {
              LAYERS: 'vestizioni',
              ratio:1,
              VERSION: '1.1.1'
          },
          serverType: 'geoserver'
      })
    });
    layer.set('name', 'vestizioni');
    this.layers.push(layer);

    // layer = new TileLayer({
    layer = new ImageLayer({
      extent: this.projection.getExtent(),
      visible: false,
      // source: new TileWMS({
      source: new ImageWMS({
        url: 'https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php',
        params: {
          LAYERS: 'CP.CadastralZoning',
          VERSION: '1.1.1',
          ratio: 1
        },
        serverType: 'geoserver'
      })
    });
    layer.set('name', 'CP.CadastralZoning');
    this.layers.push(layer);
    this.layers.push(this.vector_incendio);

    this.map = new Map({
      controls: defaultControls().extend([new ScaleLine()]),
      layers: this.layers,
      target: 'map',
      overlays: [ this.popup ],
      view: new View({
        projection:  this.projection,
        /* center: fromLonLat([8.23, 46.86], projection), */
        center: [ parseFloat('12.41000000'), parseFloat('42.1000000') ], // 6706
        extent:   this.projection.getExtent(),
        zoom: 2,
      }),
    });

    this.map.addControl(this.geocoder);

    //

    this.map.on('singleclick', (evt: any) => {
      // (non-null operator) usa ! quando sai che il valore non sarà null, per comunicarlo al compilatore
      document.getElementById('info')!.innerHTML = '';

      if (this.infoAcceso === true) {
        // avvio spinner
        this.mostraSpinner = true;

        const viewResolution = this.map.getView().getResolution();
        console.log('viewResolution', viewResolution);

        const url = this.particelleLayer.getSource().getFeatureInfoUrl(
          evt.coordinate,
          viewResolution,
          'EPSG:6706',
          {INFO_FORMAT: 'text/html'}
        );

        if (url) {
          fetch(url)
            .then((response) => {
              return response.text();
            })
            .then((html) => {
              console.log(html);
              document.getElementById('info')!.innerHTML = html;

              // chiudo spinner
              this.mostraSpinner = false;
            });
        }
      }
    });

    this.source = new VectorSource({wrapX: false});
    this.vector = new VectorLayer({ source: this.source });
    this.vector.set('name', 'draw');

    this.drawPoint = new Draw({ source: this.source, type: GeometryType.POINT });
    this.drawLine = new Draw({ source: this.source, type: GeometryType.LINE_STRING });
    this.drawPolygon = new Draw({ source: this.source, type: GeometryType.POLYGON });
/*LAZIO MERDA*/
    this.map.addLayer(this.vector);

    this.createMeasureTooltip();

    /* this.source.on('addfeature', function(event:any) { }); */

    this.geocoder.on('addresschosen', (evt: any) => {
      const feature = evt.feature;
      this.geocoder.getSource().clear();
      this.geocoder.getSource().addFeature(feature);

      window.setTimeout( () => {
        this.content.innerHTML = evt.address.formatted;
        this.popup.setPosition(evt.coordinate);
        $('#popup').show();
      }, 1000);
    });

    this.drawPolygon.on('drawstart', (event: any) => {
      /*
      let tooltipCoord = event.coordinate;

      this.sketch = event.feature;

      this.listener = this.sketch.getGeometry().on('change',  (evt:any) => {
        let geomPolygon = evt.target;
        let coord: Coordinate[][][] = geomPolygon.getCoordinates();
        tooltipCoord = geomPolygon.getInteriorPoint().getCoordinates();
        this.measureTooltipElement.innerHTML = 'Misurazione...';
        this.measureTooltip.setPosition(tooltipCoord);
      });
      */
    });

    this.drawPolygon.on('drawend', (event: any) => {
      /*
      let feature = event.feature;
      console.log('drawPolygon.drawend', feature);

      let geomPolygon: Polygon = feature.getGeometry();
      let coord: Coordinate[][] = geomPolygon.getCoordinates();
      console.log('coord', coord);

      let poly = polygon(coord);
      let area: number = turfArea(poly);
      let areakmq = area / (1000 * 1000);

      console.log('area poligono: ' + areakmq.toFixed(2) + ' kmq');

      var format = new WKT();
      var geom = geomPolygon;
      var wktRepresenation  = format.writeGeometry(geom);

      console.log("WKT GENERATO: "+wktRepresenation);

      this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
      this.measureTooltipElement.innerHTML = areakmq.toFixed(2) + ' kmq';
      this.measureTooltip.setOffset([0, -7]);
      this.measureTooltipElement = null;
      this.createMeasureTooltip();
      */
    });

    this.drawLine.on('drawstart', (event: any) => {
      /*
      let tooltipCoord = event.coordinate;

      this.sketch = event.feature;

      this.listener = this.sketch.getGeometry().on('change',  (evt:any) => {
        let geomLine = evt.target;
        //console.log("geomLine", geomLine.getCoordinates());

        // let geomLine: LineString = feature.getGeometry();
        let coord: Coordinate[] = geomLine.getCoordinates();
        let line = lineString(coord);
        let length: number = turfLength(line, { units: 'kilometers' });

        tooltipCoord = geomLine.getLastCoordinate();

        this.measureTooltipElement.innerHTML = length.toFixed(2) + ' km';
        this.measureTooltip.setPosition(tooltipCoord);
      });
      */
    });

    this.drawLine.on('drawend', (event: any) => {
      /*
      let feature = event.feature;
      console.log('drawLine.drawend', feature);

      let geomLine: LineString = feature.getGeometry();
      let coord: Coordinate[] = geomLine.getCoordinates();
      console.log('coord', coord);

      let line = lineString(coord);
      let length: number = turfLength(line, { units: 'kilometers' });

      console.log('lunghezza linea: ' + length.toFixed(2) + ' km');

      this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
      this.measureTooltip.setOffset([0, -7]);
      this.measureTooltipElement = null;
      this.createMeasureTooltip();
      */
    });

  }

  /*
  ngOnChanges(changes: SimpleChanges) {
    for (let property in changes) {
       if (property === 'newPosition') {
        if (this.map !== undefined) {
          let coords = JSON.parse(changes[property].currentValue);
          console.log("coords", coords);

          this.goto(coords);
        }

         // console.log('Previous:', changes[property].previousValue);
         // console.log('Current:', changes[property].currentValue);
         // console.log('firstChange:', changes[property].firstChange);
       }
   }
  }
  */

  recuperaIncendio(incendioId: string): void {
   // const coords = JSON.parse('[13.388443887175018, 42.337928964414125]');
   const coords = JSON.parse('[2393899.6999421, 4695913.41336353]');
    const wkt_incendio = 'MULTIPOLYGON (((2393899.6999421 4695913.41336353, 2393881.58323862 4695764.82899207, 2393917.81664558 4695685.10079275, 2393979.28279267 4695649.50856449, 2394016.79694584 4695688.63074901, 2394004.18935815 4695736.98817346, 2394020.99947507 4695821.08804205, 2394018.89821045 4695854.72798949, 2393987.37924123 4695949.34034166, 2393964.26533047 4696022.92772667, 2393894.0767098 4696039.02205047, 2393899.6999421 4695913.41336353)), ((2392182.39293725 4695366.94875164, 2392180.29167263 4695350.12877792, 2392188.69673109 4695284.95137976, 2392247.5321403 4695190.33902759, 2392375.70928179 4695148.2890933, 2392455.55733715 4695127.26412615, 2392531.20286328 4695112.54664915, 2392621.55724171 4695129.36662286, 2392642.56988785 4695148.2890933, 2392766.54450012 4695184.03153745, 2392842.19002625 4695173.51905388, 2392911.53175853 4695213.46649146, 2392995.58234312 4695217.67148489, 2393067.02534001 4695238.69645204, 2393121.65822 4695221.87647832, 2393123.75948461 4695219.7739816, 2393132.16454307 4695278.64388962, 2393148.97465999 4695303.8738502, 2393165.7847769 4695352.23127464, 2393272.94927225 4695415.30617608, 2393386.41756144 4695442.63863338, 2393525.10102601 4695455.25361367, 2393707.91104748 4695490.99605782, 2393785.65783822 4695501.50854139, 2393867.6071582 4695533.04599212, 2393878.92861237 4695544.85273655, 2393827.23312818 4695598.12457531, 2393790.99972122 4695724.96489241, 2393783.75303982 4695761.20498301, 2393733.02627008 4695761.20498301, 2393671.42947824 4695786.57304643, 2393656.93611546 4695743.08493771, 2393675.05281894 4695674.22876557, 2393591.71598293 4695714.09286523, 2393526.4958504 4695790.19705549, 2393490.26244344 4695877.17327293, 2393442.79688365 4695946.2268225, 2393430.54411835 4695936.72536137, 2393359.10112145 4695905.18791064, 2393302.36697685 4695905.18791064, 2393247.73409687 4695911.49540079, 2393161.58224767 4695955.6478318, 2393127.96201384 4695985.08278581, 2393048.11395848 4696008.21024967, 2392991.37981389 4696010.31274639, 2392861.10140778 4696010.31274639, 2392827.48117394 4695964.05781866, 2392856.89887855 4695896.77792378, 2392943.05072775 4695861.03547963, 2392959.86084467 4695800.0630749, 2392938.84819852 4695781.14060447, 2392894.72164161 4695779.03810775, 2392835.8862324 4695808.47306176, 2392825.37990933 4695829.49802891, 2392808.56979241 4695856.8304862, 2392756.03817705 4695884.1629435, 2392718.21541398 4695884.1629435, 2392690.89897399 4695858.93298292, 2392688.79770938 4695835.80551905, 2392676.19012169 4695783.24310118, 2392657.27874016 4695800.0630749, 2392619.45597709 4695825.29303548, 2392602.64586018 4695829.49802891, 2392573.22815557 4695800.0630749, 2392560.62056788 4695715.96320631, 2392562.7218325 4695636.06833114, 2392554.31677404 4695612.94086728, 2392541.70918635 4695598.22339028, 2392522.79780482 4695585.60840999, 2392497.58262944 4695535.14848883, 2392480.77251253 4695520.43101183, 2392440.84848485 4695516.2260184, 2392417.73457409 4695545.6609724, 2392390.4181341 4695570.89093298, 2392350.49410642 4695583.50591327, 2392297.96249105 4695558.27595269, 2392293.75996182 4695554.07095926, 2392262.2409926 4695507.81603154, 2392203.40558339 4695438.43363995, 2392182.39293725 4695366.94875164)))';

    this.vector_incendio.getSource().clear();

    const format = new WKT();

    let feature_inc = format.readFeature(wkt_incendio, {
      featureProjection: 'EPSG:6706',
      dataProjection: 'EPSG:3004'
    });
    this.vector_incendio.getSource().addFeature(feature_inc);

    this.goto(coords);

    this.listacomp.impostaCheck('Incendi', true);
  }

  goto(coords: string): void {
    this.map.getView().setCenter(transform([2393899.6999421,4695913.41336353], 'EPSG:3004', 'EPSG:6706'),);
    this.map.getView().setZoom(12);
    // this.map.getView().centerOn(coords, this.map.getSize(), [0,0])
  }

  /*
  changeValue(varname: string, value: string) {
    if (varname === 'newPosition') {
      // ...

    }
  }
  */

  createMeasureTooltip(): void {
    /*
    if (this.measureTooltipElement) {
      this.measureTooltipElement.parentNode.removeChild(this.measureTooltipElement);
    }
    */

    this.measureTooltipElement = document.createElement('div');
    this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
    this.measureTooltipElement.id = 'labelMis';
    this.measureTooltip = new Overlay({
      element: this.measureTooltipElement,
      offset: [0, -15],
      positioning: Positioning.BOTTOM_CENTER
    });
    this.map.addOverlay(this.measureTooltip);
  }

  toggleInfo(event: boolean): void {
      this.infoAcceso = event;
      console.log('infoAcceso = ' + this.infoAcceso);

      if (this.infoAcceso === false) {
        document.getElementById('info')!.innerHTML = '';
      }
  }

  toolbarAction(event: string): void {
    console.log('toolbar azione = ' + event);

    if (event === 'Point') {
      this.map.removeInteraction(this.selectMoveClick);
      this.map.removeInteraction(this.drawLine);
      this.map.removeInteraction(this.drawPolygon);
      this.map.addInteraction(this.drawPoint);

    } else if (event === 'LineString') {
      this.map.removeInteraction(this.selectMoveClick);
      this.map.removeInteraction(this.drawPoint);
      this.map.removeInteraction(this.drawPolygon);
      this.map.addInteraction(this.drawLine);

    } else if (event === 'Polygon') {
      this.map.removeInteraction(this.selectMoveClick);
      this.map.removeInteraction(this.drawPoint);
      this.map.removeInteraction(this.drawLine);
      this.map.addInteraction(this.drawPolygon);

    } else if (event === 'DeleteAll') {
      // this.measureTooltipElement = null;
      // this.measureTooltip = null;
      this.map.getLayers().forEach((el: any) => {
        if (el.get('name') === 'draw') {
          el.getSource().clear();
        }
      });

      console.log('remove Overlay');
      this.map.getOverlays().clear();
      this.createMeasureTooltip();

      // $('#labelMis').remove();
      this.map.removeInteraction(this.selectMoveClick);

    } else if (event === 'Pan') {
      this.map.removeInteraction(this.drawPoint);
      this.map.removeInteraction(this.drawLine);
      this.map.removeInteraction(this.drawPolygon);

    } else if (event === 'Move') {
      this.map.removeInteraction(this.drawPoint);
      this.map.removeInteraction(this.drawLine);
      this.map.removeInteraction(this.drawPolygon);

      this.map.addInteraction(this.selectMoveClick);
      this.map.addInteraction(this.translate);
    }

  }

  visibilityHandler(event: Visibility): void {
    const nomeLayer = event.nomeLayer;
    const visible = event.visible;

    console.log('visibilityHandler :: ' + nomeLayer + ' = ' + visible);
    // let labelMis = document.getElementsByClassName("ol-tooltip ol-tooltip-measure");

    this.map.getLayers().forEach((el: any) => {
      // console.log(el);
      if (el.get('name') === nomeLayer) {
        el.setVisible(visible);
        console.log('set visible = ' + visible);
      }
    });
  }

  attivaListaLayer(): void {
    this.common.listaLayerVisible = true;
  }
}
