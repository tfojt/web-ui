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

import {Component, OnInit, ChangeDetectionStrategy, OnDestroy, Input} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {AppState} from '../../../core/store/app.state';
import {Observable} from 'rxjs';
import {Query} from '../../../core/store/navigation/query/query';
import {map} from 'rxjs/operators';
import {selectKanbanById} from '../../../core/store/kanbans/kanban.state';
import {KanbanConfig} from '../../../core/store/kanbans/kanban';
import {ViewConfig} from '../../../core/store/views/view';
import {KanbansAction} from '../../../core/store/kanbans/kanbans.action';
import {Collection} from '../../../core/store/collections/collection';
import {checkOrTransformKanbanConfig} from './util/kanban.util';
import {LinkType} from '../../../core/store/link-types/link.type';
import {Workspace} from '../../../core/store/navigation/workspace';
import {selectWorkspaceWithIds} from '../../../core/store/common/common.selectors';
import {DataPerspectiveDirective} from '../data-perspective.directive';
import {defaultKanbanPerspectiveConfiguration, KanbanPerspectiveConfiguration} from '../perspective-configuration';

@Component({
  selector: 'kanban-perspective',
  templateUrl: './kanban-perspective.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['kanban-perspective.component.scss'],
})
export class KanbanPerspectiveComponent extends DataPerspectiveDirective<KanbanConfig> implements OnInit, OnDestroy {
  @Input()
  public perspectiveConfiguration: KanbanPerspectiveConfiguration = defaultKanbanPerspectiveConfiguration;

  public workspace$: Observable<Workspace>;

  constructor(protected store$: Store<AppState>) {
    super(store$);
  }

  public ngOnInit() {
    super.ngOnInit();
    this.subscribeAdditionalData();
  }

  public subscribeConfig$(perspectiveId: string): Observable<KanbanConfig> {
    return this.store$.pipe(
      select(selectKanbanById(perspectiveId)),
      map(entity => entity?.config)
    );
  }

  public configChanged(perspectiveId: string, config: KanbanConfig) {
    this.store$.dispatch(new KanbansAction.AddKanban({kanban: {id: perspectiveId, config}}));
  }

  protected getConfig(viewConfig: ViewConfig): KanbanConfig {
    return viewConfig?.kanban;
  }

  public checkOrTransformConfig(
    config: KanbanConfig,
    query: Query,
    collections: Collection[],
    linkTypes: LinkType[]
  ): KanbanConfig {
    return checkOrTransformKanbanConfig(config, query, collections, linkTypes);
  }

  private subscribeAdditionalData() {
    this.workspace$ = this.store$.pipe(select(selectWorkspaceWithIds));
  }

  public onConfigChanged(config: KanbanConfig) {
    this.store$.dispatch(new KanbansAction.SetConfig({kanbanId: this.perspectiveId$.value, config}));
  }
}
