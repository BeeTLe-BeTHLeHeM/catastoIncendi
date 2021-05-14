import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root' // Rende il servizio un singleton
})
export class CommonService {
    constructor() { }

    listaLayerVisible = false;

    newMapCenter = '';
}