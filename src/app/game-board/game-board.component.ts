//TODO: can this wrapper be removed now that wizard exists?  else refactor some back into here?

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { GameApiService } from '../game-api.service';

import * as models from '../models';

@Component({
  selector: 'app-game-board',
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.css']
})
export class GameBoardComponent implements OnInit {

  //TODO: implement model
  @Input() laneData: any[];
  //TODO bind this differently?
  @Input() betsByUser: number;
  @Input() totalBetCount: number;
  @Output() bet = new EventEmitter<models.Bet>();

  constructor(
  ) { }

  getLaneClass(laneDatum: any) : string {
    //console.log('getLaneClass called, answers.length: ' + laneDatum.answers.length + ', bets.length: ' + laneDatum?.bets?.length);
    var theClass = ((laneDatum.answers.length == 0 && laneDatum.lane !== 0) ? 'hidden' : 'lane')
     + ((laneDatum?.bets?.length > 4) ? ' narrow-bets' : '');
    
     //console.log('lane class: ' + theClass);
    return theClass;
  }

  get visibleLaneCount() {
    return this.laneData.filter(x => x.answers.length > 0).length;
  }

  ngOnInit() {

  }

  onBet(bet: models.Bet) {
    // Forward event to wizard
    this.bet.emit(bet);
    this.betsByUser++;
  }
  
}