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

import {Action} from '@ngrx/store';
import {Direction} from '../../../shared/direction';
import {DocumentModel} from '../documents/document.model';
import {LinkInstance} from '../link-instances/link.instance';
import {TableBodyCursor, TableCursor, TableHeaderCursor} from './table-cursor';
import {TableConfig, TableConfigColumn, TableConfigPart, TableConfigRow, TableModel} from './table.model';
import {EditedAttribute} from './tables.state';
import {Query} from '../navigation/query/query';
import {View} from '../views/view';
import {Workspace} from '../navigation/workspace';

export enum TablesActionType {
  CREATE_TABLE = '[Tables] Create Table',
  ADD_TABLE = '[Tables] Add Table',
  DESTROY_TABLE = '[Tables] Destroy Table',
  REMOVE_TABLE = '[Tables] Remove Table',

  SET_CONFIG = '[Tables] Set Config',

  CREATE_PART = '[Tables] Create Part',
  ADD_PART = '[Tables] Add Part',
  SWITCH_PARTS = '[Tables] Switch Parts',
  REMOVE_PART = '[Tables] Remove Part',

  ADD_COLUMN = '[Tables] Add Column',
  SPLIT_COLUMN = '[Tables] Split Column',
  REPLACE_COLUMNS = '[Tables] Replace Column',
  SHOW_COLUMNS = '[Tables] Show Columns',
  HIDE_COLUMN = '[Tables] Hide Column',
  MOVE_COLUMN = '[Tables] Move Column',
  RESIZE_COLUMN = '[Tables] Resize Column',
  REMOVE_COLUMN = '[Tables] Remove Column',
  REMOVE_COLUMN_BY_CORRELATION_ID = '[Tables] Remove Column By Correlation Id',
  REMOVE_EMPTY_COLUMNS = '[Tables] Remove Empty Columns',
  SYNC_COLUMNS = '[Tables] Sync Columns',
  UPDATE_COLUMNS = '[Tables] Update Columns',

  SYNC_PRIMARY_ROWS = '[Tables] Sync Primary Rows',
  SYNC_LINKED_ROWS = '[Tables] Sync Linked Rows',
  ADD_PRIMARY_ROWS = '[Tables] Add Primary Rows',
  INIT_ROWS = '[Tables] Init Rows',
  INIT_LINKED_ROWS = '[Tables] Init Linked Rows',
  CLEAN_ROWS = '[Tables] Clean Rows',
  ORDER_PRIMARY_ROWS = '[Tables] Order Primary Rows',

  ADD_LINKED_ROWS = '[Tables] Add Linked Rows',
  REPLACE_ROWS = '[Tables] Replace Rows',
  MOVE_ROW_UP = '[Tables] Move Row Up',
  MOVE_ROW_DOWN = '[Tables] Move Row Down',
  REMOVE_ROW = '[Tables] Remove Row',
  REMOVE_ROWS = '[Tables] Remove Rows',
  CLONE_ROW = '[Tables] Clone Row',

  INDENT_ROW = '[Tables] Indent Row',
  OUTDENT_ROW = '[Tables] Outdent Row',
  TOGGLE_CHILD_ROWS = '[Tables] Toggle Child Rows',
  COPY_VALUE = '[Tables] Copy Value',
  COPY_ROW_VALUES = '[Tables] Copy Row Values',

  TOGGLE_LINKED_ROWS = '[Tables] Toggle Linked Rows',

  EDIT_SELECTED_CELL = '[Tables] Edit Selected Cell',
  REMOVE_SELECTED_CELL = '[Tables] Remove Selected Cell',

  SET_CURSOR = '[Tables] Set Cursor',
  MOVE_CURSOR = '[Tables] Move Cursor',
  USE_VIEW_CURSOR = '[Tables] Use View Cursor',

  SET_EDITED_ATTRIBUTE = '[Tables] Set Edited Attribute',
}

export namespace TablesAction {
  export interface TableCursorAction extends Action {
    payload: {
      cursor: TableCursor;
    };
  }

  export class CreateTable implements Action {
    public readonly type = TablesActionType.CREATE_TABLE;

    public constructor(
      public payload: {tableId: string; query: Query; view: View; config: TableConfig; embedded?: boolean}
    ) {}
  }

  export class AddTable implements Action {
    public readonly type = TablesActionType.ADD_TABLE;

    public constructor(public payload: {table: TableModel}) {}
  }

  export class DestroyTable implements Action {
    public readonly type = TablesActionType.DESTROY_TABLE;

    public constructor(public payload: {tableId: string}) {}
  }

  export class RemoveTable implements Action {
    public readonly type = TablesActionType.REMOVE_TABLE;

    public constructor(public payload: {tableId: string}) {}
  }

  export class SetConfig implements Action {
    public readonly type = TablesActionType.SET_CONFIG;

    public constructor(public payload: {tableId: string; config: TableConfig}) {}
  }

  export class CreatePart implements Action {
    public readonly type = TablesActionType.CREATE_PART;

    public constructor(public payload: {tableId: string; linkTypeId: string; last?: boolean; config?: TableConfig}) {}
  }

  export class AddPart implements Action {
    public readonly type = TablesActionType.ADD_PART;

    public constructor(public payload: {tableId: string; parts: TableConfigPart[]}) {}
  }

  export class SwitchParts implements TableCursorAction {
    public readonly type = TablesActionType.SWITCH_PARTS;

    public constructor(public payload: {cursor: TableHeaderCursor; query: Query}) {}
  }

  export class RemovePart implements TableCursorAction {
    public readonly type = TablesActionType.REMOVE_PART;

    public constructor(public payload: {cursor: TableHeaderCursor; query: Query}) {}
  }

  export class AddColumn implements TableCursorAction {
    public readonly type = TablesActionType.ADD_COLUMN;

    public constructor(public payload: {cursor: TableHeaderCursor}) {}
  }

  export class SplitColumn implements TableCursorAction {
    public readonly type = TablesActionType.SPLIT_COLUMN;

    public constructor(public payload: {cursor: TableHeaderCursor}) {}
  }

  export class ReplaceColumns implements Action {
    public readonly type = TablesActionType.REPLACE_COLUMNS;

    public constructor(
      public payload: {cursor: TableHeaderCursor; deleteCount: number; columns?: TableConfigColumn[]}
    ) {}
  }

  export class ShowColumns implements TableCursorAction {
    public readonly type = TablesActionType.SHOW_COLUMNS;

    public constructor(public payload: {cursor: TableHeaderCursor; attributeIds: string[]}) {}
  }

  export class HideColumn implements TableCursorAction {
    public readonly type = TablesActionType.HIDE_COLUMN;

    public constructor(public payload: {cursor: TableHeaderCursor}) {}
  }

  export class RemoveColumn implements TableCursorAction {
    public readonly type = TablesActionType.REMOVE_COLUMN;

    public constructor(public payload: {cursor: TableHeaderCursor}) {}
  }

  export class RemoveColumnByCorrelationId implements Action {
    public readonly type = TablesActionType.REMOVE_COLUMN_BY_CORRELATION_ID;

    public constructor(public payload: {tableId: string; partIndex: number; correlationId: string}) {}
  }

  export class MoveColumn implements TableCursorAction {
    public readonly type = TablesActionType.MOVE_COLUMN;

    public constructor(public payload: {cursor: TableHeaderCursor; toIndex: number}) {}
  }

  export class ResizeColumn implements Action {
    public readonly type = TablesActionType.RESIZE_COLUMN;

    public constructor(public payload: {cursor: TableHeaderCursor; delta: number}) {}
  }

  /**
   * Remove all not initialized columns from the given table part
   */
  export class RemoveEmptyColumns implements TableCursorAction {
    public readonly type = TablesActionType.REMOVE_EMPTY_COLUMNS;

    public constructor(public payload: {cursor: TableHeaderCursor}) {}
  }

  /**
   * Replaces all columns in a given table part by new columns.
   */
  export class UpdateColumns implements TableCursorAction {
    public readonly type = TablesActionType.UPDATE_COLUMNS;

    public constructor(public payload: {cursor: TableHeaderCursor; columns: TableConfigColumn[]}) {}
  }

  /**
   * Synchronizes columns in a given table part with its collection or link type
   */
  export class SyncColumns implements Action {
    public readonly type = TablesActionType.SYNC_COLUMNS;

    public constructor(public payload: {cursor: TableHeaderCursor; view: View}) {}
  }

  /**
   * Synchronizes primary rows in table config with documents matching the query.
   * Inserts rows for new documents at the end of the table.
   * Removes rows with not existing documents.
   * Updates existing rows with correlationId for just created documents.
   */
  export class SyncPrimaryRows implements Action {
    public readonly type = TablesActionType.SYNC_PRIMARY_ROWS;

    public constructor(public payload: {cursor: TableBodyCursor; query: Query; view: View}) {}
  }

  /**
   * Synchronizes linked rows in table config with documents and link instances.
   * Inserts rows for new documents at the end of the table.
   * Updates existing rows with correlationId for just created documents (and link instances).
   */
  export class SyncLinkedRows implements Action {
    public readonly type = TablesActionType.SYNC_LINKED_ROWS;

    public constructor(public payload: {cursor: TableBodyCursor; query: Query; view: View}) {}
  }

  /**
   * Adds rows to the first table part. If append is true, the rows are added at the end (before last empty row).
   * Otherwise, they are put into exact position based on rowPath value in cursor.
   *
   */
  export class AddPrimaryRows implements Action {
    public readonly type = TablesActionType.ADD_PRIMARY_ROWS;

    public constructor(
      public payload: {
        cursor: TableBodyCursor;
        rows: TableConfigRow[];
        append?: boolean;
        documentsMap?: Record<string, DocumentModel>;
        below?: boolean;
      }
    ) {}
  }

  /**
   * Adds rows to the linked table part. If append is true, the rows are added at the end.
   * Otherwise, they are put into exact position based on rowPath value in cursor.
   *
   */
  export class AddLinkedRows implements Action {
    public readonly type = TablesActionType.ADD_LINKED_ROWS;

    public constructor(public payload: {cursor: TableBodyCursor; linkedRows: TableConfigRow[]; append?: boolean}) {}
  }

  /**
   * Adds documentId (and linkInstanceId) to the rows that have correlationId matching some of the provided documents.
   */
  export class InitRows implements Action {
    public readonly type = TablesActionType.INIT_ROWS;

    public constructor(
      public payload: {cursor: TableBodyCursor; documents: DocumentModel[]; linkInstances: LinkInstance[]}
    ) {}
  }

  /**
   * Adds linkInstanceId and documentId to the rows that have correlationId matching some of the provided documents.
   */
  export class InitLinkedRows implements Action {
    public readonly type = TablesActionType.INIT_LINKED_ROWS;

    public constructor(public payload: {cursor: TableBodyCursor; linkInstances: LinkInstance[]}) {}
  }

  /**
   * Remove rows containing documentId (or linkInstanceId) for not existing document (or link instance)
   */
  export class CleanRows implements Action {
    public readonly type = TablesActionType.CLEAN_ROWS;

    public constructor(
      public payload: {cursor: TableBodyCursor; documents: DocumentModel[]; linkInstances: LinkInstance[]}
    ) {}
  }

  export class ReplaceRows implements Action {
    public readonly type = TablesActionType.REPLACE_ROWS;

    public constructor(public payload: {cursor: TableBodyCursor; rows: TableConfigRow[]; deleteCount: number}) {}
  }

  export class RemoveRow implements Action {
    public readonly type = TablesActionType.REMOVE_ROW;

    public constructor(public payload: {cursor: TableBodyCursor}) {}
  }

  export class RemoveRows implements Action {
    public readonly type = TablesActionType.REMOVE_ROWS;

    public constructor(public payload: {cursor: TableBodyCursor; lastPathIndexes: number[]}) {}
  }

  export class CloneRow implements Action {
    public readonly type = TablesActionType.CLONE_ROW;

    public constructor(public payload: {cursor: TableBodyCursor; workspace: Workspace}) {}
  }

  export class MoveRowUp implements Action {
    public readonly type = TablesActionType.MOVE_ROW_UP;

    public constructor(public payload: {cursor: TableBodyCursor; workspace: Workspace}) {}
  }

  export class MoveRowDown implements Action {
    public readonly type = TablesActionType.MOVE_ROW_DOWN;

    public constructor(public payload: {cursor: TableBodyCursor; workspace: Workspace}) {}
  }

  export class OrderPrimaryRows implements Action {
    public readonly type = TablesActionType.ORDER_PRIMARY_ROWS;

    public constructor(public payload: {cursor: TableBodyCursor; documents: DocumentModel[]}) {}
  }

  export class IndentRow implements Action {
    public readonly type = TablesActionType.INDENT_ROW;

    public constructor(public payload: {cursor: TableBodyCursor; workspace: Workspace}) {}
  }

  export class OutdentRow implements Action {
    public readonly type = TablesActionType.OUTDENT_ROW;

    public constructor(public payload: {cursor: TableBodyCursor; workspace: Workspace}) {}
  }

  export class CopyValue implements Action {
    public readonly type = TablesActionType.COPY_VALUE;

    public constructor(public payload: {cursor: TableCursor}) {}
  }

  export class CopyRowValues implements Action {
    public readonly type = TablesActionType.COPY_ROW_VALUES;

    public constructor(public payload: {cursor: TableHeaderCursor; view: View; query: Query; unique?: boolean}) {}
  }

  /**
   * Collapses or expands child rows in a hierarchical table.
   */
  export class ToggleChildRows implements Action {
    public readonly type = TablesActionType.TOGGLE_CHILD_ROWS;

    public constructor(public payload: {cursor: TableBodyCursor}) {}
  }

  /**
   * Collapses or expands linked rows in a hierarchical table.
   */
  export class ToggleLinkedRows implements Action {
    public readonly type = TablesActionType.TOGGLE_LINKED_ROWS;

    public constructor(public payload: {cursor: TableBodyCursor}) {}
  }

  export class SetCursor implements TableCursorAction {
    public readonly type = TablesActionType.SET_CURSOR;

    public constructor(public payload: {cursor: TableCursor}) {}
  }

  export class MoveCursor implements Action {
    public readonly type = TablesActionType.MOVE_CURSOR;

    public constructor(public payload: {direction: Direction}) {}
  }

  export class UseViewCursor implements Action {
    public readonly type = TablesActionType.USE_VIEW_CURSOR;
  }

  export class EditSelectedCell implements Action {
    public readonly type = TablesActionType.EDIT_SELECTED_CELL;

    public constructor(public payload: {correlationId: string; value?: string; clear?: boolean}) {}
  }

  export class RemoveSelectedCell implements Action {
    public readonly type = TablesActionType.REMOVE_SELECTED_CELL;
  }

  export class SetEditedAttribute implements Action {
    public readonly type = TablesActionType.SET_EDITED_ATTRIBUTE;

    public constructor(public payload: {editedAttribute: EditedAttribute}) {}
  }

  export type All =
    | CreateTable
    | AddTable
    | DestroyTable
    | RemoveTable
    | SetConfig
    | CreatePart
    | AddPart
    | SwitchParts
    | RemovePart
    | AddColumn
    | SplitColumn
    | ReplaceColumns
    | RemoveColumn
    | RemoveEmptyColumns
    | SyncColumns
    | UpdateColumns
    | HideColumn
    | ShowColumns
    | MoveColumn
    | ResizeColumn
    | SyncPrimaryRows
    | SyncLinkedRows
    | OrderPrimaryRows
    | AddPrimaryRows
    | AddLinkedRows
    | InitRows
    | InitLinkedRows
    | CleanRows
    | ReplaceRows
    | RemoveRow
    | RemoveRows
    | CloneRow
    | MoveRowDown
    | MoveRowUp
    | IndentRow
    | OutdentRow
    | ToggleChildRows
    | ToggleLinkedRows
    | SetCursor
    | MoveCursor
    | UseViewCursor
    | EditSelectedCell
    | RemoveSelectedCell
    | SetEditedAttribute;
}
