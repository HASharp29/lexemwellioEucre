import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameComponent } from "./components/game/game.component";
import { FormsModule, NgModel } from '@angular/forms';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GameComponent, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

}
