import { Injectable } from "@angular/core";


export interface Card {
    suit: "hearts" | "diamonds" | "clubs" | "spades";
    rank: "9" | "10" | "J" | "Q" | "K" | "A";
    photo: string;
}

export interface Player {
    name: string;
    index: number;
}

// this interface keeps track of the cards played in a trick
// and who wins the trick
export interface Trick {
  cardsPlayed: [Card|null, Card|null, Card|null, Card|null];
  cardLed: Card | null;
  winner: Player | null;
}

// this interfaces keeps track of one round (5 tricks)
export interface Round {
  hands: Card[][]; 
  kittyCard: Card;
  dealer: Player;
  caller: Player | null;
  outPlayer: Player | null;
  trumpSuit:  Card["suit"] | null;
  trickCounter: number;
  currentTrick: Trick;
  tricknnnsWon: [number, number];
}

// this interface keeps the state of the game
export interface Game {
  players: Player[];
  roundCounter: number;
  currentRound:Round;
  roundsWon: [number, number];
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
  private dealCards(deck: Card[]) {
    const hands: Card[][] = Array.from({ length: 4 }, () => []);
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) {
        hands[j].push(deck.pop()!);
      }
    }
    const kittyCard = deck.pop()!;
    return { hands, kittyCard };
  }

  createTrick() {
    const trick = { 
      cardsPlayed: [null, null, null, null] as [Card | null, Card | null, Card | null, Card | null],
      cardLed: null,
      winner: null,
    }
    return trick;
  }

  // create instance of round interface, deal cards to players
  createRound(dealer: Player): Round {
    // Shuffle the deck before starting the round
    const shuffledDeck = this.shuffleDeck(this.createDeck());

    // Distribute the cards to the players" hands (5 cards each)
    const { hands, kittyCard } = this.dealCards(shuffledDeck);
    const currentTrick = this.createTrick();
    const round: Round = {
      hands, 
      kittyCard, 
      dealer, 
      caller: null,
      outPlayer: null,
      trumpSuit: null, 
      trickCounter: 0, 
      currentTrick, 
      tricksWon: [0, 0], 
    };
    return round;
  }

  // Initialize the game
  initializeGame(playerNames: string[]): Game {
    if (playerNames.length !== 4) {
      throw new Error("There must be exactly 4 players.");
    }

    // Create players with the input names
    const players: Player[] = playerNames.map((name, index) => ({
      name,
      index,
    }));

    //set up first round
    const roundCounter = 0;
    const currentRound = this.createRound(players[0]);

    return {
      players,
      roundCounter,
      currentRound,
      roundsWon: [0,0],
    };
  }

  //set the value of the trump suit in the round
  setTrump(round:Round, trumpSuit:Card["suit"]) {
    round.trumpSuit = trumpSuit;
  }

  //given a player index, determine which team they are on
  playerTeam(playerIndex:number):number {
    if (playerIndex === 0 || playerIndex === 2) {
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
  getCardRank(card:Card) {
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

  //given a player, card, and the round, remove card from player hand
  // and add it into the played cards of the current trick
  playCard(round:Round, player:Player, cardToPlay:Card) {
    // Remove the card from the player"s hand
    const cardIndex = round.hands[player.index].indexOf(cardToPlay);
    const trick = round.currentTrick;

    //ensure that card is in player hand
    if (cardIndex !== -1) {
      // if card no card has been played yet, set this as cardLed
      if (trick.cardLed === null) {
        trick.cardLed = cardToPlay;
      // check that the player is properly following suit of cardLed
      } else if (cardToPlay.suit !== trick.cardLed.suit){
        if (round.hands[player.index].find((card) => {
          card.suit === trick.cardLed!.suit && card !== cardToPlay
        })) {
          throw new Error("Player must follow the suit led")
        }
      }
    } else {
      throw new Error("Card to play not found in player\"s hand.");
    }

    // Add the card to the current trick, remove from hand
    trick.cardsPlayed[player.index] = cardToPlay;
    round.hands[player.index].splice(cardIndex, 1); 
  }

  //given a trick where all players have put down card, determine trick winner
  determineTrickWinner(round:Round):number {
    const trick = round.currentTrick;

    // Check if all cards have been played
    if (trick.cardsPlayed.includes(null)) {
      throw new Error("All cards must be played.");
    }

    const trumpSuit = round.trumpSuit!;

    let highestCard: Card | null = null;
    let winningPlayerIndex: number = -1;

    for(let i=0;i<4;i++) {
      const card = trick.cardsPlayed[i]!;
      
      const isRight = this.isRightBower(card, trumpSuit);
      const isLeft = this.isLeftBower(card, trumpSuit);
      const isTrump = card?.suit === trumpSuit;

      if (
        highestCard===null||
        isRight ||
        (isLeft && !this.isRightBower(highestCard, trumpSuit)) ||
        (isTrump && highestCard.suit !== trumpSuit) ||
        (card?.suit === highestCard.suit && this.getCardRank(card) > getCardRank(highestCard))
      ) {
        highestCard = card;
        winningPlayerIndex = i;
      }
    }
    return winningPlayerIndex;
  }

  // determineWinningTeam(winningPlayerIndex:number):number {
  //   if (winningPlayerIndex === 0 || winningPlayerIndex === 2) {
  //    return 0
  //  } else {
  //    return 1;
  //  }
  // }

  //determine who one trick, update score, and reset to next trick
  scoreTrick(game:Game):void {
    const round = game.currentRound;
    const players = game.players;
    
    const winningPlayerIndex:number = this.determineTrickWinner(round);
  
    // Update the tricksWon array for the respective team
    if (winningPlayerIndex === 0 || winningPlayerIndex === 2) {
      round.tricksWon[0] += 1; // Team 1 (players 0 and 2)
    } else {
      round.tricksWon[1] += 1; // Team 2 (players 1 and 3)
    }
    
    console.log(`Trick ${round.trickCounter} Winner: ${players[winningPlayerIndex].name}`);
    console.log(`Team 1 Tricks: ${round.tricksWon[0]}`);
    console.log(`Team 2 Tricks: ${round.tricksWon[1]}`);

    round.currentTrick = this.createTrick();
    round.trickCounter++;
  }

  scoreRound(round:Round) {
    if (round.trickCounter < 5) {
      throw new Error("Round not complete");
    }


    //update to allow for going alone
    //add function to determine team of a player
    // 


  }
}
