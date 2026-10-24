import type { ThemeDefinition } from '@/platform/types';
import { BlogBlocks } from './Blocks';
import { BlogCategories } from './CategoriesView';
import { BlogHome } from './Home';
import { BlogLayout } from './Layout';
import { BlogNotFound } from './NotFound';
import { BlogPageView } from './PageView';
import { BlogPostList, BlogPostView } from './PostViews';

/**
 * Blog theme.
 * Editorial publication identity: newspaper-style masthead, serif typography
 * throughout, ruled article lists, category rails, and drop-cap article bodies.
 */
export const blogTheme: ThemeDefinition = {
  id: 'blog',
  name: 'Blog',
  description: 'Editorial typography with a masthead, featured essays, and reading-first layouts.',
  version: '1.0.0',
  supportsPosts: true,
  layout: BlogLayout,
  home: BlogHome,
  page: BlogPageView,
  postList: BlogPostList,
  post: BlogPostView,
  categories: BlogCategories,
  notFound: BlogNotFound,
};

export { BlogBlocks };
