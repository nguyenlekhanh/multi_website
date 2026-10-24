import type {
  Author,
  Category,
  Page,
  Post,
  Site,
} from '../types';
import {
  phase5Authors,
  phase5Categories,
  phase5Pages,
  phase5Posts,
  phase5Sites,
} from './seed-phase5';

/**
 * Typed seed dataset for the MVP.
 *
 * Every content record carries a `siteId`, which is how the data adapter
 * enforces site isolation. In production these rows would live in
 * PostgreSQL (see docs/database.md); the shape maps 1:1 onto the schema.
 */

/* ================================ Sites ================================== */

const baseSeedSites: Site[] = [
  {
    id: 'business-demo',
    name: 'Meridian Consulting',
    domain: 'business.demo.local',
    domains: ['business.demo.local', 'www.meridian-consulting.example'],
    themeId: 'business',
    createdAt: '2024-02-10T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    settings: {
      identity: {
        name: 'Meridian Consulting',
        tagline: 'Strategy, operations, and technology consulting for ambitious companies.',
        logoText: 'Meridian',
        logoInitials: 'M',
      },
      colors: {
        primary: '#154D74',
        primaryForeground: '#FFFFFF',
        accent: '#C9973B',
        background: '#FFFFFF',
        foreground: '#0F172A',
        muted: '#F3F6FA',
        mutedForeground: '#5B6B80',
        border: '#E2E8F0',
        dark: '#0B1D31',
        darkForeground: '#DCE5EF',
      },
      nav: [
        { label: 'Home', href: '/' },
        { label: 'Services', href: '/services' },
        { label: 'About', href: '/about' },
        { label: 'Insights', href: '/posts' },
        { label: 'Contact', href: '/contact' },
      ],
      footerNav: [
        { label: 'Services', href: '/services' },
        { label: 'About the firm', href: '/about' },
        { label: 'Insights', href: '/posts' },
        { label: 'Contact', href: '/contact' },
      ],
      seo: {
        defaultTitle: 'Meridian Consulting — Strategy & Operations',
        titleTemplate: '%s · Meridian Consulting',
        description:
          'Meridian Consulting helps mid-market companies sharpen strategy, streamline operations, and adopt technology that pays for itself.',
        keywords: ['management consulting', 'strategy', 'operations', 'technology advisory'],
        socialImage: '/images/business/hero.jpg',
        twitterHandle: '@meridianconsult',
      },
      landingBlurb: 'Corporate consulting site with a strong hero, services, and social proof.',
    },
  },
  {
    id: 'travel-demo',
    name: 'Wayfare Travel Co.',
    domain: 'travel.demo.local',
    domains: ['travel.demo.local', 'www.wayfare-travel.example'],
    themeId: 'travel',
    createdAt: '2024-05-22T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    settings: {
      identity: {
        name: 'Wayfare Travel Co.',
        tagline: "Small-group journeys to the world's most beautiful places.",
        logoText: 'Wayfare',
        logoInitials: 'W',
      },
      colors: {
        primary: '#BC4B27',
        primaryForeground: '#FFFFFF',
        accent: '#0F766E',
        background: '#FFFCF7',
        foreground: '#292524',
        muted: '#F5EEE3',
        mutedForeground: '#7A6F63',
        border: '#E8DFD2',
        dark: '#123E3B',
        darkForeground: '#EAF6F1',
      },
      nav: [
        { label: 'Home', href: '/' },
        { label: 'Destinations', href: '/destinations' },
        { label: 'Journal', href: '/posts' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
      footerNav: [
        { label: 'Destinations', href: '/destinations' },
        { label: 'Travel journal', href: '/posts' },
        { label: 'About us', href: '/about' },
        { label: 'Plan a trip', href: '/contact' },
      ],
      seo: {
        defaultTitle: 'Wayfare Travel Co. — Small-group journeys',
        titleTemplate: '%s · Wayfare Travel Co.',
        description:
          'Small-group journeys to the most beautiful places on earth. Hand-built routes, local partners, and groups of twelve travelers max.',
        keywords: ['small group tours', 'travel', 'adventure travel', 'destinations'],
        socialImage: '/images/travel/hero.jpg',
        twitterHandle: '@wayfaretravel',
      },
      landingBlurb: 'Immersive travel brand with big photography and destination cards.',
    },
  },
  {
    id: 'blog-demo',
    name: 'The Margin',
    domain: 'blog.demo.local',
    domains: ['blog.demo.local', 'www.themargin.example'],
    themeId: 'blog',
    createdAt: '2023-11-02T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    settings: {
      identity: {
        name: 'The Margin',
        tagline: 'Essays on technology, culture, and the space between.',
        logoText: 'The Margin',
        logoInitials: 'TM',
      },
      colors: {
        primary: '#B91C1C',
        primaryForeground: '#FFFFFF',
        accent: '#1F2937',
        background: '#FDFCF9',
        foreground: '#1C1917',
        muted: '#F4F2EC',
        mutedForeground: '#71716C',
        border: '#E7E4DC',
        dark: '#17150F',
        darkForeground: '#EDEAE0',
      },
      nav: [
        { label: 'Home', href: '/' },
        { label: 'Essays', href: '/posts' },
        { label: 'Culture', href: '/posts?category=culture' },
        { label: 'Technology', href: '/posts?category=technology' },
        { label: 'About', href: '/about' },
      ],
      footerNav: [
        { label: 'All essays', href: '/posts' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
      seo: {
        defaultTitle: 'The Margin — Essays & criticism',
        titleTemplate: '%s · The Margin',
        description:
          'The Margin publishes essays on technology, culture, and the space between. Slow writing for a fast internet.',
        keywords: ['essays', 'technology', 'culture', 'criticism'],
        socialImage: '/images/blog/featured.jpg',
        twitterHandle: '@themargin',
      },
      landingBlurb: 'Editorial publication with serif typography and an article-first home page.',
    },
  },
];

/* ================================ Pages ================================== */

const baseSeedPages: Page[] = [
  /* ------------------------------ Business ------------------------------ */
  {
    siteId: 'business-demo',
    slug: 'home',
    title: 'Home',
    isHomepage: true,
    updatedAt: '2026-09-28T09:00:00.000Z',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'Management consulting',
        title: 'Clear strategy. Measurable results.',
        subtitle:
          'We help mid-market companies sharpen strategy, streamline operations, and adopt technology that pays for itself.',
        image: '/images/business/hero.jpg',
        imageAlt: 'Modern glass office building',
        primaryCta: { label: 'Book a consultation', href: '/contact' },
        secondaryCta: { label: 'Explore our services', href: '/services' },
      },
      {
        type: 'logos',
        heading: 'Trusted by teams at',
        items: ['Northwind', 'Helios Group', 'Bluepeak', 'Ardent Labs', 'Corelink', 'Vantage'],
      },
      {
        type: 'features',
        eyebrow: 'What we do',
        heading: 'Services built around outcomes',
        intro:
          'Every engagement starts with the result you need — then we work backwards to the smallest plan that gets you there.',
        items: [
          {
            icon: 'compass',
            title: 'Strategy & Planning',
            description: 'Positioning, growth thesis, and a roadmap your board can rally behind.',
          },
          {
            icon: 'zap',
            title: 'Operations Excellence',
            description: 'Process redesign that removes cost and friction without breaking the culture.',
          },
          {
            icon: 'chart',
            title: 'Data & Analytics',
            description: 'Dashboards and models that turn scattered reports into decisions.',
          },
          {
            icon: 'globe',
            title: 'Technology Advisory',
            description: 'Vendor selection, systems architecture, and AI adoption with a business case.',
          },
          {
            icon: 'users',
            title: 'People & Change',
            description: 'Org design and change programs that survive the quarter after we leave.',
          },
          {
            icon: 'shield',
            title: 'Risk & Compliance',
            description: 'Practical controls for regulated teams — documented, tested, and audit-ready.',
          },
        ],
      },
      {
        type: 'stats',
        items: [
          { value: '250+', label: 'Engagements delivered' },
          { value: '18', label: 'Industries served' },
          { value: '$1.2B', label: 'Client value created' },
          { value: '94%', label: 'Client retention' },
        ],
      },
      {
        type: 'intro',
        eyebrow: 'Who we are',
        heading: 'A senior team that does the work, not just the deck',
        body: [
          'Meridian was founded in 2009 by consultants who were tired of watching strategy decks gather dust. We keep teams small, senior, and accountable for implementation — not just recommendations.',
          'Our clients are typically founder-led or family-owned companies between $20M and $500M in revenue, often at the point where what got them here will not get them to the next stage.',
        ],
        image: '/images/business/team.jpg',
        imageAlt: 'Consulting team collaborating around a table',
        bullets: [
          'Partner-led engagements — you work directly with the people doing the analysis',
          'Fixed-scope pricing with defined deliverables and no surprise invoices',
          'Practical roadmaps your teams can start executing the week after we leave',
        ],
        reversed: false,
      },
      {
        type: 'postlist',
        heading: 'Latest thinking',
        intro: 'Field notes from our work across strategy, operations, and technology.',
        limit: 3,
        layout: 'grid',
      },
      {
        type: 'testimonials',
        eyebrow: 'Client stories',
        heading: 'Results our clients can point to',
        items: [
          {
            quote:
              'Meridian rebuilt our pricing and margin discipline in twelve weeks. The engagement paid for itself before the final invoice arrived.',
            author: 'Dana Whitfield',
            role: 'CEO, Bluepeak Manufacturing',
            initials: 'DW',
          },
          {
            quote:
              'The rare consulting team that stayed through implementation. Our order-to-cash cycle is down 31% and still improving.',
            author: 'Robert Osei',
            role: 'COO, Corelink Logistics',
            initials: 'RO',
          },
          {
            quote:
              'They told us what we needed to hear, not what we wanted to hear — and had the data to back every recommendation.',
            author: 'Ingrid Halvorsen',
            role: 'Founder, Ardent Labs',
            initials: 'IH',
          },
        ],
      },
      {
        type: 'cta',
        heading: "Let's build your next chapter.",
        body:
          'Tell us where you are headed and we will bring a point of view, a plan, and a team that has done it before.',
        buttonLabel: 'Book a consultation',
        buttonHref: '/contact',
      },
    ],
  },
  {
    siteId: 'business-demo',
    slug: 'services',
    title: 'Services',
    eyebrow: 'Services',
    seoDescription:
      'Strategy, operations, data, technology advisory, people & change, and risk & compliance services from Meridian Consulting.',
    updatedAt: '2026-09-20T09:00:00.000Z',
    blocks: [
      {
        type: 'features',
        eyebrow: 'Capabilities',
        heading: 'Six practices, one accountable team',
        intro:
          'Most engagements combine two or three practices. You get one partner, one plan, and one team accountable for the outcome.',
        items: [
          {
            icon: 'compass',
            title: 'Strategy & Planning',
            description:
              'Market and margin analysis, positioning, and a three-horizon growth roadmap with owners and milestones.',
          },
          {
            icon: 'zap',
            title: 'Operations Excellence',
            description:
              'End-to-end process mapping, bottleneck removal, and operating cadences that keep improvements in place.',
          },
          {
            icon: 'chart',
            title: 'Data & Analytics',
            description:
              'A single source of truth for revenue and cost, plus the models and dashboards leadership actually uses.',
          },
          {
            icon: 'globe',
            title: 'Technology Advisory',
            description:
              'Requirements-driven vendor selection, implementation oversight, and pragmatic AI pilots with measurable ROI.',
          },
          {
            icon: 'users',
            title: 'People & Change',
            description:
              'Organization design, role clarity, and communication plans that turn restructuring into momentum.',
          },
          {
            icon: 'shield',
            title: 'Risk & Compliance',
            description:
              'Gap assessments, control design, and audit preparation for finance, data privacy, and sector regulation.',
          },
        ],
      },
      {
        type: 'richtext',
        eyebrow: 'How we engage',
        heading: 'Fixed scope, senior people, visible progress',
        paragraphs: [
          'Every Meridian engagement begins with a two-week diagnostic: a focused look at your numbers, your processes, and your team, ending in a findings briefing you can act on whether or not you continue with us.',
          'From there we propose a fixed-scope engagement with named deliverables, a weekly working session with your team, and a partner on every call. You will always know what is happening, what it costs, and what it is producing.',
        ],
      },
      {
        type: 'cta',
        heading: 'Not sure which practice you need?',
        body: 'Book a 30-minute call. If we are not the right fit, we will point you to someone who is.',
        buttonLabel: 'Talk to a partner',
        buttonHref: '/contact',
      },
    ],
  },
  {
    siteId: 'business-demo',
    slug: 'about',
    title: 'About the firm',
    eyebrow: 'About us',
    seoDescription:
      'Meridian Consulting is a partner-led firm of 45 consultants serving mid-market companies since 2009.',
    updatedAt: '2026-09-18T09:00:00.000Z',
    blocks: [
      {
        type: 'intro',
        eyebrow: 'Our story',
        heading: 'Built to be accountable, not advisory',
        body: [
          'Meridian started in 2009 with three consultants and a conviction: the industry had optimized for billable hours instead of outcomes. We built the firm we would have wanted to hire — senior teams, fixed scopes, and skin in the game.',
          'Today we are 45 people across three offices, still structured so that the partner who sells the work is the partner who delivers it.',
        ],
        image: '/images/business/office.jpg',
        imageAlt: 'Meridian Consulting office interior',
        reversed: true,
      },
      {
        type: 'stats',
        items: [
          { value: '2009', label: 'Founded' },
          { value: '45', label: 'Consultants & staff' },
          { value: '3', label: 'Offices' },
          { value: '18', label: 'Industries served' },
        ],
      },
      {
        type: 'features',
        eyebrow: 'How we work',
        heading: 'Three commitments behind every engagement',
        items: [
          {
            icon: 'users',
            title: 'Senior only',
            description: 'No bench-and-bill pyramid. The people in the room average fifteen years of experience.',
          },
          {
            icon: 'check',
            title: 'Fixed scope, fixed price',
            description: 'Deliverables and pricing are agreed before we start. Change orders require your sign-off.',
          },
          {
            icon: 'chart',
            title: 'Measured outcomes',
            description: 'Every engagement defines its success metrics up front, and we report against them monthly.',
          },
        ],
      },
      {
        type: 'richtext',
        heading: 'Where we work',
        paragraphs: [
          'Our teams operate across North America and Europe, with deep experience in manufacturing, logistics, B2B software, financial services, and healthcare. We keep two engagements per consultant at most — depth over volume.',
          'If you want the long version, our annual letter walks through what we learned across last year\'s engagements, including the ones that did not go to plan.',
        ],
      },
      {
        type: 'cta',
        heading: 'Meet the team behind the results',
        body: 'We are happy to introduce the specific partners who would run your engagement.',
        buttonLabel: 'Get in touch',
        buttonHref: '/contact',
      },
    ],
  },
  {
    siteId: 'business-demo',
    slug: 'contact',
    title: 'Contact',
    eyebrow: 'Contact',
    seoDescription: 'Book a consultation with Meridian Consulting.',
    updatedAt: '2026-09-15T09:00:00.000Z',
    blocks: [
      {
        type: 'contact',
        heading: 'Start a conversation',
        body: [
          'Tell us a little about your company and the outcome you are after. A partner will reply within one business day.',
        ],
        email: 'hello@meridian-consulting.example',
        phone: '+1 (555) 014-2280',
        address: '240 Kearny Street, Suite 900, San Francisco, CA',
        hours: 'Monday–Friday, 8:00–18:00 PT',
      },
      {
        type: 'richtext',
        heading: 'What happens next',
        paragraphs: [
          'First, a 30-minute call with a partner — no business development layer. If there is a fit, we scope a short diagnostic and give you a fixed price before any work begins.',
          'If we are not the right firm for the problem, we will say so and refer you to someone who is.',
        ],
      },
    ],
  },

  /* ------------------------------- Travel ------------------------------- */
  {
    siteId: 'travel-demo',
    slug: 'home',
    title: 'Home',
    isHomepage: true,
    updatedAt: '2026-09-28T09:00:00.000Z',
    blocks: [
      {
        type: 'hero',
        eyebrow: 'Small-group tours',
        title: 'Go further. Wander deeper.',
        subtitle:
          'Hand-built routes, trusted local guides, and groups of twelve travelers max — to the most beautiful places on earth.',
        image: '/images/travel/hero.jpg',
        imageAlt: 'Turquoise beach bay seen from above',
        primaryCta: { label: 'Explore destinations', href: '/destinations' },
        secondaryCta: { label: 'Plan my trip', href: '/contact' },
      },
      {
        type: 'cards',
        eyebrow: 'Where to next',
        heading: 'Featured destinations',
        intro: 'Eight regions, dozens of routes, zero tourist traps.',
        columns: 3,
        items: [
          {
            title: 'Santorini & the Cyclades',
            description: 'Whitewashed villages, caldera sunsets, and island-hopping at human speed.',
            image: '/images/travel/santorini.jpg',
            imageAlt: 'Blue domed churches of Santorini above the sea',
            href: '/destinations',
            meta: ['12 itineraries', 'Greece'],
          },
          {
            title: 'Kyoto & the Setouchi Coast',
            description: 'Temple mornings, tea houses, and the art islands of the Inland Sea.',
            image: '/images/travel/kyoto.jpg',
            imageAlt: 'Pagoda and cherry blossoms in Kyoto',
            href: '/destinations',
            meta: ['9 itineraries', 'Japan'],
          },
          {
            title: 'Bali & the Islands of the Gods',
            description: 'Rice terraces, reef snorkeling, and village stays away from the crowds.',
            image: '/images/travel/bali.jpg',
            imageAlt: 'Green rice terraces in Bali',
            href: '/destinations',
            meta: ['11 itineraries', 'Indonesia'],
          },
          {
            title: 'Iceland Ring Road',
            description: 'Waterfalls, black-sand beaches, and hot springs under the midnight sun.',
            image: '/images/travel/iceland.jpg',
            imageAlt: 'Braided glacial river in Iceland',
            href: '/destinations',
            meta: ['7 itineraries', 'Iceland'],
          },
          {
            title: 'New York City Weekends',
            description: 'Long weekends done properly: food, museums, and neighborhoods most visitors miss.',
            image: '/images/travel/newyork.jpg',
            imageAlt: 'Manhattan skyline at dusk',
            href: '/destinations',
            meta: ['5 itineraries', 'USA'],
          },
          {
            title: 'Paris & the Loire Valley',
            description: 'Market mornings in Paris, then châteaux and vineyards by regional train.',
            image: '/images/travel/paris.jpg',
            imageAlt: 'Eiffel Tower over Paris rooftops',
            href: '/destinations',
            meta: ['8 itineraries', 'France'],
          },
        ],
      },
      {
        type: 'features',
        eyebrow: 'Why Wayfare',
        heading: 'Trips designed by people who have been there',
        items: [
          {
            icon: 'compass',
            title: 'Hand-built routes',
            description: 'Every itinerary is walked, eaten, and slept by our team before it is ever sold.',
          },
          {
            icon: 'users',
            title: 'Twelve travelers max',
            description: 'Small enough for family-run tavernas and early-morning sites without the crowds.',
          },
          {
            icon: 'shield',
            title: 'Local partners',
            description: 'Guides and guesthouses we have worked with for years, paid fairly and on time.',
          },
          {
            icon: 'spark',
            title: 'No hidden costs',
            description: 'One price covers lodging, guiding, most meals, and every entry on the route.',
          },
        ],
      },
      {
        type: 'cards',
        eyebrow: 'Signature journeys',
        heading: 'Featured trips for 2026',
        columns: 3,
        items: [
          {
            title: 'Cyclades Island Hopper',
            description: 'Eight days across Santorini, Naxos, and Paros with a local skipper.',
            image: '/images/travel/santorini.jpg',
            imageAlt: 'Santorini caldera at sunset',
            href: '/contact',
            meta: ['$2,890 · 8 days', 'Rated 4.9 by 212 travelers'],
            tag: 'Bestseller',
          },
          {
            title: 'Kyoto Autumn Route',
            description: 'Ten days of temple gardens, tea ceremony, and the Setouchi art islands.',
            image: '/images/travel/kyoto.jpg',
            imageAlt: 'Kyoto temple garden in autumn',
            href: '/contact',
            meta: ['$3,450 · 10 days', 'Rated 4.8 by 164 travelers'],
            tag: 'New',
          },
          {
            title: 'Iceland Ring Road Complete',
            description: 'Nine days around the entire island — glaciers, lagoons, and the Westfjords.',
            image: '/images/travel/iceland.jpg',
            imageAlt: 'Icelandic waterfall and road',
            href: '/contact',
            meta: ['$3,190 · 9 days', 'Rated 4.9 by 187 travelers'],
            tag: 'Limited',
          },
        ],
      },
      {
        type: 'postlist',
        heading: 'Inspiration for your next trip',
        intro: 'Notes from the road, written by the people who planned the routes.',
        limit: 3,
        layout: 'grid',
      },
      {
        type: 'testimonials',
        eyebrow: 'Traveler stories',
        heading: 'What our travelers say',
        items: [
          {
            quote:
              'Twelve strangers became twelve friends by day three. The itinerary felt like a local friend planned it — because someone local did.',
            author: 'Hannah Brooks',
            role: 'Cyclades Island Hopper, 2025',
            initials: 'HB',
          },
          {
            quote:
              'We have traveled with three other tour companies. Wayfare is the first where every single detail matched the brochure.',
            author: 'Miguel Torres',
            role: 'Iceland Ring Road, 2025',
            initials: 'MT',
          },
          {
            quote:
              'The Japan trip was flawless. Our guide grew up in Kyoto and it showed — we ate at places no app would ever find.',
            author: 'Rachel Kim',
            role: 'Kyoto Autumn Route, 2024',
            initials: 'RK',
          },
        ],
      },
      {
        type: 'cta',
        heading: 'Get trip ideas in your inbox',
        body: 'One thoughtful email a month: new routes, seasonal windows, and honest advice on when to go.',
        buttonLabel: 'Start planning',
        buttonHref: '/contact',
      },
    ],
  },
  {
    siteId: 'travel-demo',
    slug: 'destinations',
    title: 'Destinations',
    eyebrow: 'Destinations',
    seoDescription:
      'Explore Wayfare destinations: Greece, Japan, Indonesia, Iceland, the USA, France, Canada, Norway, and Patagonia.',
    updatedAt: '2026-09-22T09:00:00.000Z',
    blocks: [
      {
        type: 'cards',
        eyebrow: 'Eight regions',
        heading: 'Where we go',
        intro: 'Every route below is scouted yearly by the team that designs it.',
        columns: 4,
        items: [
          {
            title: 'Santorini & the Cyclades',
            description: 'Island-hopping at human speed.',
            image: '/images/travel/santorini.jpg',
            imageAlt: 'Santorini blue domes',
            meta: ['Greece'],
          },
          {
            title: 'Kyoto & the Setouchi Coast',
            description: 'Temples, tea, and art islands.',
            image: '/images/travel/kyoto.jpg',
            imageAlt: 'Kyoto pagoda',
            meta: ['Japan'],
          },
          {
            title: 'Bali & the Islands of the Gods',
            description: 'Terraces, reefs, and village stays.',
            image: '/images/travel/bali.jpg',
            imageAlt: 'Bali rice terraces',
            meta: ['Indonesia'],
          },
          {
            title: 'Iceland Ring Road',
            description: 'Waterfalls, glaciers, hot springs.',
            image: '/images/travel/iceland.jpg',
            imageAlt: 'Iceland glacial river',
            meta: ['Iceland'],
          },
          {
            title: 'New York City Weekends',
            description: 'The city, done properly.',
            image: '/images/travel/newyork.jpg',
            imageAlt: 'Manhattan skyline',
            meta: ['USA'],
          },
          {
            title: 'Paris & the Loire Valley',
            description: 'Markets, châteaux, vineyards.',
            image: '/images/travel/paris.jpg',
            imageAlt: 'Paris rooftops',
            meta: ['France'],
          },
          {
            title: 'Canadian Lakes & Lodges',
            description: 'Canoe mornings, pine evenings.',
            image: '/images/travel/canoe.jpg',
            imageAlt: 'Canoe on a mountain lake',
            meta: ['Canada'],
          },
          {
            title: 'Norway Fjords & Northern Lights',
            description: 'Fjord crossings and Arctic nights.',
            image: '/images/travel/mountains-night.jpg',
            imageAlt: 'Snowy mountains under stars',
            meta: ['Norway'],
          },
        ],
      },
      {
        type: 'cta',
        heading: 'Somewhere not on the list?',
        body: 'We design private departures almost anywhere. Tell us the place and the people.',
        buttonLabel: 'Design my trip',
        buttonHref: '/contact',
      },
    ],
  },
  {
    siteId: 'travel-demo',
    slug: 'about',
    title: 'About us',
    eyebrow: 'About',
    seoDescription: 'Wayfare Travel Co. builds small-group journeys designed and scouted by our own team.',
    updatedAt: '2026-09-18T09:00:00.000Z',
    blocks: [
      {
        type: 'intro',
        eyebrow: 'Our story',
        heading: 'Built by travelers, for travelers',
        body: [
          'Wayfare began in 2017 with one van, one route through Iceland, and a simple rule: we only sell trips we have taken ourselves. Nine years later that rule still decides where we go.',
          'We are 22 people in four countries, and every one of us has guided. When you email a question about a route, the person answering has usually slept in the guesthouse you are asking about.',
        ],
        image: '/images/travel/canoe.jpg',
        imageAlt: 'Canoe crossing an alpine lake at sunrise',
      },
      {
        type: 'stats',
        items: [
          { value: '38', label: 'Countries scouted' },
          { value: '12', label: 'Travelers max per group' },
          { value: '9', label: 'Years on the road' },
          { value: '4.9', label: 'Average traveler rating' },
        ],
      },
      {
        type: 'features',
        eyebrow: 'What we believe',
        heading: 'Three rules we never break',
        items: [
          {
            icon: 'compass',
            title: 'Scout it first',
            description: 'No route is sold before someone from our team has walked it in the season you will travel.',
          },
          {
            icon: 'shield',
            title: 'Pay partners fairly',
            description: 'Guides and family-run stays set their own rates. We pay them in days, not months.',
          },
          {
            icon: 'users',
            title: 'Keep groups small',
            description: 'Twelve travelers max, always. It costs us margin and earns us the trips people remember.',
          },
        ],
      },
      {
        type: 'cta',
        heading: 'Come see for yourself',
        body: 'Browse the destinations or write to us — we answer every message personally.',
        buttonLabel: 'Plan a trip',
        buttonHref: '/contact',
      },
    ],
  },
  {
    siteId: 'travel-demo',
    slug: 'contact',
    title: 'Contact',
    eyebrow: 'Contact',
    seoDescription: 'Contact Wayfare Travel Co. to plan your next small-group journey.',
    updatedAt: '2026-09-15T09:00:00.000Z',
    blocks: [
      {
        type: 'contact',
        heading: "Let's plan your next journey",
        body: [
          'Tell us where you are dreaming of, when you can travel, and who is coming. A real trip designer replies within two business days.',
        ],
        email: 'hello@wayfare-travel.example',
        phone: '+1 (555) 017-4432',
        address: '18 Harbor Lane, Suite 2, Portland, ME',
        hours: 'Monday–Saturday, 9:00–17:00 ET',
      },
    ],
  },

  /* -------------------------------- Blog -------------------------------- */
  {
    siteId: 'blog-demo',
    slug: 'home',
    title: 'Home',
    isHomepage: true,
    updatedAt: '2026-09-28T09:00:00.000Z',
    blocks: [
      {
        type: 'postlist',
        heading: 'Latest stories',
        limit: 7,
        layout: 'list',
      },
    ],
  },
  {
    siteId: 'blog-demo',
    slug: 'about',
    title: 'About The Margin',
    eyebrow: 'About',
    seoDescription:
      'The Margin publishes essays on technology, culture, and the space between. Slow writing for a fast internet.',
    updatedAt: '2026-09-18T09:00:00.000Z',
    blocks: [
      {
        type: 'richtext',
        eyebrow: 'Our masthead',
        heading: 'Slow writing for a fast internet',
        paragraphs: [
          'The Margin started in 2023 as a newsletter written on Sunday mornings and read on Sunday afternoons. It remains exactly that, only bigger: a weekly essay, a growing archive, and readers who answer by email more often than not.',
          'We publish one piece a week — no hot takes, no SEO filler. Our writers are paid per essay, our readers pay for nothing, and our only metric that matters is whether a piece is still worth reading a year later.',
        ],
      },
      {
        type: 'features',
        eyebrow: 'What we cover',
        heading: 'Three desks, one newsroom',
        items: [
          {
            icon: 'book',
            title: 'Culture',
            description: 'How we spend attention: art, food, cities, sport, and the rituals of ordinary life.',
          },
          {
            icon: 'zap',
            title: 'Technology',
            description: 'What the tools are doing to us — reported with curiosity instead of panic.',
          },
          {
            icon: 'spark',
            title: 'Essays',
            description: 'Arguments worth having, made slowly and with sources.',
          },
        ],
      },
      {
        type: 'contact',
        heading: 'Write to us',
        body: ['Pitches, corrections, and arguments are all welcome at the address below.'],
        email: 'letters@themargin.example',
      },
    ],
  },
  {
    siteId: 'blog-demo',
    slug: 'contact',
    title: 'Contact',
    eyebrow: 'Contact',
    seoDescription: 'Contact The Margin — pitches, letters, and corrections.',
    updatedAt: '2026-09-15T09:00:00.000Z',
    blocks: [
      {
        type: 'contact',
        heading: 'Letters to the editor',
        body: ['We read everything and publish the best letters (with permission) each month.'],
        email: 'letters@themargin.example',
        hours: 'We reply on weekdays, slowly and thoughtfully.',
      },
    ],
  },
];

/* ============================== Categories =============================== */

const baseSeedCategories: Category[] = [
  // Business
  { siteId: 'business-demo', id: 'cat-strategy', slug: 'strategy', name: 'Strategy' },
  { siteId: 'business-demo', id: 'cat-leadership', slug: 'leadership', name: 'Leadership' },
  { siteId: 'business-demo', id: 'cat-markets', slug: 'markets', name: 'Markets' },
  // Travel
  { siteId: 'travel-demo', id: 'cat-destinations', slug: 'destinations', name: 'Destinations' },
  { siteId: 'travel-demo', id: 'cat-guides', slug: 'guides', name: 'Guides' },
  { siteId: 'travel-demo', id: 'cat-tips', slug: 'tips', name: 'Tips' },
  // Blog
  { siteId: 'blog-demo', id: 'cat-culture', slug: 'culture', name: 'Culture' },
  { siteId: 'blog-demo', id: 'cat-technology', slug: 'technology', name: 'Technology' },
  { siteId: 'blog-demo', id: 'cat-essays', slug: 'essays', name: 'Essays' },
];

/* =============================== Authors ================================= */

const baseSeedAuthors: Record<string, Author> = {
  'business-demo:elena-voss': {
    id: 'elena-voss',
    name: 'Elena Voss',
    role: 'Managing Partner',
    bio: 'Elena has led strategy engagements across manufacturing and B2B software for fifteen years.',
    initials: 'EV',
  },
  'business-demo:marcus-hale': {
    id: 'marcus-hale',
    name: 'Marcus Hale',
    role: 'Partner, Operations',
    bio: 'Marcus spent a decade running supply chains before joining Meridian in 2016.',
    initials: 'MH',
  },
  'business-demo:priya-nair': {
    id: 'priya-nair',
    name: 'Priya Nair',
    role: 'Director, Analytics',
    bio: 'Priya builds the models behind our pricing and market work.',
    initials: 'PN',
  },
  'travel-demo:amara-chen': {
    id: 'amara-chen',
    name: 'Amara Chen',
    role: 'Head of Routes',
    bio: 'Amara has designed every Wayfare route in Asia and guides the Kyoto trips each autumn.',
    initials: 'AC',
  },
  'travel-demo:tomas-rivera': {
    id: 'tomas-rivera',
    name: 'Tomás Rivera',
    role: 'Field Writer',
    bio: 'Tomás writes the journal between scouting trips — currently somewhere between Reykjavík and Vík.',
    initials: 'TR',
  },
  'travel-demo:june-park': {
    id: 'june-park',
    name: 'June Park',
    role: 'Trip Designer',
    bio: 'June plans the European routes and answers most of the email that arrives on Mondays.',
    initials: 'JP',
  },
  'blog-demo:naomi-okafor': {
    id: 'naomi-okafor',
    name: 'Naomi Okafor',
    role: 'Senior Editor',
    bio: 'Naomi edits most of what you read here and writes the technology desk.',
    initials: 'NO',
  },
  'blog-demo:david-lindqvist': {
    id: 'david-lindqvist',
    name: 'David Lindqvist',
    role: 'Contributing Writer',
    bio: 'David is a former software architect writing about tools, attention, and habit.',
    initials: 'DL',
  },
  'blog-demo:sofia-reyes': {
    id: 'sofia-reyes',
    name: 'Sofia Reyes',
    role: 'Columnist',
    bio: 'Sofia writes the culture column and the occasional letter from Mexico City.',
    initials: 'SR',
  },
};

/* ================================= Posts ================================= */

const baseSeedPosts: Post[] = [
  /* ------------------------------ Business ------------------------------ */
  {
    siteId: 'business-demo',
    slug: 'what-a-good-strategy-review-actually-changes',
    title: 'What a good strategy review actually changes',
    excerpt:
      'Most strategy reviews produce a document. The good ones change what gets funded, what gets stopped, and who owns what on Monday morning.',
    body: [
      'Every company we work with holds a strategy review. Far fewer can name a decision that changed because of the last one. The difference is rarely effort or intelligence — it is what the review is designed to produce.',
      'A review that works starts with a short list of real decisions: which products get investment, which markets get exited, which roles get hired. Evidence is gathered against those decisions, not presented as background. And the meeting ends with owners and dates, not actions and owners to be determined.',
      'The uncomfortable part is that a good review stops things. Killing a beloved project that serves yesterday\'s strategy is the clearest signal a leadership team can send. If nothing ever stops, the review was theater.',
      'If your last review produced a deck but no decisions, try this: cut the agenda to three questions, cap the evidence at ten pages per question, and require every answer to name an owner and a date before anyone leaves the room.',
    ],
    coverImage: '/images/business/post-strategy.jpg',
    coverAlt: 'Analyst reviewing charts on a laptop',
    categoryId: 'cat-strategy',
    author: baseSeedAuthors['business-demo:elena-voss'],
    publishedAt: '2026-09-24T08:00:00.000Z',
    readingMinutes: 6,
    featured: true,
  },
  {
    siteId: 'business-demo',
    slug: 'quiet-habits-of-resilient-leadership-teams',
    title: 'The quiet habits of resilient leadership teams',
    excerpt:
      'Resilience is not a retreat exercise. It is a handful of unglamorous habits practiced in the ordinary weeks.',
    body: [
      'When operations break — a supplier fails, a key customer churns, a system goes down — the difference between teams that absorb it and teams that spiral is rarely talent. It is habit.',
      'The most resilient leadership teams we have studied share three habits. They write down decisions while making them, so context survives the people who made them. They rehearse bad news in the abstract, so the real version is not novel. And they protect one honest channel where bad news travels faster than politics.',
      'None of this is complicated, and none of it photographs well at an offsite. It is the operational equivalent of flossing — small, daily, and decisive over a decade.',
    ],
    coverImage: '/images/business/post-leadership.jpg',
    coverAlt: 'Leadership team working together at a table',
    categoryId: 'cat-leadership',
    author: baseSeedAuthors['business-demo:marcus-hale'],
    publishedAt: '2026-09-10T08:00:00.000Z',
    readingMinutes: 5,
  },
  {
    siteId: 'business-demo',
    slug: 'reading-market-signals-without-drowning-in-dashboards',
    title: 'Reading market signals without drowning in dashboards',
    excerpt:
      'More metrics have not produced more clarity. A practical filter for deciding which numbers deserve a meeting.',
    body: [
      'The average leadership meeting we sit in reviews forty-plus metrics. Almost none of them change a decision. The cost is not just time — it is attention, the scarcest input a leadership team has.',
      'Our filter is simple. A number deserves a standing slot on the agenda if, and only if, it can change a decision already on the table. Everything else can live in a dashboard someone checks when they need it.',
      'What survives the filter is usually five numbers: pipeline coverage, gross margin by product, cash runway, top-customer concentration, and one operational metric unique to the business. Five numbers, reviewed honestly, beat forty reviewed ritually.',
    ],
    coverImage: '/images/business/post-market.jpg',
    coverAlt: 'Analytics dashboard on a screen',
    categoryId: 'cat-markets',
    author: baseSeedAuthors['business-demo:priya-nair'],
    publishedAt: '2026-08-27T08:00:00.000Z',
    readingMinutes: 4,
  },

  /* ------------------------------- Travel ------------------------------- */
  {
    siteId: 'travel-demo',
    slug: 'kyoto-in-autumn-a-slow-travel-guide',
    title: 'Kyoto in autumn: a slow travel guide',
    excerpt:
      'The maples get the crowds and the guidebooks get the temples. Here is how we actually spend a week in Kyoto in November.',
    body: [
      'Kyoto in late November is the most beautiful place we scout all year — and the easiest to get wrong. The famous gardens fill by nine, and the temptation is to sprint between them. The fix is to pick two a day, and to arrive when the gates do.',
      'Mornings belong to the temples: Tofuku-ji at opening, when the maples glow over the ravine, then coffee at a kissaten that has not changed since 1974. Afternoons belong to the west side — Arashiyama is packed by noon, but the river path past the bamboo loses the crowds within fifteen minutes on foot.',
      'Eat where office workers eat. Lunch sets in the Pontochō arcades cost a third of dinner, and the sobya with six seats beats the kaiseki with a waiting list. Book one splurge dinner — a single one — and let the rest be noodles and izakaya.',
      'Stay three nights longer than you planned. The city rewards the traveler who has already seen the postcards.',
    ],
    coverImage: '/images/travel/kyoto.jpg',
    coverAlt: 'Kyoto pagoda framed by cherry trees',
    categoryId: 'cat-destinations',
    author: baseSeedAuthors['travel-demo:amara-chen'],
    publishedAt: '2026-09-21T08:00:00.000Z',
    readingMinutes: 7,
    featured: true,
  },
  {
    siteId: 'travel-demo',
    slug: 'iceland-ring-road-the-complete-9-day-itinerary',
    title: "Iceland's Ring Road: the complete 9-day itinerary",
    excerpt:
      'Waterfalls, black sand, glacier lagoons, and the Westfjords detour most itineraries skip — with realistic daily driving distances.',
    body: [
      'The Ring Road is 1,332 kilometers, and the internet is full of itineraries that treat it like a checklist. Nine days is the minimum for doing it without eating every meal at a fuel station.',
      'Days one and two cover the south coast: Seljalandsfoss and Skógafoss before the tour buses, Vík for the night, then the glacier lagoon at Jökulsárlón when the light is low. Day three is the Eastfjords — the day most itineraries delete, and the one our travelers remember most.',
      'The north rewards patience. Goðafoss and Mývatn in one morning, Húsavík for whales in the afternoon, then the long drive west with Akureyri\'s harbor lights in the rearview. Spend your last two nights on Snæfellsnes, not in Reykjavík; the black church at Búðir at sunset is the right final frame.',
      'Fuel up whenever you see a station below half, book guesthouses before April, and never trust the forecast more than four hours out. Iceland rewards the flexible and humbles the scheduled.',
    ],
    coverImage: '/images/travel/iceland.jpg',
    coverAlt: 'Braided glacial river in the Icelandic highlands',
    categoryId: 'cat-guides',
    author: baseSeedAuthors['travel-demo:tomas-rivera'],
    publishedAt: '2026-09-07T08:00:00.000Z',
    readingMinutes: 9,
  },
  {
    siteId: 'travel-demo',
    slug: 'how-to-pack-for-two-weeks-in-southeast-asia',
    title: 'How to pack for two weeks in Southeast Asia',
    excerpt:
      'One bag, no regrets: the packing list our guides actually use across Bali, Vietnam, and Thailand.',
    body: [
      'The biggest mistake in tropical packing is volume. You will wash clothes weekly, buy sunscreen there, and regret every hard-sided suitcase on ferry gangways. One 40-liter bag is genuinely enough for two weeks.',
      'Bring three quick-dry shirts, two that modestly cover shoulders for temple days, and one long layer for air conditioning that could preserve meat. Sandals that strap, one pair of proper shoes, and a sarong — the most versatile object ever invented.',
      'Leave room. The markets are better than your luggage: linen in Bangkok, sandals in Ubud, and a duffel bag in Hoi An that will outlive the trip. The souvenirs you buy are the packing list for next time.',
    ],
    coverImage: '/images/travel/bali.jpg',
    coverAlt: 'Rice terraces in upcountry Bali',
    categoryId: 'cat-tips',
    author: baseSeedAuthors['travel-demo:june-park'],
    publishedAt: '2026-08-19T08:00:00.000Z',
    readingMinutes: 5,
  },
  {
    siteId: 'travel-demo',
    slug: 'best-shoulder-season-escapes-for-2026',
    title: 'The best shoulder-season escapes for 2026',
    excerpt:
      'May and October are the sweet spots: fewer crowds, kinder prices, and light worth photographing. Six windows to book now.',
    body: [
      'Peak season is a marketing achievement and a travel problem. The weeks on either side of it are where experienced travelers live — same places, half the crowds, better light.',
      'Our 2026 short list: the Cyclades in late May, before the meltemi wind and after the spring flowers. Kyoto in the first week of April for blossom mornings without the Golden Week crowds. Iceland in early June, when the interior roads open. Paris in October, when the city exhales. New York in late September. And Bali in May, when the rice is greenest and the rain has moved on.',
      'Book flights when the routes are published, guesthouses a month out, and dinners the day of. Shoulder season rewards the unhurried.',
    ],
    coverImage: '/images/travel/paris.jpg',
    coverAlt: 'Autumn light over Paris rooftops',
    categoryId: 'cat-guides',
    author: baseSeedAuthors['travel-demo:amara-chen'],
    publishedAt: '2026-08-05T08:00:00.000Z',
    readingMinutes: 6,
  },

  /* -------------------------------- Blog -------------------------------- */
  {
    siteId: 'blog-demo',
    slug: 'the-attention-economy-is-running-out-of-attention',
    title: 'The attention economy is running out of attention',
    excerpt:
      'For twenty years the business model was simple: harvest human attention and sell it. The harvest is now larger than the field.',
    body: [
      'There is a quiet crisis in the attention economy, and it is arithmetic. The average adult already spends over forty percent of waking leisure hours with a screen. There are no new hours to harvest. Growth must now come from taking attention someone else captured, or from taking it more intensively.',
      'You can see the consequence everywhere. Interfaces have stopped asking "will this help the user?" and started asking "will this hold the user?" Feeds autoplay because a tap is a chance to lose you. Notifications have escaped the phone entirely — to watches, to cars, to the refrigerator. The industry calls this engagement. A previous century would have called it restless.',
      'The interesting question is not moral but economic: what happens to a market whose raw material is finite and whose producers keep growing? Either prices rise — attention gets more expensive to win, and the loudest players crowd out the rest — or the market diversifies, and small, calm, paid products take back the territory that advertising products cannot profitably serve.',
      'The evidence suggests the second is already happening. Newsletters, RSS resurgences, slow media, paid apps without ads. None of these will win the market. None of them need to. Attention is coming back to earth — it was only ever borrowed.',
    ],
    coverImage: '/images/blog/news.jpg',
    coverAlt: 'Stacked newspapers awaiting readers',
    categoryId: 'cat-technology',
    author: baseSeedAuthors['blog-demo:naomi-okafor'],
    publishedAt: '2026-10-18T08:00:00.000Z',
    readingMinutes: 8,
    featured: true,
  },
  {
    siteId: 'blog-demo',
    slug: 'in-defense-of-the-long-lunch',
    title: 'In defense of the long lunch',
    excerpt:
      'The sixty-minute lunch was an efficiency gain for someone. It was not you.',
    body: [
      'Somewhere in the last thirty years the lunch hour became the lunch half-hour, then became lunch at a desk, watching a video, chewing in the direction of a spreadsheet. We saved forty minutes a day and cannot say what we bought with them.',
      'The long lunch is not about food, or not only. It is the last widely available ritual that requires you to sit with other humans, unproductively, until the conversation finds its own level. Business happens in the second hour, but so does something rarer: thinking out loud without an agenda.',
      'The French and Italian lunch cultures are often romanticized, but the mechanism is mundane: a protected block, a table, no screens. You can rebuild it anywhere. Start with ninety minutes once a week. Invite people you do not need to meet. Order the second course.',
      'Your inbox will survive. It is designed to.',
    ],
    coverImage: '/images/blog/desk.jpg',
    coverAlt: 'A café table with coffee and a laptop pushed aside',
    categoryId: 'cat-culture',
    author: baseSeedAuthors['blog-demo:sofia-reyes'],
    publishedAt: '2026-10-11T08:00:00.000Z',
    readingMinutes: 4,
  },
  {
    siteId: 'blog-demo',
    slug: 'what-we-lose-when-everything-is-recorded',
    title: 'What we lose when everything is recorded',
    excerpt:
      'Perfect memory was the promise. Forgetting, it turns out, was a feature of a life.',
    body: [
      'The story goes that memory was a constraint technology would fix. Notes became recordings, photographs became archives, conversations became transcripts. We are close to the promised end state: a life with nothing lost. It is worth asking what was lost before we celebrate.',
      'Human memory is an editor. It keeps the emotional truth and discards the detail, and in doing so it forgives. The argument that was vicious in the moment becomes, in memory, the week you two finally understood each other. A perfect recording makes no such edit. It remembers the words exactly, and the words were worse.',
      'There is also the matter of performance. Everyone already knows the difference between speaking and being recorded. The microphone in the room changes the room. As capture becomes ambient and invisible, we may lose the last unobserved spaces — not because anyone is watching, but because we can no longer be sure no one is.',
      'The proposal here is not Luddism. Record the lecture, the birthday, the border crossing. But keep some rooms where nothing is kept. The ability to say a thing that exists only once — spoken, heard, and gone — may turn out to be one of the luxuries of the age.',
    ],
    coverImage: '/images/blog/library.jpg',
    coverAlt: 'A dim library with tall shelves',
    categoryId: 'cat-essays',
    author: baseSeedAuthors['blog-demo:david-lindqvist'],
    publishedAt: '2026-10-04T08:00:00.000Z',
    readingMinutes: 7,
  },
  {
    siteId: 'blog-demo',
    slug: 'the-new-wave-of-slow-software',
    title: 'The new wave of slow software',
    excerpt:
      'A generation of tools is choosing to be boring on purpose. Users are noticing.',
    body: [
      'The fastest-growing category in software is, quietly, the slowest: tools that load instantly because they do almost nothing, that never notify, that work the same on a plane as in a meeting. The users abandoning feature-rich platforms for these tools are not nostalgic. They are exhausted.',
      'Slow software has a design philosophy, even if it rarely says so out loud: the tool should be ready when you arrive and invisible while you work. No badge counts, no feeds, no "while you were away." The product earns its place by being dependable, and the business model has to match — paid, small, content.',
      'There is a lesson here beyond software. A decade of growth optimization taught every industry to compete on interruption. The businesses now winning attention are the ones that spend it carefully, like a host who does not raise their voice.',
    ],
    coverImage: '/images/blog/nook.jpg',
    coverAlt: 'A quiet reading nook with books and warm light',
    categoryId: 'cat-technology',
    author: baseSeedAuthors['blog-demo:david-lindqvist'],
    publishedAt: '2026-09-20T08:00:00.000Z',
    readingMinutes: 5,
  },
  {
    siteId: 'blog-demo',
    slug: 'cities-for-people-not-for-parking',
    title: 'Cities for people, not for parking',
    excerpt:
      'The most radical idea in urbanism is also the oldest: streets are rooms.',
    body: [
      'A city block is a machine for moving cars, or it is a room for living in. For most of the twentieth century we chose the machine, and we got very good at it: wide lanes, generous parking, and the silence that follows.',
      'The revival now visible in dozens of cities is not really about bikes or cafés. It is about the return of a unit of measurement: the walking human. Once you design for the person on foot, everything else arranges itself — trees become necessary, benches become infrastructure, and a parking lot becomes what it always was: land waiting for a better idea.',
      'The objections are always the same — deliveries, emergencies, commerce. The cities that tried it have the same answer: watch the ground floor. When a street becomes a place, the rents follow, the tax base follows, and the emergency vehicles move faster than they did on the widened road.',
    ],
    categoryId: 'cat-culture',
    author: baseSeedAuthors['blog-demo:sofia-reyes'],
    publishedAt: '2026-09-13T08:00:00.000Z',
    readingMinutes: 6,
  },
  {
    siteId: 'blog-demo',
    slug: 'reading-in-public-a-small-act-of-resistance',
    title: 'Reading in public: a small act of resistance',
    excerpt:
      'The paperback on the train is doing more work than it looks.',
    body: [
      'Watch the reader on the train. She is doing several things at once, none of them on her phone: claiming an hour of the day, modeling a habit for every child on the car, and refusing — gently, one page at a time — the idea that every moment must be fed.',
      'Public reading is quietly social. People ask what you are reading. They remember the answer. A stranger bought a book last month because of a cover she saw over a shoulder on the 8:15, and the writer of that book will never know.',
      'None of this requires a movement. It requires a book in a bag, and the small decision, on a crowded train, to open it.',
    ],
    coverImage: '/images/blog/featured.jpg',
    coverAlt: 'An open book with pages mid-turn',
    categoryId: 'cat-essays',
    author: baseSeedAuthors['blog-demo:naomi-okafor'],
    publishedAt: '2026-08-30T08:00:00.000Z',
    readingMinutes: 3,
  },
];

/* =========================== merged seed exports ========================== */
/* The full demo dataset: the original three themes plus the Phase 5 theme
 * library demos. The adapters read ONLY these merged exports, so both sets
 * of fixtures are always in sync with one dataset. */

export const seedSites: Site[] = [...baseSeedSites, ...phase5Sites];
export const seedPages: Page[] = [...baseSeedPages, ...phase5Pages];
export const seedCategories: Category[] = [...baseSeedCategories, ...phase5Categories];
export const seedPosts: Post[] = [...baseSeedPosts, ...phase5Posts];
export const seedAuthors: Record<string, Author> = {
  ...baseSeedAuthors,
  ...phase5Authors,
};
