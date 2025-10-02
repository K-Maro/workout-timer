import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-about',
  imports: [CommonModule, MatCardModule],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {}
