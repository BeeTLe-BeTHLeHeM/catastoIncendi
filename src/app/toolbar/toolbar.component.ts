import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonService } from '../common.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit {

  common: CommonService;

  constructor(common: CommonService) {
    this.common = common;
  }

  infoAcceso = false;

  @Output() toggleInfoChanged: EventEmitter<boolean> = new EventEmitter();
  @Output() toolbarChanged: EventEmitter<string> = new EventEmitter();

  ngOnInit(): void {
  }

  toggleInfo() {
    this.infoAcceso = !this.infoAcceso;
    this.toggleInfoChanged.emit(this.infoAcceso);
  }

  select(event:any) {
    let value: string = event.value;
    this.toolbarChanged.emit(value);
  }

}
