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

import {FormGroup} from '@angular/forms';
import {Component, OnInit, ChangeDetectionStrategy, Input} from '@angular/core';
import {Attribute, AttributeFunction, Collection} from '../../../../../core/store/collections/collection';
import {LinkType} from '../../../../../core/store/link-types/link.type';
import {View} from '../../../../../core/store/views/view';

@Component({
  selector: 'attribute-function-content',
  templateUrl: './attribute-function-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeFunctionContentComponent implements OnInit {
  @Input()
  public collections: Collection[];

  @Input()
  public linkTypes: LinkType[];

  @Input()
  public views: View[];

  @Input()
  public variableNames: string[];

  @Input()
  public collection: Collection;

  @Input()
  public linkType: LinkType;

  @Input()
  public attribute: Attribute;

  @Input()
  public attributeFunction: AttributeFunction;

  @Input()
  public form: FormGroup;

  public ngOnInit() {
    this.form.patchValue({
      js: this.attributeFunction?.js,
      xml: this.attributeFunction?.xml,
      dryRun: this.attributeFunction?.dryRun,
      recursive: this.attributeFunction?.recursive,
    });
  }
}
