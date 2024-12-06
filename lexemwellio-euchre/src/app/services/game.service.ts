import { Injectable } from "@angular/core";
import { outputToObservable } from "@angular/core/rxjs-interop";


export interface Card {
    suit: "hearts" | "diamonds" | "clubs" | "spades";
    rank: "9" | "10" | "J" | "Q" | "K" | "A";
    photo: string;
}

//stores a Player name and index
interface Player {
    name: string;
    index: number;
}

// this interface keeps track of the cards played in a trick and who led the trick and with what
interface Trick {
  cardsPlayed: [Card|null, Card|null, Card|null, Card|null]; //cards played, index corresponds to player
  leadPlayer: Player|null; //player who played first card
  cardLed: Card | null; //card led
} 

// this interfaces keeps track of one round. it also contains the current trick
export interface Round {
  hands: [Card[], Card[], Card[], Card[],]; //player hands,index corresponds to player
  kittyCard: Card; // card used in first round of determining trump
  dealer: Player; //who dealt the cards 
  caller: Player | null; //person who calls trump (used to determine someone gets euchred)
  outPlayer: Player | null; // if someone goes alone, this is their partner, they will not play in the round
  trumpSuit:  Card["suit"] | null; 
  trickCounter: number; //how many tricks have been completed. always <5 (first trick is 0)
  currentTrick: Trick; //state of current trick
  tricksWon: [number, number]; //score within round, for teams 0 and 1
}

// this interface keeps the state of the game
export interface Game {
  players: Player[]; //stores players in game
  roundCounter: number; //how many rounds have been completed
  currentRound:Round; //state of current round
  score: [number, number]; //game score, for teams 0 and 1
}

@Injectable({
  providedIn: "root"
})
export class GameService {

  constructor() { }

  // Create a deck of cards
  createDeck(): Card[] {
    const suits: Card["suit"][] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: Card["rank"][] = ["9", "10", "J", "Q", "K", "A"];
    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, photo: `${suit}_${rank}.png` });
      }
    }
    return deck;
  }

  // Shuffle the deck
  shuffleDeck(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap cards
    }
    return deck;
  }

  //create the hands and designate kitty card
  private dealCards() {
    const deck = this.shuffleDeck(this.createDeck());

    //deal to hands
    const hands:[Card[],Card[],Card[],Card[],] = [[],[],[],[]];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) {
        hands[j]!.push(deck.pop()!);
      }
    }

    //set kitty card
    const kittyCard = deck.pop()!;
    return { hands, kittyCard };
  }

  // creates a new trick with all values initialized to null
  createTrick() {
    return { 
      cardsPlayed: [null, null, null, null] as [Card | null, Card | null, Card | null, Card | null],
      leadPlayer: null,
      cardLed: null,
    };
  }

  // creates new round, deal cards to players
  createRound(dealer: Player): Round {
    // distribute cards to hand and kitty
    const { hands, kittyCard } = this.dealCards();

    return {
      hands, 
      kittyCard, 
      dealer, //input of function
      caller: null,
      outPlayer: null,
      trumpSuit: null, 
      trickCounter: 0, 
      currentTrick: this.createTrick(), 
      tricksWon: [0, 0], 
    };
  }

  // Initialize the game
  initializeGame(playerNames: string[]): Game {
    if (playerNames.length !== 4) {
      throw new Error("There must be exactly 4 players.");
    }

    // Create players with the input names
    const players= playerNames.map((name, index) => ({
      name,
      index,
    })) as [Player,Player,Player,Player];

    return {
      players,
      roundCounter: 0,
      currentRound: this.createRound(players[0]),
      score: [0,0],
    };
  }

  
  //given a player index, determine which team they are on 
  // team 0: players 0 and 2
  // team 1: players 1 and 3
  playerTeam(playerIndex:number):number {
    if (playerIndex % 2 === 0) {
      return 0
    } else {
      return 1
    }
  }

  //the following functions are used to help determine the rank of a card
  isRightBower(card:Card, trumpSuit:Card["suit"]):boolean {
    return card.rank==="J" && card.suit === trumpSuit;
  }

  isLeftBower(card:Card, trumpSuit:Card["suit"]) {
    if (card.rank === "J") {
      switch (card.suit) {
        case "hearts":
          return trumpSuit==="diamonds";
        case "diamonds":
          return trumpSuit==="hearts";
        case "spades":
          return trumpSuit==="clubs";
          case "clubs":
            return trumpSuit==="spades";
      }
    }
    return false;
  }

  getCardRank(card:Card, trumpSuit:Card['suit']) {
    if (this.isRightBower(card, trumpSuit)) return 8;
    if (this.isLeftBower(card, trumpSuit)) return 7;
    switch(card.rank) {
      case "A":
        return 6;
      case "K":
        return 5;
      case "Q":
        return 4;
      case "J":
        return 3;
      case "10":
        return 2;
      case "9":
        return 1;
    }
  }

  // this checks if a card is of the trump suit, taking into account the off jack
  isTrumpSuit(card:Card, trumpSuit:Card['suit']) {
    return card.suit===trumpSuit || this.isLeftBower(card, trumpSuit)
  }

  // this checks if two cards are of the same suit, taking into account the off jack
  areSameSuit(card1:Card, card2:Card, trumpSuit:Card['suit']):boolean {
    if (this.isTrumpSuit(card1,trumpSuit)) {
      return this.isTrumpSuit(card2, trumpSuit);
    }
    return card1.suit===card2.suit && !this.isTrumpSuit(card2, trumpSuit);
  }

  //given a player, card, and the round, remove card from player hand
  // and add it into the played cards of the current trick
  playCard(game:Game, player:Player, cardToPlay:Card) {

    const round = game.currentRound;
    const playerHand = round.hands[player.index]!;
    const cardToPlayIndex =playerHand.indexOf(cardToPlay);

    const trick = round.currentTrick;

    const trumpSuit = round.trumpSuit!;
    const cardLed = trick.cardLed!;

    //ensure that card is in player hand
    if (cardToPlayIndex !== -1) {
      // if card no card has been played yet, set this as cardLed
      if (trick.cardLed === null) {
        trick.cardLed = cardToPlay;

      // check that the player follows suit if they are able
      } else if (
        !this.areSameSuit(cardToPlay, cardLed, trumpSuit) && 
        (playerHand.find((card) => this.areSameSuit(card, cardLed, trumpSuit)))
      ){
        throw new Error("Player must follow the suit led")
      }
    } else {
      throw new Error("Card to play not found in player\"s hand.");
    }

    // Add the card to the current trick, remove from hand
    trick.cardsPlayed[player.index] = cardToPlay;
    playerHand.splice(cardToPlayIndex, 1); 
  }

  //given a trick where all players have put down card, determine trick winner
  determineTrickWinner(game:Game):Player {
    const round = game.currentRound;
    const trick = round.currentTrick;

    const trumpSuit = round.trumpSuit!;

    let highestCard: Card | null = null;
    let winningPlayerIndex: number = -1;

    if ( trick.cardsPlayed.find((card, index) => card === null && index !==round.outPlayer?.index)) {
      throw new Error("Trick not complete")
    }

    for(let i=0;i<4;i++) {
      const card = trick.cardsPlayed[i];

      if (
        card && (  //make sure new card is not null
        highestCard===null||  //if new card is first card
        (this.isTrumpSuit(card, trumpSuit) && !this.isTrumpSuit(highestCard, trumpSuit)) || //if new card is trump and highest is not
        (this.areSameSuit(card, highestCard, trumpSuit) && this.getCardRank(card, trumpSuit) > this.getCardRank(highestCard, trumpSuit)) //if they are same suit, and new card is higher
      )) {
        highestCard = card;
        winningPlayerIndex = i;
      }
    }
    return game.players[winningPlayerIndex];
  }

  // update score, and reset to next trick
  scoreTrick(game:Game, winningPlayer:Player):void {
    const round = game.currentRound;
    const players = game.players;
    
    const winningPlayerIndex:number = winningPlayer.index;
  
    // Update the tricksWon array for the respective team
    if (winningPlayerIndex === 0 || winningPlayerIndex === 2) {
      round.tricksWon[0] += 1; // Team 1 (players 0 and 2)
    } else {
      round.tricksWon[1] += 1; // Team 2 (players 1 and 3)
    }
    
    console.log(`Trick ${round.trickCounter} Winner: ${players[winningPlayerIndex].name}`);
    console.log(`Team 1 Tricks: ${round.tricksWon[0]}`);
    console.log(`Team 2 Tricks: ${round.tricksWon[1]}`);

    //reset trick
    round.currentTrick = this.createTrick();
    round.trickCounter++;
  }

  //update score, reset round
  scoreRound(game:Game):void {
    const round = game.currentRound;

    if (round.trickCounter < 5) {
      throw new Error("Round not complete");
    }

    //determine winning team
    const winningTeam = round.tricksWon.reduce((maxIndex, curValue, curIndex, arr) => curValue > arr[maxIndex]? curIndex:maxIndex,0);
    const tricksWon = round.tricksWon[winningTeam];

    //update score
    if (this.playerTeam(round.caller!.index) === winningTeam) {
     if (tricksWon ===5) {
      if (round.outPlayer !== null) { // caller wins all 5 tricks going alone
        game.score[winningTeam] += 4;
        console.log(`Team ${winningTeam} wins all five tricks with ${round.caller?.name} going alone, gets 4 points.`)
      } else { // caller wins all five tricks together
        game.score[winningTeam] += 2;
        console.log(`Team ${winningTeam} wins all five tricks, gets 2 points.`)
      }
     } else { // caller wins majority of tricks
      game.score[winningTeam] += 1;
      console.log(`Team ${winningTeam} wins all ${tricksWon} tricks, gets 1 point.`)
     }
    } else { //noncaller wins majority of tricks
      game.score[(winningTeam + 1)%2] += 2;
      console.log(`Team ${winningTeam} euchred Team ${(winningTeam + 1) % 2}, winning ${tricksWon} tricks. Team ${winningTeam} gets 2 points.`)
    }

    //reset round, moving to next dealer
    game.currentRound = this.createRound(game.players[(round.dealer.index + 1) % 4]);
    game.roundCounter++;
  }

  
  //set the value of the trump suit in the round
  setTrump(game:Game, trumpSuit:Card["suit"], caller:Player, alone:boolean) {
    const round = game.currentRound;

    round.trumpSuit = trumpSuit;
    
    // if caller calls go alone, not that their partner is out of play
    if (alone) { round.outPlayer = game.players[(caller.index + 2) % 4] }
  }

}
