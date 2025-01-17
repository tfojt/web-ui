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
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {Collection} from '../../../../core/store/collections/collection';
import {DocumentModel} from '../../../../core/store/documents/document.model';
import {CalendarBar, CalendarConfig, CalendarMode} from '../../../../core/store/calendars/calendar';
import {ResourcesPermissions} from '../../../../core/model/allowed-permissions';
import {BehaviorSubject, Observable} from 'rxjs';
import {debounceTime, filter, map, tap} from 'rxjs/operators';
import {
  calendarStemConfigIsWritable,
  calendarWritableUniqueStemsConfigs,
  checkOrTransformCalendarConfig,
  createCalendarNewEventData,
  parseCalendarDate,
} from '../util/calendar-util';
import {Query} from '../../../../core/store/navigation/query/query';
import {deepObjectsEquals, toNumber} from '../../../../shared/utils/common.utils';
import {ModalService} from '../../../../shared/modal/modal.service';
import {CalendarEvent, CalendarMetaData} from '../util/calendar-event';
import {LinkType} from '../../../../core/store/link-types/link.type';
import {LinkInstance} from '../../../../core/store/link-instances/link.instance';
import {CalendarConverter} from '../util/calendar-converter';
import {AttributesResource, AttributesResourceType, DataResource} from '../../../../core/model/resource';
import {findAttributeConstraint} from '../../../../core/store/collections/collection.util';
import {constraintContainsHoursInConfig, subtractDatesToDurationCountsMap} from '../../../../shared/utils/date.utils';
import {
  ConstraintData,
  ConstraintType,
  DataValue,
  DateTimeConstraint,
  DocumentsAndLinksData,
  DurationConstraint,
  durationCountsMapToString,
} from '@lumeer/data-filters';
import {View} from '../../../../core/store/views/view';
import {CreateDataResourceService} from '../../../../core/service/create-data-resource.service';
import {Workspace} from '../../../../core/store/navigation/workspace';
import {DataResourceChain} from '../../../../shared/utils/data/data-aggregator';
import {Translation} from '../../../../shared/utils/translation';

interface Data {
  collections: Collection[];
  linkTypes: LinkType[];
  data: DocumentsAndLinksData;
  config: CalendarConfig;
  permissions: ResourcesPermissions;
  query: Query;
  constraintData: ConstraintData;
}

interface PatchData {
  dataResource: DataResource;
  resourceType: AttributesResourceType;
  data: Record<string, any>;
}

@Component({
  selector: 'calendar-events',
  templateUrl: './calendar-events.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarEventsComponent implements OnInit, OnChanges {
  @Input()
  public collections: Collection[];

  @Input()
  public linkTypes: LinkType[];

  @Input()
  public data: DocumentsAndLinksData;

  @Input()
  public config: CalendarConfig;

  @Input()
  public permissions: ResourcesPermissions;

  @Input()
  public constraintData: ConstraintData;

  @Input()
  public canManageConfig: boolean;

  @Input()
  public query: Query;

  @Input()
  public view: View;

  @Input()
  public workspace: Workspace;

  @Input()
  public sidebarOpened: boolean;

  @Output()
  public patchDocumentData = new EventEmitter<DocumentModel>();

  @Output()
  public patchLinkData = new EventEmitter<LinkInstance>();

  @Output()
  public configChange = new EventEmitter<CalendarConfig>();

  private readonly converter: CalendarConverter;

  public events$: Observable<CalendarEvent[]>;
  public dataSubject = new BehaviorSubject<Data>(null);

  public canCreateEvents: boolean;

  private events: CalendarEvent[];

  constructor(private modalService: ModalService, private createService: CreateDataResourceService) {
    this.converter = new CalendarConverter();
  }

  public ngOnInit() {
    this.events$ = this.subscribeToEvents();
  }

  private subscribeToEvents(): Observable<CalendarEvent[]> {
    return this.dataSubject.pipe(
      filter(data => !!data),
      debounceTime(100),
      map(data => this.handleData(data)),
      tap(events => (this.events = events))
    );
  }

  private handleData(data: Data): CalendarEvent[] {
    const config = checkOrTransformCalendarConfig(data.config, data.query, data.collections, data.linkTypes);
    if (!deepObjectsEquals(config, data.config)) {
      this.configChange.emit(config);
    }

    return this.converter.convert(
      config,
      data.collections,
      data.linkTypes,
      data.data,
      data.permissions,
      data.constraintData,
      data.query
    );
  }

  public ngOnChanges(changes: SimpleChanges) {
    if (
      (changes.config ||
        changes.collections ||
        changes.linkTypes ||
        changes.data ||
        changes.permissions ||
        changes.query ||
        changes.currentUser ||
        changes.constraintData) &&
      this.config
    ) {
      this.dataSubject.next({
        linkTypes: this.linkTypes,
        collections: this.collections,
        data: this.data,
        permissions: this.permissions,
        config: this.config,
        query: this.query,
        constraintData: this.constraintData,
      });
    }
    if (changes.config || changes.permissions) {
      this.canCreateEvents = this.isSomeStemConfigWritable();
    }
    this.createService.setData(
      this.data,
      this.query,
      this.collections,
      this.linkTypes,
      this.constraintData,
      this.workspace
    );
  }

  private isSomeStemConfigWritable(): boolean {
    return (this.config?.stemsConfigs || []).some(config => calendarStemConfigIsWritable(config, this.permissions));
  }

  public onRangeChanged(data: {newMode: CalendarMode; newDate: Date}) {
    const config = {...this.config, mode: data.newMode, date: data.newDate};
    this.configChange.next(config);
  }

  public onListToggle(displayList: boolean) {
    const config = {...this.config, list: displayList};
    this.configChange.next(config);
  }

  public onEventRangeChanged(data: {metadata: CalendarMetaData; start: Date; end: Date; moved?: boolean}) {
    const patchData = this.createPatchData(data);
    for (const item of patchData) {
      this.emitPatchData(item.data, item.resourceType, item.dataResource);
    }
  }

  private createPatchData(data: {metadata: CalendarMetaData; start: Date; end: Date; moved?: boolean}): PatchData[] {
    const stemConfig = data.metadata.stemConfig;
    const patchData: PatchData[] = [];

    if (stemConfig.start) {
      const dataResource = this.getDataResource(data.metadata.startDataId, stemConfig.start.resourceType);
      if (dataResource) {
        const patch = this.getPatchData(patchData, dataResource, stemConfig.start);
        this.patchDate(data.start, stemConfig.start, patch, dataResource);
      }
    }

    if (stemConfig.end) {
      const dataResource = this.getDataResource(data.metadata.endDataId, stemConfig.end.resourceType);
      if (dataResource) {
        const patch = this.getPatchData(patchData, dataResource, stemConfig.end);
        this.patchEndDate(data.start, data.end, data.moved, stemConfig.end, patch, dataResource);
      }
    }

    return patchData;
  }

  private patchEndDate(
    start: Date,
    end: Date,
    moved: boolean,
    model: CalendarBar,
    patchData: Record<string, any>,
    dataResource: DataResource = null
  ) {
    const resource = this.getResourceById(model.resourceId, model.resourceType);
    const constraint = findAttributeConstraint(resource?.attributes, model.attributeId);
    if (constraint?.type === ConstraintType.Duration) {
      if (!moved) {
        const durationCountsMap = subtractDatesToDurationCountsMap(end, start);
        const durationString = durationCountsMapToString(durationCountsMap);
        const dataValue = (<DurationConstraint>constraint).createDataValue(durationString, this.constraintData);

        patchData[model.attributeId] = toNumber(dataValue.serialize());
      }
    } else {
      this.patchDate(end, model, patchData, dataResource, true);
    }
  }

  private patchDate(
    date: Date,
    model: CalendarBar,
    patchData: Record<string, any>,
    dataResource: DataResource = null,
    subtractDay?: boolean
  ) {
    const resource = this.getResourceById(model.resourceId, model.resourceType);
    const constraint = findAttributeConstraint(resource?.attributes, model.attributeId) || new DateTimeConstraint(null);
    let momentDate = parseCalendarDate(date, constraint, this.constraintData);
    if (!constraintContainsHoursInConfig(constraint)) {
      momentDate = momentDate.startOf('day');
      if (subtractDay) {
        momentDate = momentDate.subtract(1, 'days');
      }
    }

    const dataValue: DataValue = constraint.createDataValue(momentDate.toDate(), this.constraintData);
    if (
      !dataResource ||
      dataValue.compareTo(constraint.createDataValue(dataResource.data[model.attributeId], this.constraintData)) !== 0
    ) {
      patchData[model.attributeId] = dataValue.serialize();
    }
  }

  private getPatchData(
    patchDataArray: PatchData[],
    dataResource: DataResource,
    model: CalendarBar
  ): Record<string, any> {
    const patchDataObject = patchDataArray.find(
      patchData => patchData.dataResource.id === dataResource.id && patchData.resourceType === model.resourceType
    );
    if (patchDataObject) {
      return patchDataObject.data;
    }

    const data = {};
    patchDataArray.push({data, resourceType: model.resourceType, dataResource});
    return data;
  }

  private emitPatchData(
    patchData: Record<string, any>,
    resourceType: AttributesResourceType,
    dataResource: DataResource
  ) {
    if (Object.keys(patchData).length > 0) {
      if (resourceType === AttributesResourceType.Collection) {
        this.patchDocumentData.emit({...(<DocumentModel>dataResource), data: patchData});
      } else if (resourceType === AttributesResourceType.LinkType) {
        this.patchLinkData.emit({...(<LinkInstance>dataResource), data: patchData});
      }
    }
  }

  public onNewEvent(value: {start: Date; end: Date; group?: string}) {
    const stemsConfigs = calendarWritableUniqueStemsConfigs(
      this.query,
      this.config,
      this.collections,
      this.permissions
    );
    this.createService.chooseStemConfig(stemsConfigs, stemConfig => {
      const grouping = stemConfig.group ? {value: value.group, attribute: stemConfig.group} : null;
      const dataResourcesChains = this.filterDataResourcesChains(value.group);
      const nameResource = this.getResourceById(stemConfig.name?.resourceId, stemConfig.name?.resourceType);
      const namePurposeType = (<Collection>nameResource)?.purpose?.type;
      const startResource = this.getResourceById(stemConfig.start.resourceId, stemConfig.start.resourceType);
      const endResource = this.getResourceById(stemConfig.end?.resourceId, stemConfig.end?.resourceType);
      const data = createCalendarNewEventData(
        stemConfig,
        {date: value.start, resource: startResource},
        {date: value.end, resource: endResource},
        this.constraintData,
        Translation.newRecordTitle(namePurposeType)
      );
      this.createService.create({
        queryResource: stemConfig.name || stemConfig.start,
        stem: stemConfig.stem,
        grouping: [grouping].filter(val => !!val),
        dataResourcesChains,
        data,
        failureMessage: $localize`:@@perspective.calendar.create.event.failure:Could not create event`,
      });
    });
  }

  private filterDataResourcesChains(group: string): DataResourceChain[][] {
    return (this.events || []).reduce((chains, event) => {
      if (event.extendedProps.dataResourcesChain?.length && event.resourceIds?.[0] === group) {
        chains.push(event.extendedProps.dataResourcesChain);
      }
      return chains;
    }, []);
  }

  public onEventClicked(event: CalendarEvent) {
    const metadata = event.extendedProps;
    const resourceType = metadata.stemConfig.name?.resourceType || metadata.stemConfig.start?.resourceType;
    const dataResource = this.getDataResource(metadata.nameDataId, resourceType);
    const resourceId = (<DocumentModel>dataResource).collectionId || (<LinkInstance>dataResource).linkTypeId;
    const resource = this.getResourceById(resourceId, resourceType);
    this.modalService.showDataResourceDetail(dataResource, resource, this.view?.id);
  }

  private getDataResource(id: string, type: AttributesResourceType): DataResource {
    if (type === AttributesResourceType.Collection) {
      return (this.data.uniqueDocuments || []).find(document => document.id === id);
    } else if (type === AttributesResourceType.LinkType) {
      return (this.data.uniqueLinkInstances || []).find(linkInstance => linkInstance.id === id);
    }

    return null;
  }

  private getResourceById(id: string, type: AttributesResourceType): AttributesResource {
    if (type === AttributesResourceType.Collection) {
      return (this.collections || []).find(c => c.id === id);
    } else if (type === AttributesResourceType.LinkType) {
      return (this.linkTypes || []).find(lt => lt.id === id);
    }
    return null;
  }
}
