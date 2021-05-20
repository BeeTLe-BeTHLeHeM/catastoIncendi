import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { SelectionModel } from '@angular/cdk/collections';
import { CommonService } from '../common.service';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import regioniJSON from '../../assets/regioni.json';
import provinceJSON from '../../assets/province_abbruzzo.json';
import comuniJSON from '../../assets/comuni_laquila.json';
import incendiJSON from '../../assets/listaIncendi.json';
import dettaglioJSON from '../../assets/dettaglioIncendio.json';
import sezioniAquila from '../../assets/sezioniAquila.json';
import fogliJSON from '../../assets/fogli.json';
import particelleJSON from '../../assets/listaParticelle.json';

interface TodoLista {
  TodoLista: Regione[];
}

interface Regione {
  id_regi: string;
  deno_regi: string;
}

interface Provincia {
  idProv: string;
  denoProv: string;
  istatP: string;
}

interface Comune {
  idComune: string;
  codComune: string;
  nome: string;
}

interface Sezione {
  idComune: string;
  codiNazi: string;
  nome: string;
}

interface Foglio {
  idFoglio: string;
  codiNazi: string;
  numeroFoglio: string;
}

interface Particella {
  idParticella: string;
  numeroParticella: string;
  codiNazi: string;
}

interface Incendio {
  SE_ROW_ID: string;
  LOC: string;
  1: string;
  DATA_INC: string;
  DATA_RIL: string;
  METODO: string;
  STRUMENTI: string;
  CODICE_UFF: string;
  ANNO: string;
  NUME_PROG_FASC: string;
}

interface DettaglioIncendio {
  codi_nazi: string;
  foglio: string;
  particella: string;
  sub: string;
  allegato: string;
  sviluppo: string;
  area_inc: string;
  area_part: string;
}

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.css']
})
export class PanelComponent implements OnInit {
  @ViewChild(MatAccordion) accordion!: MatAccordion;

  common: CommonService;

  constructor(private http: HttpClient, common: CommonService) {
    this.common = common;
   }

  @Output() datiIncendio: EventEmitter<string> = new EventEmitter<string>();

  regioni: Regione[] = regioniJSON.TodoLista;

  province: Provincia[] = [];

  comuni: Comune[] = [];

  partSel = '';

  fogli: Foglio[] = fogliJSON.TodoLista;

  sezioni: Sezione[] = sezioniAquila.TodoLista;

  particelle: Particella[] = particelleJSON.TodoLista;

  anni: string[] = [ '2014', '2015', '2016', '2017', '2018', '2019', '2020' ];

  risultatiColumns: string[] = [ 'LOC', 'DATA_INC', 'METODO', 'STRUMENTI', 'ANNO' ];
  risultatiIncendi: Incendio[] = incendiJSON.TodoLista;
  selection = new SelectionModel<Incendio>(true, []);

  dettaglio: DettaglioIncendio[] = dettaglioJSON.TodoLista;

  risultatiVisible = false;
  risultatiVisible1 = false;
  risultatiVisible2 = false;

  sel = {
    selRegi: '',
    selProv: '',
    selComu: '',
    selAnno: ''
  };

  ngOnInit(): void {}

  selezionaRegione(event: any): void {
    console.log('Seleziona Regione:', event.value);

    if (event.value === '9') {
      this.province = provinceJSON.TodoLista;
    } else {
      this.province = [];
      this.comuni = [];
    }

    this.sel.selRegi = event.value;
  }

  selezionaProvincia(event: any): void {
    console.log('Seleziona Provincia:', event.value);

    if (event.value === '44') {
      this.comuni = comuniJSON.TodoLista;
    } else {
      this.comuni = [];
    }

    this.sel.selProv =  event.value;
  }

  selezionaComune(event: any): void {
    console.log('Seleziona Comune:', event.value);

    this.sel.selComu =  event.value;
  }

  selezionaAnno(event: any): void {
    console.log('Seleziona Anno:', event.value);

    this.sel.selAnno =  event.value;
  }

  selezionaSezione(event: any): void {
    console.log('selezionaSezione', event.value);

  }
  selezionaFoglio(event: any): void {
    console.log('selezionaFoglio', event.value);
  }
  selezionaParticella(event: any): void {
    console.log('selezionaParticella', event.value);
  }

  ricerca(): void {
    // this.centerPosition.emit("[13.393918191185524,42.344504723382094]");
    // this.common.newMapCenter = "[13.393918191185524,42.344504723382094]";

    // Ricerca per annualita'
    console.log('Selezione Attuale:', this.sel);

    if (this.sel.selAnno === '2017'
      && this.sel.selComu === '261'
      && this.sel.selProv === '44'
      ​&& this.sel.selRegi === '9') {
        this.risultatiVisible = true;
        this.risultatiVisible1 = true;
        this.risultatiVisible2 = false;
      }
  }

  visualizzaIncendio(): void {
   this.datiIncendio.emit('7307'); // Sostituire con l'id dell'incendio
  }

  ricerca2(): void {
    // Ricerca per particella
    this.risultatiVisible1 = false;
    this.risultatiVisible = false;
    this.risultatiVisible2 = true;
    console.log('Selezione Attuale:', this.sel + ' visibile? ' + this.risultatiVisible2);
  }

  clickOpen(): void {
    // console.log('Ho aperto un pannello accordion');
  }

  getService(): void {
    this.http.get<TodoLista>('http://localhost:7001/geoService/service').subscribe(data => {
      console.log('<<<<<<<<<<<<<<', data.TodoLista);
    });
  }

}
