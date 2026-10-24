import type { ThemeDefinition } from '@/platform/types';
import { NewsBlocks } from './Blocks';
import { NewsLayout } from './Layout';
import {
  NewsCategories,
  NewsHome,
  NewsNotFound,
  NewsPageView,
  NewsPostList,
  NewsPostView,
} from './Views';

/**
 * News / Magazine theme.
 * Newspaper-inspired identity for publishers: serif masthead with double
 * rules, kicker-labeled article rows, lead-story front treatment, and
 * reading-first article pages.
 */
export const newsTheme: ThemeDefinition = {
  id: 'news',
  name: 'News / Magazine',
  description: 'Newspaper masthead and dense section fronts for publishers and magazines.',
  version: '1.0.0',
  supportsPosts: true,
  layout: NewsLayout,
  home: NewsHome,
  page: NewsPageView,
  postList: NewsPostList,
  post: NewsPostView,
  categories: NewsCategories,
  notFound: NewsNotFound,
};

export { NewsBlocks };
