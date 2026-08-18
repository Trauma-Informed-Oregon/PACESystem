# P.A.C.E. Starter Pack

GitHub Pages-ready static web app for Trauma Informed Oregon's Trauma Informed Workforce Wellness work.

## Publish on GitHub Pages

1. Create or open the GitHub repository that will host P.A.C.E.
2. Upload the contents of this folder to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose the branch (usually `main`) and `/ (root)`, then save.

The app uses relative paths and does not need a build step.

## Starter Pack and Full Access

The Starter Pack is public and uses the 12 starter activities from the P.A.C.E. interactive materials.

Full Access is a soft gate suitable for distributing the larger activity library to organizations. The current access code is:

`TIO-PACE-4827`

This is a client-side gate, not a security boundary. The activity content is not sensitive, but anyone determined to inspect a public repository can discover how the gate works.

To change the access code:

1. Open `app.js`.
2. Replace the value of `ACCESS_CODE` near the top of the file.
3. Remove the code from this README before publishing if the repository is public.

This gate is meant for simple organizational distribution, not secure content protection.

## Accessibility

The interface is designed toward WCAG 2.2 Level AA and includes keyboard access, visible focus, semantic headings and landmarks, screen-reader labels and live status text, large touch targets, reduced-motion support, reflow, and non-color status cues.

A final WCAG review should be run against the exact deployed production URL because hosting, content changes, browser behavior, and future edits can affect conformance.

## Content and data

- `assets/cards.json` contains the P.A.C.E. activity collection.
- Starter Pack activity names are defined in `app.js` under `STARTER_NAMES`.
- The real Trauma Informed Oregon logo is in `assets/tio-logo.png`.

## Credit

The footer credit is intentionally small:

Developed by Steffannie Roaché MS LPC LMHC
