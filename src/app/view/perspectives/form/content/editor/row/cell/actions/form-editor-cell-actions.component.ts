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
import {FormCellConfig, FormCellType} from '../../../../../../../../core/store/form/form-model';
import {Collection} from '../../../../../../../../core/store/collections/collection';
import {View} from '../../../../../../../../core/store/views/view';

@Component({
  selector: 'form-editor-cell-actions',
  templateUrl: './form-editor-cell-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormEditorCellActionsComponent {
  @Input()
  public type: FormCellType;

  @Input()
  public config: FormCellConfig;

  @Input()
  public collectionId: string;

  @Input()
  public view: View;

  @Output()
  public configChange = new EventEmitter<FormCellConfig>();

  public readonly cellType = FormCellType;
}
