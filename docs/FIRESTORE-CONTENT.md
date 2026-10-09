# EESA v4.1 — Firestore content model

The public website now works in two layers:

1. **Built-in foundation copy** keeps the public homepage useful even when Firestore has no published content.
2. **Published Firestore content** replaces the empty states as the committee creates real EESA events, projects, notices, achievements and gallery entries.

## Public collections

### `siteSettings/public`
Fields used by the homepage:
- `eyebrow`
- `title`
- `description`
- `aboutTitle`
- `aboutText`
- `institutionTitle`
- `institutionText`
- `contact`
- `updatedAt`
- `updatedBy`

The Control Room can publish these fields for users with `manage_settings` (currently the President/admin roles).

### `events`
Create through Control Room. A public event needs `status: "published"`.

### `projects`
Create through Control Room or through the existing student-project workflow. A public project needs `status: "published"`.

### `notices`
Create through Control Room. A public notice needs `status: "published"`.

### `achievements`
Public fields can include `title`, `description`/`body`, `category`, `date`, `imageUrl`, and `status: "published"`.

### `gallery`
Public fields can include `title`, `imageUrl` (or `url`), `category`, and `status: "published"`.

## Important

Do not invent event names, achievements, student names or photographs just to populate the website. Add real EESA material through the Control Room. The site intentionally shows a polished empty state until real content is published.
