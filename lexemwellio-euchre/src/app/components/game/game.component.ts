import { Component } from '@angular/core';
import { GameService, Game } from '../../services/game.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
  imports: [FormsModule],
})
export class GameComponent {
  game: Game | null = null;
  playerNames: string[] = ['', '', '', '']; // Array to bind to input fields
  
  constructor(private gameService: GameService) {}

  startGame(playerNames: string[]): void {
    console.log("submitted");
    this.game = this.gameService.initializeGame(playerNames);
    console.log('Game initialized:', this.game);
  }
}
