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

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {Actions, ofType} from '@ngrx/effects';
import {Action, select, Store} from '@ngrx/store';
import {BehaviorSubject, combineLatest, Observable, of, Subscription} from 'rxjs';
import {distinctUntilChanged, first, map, skip, take, tap, withLatestFrom} from 'rxjs/operators';
import {AllowedPermissions} from '../../../../../../../core/model/allowed-permissions';
import {NotificationService} from '../../../../../../../core/notifications/notification.service';
import {AppState} from '../../../../../../../core/store/app.state';
import {Attribute} from '../../../../../../../core/store/collections/collection';
import {CollectionsAction} from '../../../../../../../core/store/collections/collections.action';
import {
  selectAllCollections,
  selectCollectionAttributeById,
} from '../../../../../../../core/store/collections/collections.state';
import {DocumentMetaData, DocumentModel} from '../../../../../../../core/store/documents/document.model';
import {generateDocumentDataByResourceQuery} from '../../../../../../../core/store/documents/document.utils';
import {DocumentsAction} from '../../../../../../../core/store/documents/documents.action';
import {LinkInstancesAction} from '../../../../../../../core/store/link-instances/link-instances.action';
import {LinkInstance} from '../../../../../../../core/store/link-instances/link.instance';
import {LinkTypesAction} from '../../../../../../../core/store/link-types/link-types.action';
import {selectLinkTypeAttributeById} from '../../../../../../../core/store/link-types/link-types.state';
import {Query} from '../../../../../../../core/store/navigation/query/query';
import {TableBodyCursor} from '../../../../../../../core/store/tables/table-cursor';
import {TableConfigColumn, TableConfigRow, TableModel} from '../../../../../../../core/store/tables/table.model';
import {findTableRow, getTableColumnWidth, isTableRowStriped} from '../../../../../../../core/store/tables/table.utils';
import {TablesAction, TablesActionType} from '../../../../../../../core/store/tables/tables.action';
import {
  selectAffected,
  selectTableById,
  selectTablePart,
  selectTableRow,
} from '../../../../../../../core/store/tables/tables.selector';
import {Direction} from '../../../../../../../shared/direction';
import {DocumentHintsComponent} from '../../../../../../../shared/document-hints/document-hints.component';
import {isKeyPrintable, keyboardEventCode, KeyCode} from '../../../../../../../shared/key-code';
import {
  generateAttributeNameFromAttributes,
  isAttributeConstraintType,
  isAttributeEditable,
} from '../../../../../../../shared/utils/attribute.utils';
import {EDITABLE_EVENT} from '../../../../table-perspective.component';
import {TableDataCellMenuComponent} from './menu/table-data-cell-menu.component';
import {
  computeElementPositionInParent,
  deepObjectsEquals,
  isNotNullOrUndefined,
  objectChanged,
  preventEvent,
} from '../../../../../../../shared/utils/common.utils';
import {DataInputConfiguration} from '../../../../../../../shared/data-input/data-input-configuration';
import {selectViewQuery} from '../../../../../../../core/store/views/views.state';
import {ConstraintData, ConstraintType, DataValue, UnknownConstraint, UnknownDataValue} from '@lumeer/data-filters';
import {DataResourcePermissions} from '../../../../../../../core/model/data-resource-permissions';
import {initForceTouch} from '../../../../../../../shared/utils/html-modifier';
import {View} from '../../../../../../../core/store/views/view';
import {Workspace} from '../../../../../../../core/store/navigation/workspace';
import {AttributesResource} from '../../../../../../../core/model/resource';
import {animateOpacityEnterLeave} from '../../../../../../../shared/animations';

@Component({
  selector: 'table-data-cell',
  templateUrl: './table-data-cell.component.html',
  styleUrls: ['./table-data-cell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [animateOpacityEnterLeave],
})
export class TableDataCellComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  public cursor: TableBodyCursor;

  @Input()
  public column: TableConfigColumn;

  @Input()
  public document: DocumentModel;

  @Input()
  public resource: AttributesResource;

  @Input()
  public view: View;

  @Input()
  public linkInstance: LinkInstance;

  @Input()
  public canManageConfig: boolean;

  @Input()
  public table: TableModel;

  @Input()
  public correlationId: string;

  @Input()
  public allowedPermissions: AllowedPermissions;

  @Input()
  public linkAllowedPermissions: AllowedPermissions;

  @Input()
  public dataPermissions: DataResourcePermissions;

  @Input()
  public linkDataPermissions: DataResourcePermissions;

  @Input()
  public query: Query;

  @Input()
  public constraintData: ConstraintData;

  @Output()
  public affect = new EventEmitter();

  @Input()
  @HostBinding('class.selected')
  public selected: boolean;

  @HostBinding('class.affected')
  public affected: boolean;

  @HostBinding('class.edited')
  public edited: boolean;

  @HostBinding('style.width.px')
  public columnWidth: number;

  @HostBinding('class.table-border-right')
  public tableBorderRight = true;

  @HostBinding('class.table-border-bottom')
  public tableBorderBottom = true;

  @ViewChild(TableDataCellMenuComponent)
  public menuComponent: TableDataCellMenuComponent;

  @ViewChild(DocumentHintsComponent)
  public suggestions: DocumentHintsComponent;

  public editing$ = new BehaviorSubject(false);
  public mouseEntered$ = new BehaviorSubject(false);
  public suggesting$ = new BehaviorSubject(false);
  public dataValue$: Observable<DataValue>;

  public attribute$: Observable<Attribute>;
  public row$: Observable<TableConfigRow>;

  public editableByPermissions: boolean;
  public editedValue: DataValue;

  public readonly constraintType = ConstraintType;
  public readonly configuration: DataInputConfiguration = {
    common: {allowRichText: true, delaySaveAction: true},
    boolean: {center: true},
    user: {allowCenterOnlyIcon: true},
    action: {center: true},
  };

  public striped: boolean;
  private hintWasUsed = false;
  private attribute: Attribute;
  private selectedSubscriptions = new Subscription();
  private affectedSubscription = new Subscription();
  private subscriptions = new Subscription();

  public constructor(
    private actions$: Actions,
    public element: ElementRef,
    private notificationService: NotificationService,
    private store$: Store<AppState>,
    private ngZone: NgZone
  ) {}

  public ngOnInit() {
    this.subscriptions.add(this.subscribeToEditing());

    initForceTouch(this.element.nativeElement, event => this.showContextMenu(event));
  }

  private subscribeToEditing(): Subscription {
    return this.editing$
      .pipe(skip(1), distinctUntilChanged(), withLatestFrom(this.attribute$))
      .subscribe(([editing, attribute]) => {
        this.edited = editing && !attribute?.constraint?.isDirectlyEditable;
        if (editing) {
          this.setEditedAttribute();
          this.editedValue = attribute?.constraint?.createDataValue(this.getValue(), this.constraintData);
          this.setSuggesting();
        } else {
          this.clearEditedAttribute();
          this.editedValue = null;
          this.resetSuggesting();

          if (this.selected) {
            // sets focus to hidden input
            this.store$.dispatch(new TablesAction.SetCursor({cursor: this.cursor}));
          }
        }
      });
  }

  public ngOnChanges(changes: SimpleChanges) {
    if ((changes.column || changes.document) && this.column && this.document) {
      this.attribute$ = this.store$.pipe(
        select(selectCollectionAttributeById(this.document.collectionId, this.column.attributeIds[0])),
        tap(attribute => (this.attribute = attribute))
      );
    }
    if ((changes.column || changes.linkInstance) && this.column && this.linkInstance && !this.document) {
      this.attribute$ = this.store$.pipe(
        select(selectLinkTypeAttributeById(this.linkInstance.linkTypeId, this.column.attributeIds[0])),
        tap(attribute => (this.attribute = attribute))
      );
    }
    if (
      changes.selected &&
      (changes.selected.firstChange || !changes.selected.previousValue !== !changes.selected.currentValue)
    ) {
      this.selectedSubscriptions.unsubscribe();
      if (this.selected) {
        this.selectedSubscriptions = new Subscription();
        this.selectedSubscriptions.add(this.subscribeToEditSelectedCell());
        this.selectedSubscriptions.add(this.subscribeToRemoveSelectedCell());
      } else {
        this.editing$.next(false);
      }
    }
    if ((changes.column || changes.canManageConfig) && this.column) {
      this.columnWidth = getTableColumnWidth(this.column, this.canManageConfig);
    }
    if (changes.cursor && this.cursor) {
      this.row$ = this.store$.pipe(select(selectTableRow(this.cursor)));
      this.striped = isTableRowStriped([], this.cursor.rowPath);
    }
    if (this.cursor.partIndex > 1 && (objectChanged(changes.document) || objectChanged(changes.linkInstance))) {
      this.affectedSubscription.unsubscribe();
      this.affectedSubscription = this.subscribeToAffected();
    }
    if (changes.column || changes.document || changes.linkInstance || changes.constraintData) {
      if (!this.editing$.value) {
        this.dataValue$ = this.createDataValue$();
      }
    }
    if (
      changes.cursor ||
      changes.document ||
      changes.linkInstance ||
      changes.dataPermissions ||
      changes.linkAllowedPermissions
    ) {
      this.checkIsEditable();
    }
  }

  private checkIsEditable() {
    // is first collection or link
    if (this.cursor?.partIndex === 0 || this.cursor?.partIndex % 2 === 1) {
      this.editableByPermissions = this.isEditableByPermissions();
    } else if (this.cursor?.partIndex % 2 === 0) {
      if (this.document?.id) {
        this.editableByPermissions = this.dataPermissions?.edit || this.linkDataPermissions?.edit;
      } else {
        this.editableByPermissions = this.linkDataPermissions?.create;
      }
    } else {
      this.editableByPermissions = false;
    }
  }

  private isEditableByPermissions() {
    if (this.document?.id || this.linkInstance?.id) {
      return this.dataPermissions?.edit;
    } else {
      return this.dataPermissions?.create;
    }
  }

  private isEditable(): boolean {
    return this.isEditableByPermissions() && this.isAttributeEditable(this.attribute);
  }

  private canSuggest(): boolean {
    // check if is linked collection
    if (this.cursor?.partIndex > 0 && this.cursor?.partIndex % 2 === 0) {
      if (this.document?.id) {
        return this.linkDataPermissions?.edit && this.isAttributeEditable(this.attribute);
      } else {
        return this.linkDataPermissions?.create && this.isAttributeEditable(this.attribute);
      }
    }
    if (this.cursor?.partIndex === 0) {
      return this.attribute?.suggestValues;
    }
    return false;
  }

  private createDataValue$(): Observable<DataValue> {
    return this.createDataValueByValue$(this.getValue());
  }

  private createDataValueByValue$(value: any, typed?: boolean): Observable<DataValue> {
    if (this.attribute$) {
      return this.attribute$.pipe(
        map(attribute => {
          const constraint = attribute?.constraint || new UnknownConstraint();
          if (typed) {
            return constraint.createInputDataValue(value, this.getValue(), this.constraintData);
          }
          return constraint.createDataValue(value, this.constraintData);
        }),
        tap(dataValue => typed && (this.editedValue = dataValue)),
        take(typed ? 1 : Number.MAX_SAFE_INTEGER)
      );
    }
    return of(new UnknownDataValue(value));
  }

  private subscribeToAffected(): Subscription {
    return this.store$
      .select(
        selectAffected({
          attributeId: this.column.attributeIds[0],
          documentId: this.document?.id,
          linkInstanceId: this.linkInstance?.id,
        })
      )
      .pipe(distinctUntilChanged(), withLatestFrom(this.editing$))
      .subscribe(([affected, editing]) => {
        this.affected = affected && !editing;
        // TODO run change detection in parent component some other way
        this.affect.emit();
      });
  }

  private setSuggesting() {
    if (this.canSuggest()) {
      this.suggesting$.next(true);
    }
  }

  private resetSuggesting() {
    this.editedValue = null;
    this.suggesting$.next(false);
  }

  private subscribeToEditSelectedCell(): Subscription {
    return this.actions$
      .pipe(ofType<TablesAction.EditSelectedCell>(TablesActionType.EDIT_SELECTED_CELL), withLatestFrom(this.attribute$))
      .subscribe(([action, attribute]) => {
        if (
          this.editableByPermissions &&
          this.isAttributeEditable(attribute) &&
          action.payload.correlationId === this.correlationId
        ) {
          if (action.payload.clear) {
            this.startEditingAndClear();
          } else {
            this.startEditingAndChangeValue(action.payload.value, attribute);
          }
        }
      });
  }

  private isAttributeEditable(attribute: Attribute): boolean {
    return isAttributeEditable(this.resource, this.document || this.linkInstance, attribute, this.constraintData);
  }

  private startEditingAndClear() {
    this.dataValue$ = this.createDataValueByValue$('', true);
    this.editing$.next(true);
  }

  private startEditingAndChangeValue(value: string, attribute: Attribute) {
    if (isAttributeConstraintType(attribute, ConstraintType.Boolean)) {
      if (!value) {
        this.editing$.next(true);
      }
    } else {
      if (value) {
        this.dataValue$ = this.createDataValueByValue$(value, true);
      }
      this.editing$.next(true);
    }
  }

  private subscribeToRemoveSelectedCell(): Subscription {
    return this.actions$
      .pipe(ofType<TablesAction.RemoveSelectedCell>(TablesActionType.REMOVE_SELECTED_CELL))
      .subscribe(() => this.deleteOrUnlinkDocument());
  }

  private deleteOrUnlinkDocument() {
    // TODO move methods from menu component to this component
    if (this.cursor.partIndex > 0 && this.isEntityInitialized()) {
      this.menuComponent.onUnlinkRow();
    } else {
      this.menuComponent.onRemoveRow();
    }
  }

  private getValue(): any {
    if (this.document?.data) {
      return this.document.data[this.column.attributeIds[0]];
    }
    if (this.linkInstance?.data) {
      return this.linkInstance.data[this.column.attributeIds[0]];
    }
    return '';
  }

  private isEntityInitialized(): boolean {
    return !!this.document?.id || !!this.linkInstance?.id;
  }

  public ngOnDestroy() {
    this.selectedSubscriptions.unsubscribe();
    this.affectedSubscription.unsubscribe();
    this.subscriptions.unsubscribe();
  }

  @HostListener('mouseenter')
  public onMouseEnter() {
    this.mouseEntered$.next(true);
  }

  @HostListener('mouseleave')
  public onMouseLeave() {
    this.mouseEntered$.next(false);
  }

  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent) {
    if (!this.edited) {
      this.store$.dispatch(new TablesAction.SetCursor({cursor: this.cursor}));
    }
  }

  @HostListener('dblclick', ['$event'])
  public onDoubleClick(event: MouseEvent) {
    if (!this.editing$.getValue()) {
      event.preventDefault();
      if (this.isEditable()) {
        this.editing$.next(true);
      }
    }
  }

  @HostListener('contextmenu', ['$event'])
  public onContextMenu(event: MouseEvent) {
    if (!this.edited) {
      if (!this.selected) {
        this.store$.dispatch(new TablesAction.SetCursor({cursor: this.cursor}));
      }
      setTimeout(() => this.showContextMenu(event));
    }
  }

  private showContextMenu(event: MouseEvent) {
    const {x, y} = computeElementPositionInParent(event, 'table-data-cell');
    this.menuComponent?.open(x, y);

    preventEvent(event);
  }

  private useSelectionOrSave(dataValue: DataValue) {
    if (!this.isPreviousLinkedRowInitialized()) {
      if (dataValue.format()) {
        this.showUninitializedLinkedRowWarningAndResetValue();
      }
      this.editing$.next(false);
      return;
    }

    if (this.suggestions?.isSelected()) {
      this.suggestions.useSelection();
    } else {
      this.saveData(dataValue.serialize());
    }
  }

  private showUninitializedLinkedRowWarningAndResetValue() {
    this.notificationService.warning(
      $localize`:@@table.data.cell.linked.row.uninitialized:I cannot link the entered value to anything, you must enter a value to the previous part of the table first.`
    );
  }

  private isPreviousLinkedRowInitialized(): boolean {
    if (this.cursor.partIndex === 0) {
      return true;
    }

    const previousRow = findTableRow(this.table.config.rows, this.cursor.rowPath.slice(0, -1));
    return previousRow && !!previousRow.documentId;
  }

  private setEditedAttribute() {
    if (this.document?.id) {
      this.store$.dispatch(
        new TablesAction.SetEditedAttribute({
          editedAttribute: {
            documentId: this.document.id,
            attributeId: this.column.attributeIds[0],
          },
        })
      );
    }
  }

  private clearEditedAttribute() {
    this.dataValue$ = this.createDataValue$();
    if (this.document?.id) {
      this.store$.dispatch(new TablesAction.SetEditedAttribute({editedAttribute: null}));
    }
  }

  private saveData(value: any) {
    const previousValue = this.getValue() || this.getValue() === 0 ? this.getValue() : '';
    if (deepObjectsEquals(previousValue, value) || (!value && !this.isEntityInitialized())) {
      return;
    }

    this.updateData(value);
  }

  public updateData(value: any) {
    if (this.document) {
      this.updateDocumentData(this.column.attributeIds[0], this.getAttributeName(), value);
    } else if (this.linkInstance) {
      this.updateLinkInstanceData(this.column.attributeIds[0], this.getAttributeName(), value);
    }
  }

  private getAttributeName(): string {
    return this.column?.attributeName || generateAttributeNameFromAttributes(this.resource?.attributes);
  }

  private updateDocumentData(attributeId: string, attributeName: string, value: any) {
    if (this.document.id) {
      this.updateDocument(attributeId, attributeName, value);
    } else {
      this.createDocument(attributeId, attributeName, value);
    }
  }

  private createDocument(attributeId: string, attributeName: string, value: any) {
    combineLatest([
      this.store$.pipe(select(selectTableById(this.cursor.tableId))),
      this.store$.pipe(select(selectTableRow(this.cursor))),
    ])
      .pipe(first())
      .subscribe(([table, row]) => {
        if (!attributeId) {
          this.createDocumentWithNewAttribute(table, row, attributeName, value);
        } else {
          this.createDocumentWithExistingAttribute(table, row, attributeId, value);
        }
      });
  }

  private createDocumentWithNewAttribute(table: TableModel, row: TableConfigRow, attributeName: string, value: any) {
    const document: DocumentModel = {
      ...this.document,
      correlationId: row?.correlationId,
      newData: {[attributeName]: {value}},
      metaData: this.createDocumentMetaData(row),
    };
    const createDocumentAction = new DocumentsAction.Create({
      document,
      workspace: this.currentWorkspace(),
      onSuccess: this.createLinkInstanceCallback(table),
    });
    const newAttribute: Attribute = {name: attributeName, correlationId: this.column?.correlationId};
    this.store$.dispatch(
      new CollectionsAction.CreateAttributes({
        collectionId: this.document.collectionId,
        attributes: [newAttribute],
        nextAction: createDocumentAction,
        otherActions: [this.removeColumnByCorrelationIdAction()],
      })
    );
  }

  private createDocumentWithExistingAttribute(table: TableModel, row: TableConfigRow, attributeId: string, value: any) {
    const document: DocumentModel = {
      ...this.document,
      correlationId: (row && row.correlationId) || (this.document && this.document.correlationId),
      data: {...this.document.data, [attributeId]: value},
      metaData: this.createDocumentMetaData(row),
    };

    this.store$.dispatch(
      new DocumentsAction.Create({
        document,
        workspace: this.currentWorkspace(),
        onSuccess: this.createLinkInstanceCallback(table),
      })
    );
  }

  private createDocumentMetaData(row: TableConfigRow): DocumentMetaData {
    return this.cursor.partIndex === 0 ? {parentId: row.parentDocumentId} : undefined;
  }

  private createLinkInstanceCallback(table: TableModel): (documentId: string) => void {
    if (this.cursor.partIndex === 0) {
      return null;
    }

    const {linkTypeId} = table.config.parts[this.cursor.partIndex - 1];
    const previousRow = findTableRow(table.config.rows, this.cursor.rowPath.slice(0, -1));

    return documentId => {
      const linkInstance: LinkInstance = {
        linkTypeId,
        documentIds: [previousRow.documentId, documentId],
        correlationId: this.document && this.document.correlationId,
        data: {},
      };
      this.store$.dispatch(new LinkInstancesAction.Create({linkInstance, workspace: this.currentWorkspace()}));
    };
  }

  private updateDocument(attributeId: string, attributeName: string, value: any) {
    if (!attributeId) {
      this.updateDocumentWithNewAttribute(attributeName, value);
    } else {
      this.updateDocumentWithExistingAttribute(attributeId, value);
    }
  }

  private updateDocumentWithNewAttribute(attributeName: string, value: any) {
    const document = {
      collectionId: this.document.collectionId,
      id: this.document.id,
      data: {},
      newData: {[attributeName]: {value}},
    };
    const patchDocumentAction = new DocumentsAction.PatchData({document, workspace: this.currentWorkspace()});
    const newAttribute = {name: attributeName};
    this.store$.dispatch(
      new CollectionsAction.CreateAttributes({
        collectionId: this.document.collectionId,
        attributes: [newAttribute],
        nextAction: patchDocumentAction,
        otherActions: [this.removeColumnByCorrelationIdAction()],
      })
    );
  }

  private updateDocumentWithExistingAttribute(attributeId: string, value: any) {
    // TODO what if user does not have permissions to see all columns?
    if (
      this.cursor.partIndex > 0 &&
      !value &&
      !Object.entries(this.document.data)
        .filter(([k]) => k !== attributeId)
        .some(([, v]) => v)
    ) {
      this.deleteDocumentAndRemoveRow();
    } else {
      const document = {
        collectionId: this.document.collectionId,
        id: this.document.id,
        data: {[attributeId]: value},
      };
      this.store$.dispatch(new DocumentsAction.PatchData({document, workspace: this.currentWorkspace()}));
    }
  }

  private deleteDocumentAndRemoveRow() {
    const removeRowAction = new TablesAction.RemoveRow({cursor: this.cursor});
    if (this.document?.id) {
      this.deleteDocument(removeRowAction);
      return;
    }
    this.store$.dispatch(removeRowAction);
  }

  private deleteDocument(nextAction?: Action) {
    this.store$.dispatch(
      new DocumentsAction.Delete({
        collectionId: this.document.collectionId,
        documentId: this.document.id,
        nextAction,
        workspace: this.currentWorkspace(),
      })
    );
  }

  private updateLinkInstanceData(attributeId: string, attributeName: string, value: any) {
    if (this.linkInstance && this.linkInstance.id) {
      this.updateLinkInstance(attributeId, attributeName, value);
    } else {
      this.createLinkInstance(attributeId, attributeName, value);
    }
  }

  private updateLinkInstance(attributeId: string, attributeName: string, value: any) {
    if (attributeId) {
      this.updateLinkInstanceWithExistingAttribute(attributeId, value);
    } else {
      this.updateLinkInstanceWithNewAttribute(attributeName, value);
    }
  }

  private updateLinkInstanceWithNewAttribute(attributeName: string, value: any) {
    this.createLinkTypeAttribute(attributeName, attribute =>
      this.updateLinkInstanceWithExistingAttribute(attribute.id, value)
    );
  }

  private updateLinkInstanceWithExistingAttribute(attributeId: string, value: any) {
    const linkInstance: LinkInstance = {
      id: this.linkInstance.id,
      documentIds: [null, null], // documentIds is not used
      linkTypeId: null, // linkTypeId is not used
      data: {[attributeId]: value},
    };
    this.store$.dispatch(new LinkInstancesAction.PatchData({linkInstance, workspace: this.currentWorkspace()}));
  }

  private createLinkInstance(attributeId: string, attributeName: string, value: any) {
    if (attributeId) {
      this.createLinkInstanceWithExistingAttribute(attributeId, value);
    } else {
      this.createLinkInstanceWithNewAttribute(attributeName, value);
    }
  }

  private createLinkInstanceWithNewAttribute(attributeName: string, value: any) {
    this.createLinkTypeAttribute(attributeName, attribute =>
      this.createLinkInstanceWithExistingAttribute(attribute.id, value)
    );
  }

  private createLinkInstanceWithExistingAttribute(attributeId: string, value: any) {
    combineLatest([
      this.store$.pipe(
        select(
          selectTablePart({
            ...this.cursor,
            partIndex: this.cursor.partIndex + 1,
          })
        )
      ),
      this.store$.pipe(
        select(
          selectTableRow({
            ...this.cursor,
            partIndex: this.cursor.partIndex + 1,
          })
        ),
        map(row => row?.correlationId)
      ),
      this.store$.pipe(
        select(
          selectTableRow({
            ...this.cursor,
            partIndex: this.cursor.partIndex - 1,
            rowPath: this.cursor.rowPath.slice(0, -1),
          })
        )
      ),
      this.store$.pipe(select(selectViewQuery)),
      this.store$.pipe(select(selectAllCollections)),
    ])
      .pipe(take(1))
      .subscribe(([{collectionId}, correlationId, {documentId: previousDocumentId}, query, collections]) => {
        const collection = (collections || []).find(coll => coll.id === collectionId);
        if (previousDocumentId) {
          this.store$.dispatch(
            new DocumentsAction.CreateWithLink({
              document: {
                collectionId,
                correlationId,
                data: generateDocumentDataByResourceQuery(collection, query, this.constraintData, false),
              },
              workspace: this.currentWorkspace(),
              otherDocumentId: previousDocumentId,
              linkInstance: {...this.linkInstance, documentIds: [previousDocumentId, ''], data: {[attributeId]: value}},
            })
          );
        }
      });
  }

  private currentWorkspace(): Workspace {
    return {viewId: this.view?.id};
  }

  private createLinkTypeAttribute(attributeName: string, onSuccess: (attribute: Attribute) => void) {
    this.store$.dispatch(
      new LinkTypesAction.CreateAttributes({
        linkTypeId: this.linkInstance.linkTypeId,
        attributes: [{name: attributeName}],
        otherActions: [this.removeColumnByCorrelationIdAction()],
        onSuccess: ([attribute]) => onSuccess(attribute),
      })
    );
  }

  private removeColumnByCorrelationIdAction(): TablesAction.RemoveColumnByCorrelationId {
    return new TablesAction.RemoveColumnByCorrelationId({
      tableId: this.cursor.tableId,
      partIndex: this.cursor.partIndex,
      correlationId: this.column?.correlationId,
    });
  }

  public onEdit() {
    this.store$.dispatch(new TablesAction.EditSelectedCell({correlationId: this.correlationId}));
  }

  public onValueChange(dataValue: DataValue) {
    this.editedValue = dataValue;
    this.setSuggesting();
  }

  public onValueSave(dataValue: DataValue) {
    if (this.hintWasUsed || !this.isEditable()) {
      this.onCancelEditing();
      return false;
    }

    if (isNotNullOrUndefined(dataValue)) {
      this.useSelectionOrSave(dataValue);
    }
    this.editing$.next(false);
  }

  public onCancelEditing() {
    this.dataValue$ = this.createDataValue$();
    this.editing$.next(false);
  }

  @HostListener('keydown', ['$event'])
  public onKeyDown(event: KeyboardEvent) {
    if (this.editing$.getValue()) {
      this.onKeyDownInEditMode(event);
    } else {
      this.onKeyDownInSelectionMode(event);
    }
  }

  public onKeyDownInEditMode(event: KeyboardEvent) {
    event.stopPropagation();

    switch (keyboardEventCode(event)) {
      case KeyCode.ArrowDown:
        event.preventDefault();
        return this.suggestions?.moveSelection(Direction.Down);
      case KeyCode.ArrowUp:
        event.preventDefault();
        return this.suggestions?.moveSelection(Direction.Up);
      case KeyCode.Enter:
      case KeyCode.NumpadEnter:
        // needs to be executed after the value is stored
        setTimeout(() => this.store$.dispatch(new TablesAction.MoveCursor({direction: Direction.Down})));
        return;
      case KeyCode.Tab:
        // needs to be executed after the value is stored
        setTimeout(() =>
          this.store$.dispatch(
            new TablesAction.MoveCursor({direction: event.shiftKey ? Direction.Left : Direction.Right})
          )
        );
        return;
    }

    if (isKeyPrintable(event) && this.suggestions) {
      return this.suggestions.clearSelection();
    }
  }

  public onKeyDownInSelectionMode(event: KeyboardEvent) {
    const writeWithView = this.isEditable();
    event[EDITABLE_EVENT] = writeWithView;

    if (event.altKey && event.shiftKey && writeWithView) {
      event.stopPropagation();
      switch (keyboardEventCode(event)) {
        case KeyCode.ArrowRight:
          this.store$.dispatch(new TablesAction.IndentRow({cursor: this.cursor, workspace: this.currentWorkspace()}));
          return;
        case KeyCode.ArrowLeft:
          this.store$.dispatch(new TablesAction.OutdentRow({cursor: this.cursor, workspace: this.currentWorkspace()}));
          return;
        case KeyCode.ArrowUp:
          this.store$.dispatch(new TablesAction.MoveRowUp({cursor: this.cursor, workspace: this.currentWorkspace()}));
          this.store$.dispatch(new TablesAction.MoveCursor({direction: Direction.Up}));
          return;
        case KeyCode.ArrowDown:
          this.store$.dispatch(new TablesAction.MoveRowDown({cursor: this.cursor, workspace: this.currentWorkspace()}));
          this.store$.dispatch(new TablesAction.MoveCursor({direction: Direction.Down}));
          return;
      }
    }
  }

  public onUseDocumentHint() {
    this.hintWasUsed = true;
    this.selected = false;
    this.editing$.next(false);

    this.ngZone.runOutsideAngular(() => {
      window.setTimeout(() => (this.hintWasUsed = false), 500);
    });
  }

  public onEnterInvalid() {
    if (this.suggestions?.isSelected()) {
      this.suggestions.useSelection();
      this.editing$.next(false);
    }
  }

  public onCreateLink(data: {linkInstance: LinkInstance}) {
    if (!this.isPreviousLinkedRowInitialized()) {
      this.showUninitializedLinkedRowWarningAndResetValue();
      return;
    }
    this.store$.dispatch(
      new LinkInstancesAction.Create({linkInstance: data.linkInstance, workspace: this.currentWorkspace()})
    );
  }

  public onUpdateLink(data: {linkInstance: LinkInstance; nextAction?: Action}) {
    this.store$.dispatch(
      new LinkInstancesAction.Update({
        linkInstance: data.linkInstance,
        nextAction: data.nextAction,
        workspace: this.currentWorkspace(),
      })
    );
  }
}
