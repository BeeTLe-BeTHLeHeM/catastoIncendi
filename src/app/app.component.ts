import { Component, ViewChild } from '@angular/core';
import { MapComponent } from './map/map.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'angularProva';

  @ViewChild(MapComponent) mapcomp!: MapComponent;

  ngOnInit(): void {

  }

  setIncendio(event: string): void {
    console.log('setIncendio = ' + event);
    this.mapcomp.recuperaIncendio(event);
  }

}
