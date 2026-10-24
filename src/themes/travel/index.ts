import type { ThemeDefinition } from '@/platform/types';
import { TravelBlocks } from './Blocks';
import { TravelCategories } from './CategoriesView';
import { TravelHome } from './Home';
import { TravelLayout } from './Layout';
import { TravelNotFound } from './NotFound';
import { TravelPageView } from './PageView';
import { TravelPostList, TravelPostView } from './PostViews';

/**
 * Travel theme.
 * Immersive travel identity: full-bleed photography with a transparent
 * header on the homepage, serif display type, warm cream surfaces, rounded
 * image cards, and a deep teal footer.
 */
export const travelTheme: ThemeDefinition = {
  id: 'travel',
  name: 'Travel',
  description: 'Immersive travel design with large destination photography and rounded cards.',
  version: '1.0.0',
  supportsPosts: true,
  layout: TravelLayout,
  home: TravelHome,
  page: TravelPageView,
  postList: TravelPostList,
  post: TravelPostView,
  categories: TravelCategories,
  notFound: TravelNotFound,
};

export { TravelBlocks };
