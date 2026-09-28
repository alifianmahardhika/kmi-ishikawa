# KMII Ishikawa

KMII Ishikawa is Keluarga Muslim Indonesia Ishikawa — the Indonesian
Muslim community association based in Ishikawa, Japan. Its tagline,
carried in the ring text of the badge, is "Perkuat Ukhuwah, Nikmati
Indahnya Islam" (roughly, "Strengthen brotherhood, enjoy the beauty of
Islam").

**This system is built from one source file**: the circular badge
attached to this artifact. No separate brand guideline, font file, or
additional logo lockup was supplied, so this is a minimal system — real
colors and the real mark, nothing invented beyond what's noted below.

## The mark

The badge is a green disc on a near-black card, ringed with white
Latin/Arabic text, holding a white mosque silhouette, the org's full
name ("Keluarga Muslim Indonesia Ishikawa"), the Indonesian and
Japanese flags, the "KMII" wordmark, a URL, and "JAPAN". The full-color
file is the only approved version — see `assets/Logos`.

## Color

Five colors, sampled directly from the badge's pixels (one theme —
the source shows no light variant):

| Token | Value | Use |
| --- | --- | --- |
| `kmii-green` | `#1b7717` | Primary brand color — the disc itself. |
| `ink` | `#0c1014` | The near-black ground the badge sits on. Dark surfaces, high-contrast text. |
| `on-green` | `#ffffff` | Every mark set on `kmii-green` in the source: ring text, mosque silhouette, wordmark, URL, "JAPAN". |
| `flag-red-indonesia` | `#d1172a` | The Indonesian flag icon inside the mark. Reference only. |
| `flag-red-japan` | `#bc0c39` | The Japanese flag icon inside the mark. Reference only. |

`on-green` on `kmii-green` measures 5.7:1; `on-green` on `ink` measures
19:1 — both clear the 4.5:1 text minimum. The two flag reds are
identification colors for the national flags shown in the mark, not
brand or UI colors — don't promote them to buttons, links, or accents.

## Typography

No typeface could be identified from a logo image alone — the wordmark
and ring text use a bold, condensed display face that isn't a standard
system or web font. At your request, `display-placeholder` (system-ui,
bold) stands in for it. Treat every use of this style as a placeholder:
swap it the moment the real typeface — or even just its name — is
known, and don't ship it as the brand's actual voice in the meantime.

## What isn't here

Spacing, additional radii, elevation, and components aren't included —
none of them are visible in a single badge image, and adding them would
mean inventing a system rather than extracting one. The one geometric
token this system does carry, `radius-full`, comes directly from the
badge's own shape: it's a perfect circle.

## Next steps

To grow this past the mark and its colors, the most useful things to
add are: the real typeface (a name, or the font files themselves), any
additional logo lockups (horizontal, monochrome, small-size versions),
and — if this badge is meant to anchor a larger visual identity —
guidance on spacing and iconography beyond the badge itself.
