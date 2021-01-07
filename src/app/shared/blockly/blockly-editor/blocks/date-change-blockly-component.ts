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

import {BlocklyComponent} from './blockly-component';
import {BlocklyUtils, MasterBlockType} from '../blockly-utils';
import {COLOR_CYAN, COLOR_PINK} from '../../../../core/constants';
import {I18n} from '@ngx-translate/i18n-polyfill';

declare var Blockly: any;

export class DateChangeBlocklyComponent extends BlocklyComponent {
  private tooltip: string;
  private units: string[];
  private ops: string[];

  public constructor(public blocklyUtils: BlocklyUtils, public i18n: I18n) {
    super(blocklyUtils, i18n);

    this.tooltip = i18n({
      id: 'blockly.tooltip.dateChangeBlock',
      value:
        'Changes a date object returning the new updated date object. Apply date to ISO to store it in a date/time attribute.',
    });
    this.units = i18n({
      id: 'blockly.dropdown.units.dateChangeBlock',
      value: 'second(s),minute(s),hour(s),day(s),month(s),quarter(s),year(s)',
    }).split(',');
    this.ops = i18n({id: 'blockly.dropdown.ops.dateChangeBlock', value: 'add,subtract,set'}).split(',');
  }

  public getVisibility(): MasterBlockType[] {
    return [MasterBlockType.Function, MasterBlockType.Link, MasterBlockType.Value];
  }

  public registerBlock(workspace: any): void {
    const this_ = this;

    Blockly.Blocks[BlocklyUtils.DATE_CHANGE] = {
      init: function () {
        this.jsonInit({
          type: BlocklyUtils.DATE_CHANGE,
          message0: '%{BKY_BLOCK_DATE_CHANGE}', // %1 %2 %3 to/from/in date %4
          args0: [
            {
              type: 'field_dropdown',
              name: 'OP',
              options: [
                [this_.ops[0], 'add'],
                [this_.ops[1], 'subtract'],
                [this_.ops[2], 'set'],
              ],
            },
            {
              type: 'input_value',
              name: 'COUNT',
            },
            {
              type: 'field_dropdown',
              name: 'UNIT',
              options: [
                [this_.units[0], 'seconds'],
                [this_.units[1], 'minutes'],
                [this_.units[2], 'hours'],
                [this_.units[3], 'days'],
                [this_.units[4], 'months'],
                [this_.units[5], 'quarters'],
                [this_.units[6], 'years'],
              ],
            },
            {
              type: 'input_value',
              name: 'DATE',
            },
          ],
          inputsInline: true,
          output: null,
          colour: COLOR_PINK,
          tooltip: this_.tooltip,
        });
      },
    };
    Blockly.JavaScript[BlocklyUtils.DATE_CHANGE] = function (block) {
      const unit = block.getFieldValue('UNIT');
      const op = block.getFieldValue('OP');
      const count = Blockly.JavaScript.valueToCode(block, 'COUNT', Blockly.JavaScript.ORDER_ATOMIC) || null;
      const input_date = Blockly.JavaScript.valueToCode(block, 'DATE', Blockly.JavaScript.ORDER_ATOMIC) || null;

      let code = '/** MomentJs **/ ';

      if (op === 'add' || op === 'subtract') {
        code += 'moment(' + input_date + ').' + op + '((' + count + "), '" + unit + "').toDate()";
      } else {
        if (unit === 'days') {
          code += 'moment(' + input_date + ').date((' + count + ') - 1).toDate()';
        } else {
          const fce = unit.substring(0, unit.length - 1);
          code += 'moment(' + input_date + ').' + fce + '(' + count + ').toDate()';
        }
      }

      return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
    };
  }

  public getDocumentVariablesXml(workspace: any): string {
    return null;
  }
}