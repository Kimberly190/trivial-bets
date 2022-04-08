import { Component, OnInit, Input } from '@angular/core';

import { GameApiService } from '../game-api.service';

import { Player } from '../models';

@Component({
  selector: 'app-status-bench',
  templateUrl: './status-bench.component.html',
  styleUrls: ['./status-bench.component.css']
})
export class StatusBenchComponent implements OnInit {

  showChips: boolean = false;

  get players(): Player[] { return this.gameApiService.players; };

  chips(playerId: number): number[] {
    let chips: number[] = [];
    // white player chips
    chips.push(-1);
    chips.push(-1);
    let used: number = 2;
    let score: number = this.gameApiService.players.find(p => p.id == playerId).score;
    score = 96;

    while (score - used >= 20) {
      chips.push(25);
      used += 25;
    }

    while (score - used >= 5) {
      chips.push(5);
      used += 5;
    }
    while (score - used >= 1) {
      chips.push(1);
      used += 1;
    }
    return chips;
  }

  chipClass(amount: number, playerNumber: number): string {
    return amount === -1 ? "chip player-chip player-" + playerNumber : amount === 1 ? "chip red-chip" : "chip blue-chip";
  }

  toggleChips() {
    this.showChips = !this.showChips;
  }

  constructor(
    private gameApiService: GameApiService
  ) { }

  ngOnInit() {
  }

}