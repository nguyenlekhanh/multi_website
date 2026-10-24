import type { ThemeDefinition } from '@/platform/types';
import { TechBlocks } from './Blocks';
import { TechLayout } from './Layout';
import {
  TechCategories,
  TechHome,
  TechNotFound,
  TechPageView,
  TechPostList,
  TechPostView,
} from './Views';

/**
 * IT / Technology theme.
 * Dark engineering-console identity: mono typography, glass panels, gradient
 * accents, and a subtle blueprint grid — built for tech consultancies and
 * software businesses.
 */
export const itTheme: ThemeDefinition = {
  id: 'it',
  name: 'IT / Tech',
  description: 'Dark engineering aesthetic with mono details, service cards, and measurable proof.',
  version: '1.0.0',
  supportsPosts: true,
  layout: TechLayout,
  home: TechHome,
  page: TechPageView,
  postList: TechPostList,
  post: TechPostView,
  categories: TechCategories,
  notFound: TechNotFound,
};

export { TechBlocks };
