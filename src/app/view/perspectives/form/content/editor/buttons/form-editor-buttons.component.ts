/*
 * Lumeer: Modern Data Definition and Processing Platform
 *
 * Copyright (C) since 2017 Lumeer.io, s.r.o. and/or its affiliates.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {Component, ChangeDetectionStrategy, Input, Output, EventEmitter} from '@angular/core';
import {FormButtonConfig, FormButtonsConfig} from '../../../../../../core/store/form/form-model';

@Component({
  selector: 'form-editor-buttons',
  templateUrl: './form-editor-buttons.component.html',
  styleUrls: ['./form-editor-buttons.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormEditorButtonsComponent {
  @Input()
  public buttons: FormButtonsConfig;

  @Input()
  public createOnly: boolean;

  @Output()
  public buttonsChange = new EventEmitter<FormButtonsConfig>();

  public onCreateButtonChange(button: FormButtonConfig) {
    this.buttonsChange.emit({
      ...this.buttons,
      create: button,
    });
  }

  public onUpdateButtonChange(button: FormButtonConfig) {
    this.buttonsChange.emit({
      ...this.buttons,
      update: button,
    });
  }
}
