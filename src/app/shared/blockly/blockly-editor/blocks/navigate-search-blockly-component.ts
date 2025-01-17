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
import {COLOR_AMBER} from '../../../../core/constants';
import {View} from '../../../../core/store/views/view';

declare var Blockly: any;

export class NavigateSearchBlocklyComponent extends BlocklyComponent {
  private tooltip: string;
  private viewOptions = [];
  private windowOptions: string[];
  private sidebarOptions: string[];

  public constructor(public blocklyUtils: BlocklyUtils, private views: View[]) {
    super(blocklyUtils);

    views.forEach(view => this.viewOptions.push([view.name.replace(/ /g, '\u00A0'), view.id]));

    if (this.viewOptions.length === 0) {
      this.viewOptions.push(['?', '']);
    }

    this.tooltip = $localize`:@@blockly.tooltip.navigateSearchBlock:Opens the given view with additional query parameters. It can open the view in the same browser tab or in a new one. Where possible (e.g. Workflow), a sidebar can be opened.`;

    this.windowOptions = $localize`:@@blockly.dropdown.window.navigateBlock:the same,a new`.split(',');
    this.sidebarOptions = $localize`:@@blockly.dropdown.sidebar.navigateBlock:closed,opened`.split(',');
  }

  public getVisibility(): MasterBlockType[] {
    return [MasterBlockType.Rule, MasterBlockType.Link];
  }

  public registerBlock(workspace: any) {
    const this_ = this;

    Blockly.Blocks[BlocklyUtils.NAVIGATE_TO_VIEW_SEARCH] = {
      init: function () {
        this.jsonInit({
          type: BlocklyUtils.NAVIGATE_TO_VIEW_SEARCH,
          message0: '%{BKY_BLOCK_NAVIGATE_TO_VIEW_SEARCH}', // navigate to view %1 %2 in %3 browser tab %4 with the sidebar %5 %6 with search query %7
          args0: [
            {
              type: 'field_dropdown',
              name: 'VIEW_ID',
              options: this_.viewOptions,
            },
            {
              type: 'input_dummy',
              align: 'RIGHT',
            },
            {
              type: 'field_dropdown',
              name: 'NEW_WINDOW',
              options: [
                [this_.windowOptions[0], 'false'],
                [this_.windowOptions[1], 'true'],
              ],
            },
            {
              type: 'input_dummy',
              align: 'RIGHT',
            },
            {
              type: 'field_dropdown',
              name: 'SIDEBAR',
              options: [
                [this_.sidebarOptions[0], 'false'],
                [this_.sidebarOptions[1], 'true'],
              ],
            },
            {
              type: 'input_dummy',
              align: 'RIGHT',
            },
            {
              type: 'input_value',
              name: 'SEARCH',
              align: 'RIGHT',
            },
          ],
          previousStatement: null,
          nextStatement: null,
          colour: COLOR_AMBER,
          tooltip: this_.tooltip,
          helpUrl: '',
        });
      },
    };
    Blockly.JavaScript[BlocklyUtils.NAVIGATE_TO_VIEW_SEARCH] = function (block) {
      const viewId = block.getFieldValue('VIEW_ID') || null;
      const newWindow = block.getFieldValue('NEW_WINDOW') || false;
      const sidebar = block.getFieldValue('SIDEBAR') || false;
      const search = Blockly.JavaScript.valueToCode(block, 'SEARCH', Blockly.JavaScript.ORDER_ASSIGNMENT) || '';

      if (!viewId) {
        return '';
      }

      return this_.blocklyUtils.getLumeerVariable() + `.navigate('${viewId}', ${search}, ${sidebar}, ${newWindow});\n`;
    };
  }
}
