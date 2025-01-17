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

import {createSelector} from '@ngrx/store';
import {
  ConstraintData,
  DocumentsAndLinksData,
  filterDocumentsAndLinksByQuery,
  filterDocumentsAndLinksDataByQuery,
  userCanReadDocument,
  userCanReadLinkInstance,
} from '@lumeer/data-filters';
import {containsSameElements, uniqueValues} from '../../../shared/utils/array.utils';
import {sortResourcesByFavoriteAndLastUsed} from '../../../shared/utils/resource.utils';
import {RoleType} from '../../model/role-type';
import {filterCollectionsByQuery} from '../collections/collections.filters';
import {
  selectAllCollections,
  selectCollectionById,
  selectCollectionsDictionary,
} from '../collections/collections.state';
import {DocumentModel} from '../documents/document.model';
import {
  filterTaskDocuments,
  groupDocumentsByCollection,
  sortDocumentsByCreationDate,
  sortDocumentsTasks,
} from '../documents/document.utils';
import {
  selectAllDocuments,
  selectDocumentsByCollectionId,
  selectDocumentsDictionary,
} from '../documents/documents.state';
import {selectAllLinkInstances, selectLinkInstancesByType} from '../link-instances/link-instances.state';
import {selectAllLinkTypes, selectLinkTypeById, selectLinkTypesDictionary} from '../link-types/link-types.state';
import {Query} from '../navigation/query/query';
import {
  checkTasksCollectionsQuery,
  getAllLinkTypeIdsFromQuery,
  queryIsEmpty,
  queryWithoutLinks,
  tasksCollectionsQuery,
} from '../navigation/query/query.util';
import {View, ViewSettings} from '../views/view';
import {filterViewsByQuery} from '../views/view.filters';
import {
  selectAllViews,
  selectCurrentView,
  selectDefaultSearchPerspectiveConfig,
  selectDefaultSearchPerspectiveDashboardView,
  selectViewQuery,
} from '../views/views.state';
import {LinkInstance} from '../link-instances/link.instance';
import {selectConstraintData} from '../constraint-data/constraint-data.state';
import {
  selectDataSettingsIncludeSubItems,
  selectViewSettings,
  selectViewSettingsByView,
} from '../view-settings/view-settings.state';
import {objectsByIdMap} from '../../../shared/utils/common.utils';
import {AttributesResourceType} from '../../model/resource';
import {sortDataResourcesByViewSettings} from '../../../shared/utils/data-resource.utils';
import {groupLinkInstancesByLinkTypes, sortLinkInstances} from '../link-instances/link-instance.utils';
import {
  selectCollectionsPermissions,
  selectLinkTypesPermissions,
  selectProjectPermissions,
  selectResourcesPermissions,
  selectViewsPermissions,
} from '../user-permissions/user-permissions.state';
import {Collection, CollectionPurposeType} from '../collections/collection';
import {selectCurrentUserForWorkspace} from '../users/users.state';
import {
  canChangeViewQuery,
  createSearchPerspectiveTabs,
  createSearchPerspectiveTabsByView,
  getViewColor,
  getViewIcon,
} from '../views/view.utils';
import {LinkType} from '../link-types/link.type';
import {AllowedPermissionsMap, ResourcesPermissions} from '../../model/allowed-permissions';
import {DataQuery} from '../../model/data-query';
import {selectWorkspaceModels} from './common.selectors';
import {
  computeCollectionsPermissions,
  computeLinkTypesPermissions,
  computeResourcesPermissions,
  userPermissionsInCollection,
  userPermissionsInLinkType,
} from '../../../shared/utils/permission.utils';
import {User} from '../users/user';
import {filterVisibleAttributesBySettings} from '../../../shared/utils/attribute.utils';
import {mapLinkTypeCollections} from '../../../shared/utils/link-type.utils';
import {addDefaultDashboardTabsIfNotPresent, isViewValidForDashboard} from '../../../shared/utils/dashboard.utils';
import {filterDefaultDashboardTabs} from '../../model/dashboard-tab';
import {selectSearchesDictionary} from '../searches/searches.state';
import {DEFAULT_PERSPECTIVE_ID} from '../../../view/perspectives/perspective';
import {SearchConfig, SearchTasksConfig} from '../searches/search';

const selectCollectionsByPermission = (roleTypes: RoleType[]) =>
  createSelector(selectCollectionsPermissions, selectAllCollections, (permissions, collections) =>
    collections.filter(collection => roleTypes.some(role => permissions?.[collection.id]?.rolesWithView?.[role]))
  );

const selectCollectionsCountByPermission = (roleTypes: RoleType[]) =>
  createSelector(selectCollectionsByPermission(roleTypes), collections => collections.length);

const selectCollectionsByViewAndPermission = (view: View, roleTypes: RoleType[]) =>
  createSelector(selectCollectionsPermissionsByView(view), selectAllCollections, (permissions, collections) =>
    collections.filter(collection => roleTypes.some(role => permissions?.[collection.id]?.rolesWithView?.[role]))
  );

export const selectReadableCollections = selectCollectionsByPermission([RoleType.Read]);

export const selectReadableCollectionsCount = selectCollectionsCountByPermission([RoleType.Read]);

export const selectReadableCollectionsByView = (view: View) =>
  selectCollectionsByViewAndPermission(view, [RoleType.Read]);

export const selectContributeCollectionsByView = (view: View) =>
  selectCollectionsByViewAndPermission(view, [RoleType.DataContribute]);

export const selectContributeAndWritableCollections = selectCollectionsByPermission([
  RoleType.DataContribute,
  RoleType.DataWrite,
]);

export const selectTasksCollections = createSelector(selectAllCollections, collections =>
  collections.filter(collection => collection.purpose?.type === CollectionPurposeType.Tasks)
);

const selectCollectionsByPurposeAndPermission = (purpose: CollectionPurposeType, role: RoleType) =>
  createSelector(selectCollectionsPermissions, selectAllCollections, (permissions, collections) =>
    collections.filter(
      collection => collection.purpose?.type === purpose && permissions?.[collection.id]?.rolesWithView?.[role]
    )
  );

const selectTasksCollectionsByReadPermission = selectCollectionsByPurposeAndPermission(
  CollectionPurposeType.Tasks,
  RoleType.Read
);

const selectLinkTypesByPermission = (roles: RoleType[]) =>
  createSelector(selectLinkTypesPermissions, selectAllLinkTypes, (permissions, linkTypes) =>
    linkTypes.filter(linkType => roles.some(role => permissions?.[linkType.id]?.rolesWithView?.[role]))
  );

const selectLinkTypesByViewAndPermission = (view: View, roles: RoleType[]) =>
  createSelector(selectLinkTypesPermissionsByView(view), selectAllLinkTypes, (permissions, linkTypes) =>
    linkTypes.filter(linkType => roles.some(role => permissions?.[linkType.id]?.rolesWithView?.[role]))
  );

export const selectReadableLinkTypes = selectLinkTypesByPermission([RoleType.Read]);

export const selectReadableLinkTypesByView = (view: View) => selectLinkTypesByViewAndPermission(view, [RoleType.Read]);

export const selectContributeLinkTypes = selectLinkTypesByPermission([RoleType.DataContribute]);

export const selectContributeAndWritableLinkTypes = selectLinkTypesByPermission([
  RoleType.DataWrite,
  RoleType.DataContribute,
]);

export const selectTasksQuery = createSelector(
  selectViewQuery,
  selectTasksCollectionsByReadPermission,
  (query, collections) => checkTasksCollectionsQuery(collections, query, {})
);

export const selectTasksCollectionsByViewAndQuery = (view: View) =>
  createSelector(
    selectTasksCollections,
    selectAllDocuments,
    selectAllLinkTypes,
    selectViewQuery,
    selectCollectionsPermissionsByView(view),
    selectConstraintData,
    (collections, documents, linkTypes, query, permissions, constraintData) =>
      filterCollectionsByQuery(
        collections,
        documents,
        linkTypes,
        checkTasksCollectionsQuery(collections, query, permissions),
        constraintData
      )
  );

export const selectTasksCollectionsByViewAndCustomQuery = (view: View, query: Query) =>
  createSelector(
    selectTasksCollections,
    selectAllDocuments,
    selectAllLinkTypes,
    selectCollectionsPermissionsByView(view),
    selectConstraintData,
    (collections, documents, linkTypes, permissions, constraintData) =>
      filterCollectionsByQuery(
        collections,
        documents,
        linkTypes,
        checkTasksCollectionsQuery(collections, query, permissions),
        constraintData
      )
  );

export const selectCollectionsByQueryWithoutLinks = createSelector(
  selectReadableCollections,
  selectAllDocuments,
  selectAllLinkTypes,
  selectViewQuery,
  selectConstraintData,
  (collections, documents, linkTypes, query, constraintData) =>
    filterCollectionsByQuery(collections, documents, linkTypes, queryWithoutLinks(query), constraintData)
);

export const selectCollectionsByCustomQueryWithoutLinks = (view: View, query: Query) =>
  createSelector(
    selectReadableCollectionsByView(view),
    selectAllDocuments,
    selectAllLinkTypes,
    selectConstraintData,
    (collections, documents, linkTypes, constraintData) =>
      filterCollectionsByQuery(collections, documents, linkTypes, queryWithoutLinks(query), constraintData)
  );

export const selectCollectionsInCustomQuery = (query: Query) =>
  createSelector(selectCollectionsDictionary, collectionsMap => {
    const collectionIds = uniqueValues(query?.stems?.map(stem => stem.collectionId) || []);
    return collectionIds.map(id => collectionsMap[id]).filter(collection => !!collection);
  });

export const selectCollectionsByCustomViewAndQuery = (view: View, query: Query) =>
  createSelector(
    selectReadableCollectionsByView(view),
    selectAllDocuments,
    selectAllLinkTypes,
    selectConstraintData,
    (collections, documents, linkTypes, constraintData) =>
      filterCollectionsByQuery(collections, documents, linkTypes, query, constraintData)
  );

export const selectDocumentsByViewAndReadPermission = (view: View) =>
  createSelector(
    selectAllDocuments,
    selectAllCollections,
    selectCollectionsPermissionsByView(view),
    selectCurrentUserForWorkspace,
    selectConstraintData,
    (documents, collections, permissionsMap, currentUser, constraintData) =>
      filterDocumentsByReadPermission(documents, collections, permissionsMap, currentUser, constraintData)
  );

export const selectDocumentsByCollectionAndReadPermission = (collectionId: string, view?: View) =>
  createSelector(
    selectDocumentsByCollectionId(collectionId),
    selectCollectionById(collectionId),
    selectCollectionPermissionsByView(view, collectionId),
    selectCurrentUserForWorkspace,
    selectConstraintData,
    (documents, collection, permissions, currentUser, constraintData) =>
      filterDocumentsByReadPermission(
        documents,
        [collection],
        {[collectionId]: permissions},
        currentUser,
        constraintData
      )
  );

function filterDocumentsByReadPermission(
  documents: DocumentModel[],
  collections: Collection[],
  permissionsMap: AllowedPermissionsMap,
  currentUser: User,
  constraintData: ConstraintData
) {
  const documentsByCollection = groupDocumentsByCollection(documents);
  return (collections || [])
    .filter(collection => !!collection)
    .reduce((allDocuments, collection) => {
      const permissions = permissionsMap[collection.id];
      const collectionDocuments = documentsByCollection[collection.id] || [];
      if (permissions?.rolesWithView?.DataRead) {
        allDocuments.push(...collectionDocuments);
      } else {
        allDocuments.push(
          ...collectionDocuments.filter(document =>
            userCanReadDocument(document, collection, permissions, currentUser, constraintData)
          )
        );
      }

      return allDocuments;
    }, []);
}

export const selectLinksByViewAndReadPermission = (view: View) =>
  createSelector(
    selectAllLinkInstances,
    selectAllLinkTypes,
    selectLinkTypesPermissionsByView(view),
    selectCurrentUserForWorkspace,
    (linkInstances, linkTypes, permissionsMap, currentUser) =>
      filterLinksByReadPermission(linkInstances, linkTypes, permissionsMap, currentUser)
  );

export const selectLinksByLinkTypeAndReadPermission = (linkTypeId: string, view?: View) =>
  createSelector(
    selectLinkInstancesByType(linkTypeId),
    selectLinkTypeById(linkTypeId),
    selectLinkTypePermissionsByView(view, linkTypeId),
    selectCurrentUserForWorkspace,
    (linkInstances, linkType, permissions, currentUser) =>
      filterLinksByReadPermission(linkInstances, [linkType], {[linkTypeId]: permissions}, currentUser)
  );

function filterLinksByReadPermission(
  linkInstances: LinkInstance[],
  linkTypes: LinkType[],
  permissionsMap: AllowedPermissionsMap,
  currentUser: User
) {
  const linkInstancesByLinkTypes = groupLinkInstancesByLinkTypes(linkInstances);
  return (linkTypes || [])
    .filter(linkType => !!linkType)
    .reduce((allLinkInstances, linkType) => {
      const permissions = permissionsMap[linkType.id];
      const collectionDocuments = linkInstancesByLinkTypes[linkType.id] || [];
      if (permissions?.rolesWithView?.DataRead) {
        allLinkInstances.push(...collectionDocuments);
      } else {
        allLinkInstances.push(
          ...collectionDocuments.filter(linkInstance =>
            userCanReadLinkInstance(linkInstance, linkType, permissions, currentUser)
          )
        );
      }

      return allLinkInstances;
    }, []);
}

export const selectDataByCustomQuery = (view: View, query: Query) =>
  createSelector(
    selectDocumentsByViewAndReadPermission(view),
    selectReadableCollectionsByView(view),
    selectReadableLinkTypesByView(view),
    selectLinksByViewAndReadPermission(view),
    selectResourcesPermissionsByView(view),
    selectConstraintData,
    selectDataSettingsIncludeSubItems,
    (
      documents,
      collections,
      linkTypes,
      linkInstances,
      permissions,
      constraintData,
      includeSubItems
    ): DocumentsAndLinksData =>
      filterDocumentsAndLinksDataByQuery(
        documents,
        collections,
        linkTypes,
        linkInstances,
        query,
        permissions.collections,
        permissions.linkTypes,
        constraintData,
        includeSubItems
      )
  );

export const selectDocumentsByCustomQuerySorted = (view: View, query: Query) =>
  createSelector(selectDocumentsAndLinksByCustomQuerySorted(view, query), data => data.documents);

export const selectDocumentsAndLinksByCustomQuerySorted = (view: View, query: Query) =>
  createSelector(
    selectDocumentsByViewAndReadPermission(view),
    selectReadableCollectionsByView(view),
    selectReadableLinkTypesByView(view),
    selectLinksByViewAndReadPermission(view),
    selectViewSettingsByView(view),
    selectResourcesPermissionsByView(view),
    selectConstraintData,
    (
      documents,
      collections,
      linkTypes,
      linkInstances,
      viewSettings,
      permissions,
      constraintData
    ): {documents: DocumentModel[]; linkInstances: LinkInstance[]} =>
      filterDocumentsAndLinksByQuerySorted(
        documents,
        collections,
        linkTypes,
        linkInstances,
        query,
        viewSettings,
        permissions,
        constraintData
      )
  );

function filterDocumentsAndLinksByQuerySorted(
  documents: DocumentModel[],
  collections: Collection[],
  linkTypes: LinkType[],
  linkInstances: LinkInstance[],
  query: Query,
  viewSettings: ViewSettings,
  permissions: ResourcesPermissions,
  constraintData: ConstraintData
): {documents: DocumentModel[]; linkInstances: LinkInstance[]} {
  const data = filterDocumentsAndLinksByQuery(
    documents,
    collections,
    linkTypes,
    linkInstances,
    query,
    permissions.collections,
    permissions.linkTypes,
    constraintData,
    viewSettings?.data?.includeSubItems
  );
  const collectionsMap = objectsByIdMap(collections);
  const linkTypesMap = objectsByIdMap(linkTypes);
  return {
    documents: sortDataResourcesByViewSettings(
      data.documents,
      collectionsMap,
      AttributesResourceType.Collection,
      viewSettings?.attributes,
      constraintData
    ),
    linkInstances: sortDataResourcesByViewSettings(
      data.linkInstances,
      linkTypesMap,
      AttributesResourceType.LinkType,
      viewSettings?.attributes,
      constraintData
    ),
  };
}

export const selectTasksDocumentsByCustomQuery = (view: View, query: DataQuery) =>
  createSelector(
    selectAllDocuments,
    selectTasksCollectionsByViewAndQuery(view),
    selectAllLinkTypes,
    selectAllLinkInstances,
    selectResourcesPermissionsByView(view),
    selectConstraintData,
    selectDefaultSearchPerspectiveConfig,
    (documents, collections, linkTypes, linkInstances, permissions, constraintData, config): DocumentModel[] =>
      filterTasksDocuments(
        documents,
        collections,
        linkTypes,
        linkInstances,
        query,
        permissions,
        constraintData,
        config?.documents
      )
  );

export function filterTasksDocuments(
  documents: DocumentModel[],
  collections: Collection[],
  linkTypes: LinkType[],
  linkInstances: LinkInstance[],
  query: DataQuery,
  permissions: ResourcesPermissions,
  constraintData: ConstraintData,
  config: SearchTasksConfig
): DocumentModel[] {
  let tasksDocuments = documents;
  let tasksQuery: Query = query;

  if (queryIsEmpty(query)) {
    tasksDocuments = filterTaskDocuments(documents, collections, constraintData);
    tasksQuery = tasksCollectionsQuery(collections, permissions.collections);
  }

  const filteredTasks = filterDocumentsAndLinksByQuery(
    tasksDocuments,
    collections,
    linkTypes,
    linkInstances,
    tasksQuery,
    permissions.collections,
    permissions.linkTypes,
    constraintData,
    query?.includeSubItems
  ).documents;

  return sortDocumentsTasks(filteredTasks, objectsByIdMap(collections), constraintData, config?.sortBy);
}

export const selectDocumentsByViewAndCustomQueryAndIdsSortedByCreation = (view: View, query: Query, ids: string[]) =>
  createSelector(
    selectDocumentsByViewAndReadPermission(view),
    selectReadableCollectionsByView(view),
    selectReadableLinkTypesByView(view),
    selectLinksByViewAndReadPermission(view),
    selectResourcesPermissionsByView(view),
    selectConstraintData,
    (documents, collections, linkTypes, linkInstances, permissions, constraintData): DocumentModel[] =>
      sortDocumentsByCreationDate(
        filterDocumentsAndLinksByQuery(
          documents,
          collections,
          linkTypes,
          linkInstances,
          query,
          permissions.collections,
          permissions.linkTypes,
          constraintData
        ).documents.filter(doc => ids.includes(doc.id))
      )
  );

export const selectDocumentsByCollectionAndQuery = (collectionId: string, query: Query, view: View) =>
  createSelector(
    selectDocumentsByCollectionAndReadPermission(collectionId, view),
    selectCollectionById(collectionId),
    selectCollectionsPermissionsByView(view),
    selectViewSettingsByView(view),
    selectConstraintData,
    (documents, collection, permissions, viewSettings, constraintData) => {
      const data = filterDocumentsAndLinksByQuery(
        documents,
        [collection],
        [],
        [],
        query,
        permissions,
        {},
        constraintData
      );
      const collectionsMap = {[collectionId]: collection};
      return sortDataResourcesByViewSettings(
        data.documents,
        collectionsMap,
        AttributesResourceType.Collection,
        viewSettings?.attributes,
        constraintData
      );
    }
  );

export const selectDocumentsByIdsSorted = (ids: string[]) =>
  createSelector(
    selectDocumentsDictionary,
    selectCollectionsDictionary,
    selectConstraintData,
    selectViewSettings,
    (documentsMap, collectionsMap, constraintData, viewSettings) => {
      const documents = (ids || []).map(id => documentsMap[id]).filter(doc => doc);
      return sortDataResourcesByViewSettings(
        documents,
        collectionsMap,
        AttributesResourceType.Collection,
        viewSettings?.attributes,
        constraintData
      );
    }
  );

const selectDocumentsAndLinksByViewCustomQuery = (view: View, query: Query, desc?: boolean) =>
  createSelector(
    selectDocumentsByViewAndReadPermission(view),
    selectReadableCollectionsByView(view),
    selectReadableLinkTypesByView(view),
    selectLinksByViewAndReadPermission(view),
    selectResourcesPermissions,
    selectConstraintData,
    selectDataSettingsIncludeSubItems,
    (documents, collections, linkTypes, linkInstances, permissions, constraintData, includeChildren) => {
      const data = filterDocumentsAndLinksByQuery(
        documents,
        collections,
        linkTypes,
        linkInstances,
        query,
        permissions.collections,
        permissions.linkTypes,
        constraintData,
        includeChildren
      );
      return {
        documents: sortDocumentsByCreationDate(data.documents, desc),
        linkInstances: sortLinkInstances(data.linkInstances),
      };
    }
  );

export const selectDocumentsByViewAndCustomQuery = (view: View, query: Query, desc?: boolean) =>
  createSelector(selectDocumentsAndLinksByViewCustomQuery(view, query, desc), data => data.documents);

export const selectLinkTypesInQuery = createSelector(selectReadableLinkTypes, selectViewQuery, (linkTypes, query) => {
  const linkTypesIdsInQuery = new Set(getAllLinkTypeIdsFromQuery(query));
  return linkTypes.filter(linkType => linkTypesIdsInQuery.has(linkType.id));
});

export const selectLinkTypesInCustomViewAndQuery = (view: View, query: Query) =>
  createSelector(selectReadableLinkTypesByView(view), linkTypes => {
    const linkTypesIdsInQuery = new Set(getAllLinkTypeIdsFromQuery(query));
    return linkTypes.filter(linkType => linkTypesIdsInQuery.has(linkType.id));
  });

export const selectLinkTypesByCollectionId = (collectionId: string) =>
  createSelector(selectReadableLinkTypes, linkTypes =>
    linkTypes.filter(linkType => linkType.collectionIds.includes(collectionId))
  );

export const selectLinkTypesByViewAndCollectionId = (view: View, collectionId: string) =>
  createSelector(selectReadableLinkTypesByView(view), linkTypes =>
    linkTypes.filter(linkType => linkType.collectionIds.includes(collectionId))
  );

export const selectLinkTypesByViewAndCollectionIdWithCollections = (view: View, collectionId: string) =>
  createSelector(selectReadableLinkTypesByView(view), selectCollectionsDictionary, (linkTypes, collectionsMap) =>
    linkTypes
      .filter(linkType => linkType.collectionIds.includes(collectionId))
      .map(linkType => mapLinkTypeCollections(linkType, collectionsMap))
  );

export const selectLinkTypesByCollectionIds = (collectionIds: string[]) =>
  createSelector(selectAllLinkTypes, linkTypes =>
    linkTypes.filter(linkType => containsSameElements(linkType.collectionIds, collectionIds))
  );

export const selectCanManageCurrentViewConfig = createSelector(
  selectCurrentView,
  selectViewsPermissions,
  (view, permissions) => !view || permissions?.[view.id]?.roles.PerspectiveConfig
);

export const selectCanManageViewConfig = (view: View) =>
  createSelector(selectViewsPermissions, permissions => !view || permissions?.[view.id]?.roles.PerspectiveConfig);

export const selectCanChangeViewQuery = createSelector(selectCurrentView, selectViewsPermissions, (view, permissions) =>
  canChangeViewQuery(view, permissions)
);

export const selectViewsByRead = createSelector(selectAllViews, selectViewsPermissions, (views, permissions) =>
  views.filter(view => permissions?.[view.id]?.roles?.Read)
);

export const selectViewsByReadCount = createSelector(selectViewsByRead, views => views.length);

export const selectViewsByReadSorted = createSelector(selectViewsByRead, (views): View[] =>
  sortResourcesByFavoriteAndLastUsed<View>(views)
);

export const selectViewsByReadWithComputedData = createSelector(
  selectViewsByReadSorted,
  selectCollectionsDictionary,
  (views, collectionsMap) =>
    views.map(view => ({...view, icon: getViewIcon(view), color: getViewColor(view, collectionsMap)}))
);

export const selectViewsByCustomQuery = (query: Query) =>
  createSelector(selectViewsByRead, (views): View[] =>
    sortResourcesByFavoriteAndLastUsed<View>(filterViewsByQuery(views, query))
  );

export const selectResourcesPermissionsByView = (view: View) =>
  createSelector(
    selectCurrentUserForWorkspace,
    selectWorkspaceModels,
    selectAllCollections,
    selectAllLinkTypes,
    (user, workspace, collections, linkTypes) =>
      computeResourcesPermissions(workspace.organization, workspace.project, view, collections, linkTypes, user)
  );

export const selectCollectionsPermissionsByView = (view: View) =>
  createSelector(
    selectCurrentUserForWorkspace,
    selectWorkspaceModels,
    selectAllCollections,
    selectAllLinkTypes,
    (user, workspace, collections, linkTypes) =>
      computeCollectionsPermissions(workspace.organization, workspace.project, view, collections, linkTypes, user)
  );

export const selectCollectionPermissionsByView = (view: View, collectionId: string) =>
  createSelector(
    selectCurrentUserForWorkspace,
    selectWorkspaceModels,
    selectCollectionsDictionary,
    selectAllLinkTypes,
    (user, workspace, collectionsMap, linkTypes) =>
      userPermissionsInCollection(
        workspace.organization,
        workspace.project,
        collectionsMap[collectionId],
        view,
        linkTypes,
        user
      )
  );

export const selectAllCollectionsWithoutHiddenAttributes = createSelector(
  selectCanChangeViewQuery,
  selectAllCollections,
  selectViewSettings,
  (canChangeQuery, collections, viewSettings) =>
    mapCollectionsWithoutHiddenAttributes(canChangeQuery, collections, viewSettings)
);

export const selectCollectionsByIdsWithoutHiddenAttributes = (ids: string[]) =>
  createSelector(
    selectCanChangeViewQuery,
    selectCollectionsDictionary,
    selectViewSettings,
    (canChangeQuery, collectionsDictionary, viewSettings) => {
      const collections = ids.map(id => collectionsDictionary[id]).filter(collection => !!collection);
      return mapCollectionsWithoutHiddenAttributes(canChangeQuery, collections, viewSettings);
    }
  );

function mapCollectionsWithoutHiddenAttributes(
  canChangeQuery: boolean,
  collections: Collection[],
  viewSettings: ViewSettings
): Collection[] {
  if (canChangeQuery) {
    return collections;
  }
  return collections.map(collection => ({
    ...collection,
    attributes: filterVisibleAttributesBySettings(collection, viewSettings?.attributes?.collections),
  }));
}

export const selectAllLinkTypesWithoutHiddenAttributes = createSelector(
  selectCanChangeViewQuery,
  selectAllLinkTypes,
  selectViewSettings,
  (canChangeQuery, linkTypes, viewSettings) =>
    mapLinkTypesWithoutHiddenAttributes(canChangeQuery, linkTypes, viewSettings)
);

export const selectLinkTypesByIdsWithoutHiddenAttributes = (ids: string[]) =>
  createSelector(
    selectCanChangeViewQuery,
    selectLinkTypesDictionary,
    selectViewSettings,
    (canChangeQuery, linkTypesDictionary, viewSettings) => {
      const linkTypes = ids.map(id => linkTypesDictionary[id]).filter(collection => !!collection);
      return mapLinkTypesWithoutHiddenAttributes(canChangeQuery, linkTypes, viewSettings);
    }
  );

function mapLinkTypesWithoutHiddenAttributes(
  canChangeQuery: boolean,
  linkTypes: LinkType[],
  viewSettings: ViewSettings
): LinkType[] {
  if (canChangeQuery) {
    return linkTypes;
  }
  return linkTypes.map(linkType => ({
    ...linkType,
    attributes: filterVisibleAttributesBySettings(linkType, viewSettings?.attributes?.linkTypes),
  }));
}

export const selectLinkTypesPermissionsByView = (view: View) =>
  createSelector(
    selectCurrentUserForWorkspace,
    selectWorkspaceModels,
    selectAllLinkTypes,
    selectAllCollections,
    (user, workspace, linkTypes, collections) =>
      computeLinkTypesPermissions(workspace.organization, workspace.project, view, collections, linkTypes, user)
  );

export const selectLinkTypePermissionsByView = (view: View, linkTypeId: string) =>
  createSelector(
    selectCurrentUserForWorkspace,
    selectWorkspaceModels,
    selectLinkTypesDictionary,
    selectAllCollections,
    (user, workspace, linkTypesMap, collections) =>
      userPermissionsInLinkType(
        workspace.organization,
        workspace.project,
        linkTypesMap[linkTypeId],
        collections,
        view,
        user
      )
  );

/*
 * Dashboard tabs
 */

export const selectDefaultSearchPerspectiveDashboardTabs = createSelector(
  selectDefaultSearchPerspectiveConfig,
  selectProjectPermissions,
  selectReadableCollectionsCount,
  selectViewsByReadCount,
  (config, permissions, collectionsCount, viewsCount) =>
    addDefaultDashboardTabsIfNotPresent(
      config?.dashboard?.tabs,
      filterDefaultDashboardTabs(permissions, collectionsCount, viewsCount)
    )
);

export const selectDefaultSearchPerspectiveVisibleTabs = createSelector(
  selectDefaultSearchPerspectiveDashboardTabs,
  tabs => tabs.filter(tab => !tab.hidden)
);

export const selectSearchPerspectiveTabs = createSelector(
  selectDefaultSearchPerspectiveDashboardTabs,
  selectSearchesDictionary,
  selectDefaultSearchPerspectiveDashboardView,
  selectCurrentView,
  (defaultTabs, searchesMap, dashboardView, currentView) => {
    if (currentView) {
      const search = searchesMap[currentView.code];
      if (search?.config) {
        return createSearchPerspectiveTabs(search?.config, defaultTabs);
      }
      return createSearchPerspectiveTabsByView(currentView, defaultTabs);
    }

    if (isViewValidForDashboard(dashboardView)) {
      const search = searchesMap[dashboardView.code];
      if (search?.config) {
        return createSearchPerspectiveTabs(search?.config, defaultTabs);
      }
      return createSearchPerspectiveTabsByView(dashboardView, defaultTabs);
    }

    return createSearchPerspectiveTabs(searchesMap[DEFAULT_PERSPECTIVE_ID]?.config, defaultTabs);
  }
);

export const selectSearchPerspectiveTabsByView = (view: View, defaultConfig?: SearchConfig) =>
  createSelector(selectDefaultSearchPerspectiveDashboardTabs, selectSearchesDictionary, (defaultTabs, searchesMap) => {
    if (isViewValidForDashboard(view)) {
      const search = searchesMap[view.code];
      if (search?.config) {
        return createSearchPerspectiveTabs(search?.config, defaultTabs);
      }
      return createSearchPerspectiveTabsByView(view, defaultTabs);
    }

    return createSearchPerspectiveTabs(defaultConfig || searchesMap[DEFAULT_PERSPECTIVE_ID]?.config, defaultTabs);
  });

export const selectSearchPerspectiveVisibleTabs = createSelector(selectSearchPerspectiveTabs, tabs =>
  tabs.filter(tab => !tab.hidden)
);

export const selectHasVisibleSearchTab = (tabId: string) =>
  createSelector(selectSearchPerspectiveVisibleTabs, tabs => tabs.some(tab => tab.id === tabId));
