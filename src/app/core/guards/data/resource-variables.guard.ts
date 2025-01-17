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

import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';

import {select, Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {first, mergeMap, skipWhile, tap} from 'rxjs/operators';
import {AppState} from '../../store/app.state';
import {Project} from '../../store/projects/project';
import {Organization} from '../../store/organizations/organization';
import {WorkspaceService} from '../../../workspace/workspace.service';
import * as ResourceVariableActions from '../../store/resource-variables/resource-variables.actions';
import {
  selectResourceVariablesByResourceType,
  selectResourceVariablesLoadedForProject,
} from '../../store/resource-variables/resource-variables.state';
import {ResourceType} from '../../model/resource-type';

@Injectable()
export class ResourceVariablesGuard implements Resolve<any> {
  constructor(private workspaceService: WorkspaceService, private store$: Store<AppState>) {}

  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {
    const organizationCode = route.paramMap.get('organizationCode');
    const projectCode = route.paramMap.get('projectCode');

    return this.workspaceService
      .selectOrGetWorkspace(organizationCode, projectCode)
      .pipe(mergeMap(({organization, project}) => this.resolveDashboardData(organization, project)));
  }

  private resolveDashboardData(organization: Organization, project: Project): Observable<any> {
    return this.store$.pipe(
      select(selectResourceVariablesLoadedForProject(project.id)),
      tap(loaded => {
        if (!loaded) {
          const workspace = {organizationId: organization.id, projectId: project.id};
          this.store$.dispatch(ResourceVariableActions.get({workspace}));
        }
      }),
      skipWhile(loaded => !loaded),
      mergeMap(() => this.store$.pipe(select(selectResourceVariablesByResourceType(project.id, ResourceType.Project)))),
      first()
    );
  }
}
