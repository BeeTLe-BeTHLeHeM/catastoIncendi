import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaLayerComponent } from './lista-layer.component';

describe('ListaLayerComponent', () => {
  let component: ListaLayerComponent;
  let fixture: ComponentFixture<ListaLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ListaLayerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ListaLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
