import { Component, OnInit, Input } from '@angular/core';

import { GameApiService } from '../game-api.service';

import { Player } from '../models';

@Component({
  selector: 'app-status-bench',
  templateUrl: './status-bench.component.html',
  styleUrls: ['./status-bench.component.css']
})
export class StatusBenchComponent implements OnInit {

  get players(): Player[] { return this.gameApiService.players; };

  constructor(
    private gameApiService: GameApiService
  ) { }

  ngOnInit() {
  }

}