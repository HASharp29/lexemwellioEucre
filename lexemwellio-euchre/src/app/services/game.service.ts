import { Injectable } from '@angular/core';


export interface Card {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
    rank: '9' | '10' | 'J' | 'Q' | 'K' | 'A';
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
  trumpSuit:  Card['suit'] | null;
  trickCounter: number;
  currentTrick: Trick;
  tricksWon: [number, number];
}

// this interface keeps the state of the game
export interface Game {
  players: Player[];
  roundCounter: number;
  currentRound:Round|null;
  roundsWon: [number, number];
}

@Injectable({
  providedIn: 'root'
})
export class GameService {

  constructor() { }

  // Create a deck of cards
  createDeck(): Card[] {
    const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Card['rank'][] = ['9', '10', 'J', 'Q', 'K', 'A'];
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

    // Distribute the cards to the players' hands (5 cards each)
    const { hands, kittyCard } = this.dealCards(shuffledDeck);
    const currentTrick = this.createTrick();
    const round: Round = {
      hands, 
      kittyCard, 
      dealer, 
      caller: null,
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
      throw new Error('There must be exactly 4 players.');
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

  setTrump(round:Round, trumpSuit:Card['suit']) {
    round.trumpSuit = trumpSuit;
  }

  //given a player, card, and the round, remove card from player hand
  // and add it into the played cards of the current trick
  playCard(round:Round, player:Player, cardToPlay:Card) {
    // Remove the card from the player's hand
    const cardIndex = round.hands[player.index].indexOf(cardToPlay);
    if (cardIndex !== -1) {
      round.hands[player.index].splice(cardIndex, 1);  // Remove the card from the hand
    } else {
      throw new Error('Card to play not found in player\'s hand.');
    }

    // Add the card to the current trick
    const trick = round.currentTrick;
    trick.cardsPlayed[player.index] = cardToPlay;
    
    // if card is first  in trick, add it the cardLed
    if (trick.cardLed === null) {
      trick.cardLed = cardToPlay;
    }
  }

  // determineTrickWinner(round:Round) {
  //   const trick = round.currentTrick;

  //   // Check if all cards have been played
  //   if (trick.cardsPlayed.includes(null)) {
  //     throw new Error('All cards must be played.');
  //   }

  //   const trumpSuit = round.trumpSuit;
  //   const cardLed = trick.cardLed;

  //   let highestCard: Card | null = null;
  //   let winningPlayerIndex: number = -1;

  // }

}
