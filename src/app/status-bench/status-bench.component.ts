import { Component, OnInit, Input } from '@angular/core';

import { GameApiService } from '../game-api.service';

import { ChipGroup, Player } from '../models';

@Component({
  selector: 'app-status-bench',
  templateUrl: './status-bench.component.html',
  styleUrls: ['./status-bench.component.css']
})
export class StatusBenchComponent implements OnInit {

  showChips: boolean = false;

  get players(): Player[] { return this.gameApiService.players; };

  getChipGroups(playerId: number): ChipGroup[] {
    let groups: ChipGroup[] = [];
    let score: number = this.gameApiService.players.find(p => p.id == playerId).score;
    let remaining: number = score;

    let playerChipGroup: ChipGroup = {
      amount: -1,
      count: 2
    };
    groups.push(playerChipGroup);
    remaining -= 2;

    if (remaining > 9) {
      let blueChipGroup: ChipGroup = {
        amount: 5,
        count: Math.floor(remaining / 5) - 1 // last 5 should always show as red chips, up to 9
      };
      groups.push(blueChipGroup);
      remaining -= blueChipGroup.amount * blueChipGroup.count;
    }

    if (remaining > 0) {
      let redChipGroup: ChipGroup = {
        amount: 1,
        count: remaining
      };
      groups.push(redChipGroup);
    }

    return groups;
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