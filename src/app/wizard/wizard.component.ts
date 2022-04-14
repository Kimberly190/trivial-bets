import { Component, OnInit, HostBinding, ViewChild, ElementRef } from '@angular/core';
import { interval } from 'rxjs';
import { switchMap, filter, take, timeout } from 'rxjs/operators';

import { GameApiService } from '../game-api.service';

import * as models from '../models';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.css']
})
export class WizardComponent implements OnInit {

  DEFAULT_SCORE = 2;
  DEFAULT_ANSWER = -1;
  MAX_QUESTION = 7;

  PAGE_NUM_WELCOME = 1;
  PAGE_NUM_NEW_GAME = 2;
  PAGE_NUM_WAITING = 3;
  PAGE_NUM_ANSWER_Q = 4;
  PAGE_NUM_SHOW_A = 5;
  PAGE_NUM_BET = 6;
  PAGE_NUM_SHOW_BETS = 7;
  PAGE_NUM_SHOWTIME = 8;
  PAGE_NUM_WINNING_G = 9;
  PAGE_NUM_SCORES = 10;
  PAGE_NUM_FINAL = 11;

  //TODO check optional interface properties
  //TODO componentize dependent UI pieces to avoid this innitialization
  // Initialize editable model types with defaults to enable two-way data binding.
  gameRoom: models.GameRoom = { id: undefined };
  player: models.Player = { id: undefined, playerNumber: undefined, name: undefined, isHost: false, gameRoomId: undefined, score: this.DEFAULT_SCORE };
  question: models.Question = { id: undefined, gameRoomId: undefined, correctAnswer: undefined };
  answer: models.Answer = { id: undefined, guess: undefined, playerId: undefined, questionId: undefined };
  bet: models.Bet = { id: undefined, amount: undefined, payout: undefined, playerId: undefined, answerId: undefined };
  defaultAnswer: models.Answer;
  
  allAnswers: models.Answer[];
  allResults: models.Result[];
  winningGuesses: models.Result[];
  otherResults: models.Result[];

  get betAnswerValue() : number {
    return (this.allAnswers && this.bet)
      ? (this.allAnswers.find(a => a.id == this.bet.answerId) || { guess: undefined }).guess
      : undefined;
  }

  get players() : models.Player[] { return this.gameApiService.players; }

  get playersByScore() : models.Player[] { return this.players.sort((a, b) => { return b.score - a.score; }); }

  // State properties
  questionNumber: number = 0;
  //TODO contrast with http interceptor for loading solution
  @HostBinding('class.wait') loading: boolean = false;
  showGameBoard: boolean = false;
  laneData: any[] = []; //TODO remove init if not needed
  //TODO replace this + allAnswersIn with single property / or binding?
  betsByUser: number;
  betAmountTotal: number = 0;
  page: number;
  canRetry: boolean = false;

  @ViewChild("nameInput") _nameInput: ElementRef;
  @ViewChild("guessInput") _guessInput: ElementRef;
  @ViewChild("betInput") _betInput: ElementRef;
  @ViewChild("answerInput") _answerInput: ElementRef;

  constructor(
    private gameApiService: GameApiService
  ) { }

  ngOnInit() {
    this.page = this.PAGE_NUM_WELCOME;
  }

  hostNewGame() {
    this.loading = true;

    this.player.isHost = true;
    this.gameApiService.createGame().subscribe(
      (data: models.GameRoom) => {
        this.gameRoom = data;
        //TODO can shortcut? / is this copy necessary?
        this.player.gameRoomId = this.gameRoom.id;

        this.page++;
      },
      error => {
        //TODO handle
        window.alert('Failed to create game room: ' + error.error);
        console.log('error creating gameRoom in wizard: ', error);
      }
    ).add(() => {
      this.loading = false;
      this.setFocusOn(this._nameInput);
    });
  }

  joinGame() {
    this.page++;
    this.setFocusOn(this._nameInput);
  }

  //TODO can back be enabled in bet screen, others?
  back() {
    if (this.page == this.PAGE_NUM_NEW_GAME) {
      // Reset
      this.player.isHost = false;
      this.gameRoom.id = undefined;
    }
    this.page--;
  }

  addPlayer() {
    this.loading = true;

    this.gameApiService.createPlayer(this.player).subscribe(
      (data: models.Player) => {
        this.player = data;
        this.gameRoom.id = this.player.gameRoomId;

        console.log("created player, id: " + this.player.id + "; game room id: " + this.gameRoom.id);

        this.refreshPlayers();

        this.page++;

        if (!this.player.isHost) {
          this.nextQuestion();
        }
      },
      error => {
        //TODO handle
        console.log('Failed to add player: ', error);
        window.alert('error adding player in wizard: ' + error.error);
      }
    ).add(() => { this.loading = false; });
  }

  //TODO: replace manual refresh with polling + timeout until start of game
  refreshPlayers() {
    this.gameApiService.getPlayers(this.gameRoom.id);
  }

  nextQuestion(isRetry: boolean = false) {
    console.log('nextQuestion() called, questionNumber: ' + this.questionNumber);

    if (this.questionNumber == this.MAX_QUESTION) {
      this.getFinalScores();
    } else {
      // Reset.
      this.answer = { id: undefined, guess: undefined, playerId: undefined, questionId: undefined };
      this.bet = { id: undefined, amount: undefined, payout: undefined, playerId: undefined, answerId: undefined };
      this.laneData.length = 0;

      this.loading = true;
      if (!isRetry) {
        this.questionNumber++; //TODO remove when data-bound?
      }

      //TODO: PUT flag on gameRoom to block late joiners?

      if (this.player.isHost) {
        // Host creates the question...
        this.gameApiService.createQuestion(this.gameRoom.id, this.questionNumber).subscribe(
          (data: models.Question) => {
            this.question = data;
            this.answer.questionId = this.question.id;
            this.answer.playerId = this.player.id;

            // Also create the 'default' answer for the question.  No dependent UI updates.
            this.gameApiService.createAnswer(
              {
                id: undefined,
                guess: this.DEFAULT_ANSWER,
                playerId: undefined,
                questionId: this.question.id
              }
            ).subscribe(
              data => {
                if (this.questionNumber === 1) {
                  // Make sure all players are known to this instance at start of game.
                  this.refreshPlayers();
                }

                //TODO - anything else?
              },
              error => {
                //TODO handle
                window.alert('Failed to get game question: ' + error.error);
                console.log('error creating default question in wizard: ', error);
              }
            );

            this.page = this.PAGE_NUM_ANSWER_Q;
          },
          error => {
            //TODO handle
            window.alert('Failed to get game question: ' + error.error);
            console.log('error creating question in wizard: ', error);
          }
        ).add(() => {
          this.loading = false;
          this.setFocusOn(this._guessInput);
        });
      } else {
        // ..other players just get it.
        //TODO check alt method of polling with retry, delay, back-off
        //https://medium.com/angular-in-depth/retry-failed-http-requests-in-angular-f5959d486294

        this.canRetry = false;

        //https://stackoverflow.com/questions/63058012/angular-rxjs-poll-http-request-until-timeout-or-positive-response-from-server
        //TODO remove initial delay?
        interval(3000).pipe(
          switchMap(() => this.gameApiService.getQuestion(this.gameRoom.id, this.questionNumber)),

          filter((data: models.Question) => {
            //console.log('got question data: ' + JSON.stringify(data));
            return data && data.id > 0;
          }),

          // Emit only the first value emitted by the source
          take(1),

          // Time out after 15 seconds
          timeout(15000),
        ).subscribe((data: models.Question) => {
          if (this.questionNumber === 1) {
            // Make sure all players are known to this instance at start of game.
            this.refreshPlayers();
          }
          
          this.question = data;
          this.answer.questionId = this.question.id;
          this.answer.playerId = this.player.id;

          // this.questionNumber++; //TODO remove when data-bound?
          this.page = this.PAGE_NUM_ANSWER_Q;
        },
          error => {
            //TODO handle
            window.alert('Failed to get game question: ' + error.error);
            console.log('error getting question in wizard: ', error);
            this.canRetry = true;
          }
        ).add(() => {
          console.log("polling complete");
          this.loading = false;
          this.setFocusOn(this._guessInput);
        });
      }
    }
  }

  submitAnswer() {
    this.loading = true;

    this.gameApiService.createAnswer(this.answer).subscribe(
      (data: models.Answer) => {
        this.answer = data;

        //TODO get all answers & poll

        this.betAmountTotal = 0;
        this.betsByUser = 0;

        this.showGameBoard = true;
        this.page++;

        //TODO test
        this.refreshAnswers();
      },
      error => {
        //TODO handle
        window.alert('Failed to submit answer: ' + error.error);
        console.log('error creating answer in wizard: ', error);
      }
    ).add(() => { this.loading = false; });
  }

  refreshAnswers() {
    this.loading = true;

    this.gameApiService.getAnswersForQuestion(this.question.id).subscribe(
      (data: models.Answer[]) => {
        this.allAnswers = data;
        this.defaultAnswer = this.allAnswers.find(a => a.guess == this.DEFAULT_ANSWER);
        let playerAnswers = this.allAnswers.filter(a => a.guess != this.DEFAULT_ANSWER);
        this.laneData = this.gameApiService.distributeAnswers(playerAnswers, this.gameApiService.players);
      },
      error => {
        //TODO handle
        window.alert('Failed to refresh: ' + error.error);
        console.log('error refreshing answers in wizard: ', error);
      }
    ).add(() => { this.loading = false; });
  }

  onBet(bet: models.Bet) {
    if (this.betsByUser >= 2) {
      window.alert('You can only bet two times.');
      return;
    }

    this.bet = bet;
    this.bet.playerId = this.player.id;

    //TODO decrement player score display by amount?  (would require persisting & updating all users...)

    if (this.bet.answerId == 0) {
      this.bet.answerId = this.defaultAnswer.id;
    }

    this.showGameBoard = false;
    this.page = this.PAGE_NUM_BET;
    
    this.setFocusOn(this._betInput);
  }

  submitBet() {
    // Update player reference for bet amount validation vs score
    this.player = this.gameApiService.players.find(p => p.id == this.player.id);

    if (this.bet.amount < 1) {
      window.alert('The minimum bet is 1.');
      return;
    }

    if ((this.betAmountTotal + this.bet.amount) > this.player.score) {
      window.alert('You can\'t bet more chips than you have.');
      return;
    }

    if (this.bet.amount == this.player.score) {
      window.alert('You can\'t use all your chips in a single bet.');
      return;
    }

    this.loading = true;

    this.gameApiService.createBet(this.bet).subscribe(
      (data: models.Bet) => {
        this.bet = data;

        this.betAmountTotal += this.bet.amount;
        this.betsByUser++;

        this.showGameBoard = true;
        this.page = this.PAGE_NUM_SHOW_BETS;

        this.refreshBets();
      },
      error => {
        //TODO handle
        window.alert('Failed to submit bet: ' + error.error);
        console.log('error submitting bet in wizard: ', error);
      }
    ).add(() => { this.loading = false; });
  }

  refreshBets() {
    this.loading = true;

    this.gameApiService.getBetsForQuestion(this.question.id).subscribe(
      (data: models.Bet[]) => {
        var bets = data;
        this.gameApiService.setBets(this.laneData, bets);
      },
      error => {
        //TODO handle
        window.alert('Failed to refresh: ' + error.error);
        console.log('error refreshing answers in wizard: ', error);
      }
    ).add(() => { this.loading = false; });
  }

  goToResults() {
    this.showGameBoard = false;
    this.page++;

    if (this.player.isHost) {
      this.setFocusOn(this._answerInput);
    } else {
      this.updateQuestionGetResults();
    }
  }

  updateQuestionGetResults() {
    console.log('updateQuestionGetResults() called, questionNumber: ' + this.questionNumber);

    if (this.player.isHost) {
      // Host updates the question with the correct answer...
      this.loading = true;

      this.gameApiService.updateQuestion(this.question).subscribe(
        data => {
          this.getResults();
        },
        error => {
          //TODO handle
          window.alert('Failed to update question: ' + error.error);
          console.log('error updating question in wizard: ', error);
        }
      ).add(() => { this.loading = false; });
    } else {
      // ..other players just get it.
      this.loading = true;
      this.canRetry = false;

      interval(3000).pipe(
        switchMap(() => this.gameApiService.getQuestion(this.gameRoom.id, this.questionNumber)),

        filter((data: models.Question) => {
          console.log('got question, continue if answer is set: ' + JSON.stringify(data));
          return data && data.correctAnswer != null;
        }),

        // Emit only the first value emitted by the source
        take(1),

        // Time out after 15 seconds
        timeout(15000),

      ).subscribe((data: models.Question) => {
          this.question = data;
          this.getResults();
      },
        error => {
          //TODO handle
          window.alert('Failed to get results: ' + error.error);
          console.log('error getting question results in wizard: ', error);
          this.canRetry = true;
        }
      ).add(() => { console.log("polling complete"); this.loading = false; });
    }
  }

  getResults() {
    this.loading = true;

    this.gameApiService.getResultsForQuestion(this.question.id).subscribe(
      (data: models.Result[]) => {

        this.allResults = data.sort((ra, rb) => { return rb.credit - ra.credit });
        this.allResults.forEach(r => {
          // Populate player and answer to simplify display logic.
          r.player = this.gameApiService.players.find(p => p.id == r.playerId);
          r.answer = this.allAnswers.find(a => a.id == r.answerId);
        });

        this.winningGuesses = this.allResults.filter(r => r.isWinningGuess && r.playerId);
        this.otherResults = this.allResults.filter(r => !r.isWinningGuess);

        this.page++;

        if (this.player.isHost) {
          this.updateScores();
        }
      },
      error => {
        //TODO handle
        window.alert('Failed to get results: ' + error.error);
        console.log('error getting results in wizard: ', error);
      }
    ).add(() => { this.loading = false; });
  }

  updateScores() {
    for (let player of this.gameApiService.players) {
      this.loading = true;

      let playerResults = this.allResults.filter(r => r.playerId == player.id);
      playerResults.forEach(pr => player.score += pr.credit);
      
      //TODO fix score decrementing / incrementing (doesn't work unless host handles all...)
      //// Also add back the default chips.
      //player.score += this.DEFAULT_SCORE;

      this.gameApiService.updatePlayer(player).subscribe(
        data => {
          // nop?
        },
        error => {
          //TODO handle
          window.alert('Failed to update player: ' + error.error);
          console.log('error updating player in wizard: ', error);
        }
      ).add(() => { this.loading = false; });
    }
  }

  getPlayerCredits() {
    this.refreshPlayers();
    this.page++;
  }

  getFinalScores() {
    this.page++;
  }

  endGame() {
    //TODO
    //?
  }

  setFocusOn(element: ElementRef) {
    setTimeout(()=>{
      element.nativeElement.focus();
    },100);
  }
}