import type { ThemeDefinition } from '@/platform/types';
import { BusinessBlocks } from './Blocks';
import { BusinessCategories } from './CategoriesView';
import { BusinessHome } from './Home';
import { BusinessLayout } from './Layout';
import { BusinessNotFound } from './NotFound';
import { BusinessPageView } from './PageView';
import { BusinessPostList, BusinessPostView } from './PostViews';

/**
 * Business theme.
 * Professional corporate identity: sticky light header, restrained navy and
 * gold palette, card-based services, dark stat bands, and clear CTAs.
 */
export const businessTheme: ThemeDefinition = {
  id: 'business',
  name: 'Business',
  description: 'Professional corporate design with a strong hero, services, and social proof.',
  version: '1.0.0',
  supportsPosts: true,
  layout: BusinessLayout,
  home: BusinessHome,
  page: BusinessPageView,
  postList: BusinessPostList,
  post: BusinessPostView,
  categories: BusinessCategories,
  notFound: BusinessNotFound,
};

export { BusinessBlocks };
