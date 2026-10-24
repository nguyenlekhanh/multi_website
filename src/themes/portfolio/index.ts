import type { ThemeDefinition } from '@/platform/types';
import { PortfolioBlocks } from './Blocks';
import { PortfolioLayout } from './Layout';
import {
  PortfolioCategories,
  PortfolioHome,
  PortfolioNotFound,
  PortfolioPageView,
  PortfolioPostList,
  PortfolioPostView,
} from './Views';

/**
 * Portfolio theme.
 * Minimalist editorial identity for creative professionals: oversized serif
 * display type, hairline rules, numbered sections, and image-forward
 * project presentation on generous whitespace.
 */
export const portfolioTheme: ThemeDefinition = {
  id: 'portfolio',
  name: 'Portfolio',
  description: 'Minimalist editorial portfolio with a large project gallery and refined typography.',
  version: '1.0.0',
  supportsPosts: true,
  layout: PortfolioLayout,
  home: PortfolioHome,
  page: PortfolioPageView,
  postList: PortfolioPostList,
  post: PortfolioPostView,
  categories: PortfolioCategories,
  notFound: PortfolioNotFound,
};

export { PortfolioBlocks };
