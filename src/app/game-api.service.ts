import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import * as models from './models';

@Injectable()
export class GameApiService {

  private apiEndpoint = 'https://trivial-bets.azurewebsites.net/api/v1';
  //private apiEndpoint = 'https://localhost:5001/api/v2'

  NUM_LANES = 8;
  PAYOUTS = [6, 5, 4, 3, 2, 3, 4, 5];
  //TODO: payout(lane i) = 2 + abs (4 - i)
  //PAYOUTS = Array.from(Array(8), (_, i) => 2 + Math.abs(4 - i));

  gameRoom: models.GameRoom;
  players: models.Player[] = [];
  currentQAnswers: models.Answer[] = [];

  constructor(
    private http: HttpClient
  ) { }

  testLiveApi() {
    return this.http.get(this.apiEndpoint + '/Result/ForQuestion/3');
  }

  createGame(): Observable<models.GameRoom> {
    return this.http.post<models.GameRoom>(this.apiEndpoint + '/GameRoom', { });
  }

  createPlayer(player: models.Player): Observable<models.Player> {
    return this.http.post<models.Player>(this.apiEndpoint + '/Player', player);
  }

  getPlayers(gameRoomId: number) : Observable<models.Player[]> {
    //TODO is there a better way to manage this data sharing?
    //https://levelup.gitconnected.com/5-ways-to-share-data-between-angular-components-d656a7eb7f96
    var source = this.http.get<models.Player[]>(this.apiEndpoint + '/Player/ForGameRoom/' + gameRoomId);
    source.subscribe(
      (data: models.Player[]) => {
        this.players.length = 0;
        data.forEach(p => this.players.push(p));
      },
      error => {
        console.log("error getting player data in game api service: ", error);
      }
    );

    return source;
  }

  createQuestion(gameRoomId: number, rank: number) : Observable<models.Question> {
    return this.http.post<models.Question>(this.apiEndpoint + '/Question', { gameRoomId: gameRoomId, rank: rank });
  }

  getLatestQuestion(gameRoomId: number) : Observable<models.Question[]> {
    //TODO fix once API updated; currently returns all quetions and caller sorts
    return this.http.get<models.Question[]>(this.apiEndpoint + '/Question');
  }

  getQuestion(gameRoomId: number, rank: number) : Observable<models.Question> {
    //console.log('get question ' + rank + ' for room ' + gameRoomId);
    return this.http.get<models.Question>(this.apiEndpoint + `/GameRoom/${gameRoomId}/Question/${rank}`)
  }

  createAnswer(answer: models.Answer) : Observable<models.Answer> {
    return this.http.post<models.Answer>(this.apiEndpoint + '/Answer', answer);
  }

  getAnswersForQuestion(questionId: number) : Observable<models.Answer[]> {
    return this.http.get<models.Answer[]>(this.apiEndpoint + '/Answer/ForQuestion/' + questionId);
  }

  createBet(bet: models.Bet) : Observable<models.Bet> {
    return this.http.post<models.Bet>(this.apiEndpoint + '/Bet', bet);
  }

  getBetsForQuestion(questionId: number) : Observable<models.Bet[]> {
    return this.http.get<models.Bet[]>(this.apiEndpoint + '/Bet/ForQuestion/' + questionId);
  }

  updateQuestion(question: models.Question) {
    return this.http.put<models.Question>(this.apiEndpoint + '/Question/' + question.id, question);
  }

  getResultsForQuestion(questionId: number) : Observable<models.Result[]> {
    return this.http.get<models.Result[]>(this.apiEndpoint + '/Result/ForQuestion/' + questionId);
  }

  updatePlayer(player: models.Player) {
    return this.http.put<models.Player>(this.apiEndpoint + '/Player/' + player.id, player);
  }

  //TODO typed return
  //TODO can this be simplified? skip param players?
  // Precondition: these are player answers only
  distributeAnswers(answers, players): any[] {
    
    let laneResults = [];

    //TODO is this the best approach?  can do this elsewhere, and avoid double-iteration?
    for (let i = 0; i < answers.length; i++) {
      if (answers[i].playerId) { // It is not the default answer
        var player = players.find(p => p.id === answers[i].playerId);
        // Copy player name and playerNumber to answer to simplify display logic
        answers[i].name = player.name;
        answers[i].playerNumber = player.playerNumber;
      }
    }

    // .filter to work on a copy - TODO is this necessary?
    let sorted = answers.filter(Boolean).sort((a, b) => { return a.guess - b.guess; });

    for (let i = 0; i < sorted.length; i++) {

      // change each to an array, for now with single entry...
      let current = [sorted[i]];

      let matches = sorted.slice(i + 1).filter(x => x.guess === current[0].guess);
      if (matches) {
        matches.forEach(m => {
          // ...append any identical answers then remove from outer array
          current.push(m);
          delete sorted[sorted.indexOf(m)];
        });
        //TODO simplify this v
        // collapse deleted items before iterating; account for non-array-ified entries
        sorted = sorted.filter(item => item != null && (item.length == undefined || item.length > 0));
      }

      sorted[i] = current;
    }

    // Skip middle lane if even number of distinct answers; indicate with empty array
    if (sorted.length % 2 == 0) {
      sorted.splice(sorted.length  / 2, 0, []);
    }

    //TODO simplify? / explain
    let startLane = Math.floor((this.NUM_LANES - 1 - sorted.length) / 2) + 1;
    for (let i = 0; i < this.NUM_LANES; i++) {

      //TODO model type
      let laneData = {
        lane: i,
        answers: [],
        bets: [],
        payout: this.PAYOUTS[i],
        allAnswersIn: (answers.length === players.length)
      };
      if (i >= startLane && i < startLane + sorted.length) {
        laneData.answers.push(...sorted[i - startLane]);
      }

      laneResults.push(laneData);
    }

    return laneResults;
  }

  setBets(laneData, bets) {
    // Clear the current bets.
    laneData.forEach(d => d.bets.length = 0);

    for (let i = 0; i < bets.length; i++)
    {
      // Copy playerNumber to bet to simplify display logic
      let player = this.players.find(p => p.id == bets[i].playerId);
      bets[i].playerNumber = player.playerNumber;

      // Assign bet to lane based on answerIds
      let laneDatum = laneData.find(d => (d.answers.find(a => a.id === bets[i].answerId)));
      if (!laneDatum) {
        // It is the 'default' lane
        //TODO verify bets are not getting lost here
        laneDatum = laneData.find(d => d.lane === 0);
      }
      
      laneDatum.bets.push(bets[i]);
    }
  }
}