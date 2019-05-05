/*
 * Lumeer: Modern Data Definition and Processing Platform
 *
 * Copyright (C) since 2017 Answer Institute, s.r.o. and/or its affiliates.
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

export interface Template {
  imagePath?: string;
  icon?: string;
  title: string;
  description: string;
  type: TemplateType;
  url?: string;
}

export enum TemplateType {
  Empty = 'EMPTY',
  OKR = 'OKR',
  HR = 'HR',
}

export const templateTypesMap: Record<string, TemplateType> = {
  [TemplateType.Empty]: TemplateType.Empty,
  [TemplateType.OKR]: TemplateType.OKR,
  [TemplateType.HR]: TemplateType.HR,
};
