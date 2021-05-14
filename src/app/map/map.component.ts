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
    const coords = JSON.parse('[13.388443887175018, 42.337928964414125]');
    const wkt_incendio = 'POLYGON((13.38862192074688 42.33814383413555,13.38862192074688 42.33814383413555,13.388633238586683 42.33810988061614,13.388633238586683 42.33810610800287,13.38864078381322 42.33809101754979,13.388648329039755 42.33807969970999,13.388652101653022 42.338075927096725,13.388655874266291 42.338075927096725,13.388667192106094 42.338060836643656,13.38867473733263 42.33804951880385,13.388686055172435 42.33804197357731,13.38869360039897 42.33803820096404,13.388701145625506 42.33803065573751,13.388708690852042 42.338019337897705,13.388716236078578 42.3380080200579,13.388720008691847 42.33800424744464,13.388723781305114 42.3379967022181,13.388727553918383 42.3379967022181,13.388735099144919 42.33798915699156,13.38875018959799 42.337970293925224,13.388753962211258 42.33795520347215,13.388753962211258 42.33795520347215,13.388757734824527 42.33795143085888,13.388761507437794 42.33794765824561,13.38876528005106 42.33793256779254,13.388772825277597 42.337913704726205,13.388784143117402 42.33789484165986,13.388791688343938 42.33787597859352,13.388791688343938 42.33787597859352,13.388791688343938 42.33787597859352,13.388791688343938 42.337868433366985,13.388791688343938 42.337868433366985,13.388791688343938 42.337857115527186,13.388791688343938 42.337857115527186,13.388791688343938 42.33784957030065,13.388791688343938 42.33783825246084,13.388791688343938 42.33783825246084,13.388791688343938 42.33782693462104,13.388787915730669 42.337819389394504,13.388784143117402 42.337804298941435,13.388780370504133 42.33779298110163,13.388780370504133 42.33779298110163,13.388780370504133 42.33778543587509,13.388776597890866 42.33777411803529,13.388776597890866 42.33777411803529,13.388776597890866 42.337762800195485,13.388776597890866 42.33775525496895,13.388772825277597 42.337747709742416,13.38876905266433 42.33773639190261,13.38876905266433 42.33772884667607,13.38876528005106 42.337721301449534,13.388761507437794 42.337713756223,13.388761507437794 42.337706210996465,13.388761507437794 42.337706210996465,13.388757734824527 42.33769866576993,13.388753962211258 42.33769112054339,13.388753962211258 42.33769112054339,13.38875018959799 42.33767980270359,13.38875018959799 42.337664712250515,13.388746416984722 42.33764584918418,13.388742644371455 42.33763075873111,13.388742644371455 42.33762321350457,13.388742644371455 42.33761566827803,13.388746416984722 42.337608123051496,13.388746416984722 42.337600577824965,13.388746416984722 42.33758925998516,13.388746416984722 42.33757416953209,13.388746416984722 42.337559079079014,13.388742644371455 42.337551533852476,13.38873132653165 42.33752889817287,13.388723781305114 42.33751003510653,13.388716236078578 42.337498717266726,13.38871246346531 42.33749117204019,13.388704918238775 42.33747985420039,13.38869360039897 42.33746476374731,13.388682282559166 42.337453445907514,13.3886785099459 42.337445900680976,13.38867473733263 42.33743835545444,13.388670964719363 42.33743458284117,13.388667192106094 42.33742703761464,13.388659646879558 42.3374194923881,13.388648329039755 42.33741571977483,13.388644556426486 42.33741571977483,13.388633238586683 42.33740440193503,13.388629465973414 42.33740062932176,13.38862192074688 42.33738931148196,13.388610602907075 42.33738176625542,13.388606830293808 42.33737422102889,13.388599285067272 42.33737422102889,13.388595512454003 42.33736667580235,13.388587967227467 42.33736290318908,13.388580422000931 42.337351585349275,13.388569104161128 42.33733272228294,13.388561558934592 42.3373251770564,13.388554013708056 42.3373138592166,13.38854646848152 42.33730631399006,13.388542695868253 42.337291223536994,13.388535150641717 42.33727990569719,13.388523832801912 42.33727613308392,13.388512514962109 42.33726481524411,13.388501197122304 42.33725349740431,13.388478561442698 42.337242179564505,13.388459698376357 42.33722708911144,13.38845215314982 42.33722331649817,13.388440835310018 42.3372195438849,13.388421972243679 42.33721577127163,13.388384246110999 42.33720822604509,13.388346519978318 42.33720068081856,13.388331429525246 42.33719690820529,13.388293703392568 42.33719690820529,13.388293703392568 42.33719690820529,13.388278612939496 42.33719690820529,13.388274840326227 42.33719690820529,13.388259749873155 42.33720068081856,13.388255977259888 42.33720445343183,13.38825220464662 42.33720822604509,13.388237114193547 42.33721199865836,13.388229568967013 42.3372195438849,13.388222023740477 42.33722708911144,13.388203160674136 42.33724972479104,13.388184297607797 42.33726858785738,13.388169207154725 42.337291223536994,13.388161661928189 42.33730254137679,13.388157889314922 42.33731008660333,13.38813902624858 42.33732140444313,13.388131481022045 42.3373251770564,13.388123935795509 42.33733272228294,13.388108845342437 42.337340267509475,13.388093754889367 42.337355357962544,13.38808620966283 42.33736667580235,13.388082437049562 42.33737422102889,13.388071119209759 42.33738553886869,13.388063573983223 42.337393084095226,13.388044710916882 42.33741571977483,13.388040938303615 42.33742326500137,13.388033393077079 42.33744212806771,13.388029620463811 42.33745721852078,13.388022075237275 42.33746476374731,13.388018302624006 42.33747985420039,13.38801453001074 42.33748739942693,13.388006984784203 42.337498717266726,13.387999439557667 42.33751758033307,13.387999439557667 42.33751758033307,13.387999439557667 42.33752889817287,13.387999439557667 42.33754021601268,13.388006984784203 42.337555306465745,13.38801453001074 42.33756662430555,13.388018302624006 42.33757416953209,13.388033393077079 42.33758548737189,13.388040938303615 42.337600577824965,13.388044710916882 42.337611895664764,13.388044710916882 42.337611895664764,13.38804848353015 42.33762321350457,13.388059801369954 42.33763830395764,13.388074891823026 42.33766093963725,13.38808620966283 42.33767980270359,13.388097527502634 42.33769489315666,13.38810507272917 42.337706210996465,13.388116390568973 42.337721301449534,13.388123935795509 42.33773639190261,13.388131481022045 42.337747709742416,13.388131481022045 42.33775525496895,13.388135253635314 42.337759027582216,13.388135253635314 42.33777411803529,13.38813902624858 42.33778920848836,13.38813902624858 42.33778920848836,13.38813902624858 42.337804298941435,13.38813902624858 42.337811844167966,13.38813902624858 42.337811844167966,13.38813902624858 42.337857115527186,13.38813902624858 42.33788352382006,13.38813902624858 42.337909932112936,13.388131481022045 42.33793256779254,13.388127708408778 42.33795897608542,13.388120163182242 42.337981611765024,13.388116390568973 42.3379967022181,13.388108845342437 42.338023110510974,13.388093754889367 42.33804951880385,13.38808620966283 42.33806460925692,13.388078664436295 42.338075927096725,13.388074891823026 42.33808347232326,13.388071119209759 42.33809101754979,13.388059801369954 42.33812119845594,13.388052256143418 42.33814383413555,13.388044710916882 42.33816646981516,13.388040938303615 42.338185332881494,13.388037165690347 42.33820419594784,13.388037165690347 42.338223059014176,13.388033393077079 42.33825323992032,13.388033393077079 42.338279648213195,13.388029620463811 42.33829851127953,13.388029620463811 42.33832491957241,13.388029620463811 42.338347555252014,13.388033393077079 42.33837019093163,13.388040938303615 42.3383965992245,13.388044710916882 42.33841923490411,13.38804848353015 42.33843432535718,13.388056028756687 42.33845318842352,13.388071119209759 42.338483369329666,13.388078664436295 42.338494687169465,13.388097527502634 42.33851732284908,13.388127708408778 42.338547503755215,13.38813902624858 42.33855882159502,13.388157889314922 42.33857013943483,13.388188070221064 42.33858145727463,13.388255977259888 42.338596547727704,13.388331429525246 42.33861918340731,13.38836161043139 42.33862295602058,13.388376700884463 42.33862672863385,13.388403109177338 42.33863050124712,13.388429517470215 42.33863050124712,13.388448380536554 42.33863050124712,13.388482334055965 42.33862295602058,13.388523832801912 42.33861918340731,13.388535150641717 42.33861541079404,13.388550241094789 42.33861541079404,13.388595512454003 42.338604092954235,13.38862192074688 42.338592775114435,13.388629465973414 42.338592775114435,13.38864078381322 42.338589002501166,13.388655874266291 42.3385852298879,13.388667192106094 42.3385852298879,13.38867473733263 42.3385852298879,13.388708690852042 42.338592775114435,13.38873132653165 42.33860032034097,13.388738871758186 42.33860032034097,13.388742644371455 42.338604092954235,13.38875018959799 42.3386078655675,13.38876528005106 42.33861541079404,13.388772825277597 42.33861918340731,13.388780370504133 42.33861918340731,13.388791688343938 42.33862672863385,13.388799233570474 42.33863050124712,13.38880677879701 42.33863427386038,13.388814324023546 42.33863804647365,13.388814324023546 42.33863804647365,13.388825641863349 42.33863804647365,13.388825641863349 42.33863804647365,13.388840732316421 42.33863804647365,13.388848277542957 42.33863804647365,13.388863367996029 42.33863427386038,13.388870913222565 42.33862672863385,13.388874685835832 42.33862295602058,13.388878458449101 42.33861918340731,13.388878458449101 42.33861918340731,13.388889776288904 42.33861163818077,13.38889732151544 42.338596547727704,13.388901094128707 42.338592775114435,13.388908639355243 42.33858145727463,13.388912411968512 42.33857768466136,13.38891618458178 42.33857013943483,13.38891618458178 42.33856259420829,13.38891618458178 42.33856259420829,13.38891618458178 42.338547503755215,13.388923729808315 42.33851732284908,13.388923729808315 42.33850600500927,13.388927502421584 42.338494687169465,13.388927502421584 42.3384795967164,13.388927502421584 42.33847205148986,13.388927502421584 42.33846073365006,13.388927502421584 42.33845318842352,13.388931275034851 42.338445643196984,13.388931275034851 42.338438097970446,13.388931275034851 42.338426780130646,13.388931275034851 42.338426780130646,13.388931275034851 42.33841546229084,13.388931275034851 42.33840037183777,13.388931275034851 42.338389053997965,13.388927502421584 42.33837773615816,13.388923729808315 42.33837019093163,13.388919957195048 42.33836264570509,13.38891618458178 42.33836264570509,13.38891618458178 42.33836264570509,13.38862192074688 42.33814383413555))';

    this.vector_incendio.getSource().clear();

    const format = new WKT();

    let feature_inc = format.readFeature(wkt_incendio, {
      dataProjection: 'EPSG:6706',
      featureProjection: 'EPSG:6706'
    });
    this.vector_incendio.getSource().addFeature(feature_inc);

    this.goto(coords);

    this.listacomp.impostaCheck('Incendi', true);
  }

  goto(coords: string): void {
    this.map.getView().setCenter(coords);
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
