# Jekyll Hosting

Applies to apps hosted on a Jekyll site, and to that site's shell pages.
- Mirror the GitHub Pages paths an embedded app is hosted under with source-app routing. Keep route components under
  `src/routes`, and use `src/routes/+page.svelte` as the app navigation hub unless the app has a durable reason for a
  different structure. Derive each route's path variants from one helper rather than repeating the project slug in
  every `Route` declaration: the extensionless route, the Jekyll `.html` shell page, and, for the project home route,
  the directory and index forms. For example, derive `/my_project/tool` and `/my_project/tool.html`, and `/my_project`,
  `/my_project/`, and `/my_project/index.html`.
- Make a shell page's bundle prefix configurable through a shared include or site variable rather than hard-coding
  staging and production paths in each page, since the shared Rollup workflow names live and staged `dev_bundle.*`
  uploads by branch. Leave a public production config's prefix blank unless staged bundles are intentionally under
  review on the live shell route.
- Keep Jekyll shell pages lightweight: front matter, page-specific host layout/full-width options, the compiled bundle
  CSS link, and the compiled bundle script tag. Change behavior, routes, and app-scoped styles in the source Svelte
  app, then rebuild and upload its bundle. Never patch a generated bundle or duplicate route content in Jekyll.
- A bundle's scoped Tailwind CSS applies only below its app wrapper. Style the Jekyll page around it with page, inline,
  or global site CSS.
- Do not use manually configured S3 asset version variables in Jekyll shell pages. Query-string cache busters are fine
  when a shared include derives them automatically from Jekyll build metadata such as `site.time`, or at runtime when
  a development config enables a strategy such as `s3_bundle_cache_bust_strategy: runtime`. Keep automatic cache busting scoped to
  mutable bundle assets by default, provide a config switch between runtime and build-time strategies, and make upload tooling set
  `Cache-Control: no-cache, max-age=0, must-revalidate` so direct S3 visits still revalidate same-name uploads.
- When a Rollup app renders differently inside a Jekyll host, compare computed styles and element geometry at the same viewport to identify the winning host declarations. Keep intrinsic component layout and spacing in the source app; compensate only for host-introduced cascade differences with narrowly page-scoped Jekyll CSS, preserving explicitly accepted host effects such as borders or alternating row colors. When existing Tailwind classes or other source-app CSS declarations serve only to counter Jekyll rendering differences, identify them during related work, move that compensation to the narrowly scoped Jekyll CSS, and remove the obsolete source styling after verifying both render paths. Verify the standalone and hosted geometry after the override rather than copying broad reset rules into either repository.
- Project home content embedded above Jekyll project pagination should reserve bottom space in the source app, matching the existing `mb-8` route or root wrapper convention rather than relying on host-page pager margins.
