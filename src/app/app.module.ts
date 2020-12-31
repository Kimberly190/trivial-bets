import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { GameBoardComponent } from './game-board/game-board.component';
import { LaneComponent } from './lane/lane.component';
import { BetComponent } from './bet/bet.component';
import { StatusBenchComponent } from './status-bench/status-bench.component';
import { WizardComponent } from './wizard/wizard.component';
import { CssHourglassComponent } from './css-hourglass/css-hourglass.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { GameApiService } from './game-api.service';

@NgModule({
  imports:      [ BrowserModule, FormsModule, HttpClientModule,
    RouterModule.forRoot([
      { path: '', component: WizardComponent }
    ]) ],
  declarations: [ AppComponent, HeaderComponent, GameBoardComponent, LaneComponent, BetComponent, StatusBenchComponent, WizardComponent, CssHourglassComponent, SpinnerComponent ],
  bootstrap:    [ AppComponent ],
  providers: [GameApiService]
})
export class AppModule { }
