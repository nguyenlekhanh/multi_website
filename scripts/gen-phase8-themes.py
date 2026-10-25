# One-off: writes the 6 Phase 8 theme packages. Run: python scripts/gen-phase8-themes.py
import io, json, os

def manifest(id, name, description, layout, features, blocks):
    return {
        "format": "msp-theme", "formatVersion": 1, "id": id, "name": name,
        "version": "1.0.0", "description": description,
        "author": {"name": "Platform Team", "url": "https://example.com"},
        "preview": "assets/preview.png",
        "compatibility": {"platform": "1"},
        "features": features,
        "supportedBlocks": blocks,
        "entry": {
            "templates": {"home": "templates/home.json", "page": "templates/page.json",
                          "postList": "templates/post-list.json", "post": "templates/post.json"},
            "styles": "styles/theme.css",
        },
        "layout": layout,
    }

def header(variant, sticky=True, cta=None):
    h = {"variant": variant, "sticky": sticky}
    if cta:
        h["ctaLabel"], h["ctaHref"] = cta
    return h

def footer(variant, tagline=True):
    return {"variant": variant, "showTagline": tagline}

def typo(hf, bf):
    return {"headingFont": hf, "bodyFont": bf}

ALL = ["hero","intro","features","cards","stats","testimonials","richtext","logos","cta","contact","postlist"]

def template(route, sections, options=None, header_style="band", show_eyebrow=True):
    t = {"route": route, "contentHeader": {"style": header_style, "showEyebrow": show_eyebrow}, "sections": sections}
    t["options"] = options or {}
    return t

def static(block, variant=None):
    s = {"type": "static", "block": dict(block)}
    if variant:
        s["variant"] = variant
    return s

def write(theme_id, files):
    base = os.path.join('theme-packages', theme_id)
    for name, content in files.items():
        path = os.path.join(base, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with io.open(path, 'w', encoding='utf-8') as f:
            f.write(content if isinstance(content, str) else json.dumps(content, indent=2, ensure_ascii=False) + '\n')

PACKAGES = {}

PACKAGES['blog-editorial'] = {
'theme.json': manifest(
    'blog-editorial', 'Blog Editorial',
    'A personal-blog theme with editorial serif typography, a featured essay treatment, and comfortable reading widths.',
    {"header": header('centered', False), "footer": footer('minimal'),
     "typography": typo('serif', 'serif'), "colors": {"mode": "brand"}},
    ['responsive', 'post-list', 'post-detail', 'seo', 'reading-width'], ALL),
'templates/home.json': template('home', [{"type": "content"}], {"containerWidth": "narrow"}),
'templates/page.json': template('page', [
    {"type": "content"},
    static({"type": "cta", "heading": "Enjoyed this? Say hello.",
        "body": "Letters, corrections, and story ideas are always welcome.",
        "buttonLabel": "Get in touch", "buttonHref": "/contact"}, 'banner'),
], {"containerWidth": "narrow"}),
'templates/post-list.json': template('postList', [{"type": "content"}], {"postListLayout": "list"}),
'templates/post.json': template('post', [{"type": "content"}],
    {"postShowCover": True, "postShowAuthorCard": True, "containerWidth": "narrow"}),
'styles/theme.css': """/* Blog Editorial - generous line height, rule separators, calm rhythm */
main { line-height: 1.75; }
main > section { padding-top: 2.5rem; padding-bottom: 2.5rem; }
@media (min-width: 640px) { main > section { padding-top: 4rem; padding-bottom: 4rem; } }
h1, h2, h3 { letter-spacing: -0.015em; }
section + section { border-top: 1px solid rgba(0,0,0,0.07); }
""",
}

PACKAGES['travel-explorer'] = {
'theme.json': manifest(
    'travel-explorer', 'Travel Explorer',
    'Adventure travel identity with an immersive photo hero, overlay destination cards, and route-style statistics.',
    {"header": header('logo-left-nav', True), "footer": footer('large-brand'),
     "typography": typo('sans', 'sans'), "colors": {"mode": "brand"}},
    ['responsive', 'post-list', 'post-detail', 'seo', 'overlay-cards', 'immersive-hero'], ALL),
'templates/home.json': template('home', [{"type": "content"}], {"containerWidth": "wide"}, 'none', False),
'templates/page.json': template('page', [
    {"type": "content"},
    static({"type": "cta", "heading": "Where to next?",
        "body": "Tell us the kind of trip you are dreaming about.",
        "buttonLabel": "Plan a journey", "buttonHref": "/contact"}, 'split'),
], {"containerWidth": "normal"}),
'templates/post-list.json': template('postList', [{"type": "content"}],
    {"postListLayout": "grid", "postListFeaturedFirst": True}),
'templates/post.json': template('post', [{"type": "content"}],
    {"postShowCover": True, "postShowAuthorCard": False, "containerWidth": "normal"}),
'styles/theme.css': """/* Travel Explorer - big imagery, airy sections, rounded corners */
main img { border-radius: 1rem; }
main > section { padding-top: 3rem; padding-bottom: 3rem; }
@media (min-width: 640px) { main > section { padding-top: 4.5rem; padding-bottom: 4.5rem; } }
a.group { transition: transform .3s ease, box-shadow .3s ease; }
a.group:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
""",
}

PACKAGES['restaurant-bistro'] = {
'theme.json': manifest(
    'restaurant-bistro', 'Restaurant Bistro',
    'Warm modern bistro design: candlelit hero, menu-style dish cards, kitchen story, and a reservation-call CTA.',
    {"header": header('nav-cta', True, ("Reserve a table", "/contact")), "footer": footer('columns'),
     "typography": typo('serif', 'sans'), "colors": {"mode": "brand"}},
    ['responsive', 'post-list', 'post-detail', 'seo', 'menu-cards', 'reservation-cta'], ALL),
'templates/home.json': template('home', [{"type": "content"}], {"containerWidth": "normal"}, 'none', False),
'templates/page.json': template('page', [
    {"type": "content"},
    static({"type": "contact", "heading": "Reservations",
        "body": ["Call us or write - we answer personally."],
        "hours": "Tuesday-Sunday, 17:00-23:00"}, 'rows'),
], {"containerWidth": "normal"}),
'templates/post-list.json': template('postList', [{"type": "content"}], {"postListLayout": "list"}),
'templates/post.json': template('post', [{"type": "content"}],
    {"postShowCover": True, "postShowAuthorCard": True, "containerWidth": "narrow"}),
'styles/theme.css': """/* Restaurant Bistro - warm surfaces, soft shadows */
main > section { padding-top: 3rem; padding-bottom: 3rem; }
@media (min-width: 640px) { main > section { padding-top: 4.5rem; padding-bottom: 4.5rem; } }
a.group { box-shadow: 0 6px 18px rgba(28,20,12,0.10); transition: box-shadow .3s ease; }
a.group:hover { box-shadow: 0 12px 28px rgba(28,20,12,0.18); }
""",
}

PACKAGES['hotel-luxury'] = {
'theme.json': manifest(
    'hotel-luxury', 'Hotel Luxury',
    'Quiet-luxury resort identity: full-bleed imagery, suite and amenity cards, a dark stats band, and concierge contact.',
    {"header": header('logo-left-nav', False), "footer": footer('large-brand'),
     "typography": typo('serif', 'sans'), "colors": {"mode": "brand"}},
    ['responsive', 'post-list', 'post-detail', 'seo', 'immersive-hero', 'suite-cards'], ALL),
'templates/home.json': template('home', [{"type": "content"}], {"containerWidth": "wide"}, 'none', False),
'templates/page.json': template('page', [
    {"type": "content"},
    static({"type": "cta", "heading": "Plan your stay",
        "body": "Our concierge responds within a day - every enquiry, personally.",
        "buttonLabel": "Contact the concierge", "buttonHref": "/contact"}, 'panel'),
], {"containerWidth": "normal"}),
'templates/post-list.json': template('postList', [{"type": "content"}], {"postListLayout": "grid"}),
'templates/post.json': template('post', [{"type": "content"}],
    {"postShowCover": True, "postShowAuthorCard": False, "containerWidth": "narrow"}),
'styles/theme.css': """/* Hotel Luxury - restrained spacing, hairline dividers, elegant caps */
main > section { padding-top: 3.5rem; padding-bottom: 3.5rem; }
@media (min-width: 640px) { main > section { padding-top: 5rem; padding-bottom: 5rem; } }
section + section { border-top: 1px solid rgba(0,0,0,0.05); }
h1, h2 { font-weight: 600; letter-spacing: 0.01em; }
main img { border-radius: 0.75rem; }
""",
}

PACKAGES['education-academy'] = {
'theme.json': manifest(
    'education-academy', 'Education Academy',
    'Training-academy design: program hero, course cards, learning-benefit features, outcome statistics, and an enrolment CTA.',
    {"header": header('nav-cta', True, ("Enrol now", "/contact")), "footer": footer('columns'),
     "typography": typo('sans', 'sans'), "colors": {"mode": "brand"}},
    ['responsive', 'post-list', 'post-detail', 'seo', 'course-cards', 'enrolment-cta'], ALL),
'templates/home.json': template('home', [{"type": "content"}], {"containerWidth": "normal"}),
'templates/page.json': template('page', [
    {"type": "content"},
    static({"type": "cta", "heading": "Join the next cohort",
        "body": "Applications are reviewed weekly. Ask us anything.",
        "buttonLabel": "Request the syllabus", "buttonHref": "/contact"}, 'banner'),
], {"containerWidth": "normal"}),
'templates/post-list.json': template('postList', [{"type": "content"}], {"postListLayout": "grid"}),
'templates/post.json': template('post', [{"type": "content"}],
    {"postShowCover": True, "postShowAuthorCard": True, "containerWidth": "normal"}),
'styles/theme.css': """/* Education Academy - structured grid feel, clear section heads */
main > section { padding-top: 3rem; padding-bottom: 3rem; }
@media (min-width: 640px) { main > section { padding-top: 4rem; padding-bottom: 4rem; } }
h2 { padding-bottom: 0.5rem; }
""",
}

PACKAGES['saas-startup'] = {
'theme.json': manifest(
    'saas-startup', 'SaaS Startup',
    'Modern product design: gradient-split hero, capability features, metric band, plan-style cards, and a start-free CTA.',
    {"header": header('nav-cta', True, ("Start free", "/contact")), "footer": footer('minimal'),
     "typography": typo('sans', 'sans'), "colors": {"mode": "brand"}},
    ['responsive', 'post-list', 'post-detail', 'seo', 'plan-cards', 'trial-cta'], ALL),
'templates/home.json': template('home', [{"type": "content"}], {"containerWidth": "wide"}, 'none', False),
'templates/page.json': template('page', [
    {"type": "content"},
    static({"type": "cta", "heading": "Try it with your team",
        "body": "No credit card, no sales call - just working software.",
        "buttonLabel": "Start free", "buttonHref": "/contact"}, 'banner'),
], {"containerWidth": "normal"}),
'templates/post-list.json': template('postList', [{"type": "content"}],
    {"postListLayout": "grid", "postListFeaturedFirst": True}),
'templates/post.json': template('post', [{"type": "content"}],
    {"postShowCover": True, "postShowAuthorCard": True, "containerWidth": "normal"}),
'styles/theme.css': """/* SaaS Startup - crisp cards, bouncy hovers, tight headings */
main > section { padding-top: 3rem; padding-bottom: 3rem; }
@media (min-width: 640px) { main > section { padding-top: 4.5rem; padding-bottom: 4.5rem; } }
h1, h2, h3 { letter-spacing: -0.02em; }
a.group { transition: transform .2s ease, box-shadow .2s ease; }
a.group:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,23,42,0.10); }
""",
}

for theme_id, files in PACKAGES.items():
    write(theme_id, files)
    print(f'wrote {theme_id}')
print('done')
