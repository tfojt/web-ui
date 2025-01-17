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

import {createEntityAdapter, EntityState} from '@ngrx/entity';
import {createSelector} from '@ngrx/store';
import {AppState} from '../app.state';
import {LinkInstance} from './link.instance';
import {isLinkInstanceValid, sortLinkInstances} from './link-instance.utils';
import {selectDocumentsDictionary} from '../documents/documents.state';
import {DataQuery} from '../../model/data-query';

export interface LinkInstancesState extends EntityState<LinkInstance> {
  queries: DataQuery[];
  loadingQueries: DataQuery[];
  actionExecutedTimes: Record<string, Record<string, number>>;
}

export const linkInstancesAdapter = createEntityAdapter<LinkInstance>();

export const initialLinkInstancesState: LinkInstancesState = linkInstancesAdapter.getInitialState({
  queries: [],
  loadingQueries: [],
  actionExecutedTimes: {},
});

export const selectLinkInstancesState = (state: AppState) => state.linkInstances;

export const selectAllLinkInstances = createSelector(
  selectLinkInstancesState,
  linkInstancesAdapter.getSelectors().selectAll
);
export const selectLinkInstancesDictionary = createSelector(
  selectLinkInstancesState,
  linkInstancesAdapter.getSelectors().selectEntities
);
export const selectLinkInstancesQueries = createSelector(
  selectLinkInstancesState,
  linkInstancesState => linkInstancesState.queries
);

export const selectLinkInstancesLoadingQueries = createSelector(
  selectLinkInstancesState,
  linkInstancesState => linkInstancesState.loadingQueries
);

export const selectLinkInstanceById = (id: string) =>
  createSelector(selectLinkInstancesDictionary, linkInstancesMap => linkInstancesMap[id]);

export const selectLinkInstancesByIds = (ids: string[]) =>
  createSelector(selectLinkInstancesDictionary, linkInstancesMap =>
    sortLinkInstances(ids.map(id => linkInstancesMap[id]).filter(linkInstance => !!linkInstance))
  );

export const selectLinkInstancesByDocumentIds = (documentIds: string[]) =>
  createSelector(selectAllLinkInstances, selectDocumentsDictionary, (linkInstances, documentsMap) =>
    sortLinkInstances(
      linkInstances.filter(linkInstance =>
        linkInstance.documentIds?.some(
          id => documentIds.includes(id) && isLinkInstanceValid(linkInstance, documentsMap)
        )
      )
    )
  );

export const selectLinkInstancesByType = (linkTypeId: string) =>
  createSelector(selectAllLinkInstances, linkInstances =>
    sortLinkInstances(linkInstances.filter(linkInstance => linkInstance.linkTypeId === linkTypeId))
  );

export const selectLinkInstancesByTypes = (linkTypeIds: string[]) =>
  createSelector(selectAllLinkInstances, linkInstances =>
    sortLinkInstances(linkInstances.filter(linkInstance => linkTypeIds.includes(linkInstance.linkTypeId)))
  );

export const selectLinkInstancesByTypeAndDocuments = (linkTypeId: string, documentIds: string[]) =>
  createSelector(selectLinkInstancesByType(linkTypeId), selectDocumentsDictionary, (linkInstances, documentsMap) =>
    sortLinkInstances(
      linkInstances.filter(linkInstance =>
        linkInstance.documentIds?.some(
          id => documentIds.includes(id) && isLinkInstanceValid(linkInstance, documentsMap)
        )
      )
    )
  );

export const selectLinkInstancesByTypesAndDocuments = (linkTypeIds: string[], documentIds: string[]) =>
  createSelector(selectLinkInstancesByTypes(linkTypeIds), selectDocumentsDictionary, (linkInstances, documentsMap) =>
    sortLinkInstances(
      linkInstances.filter(linkInstance =>
        linkInstance.documentIds?.some(
          id => documentIds.includes(id) && isLinkInstanceValid(linkInstance, documentsMap)
        )
      )
    )
  );

export const selectLinkInstanceActionExecutedTime = (linkInstanceId: string, attributeId: string) =>
  createSelector(selectLinkInstancesState, state => state.actionExecutedTimes?.[linkInstanceId]?.[attributeId]);
