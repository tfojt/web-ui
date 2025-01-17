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

import {initialViewSettingsState, ViewSettingsState} from './view-settings.state';
import {ViewSettingsAction, ViewSettingsActionType} from './view-settings.action';
import {
  addAttributeToSettings,
  createAndModifyViewSettings,
  moveAttributeInSettings,
  setAttributeToAttributeSettings,
} from '../../../shared/settings/settings.util';
import {AttributesResource, AttributesResourceType} from '../../model/resource';
import {ViewSettings} from '../views/view';

export function viewSettingsReducer(
  state: ViewSettingsState = initialViewSettingsState,
  action: ViewSettingsAction.All
): ViewSettingsState {
  switch (action.type) {
    case ViewSettingsActionType.HIDE_ATTRIBUTES:
      return hideOrShowAttributes(state, action, true);
    case ViewSettingsActionType.SHOW_ATTRIBUTES:
      return hideOrShowAttributes(state, action, false);
    case ViewSettingsActionType.MOVE_ATTRIBUTE:
      return moveAttribute(state, action);
    case ViewSettingsActionType.ADD_ATTRIBUTE:
      return addAttribute(state, action);
    case ViewSettingsActionType.SET_ATTRIBUTE:
      return setAttribute(state, action);
    case ViewSettingsActionType.SET_SETTINGS:
      return {...state, [action.payload.settingsId]: action.payload.settings};
    case ViewSettingsActionType.RESET_SETTINGS:
      return {...state, [action.payload.settingsId]: {}};
    case ViewSettingsActionType.CLEAR:
      return initialViewSettingsState;
    default:
      return state;
  }
}

function hideOrShowAttributes(
  state: ViewSettingsState,
  action: ViewSettingsAction.HideAttributes | ViewSettingsAction.ShowAttributes,
  hide: boolean
): ViewSettingsState {
  const {collectionAttributeIds, collection, linkTypeAttributeIds, linkType} = action.payload;
  const resources: {resource: AttributesResource; type: AttributesResourceType; attributeIds: string[]}[] = [];

  if (collection) {
    resources.push({
      resource: collection,
      type: AttributesResourceType.Collection,
      attributeIds: collectionAttributeIds || [],
    });
  }
  if (linkType) {
    resources.push({
      resource: linkType,
      type: AttributesResourceType.LinkType,
      attributeIds: linkTypeAttributeIds || [],
    });
  }

  const currentSettings = getViewSettings(state, action.payload.settingsId);
  const newSettings = resources.reduce((currentState, resource) => {
    return createAndModifyViewSettings(currentState, resource.resource, resource.type, settingsAttributes => {
      for (const attributeId of resource.attributeIds) {
        const attributeIndex = settingsAttributes.findIndex(setting => setting.attributeId === attributeId);
        if (attributeIndex !== -1) {
          settingsAttributes[attributeIndex] = {...settingsAttributes[attributeIndex], hidden: hide};
          if (!hide) {
            delete settingsAttributes[attributeIndex].hidden;
          }
        }
      }
      return settingsAttributes;
    });
  }, currentSettings);
  return setViewSettings(state, action.payload.settingsId, newSettings);
}

function moveAttribute(state: ViewSettingsState, action: ViewSettingsAction.MoveAttribute): ViewSettingsState {
  const {from, to, collection, linkType} = action.payload;
  const currentSettings = getViewSettings(state, action.payload.settingsId);
  const newSettings = moveAttributeInSettings(currentSettings, from, to, collection, linkType);
  return setViewSettings(state, action.payload.settingsId, newSettings);
}

function addAttribute(state: ViewSettingsState, action: ViewSettingsAction.AddAttribute): ViewSettingsState {
  const {attributeId, position, collection, linkType} = action.payload;
  const currentSettings = getViewSettings(state, action.payload.settingsId);
  const newSettings = addAttributeToSettings(currentSettings, attributeId, position, collection, linkType);
  return setViewSettings(state, action.payload.settingsId, newSettings);
}

function setAttribute(state: ViewSettingsState, action: ViewSettingsAction.SetAttribute): ViewSettingsState {
  const {attributeId, settings, collection, linkType} = action.payload;
  const resourceType = linkType ? AttributesResourceType.LinkType : AttributesResourceType.Collection;
  const currentSettings = getViewSettings(state, action.payload.settingsId);
  const newSettings = createAndModifyViewSettings(
    currentSettings,
    linkType || collection,
    resourceType,
    settingAttributes => setAttributeToAttributeSettings(attributeId, settingAttributes, settings)
  );
  return setViewSettings(state, action.payload.settingsId, newSettings);
}

function getViewSettings(state: ViewSettingsState, settingsId: string): ViewSettings {
  return state[settingsId];
}

function setViewSettings(state: ViewSettingsState, settingsId: string, settings: ViewSettings): ViewSettingsState {
  return {...state, [settingsId]: settings};
}
