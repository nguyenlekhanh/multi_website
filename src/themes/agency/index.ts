import type { ThemeDefinition } from '@/platform/types';
import { AgencyBlocks } from './Blocks';
import { AgencyLayout } from './Layout';
import {
  AgencyCategories,
  AgencyHome,
  AgencyNotFound,
  AgencyPageView,
  AgencyPostList,
  AgencyPostView,
} from './Views';

/**
 * Agency theme.
 * Bold print-brutalist identity: uppercase black display type, thick borders
 * with hard offset shadows, accent stripes, and a composition built for
 * marketing and design studios.
 */
export const agencyTheme: ThemeDefinition = {
  id: 'agency',
  name: 'Agency',
  description: 'Bold print-brutalist agency design with hard shadows and uppercase display type.',
  version: '1.0.0',
  supportsPosts: true,
  layout: AgencyLayout,
  home: AgencyHome,
  page: AgencyPageView,
  postList: AgencyPostList,
  post: AgencyPostView,
  categories: AgencyCategories,
  notFound: AgencyNotFound,
};

export { AgencyBlocks };
