import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ScrollingVisibility } from '@angular/cdk/overlay';
import { SelectionModel } from '@angular/cdk/collections';

import { CommonService } from '../common.service';
import ListaLayersJSON from '../../assets/layers.json';

interface Layer {
  idLayer: string;
  nome: string;
  descrizione: string;
  url: string;
  visible: boolean;
}

class Visibility {
  nomeLayer: string;
  visible: boolean;

  constructor() {
    this.nomeLayer = '';
    this.visible = false;
  }
}

@Component({
  selector: 'app-lista-layer',
  templateUrl: './lista-layer.component.html',
  styleUrls: ['./lista-layer.component.css']
})
export class ListaLayerComponent implements OnInit {

  common: CommonService;

  @Output() layerVisibleChanged: EventEmitter<Visibility> = new EventEmitter();

  displayedColumns: string[] = ['select', 'idLayer', 'descrizione'];
  listaLayers: Layer[] = ListaLayersJSON.TodoLista;
  selection = new SelectionModel<Layer>(true, []);

  constructor(common: CommonService) {
    this.common = common;
  }

  ngOnInit(): void {
  }

  // @Input() layerListVisible: boolean = false;

  impostaCheck(nome: string, stato: boolean): void {
    /*
    for(let item in this.listaLayers) {
      if (item.nome === nome) {
        item.visible = stato;
      }
    }*/

    for (let i = 0; i < this.listaLayers.length; i++) {
      let item: Layer = this.listaLayers[i];
      if (item.nome === nome) {
        // item.visible = stato;
        // console.log('impostaCheck', item);

        if (stato === true) {
          this.selection.select(item);
        } else {
          this.selection.deselect(item);
        }

        // this.layerSelection(item);
      }
    }
  }

  layerSelection(row: Layer): void {
    console.log('layerSelection', row);

    var data = new Visibility();
    data.nomeLayer = row.nome;

    if (this.selection.isSelected(row) === true) {
      data.visible = false;
    } else {
      data.visible = true;
    }

    console.log('aggiorna layer: ', data);

    this.layerVisibleChanged.emit(data);
  }

  toggleListaLayer(): void {
    this.common.listaLayerVisible = false;
  }
}
