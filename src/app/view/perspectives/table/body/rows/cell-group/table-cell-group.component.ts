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

import {ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {BehaviorSubject, combineLatest, Observable, of} from 'rxjs';
import {filter, switchMap} from 'rxjs/operators';
import {DocumentModel} from '../../../../../../core/store/documents/document.model';
import {selectDocumentsByIds} from '../../../../../../core/store/documents/documents.state';
import {selectLinkInstancesByIds} from '../../../../../../core/store/link-instances/link-instances.state';
import {LinkInstance} from '../../../../../../core/store/link-instances/link.instance';
import {Query} from '../../../../../../core/store/navigation/query/query';
import {TableBodyCursor, TableCursor} from '../../../../../../core/store/tables/table-cursor';
import {
  TableColumnType,
  TableConfigColumn,
  TableConfigPart,
  TableConfigRow,
  TableModel,
} from '../../../../../../core/store/tables/table.model';
import {
  selectTableById,
  selectTableCursor,
  selectTablePart,
  selectTablePartLeafColumns,
  selectTableParts,
} from '../../../../../../core/store/tables/tables.selector';
import {selectConstraintData} from '../../../../../../core/store/constraint-data/constraint-data.state';
import {Collection} from '../../../../../../core/store/collections/collection';
import {selectAllCollections, selectCollectionById} from '../../../../../../core/store/collections/collections.state';
import {AllowedPermissions} from '../../../../../../core/model/allowed-permissions';
import {ConstraintData} from '@lumeer/data-filters';
import {AppState} from '../../../../../../core/store/app.state';
import {selectCurrentUserForWorkspace} from '../../../../../../core/store/users/users.state';
import {selectLinkTypeById} from '../../../../../../core/store/link-types/link-types.state';
import {User} from '../../../../../../core/store/users/user';
import {AttributesResource} from '../../../../../../core/model/resource';
import {LinkType} from '../../../../../../core/store/link-types/link.type';
import {View} from '../../../../../../core/store/views/view';
import {
  selectCollectionPermissionsByView,
  selectLinkTypePermissionsByView,
} from '../../../../../../core/store/common/permissions.selectors';

@Component({
  selector: 'table-cell-group',
  templateUrl: './table-cell-group.component.html',
  styleUrls: ['./table-cell-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCellGroupComponent implements OnChanges, OnInit {
  @Input()
  public cursor: TableBodyCursor;

  @Input()
  public query: Query;

  @Input()
  public view: View;

  @Input()
  public rows: TableConfigRow[];

  @Input()
  public correlationId: string;

  @Input()
  public canManageConfig: boolean;

  public documents$: Observable<DocumentModel[]>;
  public linkInstances$: Observable<LinkInstance[]>;
  public constraintData$: Observable<ConstraintData>;
  public collections$: Observable<Collection[]>;
  public permissions$: Observable<AllowedPermissions>;
  public resource$: Observable<AttributesResource>;
  public linkType$: Observable<LinkType>;
  public linkTypePermissions$: Observable<AllowedPermissions>;
  public currentUser$: Observable<User>;

  public columns$: Observable<TableConfigColumn[]>;
  public part$: Observable<TableConfigPart>;
  public selectedCursor$: Observable<TableCursor>;

  public table$: Observable<TableModel>;

  private cursor$ = new BehaviorSubject<TableBodyCursor>(null);
  private view$ = new BehaviorSubject<View>(null);
  private rows$ = new BehaviorSubject<TableConfigRow[]>([]);

  public constructor(private store$: Store<AppState>) {}

  public ngOnInit() {
    this.constraintData$ = this.store$.pipe(select(selectConstraintData));
    this.currentUser$ = this.store$.pipe(select(selectCurrentUserForWorkspace));
    this.collections$ = this.store$.pipe(select(selectAllCollections));
    this.columns$ = this.bindColumns();
    this.permissions$ = this.bindPermissions();
    this.resource$ = this.bindResource();
    this.linkType$ = this.bindLinkType();
    this.linkTypePermissions$ = this.bindLinkTypePermissions(this.linkType$);
    this.documents$ = this.bindDocuments();
    this.linkInstances$ = this.bindLinkInstances();
    this.selectedCursor$ = this.bindSelectedCursor();
    this.part$ = this.bindPart();
    this.table$ = this.bindTable();
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes.cursor && this.cursor) {
      this.cursor$.next(this.cursor);
    }
    if (changes.rows && this.rows) {
      this.rows$.next(this.rows);
    }
    if (changes.view) {
      this.view$.next(this.view);
    }
  }

  private bindColumns(): Observable<TableConfigColumn[]> {
    return this.cursor$.pipe(switchMap(cursor => this.store$.pipe(select(selectTablePartLeafColumns(cursor)))));
  }

  private bindPermissions(): Observable<AllowedPermissions> {
    return this.cursor$.pipe(
      filter(cursor => !!cursor),
      switchMap(cursor =>
        this.store$.pipe(
          select(selectTablePart(cursor)),
          switchMap(part => {
            if (part?.collectionId) {
              return this.view$.pipe(
                switchMap(view => this.store$.pipe(select(selectCollectionPermissionsByView(view, part.collectionId))))
              );
            } else if (part?.linkTypeId) {
              return this.view$.pipe(
                switchMap(view => this.store$.pipe(select(selectLinkTypePermissionsByView(view, part.linkTypeId))))
              );
            }
            return of({});
          })
        )
      )
    );
  }

  private bindResource(): Observable<AttributesResource> {
    return this.cursor$.pipe(
      filter(cursor => !!cursor),
      switchMap(cursor =>
        this.store$.pipe(
          select(selectTablePart(cursor)),
          switchMap(part => {
            if (part?.collectionId) {
              return this.store$.pipe(select(selectCollectionById(part.collectionId)));
            } else if (part?.linkTypeId) {
              return this.store$.pipe(select(selectLinkTypeById(part.linkTypeId)));
            }
            return of(null);
          })
        )
      )
    );
  }

  private bindLinkType(): Observable<LinkType> {
    return this.cursor$.pipe(
      filter(cursor => !!cursor),
      switchMap(cursor =>
        this.store$.pipe(
          select(selectTableParts(cursor)),
          switchMap(parts => {
            // if is linked collection
            if (cursor.partIndex > 0) {
              const partIndex = cursor.partIndex % 2 === 0 ? cursor.partIndex - 1 : cursor.partIndex;
              const linkTypeId = parts?.[partIndex]?.linkTypeId;
              if (linkTypeId) {
                return this.store$.pipe(select(selectLinkTypeById(linkTypeId)));
              }
            }
            return of(null);
          })
        )
      )
    );
  }

  private bindLinkTypePermissions(linkType$: Observable<LinkType>): Observable<AllowedPermissions> {
    return linkType$.pipe(
      filter(linkType => !!linkType),
      switchMap(linkType =>
        this.view$.pipe(switchMap(view => this.store$.pipe(select(selectLinkTypePermissionsByView(view, linkType.id)))))
      )
    );
  }

  private bindDocuments(): Observable<DocumentModel[]> {
    return combineLatest([this.cursor$, this.rows$]).pipe(
      filter(([cursor, rows]) => !!cursor && !!rows),
      switchMap(([cursor, rows]) =>
        this.store$.pipe(
          select(selectTablePart(cursor)),
          filter(part => part && !!part.collectionId),
          switchMap(() => {
            const documentIds = rows.map(row => row.documentId);
            return this.store$.pipe(select(selectDocumentsByIds(documentIds)));
          })
        )
      )
    );
  }

  private bindLinkInstances(): Observable<LinkInstance[]> {
    return combineLatest([this.cursor$, this.rows$]).pipe(
      filter(([cursor, rows]) => !!cursor && !!rows),
      switchMap(([cursor, rows]) =>
        this.store$.pipe(
          select(selectTablePart(cursor)),
          switchMap(() => {
            const linkInstanceIds = rows.map(row => row.linkInstanceId);
            return this.store$.pipe(select(selectLinkInstancesByIds(linkInstanceIds)));
          })
        )
      )
    );
  }

  private bindSelectedCursor(): Observable<TableCursor> {
    // do not try to optimize by comparing rows, otherwise cells below stay selected after row deletion
    return this.store$.pipe(select(selectTableCursor));
  }

  private bindPart(): Observable<TableConfigPart> {
    return this.cursor$.pipe(switchMap(cursor => this.store$.pipe(select(selectTablePart(cursor)))));
  }

  private bindTable(): Observable<TableModel> {
    return this.cursor$.pipe(switchMap(cursor => this.store$.pipe(select(selectTableById(cursor && cursor.tableId)))));
  }

  public trackByAttributeIds(index: number, column: TableConfigColumn): string {
    if (column.type === TableColumnType.COMPOUND) {
      return column.attributeIds[0] || column.attributeName; // TODO use correlationId in attributeId
    }
    if (column.type === TableColumnType.HIDDEN) {
      return column.attributeIds.join('-');
    }
  }

  public onAffect() {
    // just to run change detection
  }
}
