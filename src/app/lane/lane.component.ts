import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { BetComponent } from '../bet/bet.component';

import * as models from '../models';

@Component({
  selector: 'app-lane',
  templateUrl: './lane.component.html',
  styleUrls: ['./lane.component.css']
})
export class LaneComponent implements OnInit {

  //TODO model types
  @Input() laneData: any;
  @Input() bets: any;
  @Input() answers: any;
  @Input() betsByUser: number;

  @Output() bet = new EventEmitter<models.Bet>();

  constructor() { }

  ngOnInit() {
  }

  placeBet() {
    let theBet: models.Bet = {
      id: undefined,
      amount: 1, // Default to 1 (common bet) for user ease
      payout: this.laneData.payout,
      playerId: undefined,
      //TODO resolve
      answerId: (this.answers && this.answers.length ? this.answers[0].id : 0)
    };
    this.bet.emit(theBet);
  }

}