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

import {SearchesAction, SearchesActionType} from './searches.action';
import {initialSearchesState, searchesAdapter, SearchesState} from './searches.state';

export function searchesReducer(
  state: SearchesState = initialSearchesState,
  action: SearchesAction.All
): SearchesState {
  switch (action.type) {
    case SearchesActionType.ADD_SEARCH:
      return searchesAdapter.addOne(action.payload.search, state);
    case SearchesActionType.REMOVE_SEARCH:
      return searchesAdapter.removeOne(action.payload.searchId, state);
    case SearchesActionType.SET_CONFIG:
      return searchesAdapter.updateOne({id: action.payload.searchId, changes: {config: action.payload.config}}, state);
    case SearchesActionType.CLEAR:
      return initialSearchesState;
    default:
      return state;
  }
}